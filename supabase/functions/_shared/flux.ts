// Lecture de flux RSS, sans reseau.
//
// Extrait de la fonction `journal`, qui ne savait lire qu'un seul flux avec un
// code taille pour lui. Des qu'une deuxieme source est apparue, les
// differences de forme sont devenues le vrai sujet : l'un encode ses balises
// deux fois, l'autre les enferme dans du CDATA et ajoute une signature
// WordPress a chaque resume.
//
// Tout est pur et teste ici, parce qu'un flux mal decode ne plante pas : il
// affiche « &lt;p&gt;Le regulateur met en garde… » a l'utilisateur, ce qui
// passe inapercu en developpement et saute aux yeux en production.

export interface ArticleFlux {
  titre: string;
  lien: string;
  date: string | null;
  extrait: string;
}

/**
 * Entites HTML, nommees et numeriques.
 *
 * `&amp;` est traite en dernier, volontairement : le faire en premier
 * transformerait « &amp;lt; » en « < » alors que le texte publie disait
 * litteralement « &lt; ».
 */
export function decoderEntites(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ccedil;/g, "ç")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      // 160 est l'espace insecable : la laisser telle quelle collerait les
      // mots au caractere suivant apres compactage des blancs.
      return code === 160 ? " " : String.fromCharCode(code);
    })
    .replace(/&amp;/g, "&");
}

/** Retire l'enveloppe CDATA quand elle est presente. */
export function deCdata(s: string): string {
  const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : s;
}

/**
 * Signature ajoutee par WordPress a la fin de chaque resume
 * (« The post … appeared first on … »). Elle n'apporte rien au lecteur et
 * mange la place de l'extrait reel, qui est tronque a 220 caracteres.
 */
export function retirerSignatureWordpress(s: string): string {
  return s.replace(/\s*The post\s+.*?\s+appeared first on\s+.*?\.?\s*$/i, "").trim();
}

export function texteBrut(html: string): string {
  // Certains flux encodent leurs balises deux fois : « &lt;p&gt; » doit
  // redevenir « <p> » avant qu'on puisse le reconnaitre comme une balise.
  return retirerSignatureWordpress(
    decoderEntites(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function champ(bloc: string, nom: string): string | null {
  const m = bloc.match(new RegExp(`<${nom}(?:\\s[^>]*)?>([\\s\\S]*?)</${nom}>`));
  return m ? deCdata(m[1]).trim() : null;
}

/**
 * Articles d'un flux RSS 2.0.
 *
 * Une entree sans titre ou sans lien est ecartee plutot que rendue avec un
 * champ vide : un article sur lequel on ne peut pas cliquer n'informe pas, il
 * occupe seulement de la place.
 */
export function parserFlux(xml: string, limite: number): ArticleFlux[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  const resultats: ArticleFlux[] = [];
  for (const bloc of items) {
    if (resultats.length >= limite) break;
    const titre = champ(bloc, "title");
    const lien = champ(bloc, "link");
    if (!titre || !lien) continue;
    resultats.push({
      titre: texteBrut(titre),
      lien: decoderEntites(lien).trim(),
      date: champ(bloc, "pubDate"),
      extrait: texteBrut(champ(bloc, "description") ?? "").slice(0, 220),
    });
  }
  return resultats;
}

/**
 * Une mise en garde de la FSMA protege ; une actualite informe. Les deux
 * comptent, mais elles ne se lisent pas de la meme facon, d'ou la distinction.
 */
export function categorieFsma(lien: string): "mise-en-garde" | "actualite" {
  return lien.includes("/warnings/") ? "mise-en-garde" : "actualite";
}
