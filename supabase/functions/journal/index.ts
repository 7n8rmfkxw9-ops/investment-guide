// Edge Function `journal` — actualites et education financiere.
//
// Deux sources, toutes deux officielles :
//
//  - Le flux RSS de la FSMA (regulateur belge) : actualites de marche et,
//    surtout, ses mises en garde contre des acteurs non agrees. C'est la
//    lecture la plus protectrice qu'un debutant puisse faire.
//  - Une selection fixe d'articles Wikifin (le site d'education financiere de
//    la FSMA elle-meme), rangee par theme. Wikifin ne publie pas de flux : la
//    liste est entretenue a la main plutot que devinee.
//
// Aucune synthese, aucun resume ecrit par un modele : on relaie le titre et le
// lien tels que publies. Rien ici ne recommande un placement.

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifierAppelant } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FSMA_RSS = "https://www.fsma.be/fr/news-articles/rss.xml";
const UA = "Mozilla/5.0 (compatible; veille-investissement personnelle)";

interface ActualiteFsma {
  titre: string;
  lien: string;
  date: string | null;
  /** Une mise en garde protege ; une actualite informe. Les deux comptent. */
  categorie: "mise-en-garde" | "actualite";
  extrait: string;
}

function texteBrut(html: string): string {
  // La description du flux est encodee deux fois : les balises elles-memes
  // apparaissent comme "&lt;p&gt;". Il faut donc decoder les entites avant de
  // pouvoir reconnaitre et retirer les balises.
  const decode = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&amp;/g, "&");
  return decode
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function champ(bloc: string, nom: string): string | null {
  const m = bloc.match(new RegExp(`<${nom}>([\\s\\S]*?)</${nom}>`));
  return m ? m[1].trim() : null;
}

async function actualitesFsma(limite: number): Promise<ActualiteFsma[]> {
  const r = await fetch(FSMA_RSS, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`FSMA indisponible (${r.status})`);
  const xml = await r.text();
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  const resultats: ActualiteFsma[] = [];
  for (const bloc of items.slice(0, limite)) {
    const titre = champ(bloc, "title");
    const lien = champ(bloc, "link");
    if (!titre || !lien) continue;
    resultats.push({
      titre: texteBrut(titre),
      lien,
      date: champ(bloc, "pubDate"),
      categorie: lien.includes("/warnings/") ? "mise-en-garde" : "actualite",
      extrait: texteBrut(champ(bloc, "description") ?? "").slice(0, 220),
    });
  }
  return resultats;
}

/**
 * Selection fixe : Wikifin ne publie pas de flux RSS. Chaque entree a ete
 * verifiee manuellement (juillet 2026). Une page qui deplace son URL cassera
 * silencieusement un lien plutot que toute la fonction — c'est le compromis
 * accepte pour une source sans flux exploitable.
 */
const WIKIFIN: { theme: string; titre: string; lien: string; resume: string }[] = [
  {
    theme: "Démarrer",
    titre: "Pourquoi investir ?",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/comment-investir-et-repartition-des-risques/pourquoi-investir",
    resume: "Les bases, sans jargon : ce que l'investissement peut et ne peut pas faire pour vous.",
  },
  {
    theme: "Démarrer",
    titre: "Quel montant investir ?",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/comment-investir-et-repartition-des-risques/quel-montant-investir",
    resume: "Comment évaluer une somme raisonnable à côté de votre épargne de précaution.",
  },
  {
    theme: "Démarrer",
    titre: "Votre profil d'investisseur",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/comment-investir-et-repartition-des-risques/votre-profil-dinvestisseur",
    resume: "Ce que votre courtier vous demandera, et pourquoi c'est utile de vous connaître d'abord.",
  },
  {
    theme: "Produits",
    titre: "Qu'est-ce qu'une action ?",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/produits-dinvestissement/action",
    resume: "La fiche de référence de la FSMA sur ce que possède réellement un actionnaire.",
  },
  {
    theme: "Produits",
    titre: "Les fonds de placement (dont les ETF)",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/produits-dinvestissement/fonds-de-placement",
    resume: "Comment un fonds diversifie un placement, et ce que cela change face au risque.",
  },
  {
    theme: "Se protéger",
    titre: "Cela peut arriver à tout le monde",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/fraudes-et-escroqueries-linvestissement/cela-peut-arriver-tout-le-monde",
    resume: "Pourquoi les arnaques à l'investissement touchent aussi des gens prudents.",
  },
  {
    theme: "Se protéger",
    titre: "Les différents types de fraude",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/fraudes-et-escroqueries-linvestissement/les-differents-types-de-fraude",
    resume: "Reconnaître les montages les plus courants avant d'y être confronté.",
  },
  {
    theme: "Se protéger",
    titre: "Conseils contre la fraude",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/fraudes-et-escroqueries-linvestissement/conseils-contre-la-fraude",
    resume: "Les réflexes de vérification avant de confier de l'argent à qui que ce soit.",
  },
  {
    theme: "Fiscalité",
    titre: "Qu'est-ce qu'un compte-titres ?",
    lien: "https://www.wikifin.be/fr/epargner-et-investir/comment-investir-et-repartition-des-risques/quest-ce-quun-compte-titres",
    resume: "Le compte nécessaire pour détenir des actions ou ETF, expliqué simplement.",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  // Reserve aux utilisateurs de l'application : sans cela, la seule cle
  // anonyme (publique par construction) suffirait a faire tourner ce proxy
  // vers le flux RSS de la FSMA pour n'importe qui.
  const verif = await verifierAppelant(req, supabase);
  if (!verif.ok) return json({ erreur: verif.message }, 401);

  try {
    let fsma: ActualiteFsma[] = [];
    let erreurFsma: string | null = null;
    try {
      fsma = await actualitesFsma(30);
    } catch (e) {
      erreurFsma = e instanceof Error ? e.message : String(e);
    }
    return json({ fsma, erreurFsma, education: WIKIFIN });
  } catch (e) {
    return json({ erreur: e instanceof Error ? e.message : String(e) }, 502);
  }
});
