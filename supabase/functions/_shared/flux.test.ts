import { describe, expect, it } from "vitest";
import {
  categorieFsma,
  champ,
  deCdata,
  decoderEntites,
  parserFlux,
  retirerSignatureWordpress,
  texteBrut,
} from "./flux";

describe("decoderEntites", () => {
  it("decode les entites nommees courantes", () => {
    expect(decoderEntites("&laquo;&nbsp;caf&eacute;&nbsp;&raquo;")).toBe("« café »");
  });

  it("decode les entites numeriques", () => {
    expect(decoderEntites("l&#8217;euro")).toBe("l'euro");
    expect(decoderEntites("&#233;pargne")).toBe("épargne");
  });

  it("transforme l'espace insecable numerique en espace normal", () => {
    // Sans cela, « Marché des changes&#160;: » restait colle apres compactage
    // des blancs et donnait « Marché des changes: ».
    expect(decoderEntites("changes&#160;: pourquoi")).toBe("changes : pourquoi");
  });

  it("traite &amp; en dernier", () => {
    // Le piege : decoder &amp; d'abord transformerait &amp;lt; en < alors que
    // le flux disait litteralement « &lt; ».
    expect(decoderEntites("&amp;lt;p&amp;gt;")).toBe("&lt;p&gt;");
  });

  it("decode une balise encodee une seule fois", () => {
    expect(decoderEntites("&lt;p&gt;")).toBe("<p>");
  });
});

describe("deCdata", () => {
  it("retire l'enveloppe CDATA", () => {
    expect(deCdata("<![CDATA[Décryptages]]>")).toBe("Décryptages");
  });

  it("laisse un texte nu intact", () => {
    expect(deCdata("Décryptages")).toBe("Décryptages");
  });

  it("n'ampute pas un texte contenant des crochets", () => {
    expect(deCdata("<![CDATA[Épisode 2] Le private credit]]>")).toBe(
      "Épisode 2] Le private credit",
    );
  });
});

describe("retirerSignatureWordpress", () => {
  it("retire la signature de fin de resume", () => {
    const s = "Pourquoi le yen s'est-il effondré ? The post Marché des changes appeared first on La finance pour tous.";
    expect(retirerSignatureWordpress(s)).toBe("Pourquoi le yen s'est-il effondré ?");
  });

  it("laisse intact un resume sans signature", () => {
    expect(retirerSignatureWordpress("Un résumé normal.")).toBe("Un résumé normal.");
  });

  it("ne coupe pas un texte qui parle d'un post sans la formule complete", () => {
    const s = "The post office a publié ses résultats.";
    expect(retirerSignatureWordpress(s)).toBe(s);
  });
});

describe("texteBrut", () => {
  it("decode puis retire les balises encodees deux fois", () => {
    // La forme reelle du flux FSMA.
    expect(texteBrut("&lt;p&gt;La FSMA met en garde&lt;/p&gt;")).toBe(
      "La FSMA met en garde",
    );
  });

  it("retire les balises HTML nues", () => {
    expect(texteBrut("<p>Un <strong>avertissement</strong></p>")).toBe(
      "Un avertissement",
    );
  });

  it("compacte les blancs multiples", () => {
    expect(texteBrut("trop   d'espaces\n\tici")).toBe("trop d'espaces ici");
  });

  it("nettoie un resume WordPress complet", () => {
    const brut =
      "<p>Fin juillet 2026, le dollar est monté...</p>\n<p>The post <a href=\"h\">Marché des changes</a> appeared first on La finance pour tous.</p>";
    expect(texteBrut(brut)).toBe("Fin juillet 2026, le dollar est monté...");
  });

  it("renvoie une chaine vide sur une entree vide", () => {
    expect(texteBrut("")).toBe("");
  });
});

describe("champ", () => {
  it("extrait une balise simple", () => {
    expect(champ("<item><title>Bonjour</title></item>", "title")).toBe("Bonjour");
  });

  it("extrait une balise porteuse d'attributs", () => {
    // <guid isPermaLink="false"> : sans la tolerance aux attributs, le champ
    // etait introuvable.
    expect(champ('<guid isPermaLink="false">abc</guid>', "guid")).toBe("abc");
  });

  it("retire le CDATA au passage", () => {
    expect(champ("<title><![CDATA[Décryptages]]></title>", "title")).toBe("Décryptages");
  });

  it("renvoie null quand la balise est absente", () => {
    expect(champ("<item><link>x</link></item>", "title")).toBeNull();
  });

  it("ne confond pas deux balises de prefixe commun", () => {
    // <link> ne doit pas etre servi a la place de <linkExtra>, ni l'inverse.
    const bloc = "<linkExtra>mauvais</linkExtra><link>bon</link>";
    expect(champ(bloc, "link")).toBe("bon");
  });
});

describe("parserFlux", () => {
  const xml = `<rss><channel>
    <item><title>Premier</title><link>https://a.test/1</link>
      <pubDate>Fri, 07 Aug 2026 10:17:34 +0000</pubDate>
      <description><![CDATA[<p>Résumé un</p>]]></description></item>
    <item><title><![CDATA[Deuxième]]></title><link>https://a.test/2</link></item>
    <item><link>https://a.test/3</link></item>
    <item><title>Sans lien</title></item>
  </channel></rss>`;

  it("lit les articles complets", () => {
    const r = parserFlux(xml, 10);
    expect(r).toHaveLength(2);
    expect(r[0].titre).toBe("Premier");
    expect(r[0].lien).toBe("https://a.test/1");
    expect(r[0].extrait).toBe("Résumé un");
    expect(r[1].titre).toBe("Deuxième");
  });

  it("écarte un article sans titre ou sans lien", () => {
    // Un article sur lequel on ne peut pas cliquer occupe de la place sans
    // rien apporter.
    expect(parserFlux(xml, 10).map((a) => a.lien)).not.toContain("https://a.test/3");
  });

  it("respecte la limite demandée", () => {
    expect(parserFlux(xml, 1)).toHaveLength(1);
  });

  it("renvoie une liste vide sur un flux sans article", () => {
    expect(parserFlux("<rss><channel></channel></rss>", 10)).toEqual([]);
  });

  it("ne plante pas sur du XML tronqué", () => {
    // Une reponse coupee en plein vol ne doit pas casser toute la page.
    expect(parserFlux("<rss><channel><item><title>Coup", 10)).toEqual([]);
  });

  it("laisse la date telle que publiée", () => {
    expect(parserFlux(xml, 10)[0].date).toBe("Fri, 07 Aug 2026 10:17:34 +0000");
    expect(parserFlux(xml, 10)[1].date).toBeNull();
  });

  it("tronque un extrait très long", () => {
    const long = `<rss><item><title>T</title><link>https://a.test/x</link>
      <description>${"a".repeat(400)}</description></item></rss>`;
    expect(parserFlux(long, 10)[0].extrait).toHaveLength(220);
  });
});

describe("categorieFsma", () => {
  it("reconnait une mise en garde à son chemin", () => {
    expect(categorieFsma("https://www.fsma.be/fr/warnings/abc")).toBe("mise-en-garde");
  });

  it("classe le reste en actualité", () => {
    expect(categorieFsma("https://www.fsma.be/fr/news/abc")).toBe("actualite");
  });
});
