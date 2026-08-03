/**
 * Ces fonctions decident quelle piste est affichee, a quelle societe elle
 * est attribuee, et si un mouvement est assez significatif pour etre
 * signale. Chaque cas de test ci-dessous correspond a un comportement reel
 * verifie contre des donnees reelles pendant le developpement de l'outil —
 * plusieurs correspondent a des bugs qui se sont vraiment produits.
 */

import { describe, expect, it } from "vitest";
import {
  accessionNoDash,
  champ,
  classifierMouvement13F,
  classifierNatureFsma,
  decoderCsv,
  estAutreEmetteur,
  evaluerLigneFi,
  extraireLigneFsma,
  filingHumanUrl,
  filingIndexUrl,
  formatUsd,
  ligneCsv,
  normaliserNom,
  normalizeIssuerName,
  padCik,
  parseBeNumber,
  stripTags,
} from "./parsing";

describe("padCik", () => {
  it("complete a 10 chiffres avec des zeros en tete", () => {
    expect(padCik("1067983")).toBe("0001067983");
  });
  it("retire les caracteres non numeriques", () => {
    expect(padCik("CIK0001067983")).toBe("0001067983");
  });
});

describe("accessionNoDash / filingIndexUrl / filingHumanUrl", () => {
  it("retire les tirets d'un numero d'accession", () => {
    expect(accessionNoDash("0001193125-26-324312")).toBe("000119312526324312");
  });

  it("construit l'URL d'index sans zeros de tete sur le CIK", () => {
    expect(filingIndexUrl("0001067983", "0001193125-26-324312")).toBe(
      "https://www.sec.gov/Archives/edgar/data/1067983/000119312526324312",
    );
  });

  it("construit l'URL humaine avec le numero d'accession original", () => {
    expect(filingHumanUrl("1067983", "0001193125-26-324312")).toBe(
      "https://www.sec.gov/Archives/edgar/data/1067983/000119312526324312/0001193125-26-324312-index.htm",
    );
  });
});

describe("normalizeIssuerName", () => {
  it("retire les formes juridiques courantes pour rapprocher deux noms", () => {
    expect(normalizeIssuerName("Apple Inc.")).toBe(normalizeIssuerName("APPLE INC"));
    expect(normalizeIssuerName("Coca-Cola Co")).toBe("COCA COLA");
  });
});

describe("formatUsd", () => {
  it("abrege en Md$ au-dela du milliard", () => {
    expect(formatUsd(1_200_000_000)).toBe("1,2 Md$");
  });
  it("abrege en M$ au-dela du million", () => {
    // toLocaleString("fr-FR") separe les milliers par une espace insecable
    // fine (U+202F), pas une espace ordinaire.
    expect(formatUsd(586_000)).toBe("586 000 $");
    expect(formatUsd(45_600_000)).toBe("45,6 M$");
  });
});

describe("estAutreEmetteur", () => {
  it("reconnait un filing sur la bonne societe", () => {
    expect(estAutreEmetteur("0000070858", "70858")).toBe(false);
  });

  it("detecte un filing sur une AUTRE societe : le cas Nuveen/Bank of America", () => {
    // Le flux Form 4 de Bank of America (CIK 70858) contenait un filing dont
    // l'emetteur declare dans le document etait en realite un fonds Nuveen
    // (CIK different) : sans cette verification, la vente aurait ete
    // affichee comme une operation d'initie sur BAC.
    expect(estAutreEmetteur("0000225030", "0000070858")).toBe(true);
  });

  it("ne bloque rien si le CIK du document est absent", () => {
    expect(estAutreEmetteur("", "0000070858")).toBe(false);
  });
});

describe("classifierMouvement13F", () => {
  it("signale une nouvelle position quand rien n'existait avant", () => {
    expect(classifierMouvement13F(null, 1000)).toEqual({ signal: "13f_new", deltaPct: null });
  });

  it("signale un renforcement au-dela de +10 %", () => {
    const r = classifierMouvement13F(1000, 1200);
    expect(r?.signal).toBe("13f_increase");
    expect(r?.deltaPct).toBeCloseTo(20, 6);
  });

  it("signale un allegement au-dela de -10 %", () => {
    const r = classifierMouvement13F(1000, 800);
    expect(r?.signal).toBe("13f_decrease");
    expect(r?.deltaPct).toBeCloseTo(-20, 6);
  });

  it("ne signale rien dans la zone de bruit entre -10 % et +10 %", () => {
    expect(classifierMouvement13F(1000, 1050)).toBeNull();
    expect(classifierMouvement13F(1000, 950)).toBeNull();
  });

  it("ne signale rien pile aux seuils de 10 %", () => {
    expect(classifierMouvement13F(1000, 1100)).toBeNull();
    expect(classifierMouvement13F(1000, 900)).toBeNull();
  });
});

describe("stripTags", () => {
  it("retire les balises et decode les entites HTML courantes", () => {
    expect(stripTags("<td>UCB&nbsp;SA</td>")).toBe("UCB SA");
    expect(stripTags("<p>Jean-Fran&#039;s &amp; Co</p>")).toBe("Jean-Fran's & Co");
  });
});

describe("parseBeNumber", () => {
  it("convertit un nombre au format belge (point = millier, virgule = decimale)", () => {
    expect(parseBeNumber("517.809,50")).toBeCloseTo(517809.5, 6);
  });
  it("renvoie 0 pour une valeur non numerique plutot que NaN", () => {
    expect(parseBeNumber("")).toBe(0);
    expect(parseBeNumber("n/a")).toBe(0);
  });
});

describe("champ", () => {
  it("essaie plusieurs cles et renvoie la premiere trouvee", () => {
    expect(champ({ "Prix": "12,5" }, "Transaction Price", "Prix")).toBe("12,5");
  });
  it("renvoie une chaine vide si aucune cle ne correspond", () => {
    expect(champ({}, "Prix", "Transaction Price")).toBe("");
  });
});

describe("extraireLigneFsma", () => {
  it("reconnait un lien parlant (page en anglais)", () => {
    const tr =
      '<tr><td>21/07/2026</td><td>Barco NV</td><td>Jan Decock</td>' +
      '<a href="/en/manager-transaction/barco-66">détail</a></tr>';
    expect(extraireLigneFsma(tr)).toEqual({
      path: "/en/manager-transaction/barco-66",
      publishedAt: "21/07/2026",
      issuer: "Barco NV",
      person: "Jan Decock",
    });
  });

  it("reconnait un lien par identifiant de noeud (page en français) — la forme qui avait cassé l'extraction", () => {
    const tr =
      '<tr><td>21/07/2026</td><td>UCB SA</td><td>Jean-Christophe Tellier</td>' +
      '<a href="/fr/node/619576">détail</a></tr>';
    const r = extraireLigneFsma(tr);
    expect(r?.path).toBe("/fr/node/619576");
    expect(r?.issuer).toBe("UCB SA");
  });

  it("ignore une ligne sans lien de detail ou avec trop peu de cellules", () => {
    expect(extraireLigneFsma("<tr><td>21/07/2026</td></tr>")).toBeNull();
    expect(extraireLigneFsma("<tr><td>a</td><td>b</td><td>c</td></tr>")).toBeNull();
  });
});

describe("classifierNatureFsma", () => {
  it("reconnait un achat en français et en anglais", () => {
    expect(classifierNatureFsma("Acquisition")).toBe("achat");
    expect(classifierNatureFsma("Achat")).toBe("achat");
    expect(classifierNatureFsma("Purchase")).toBe("achat");
  });
  it("reconnait une vente en français et en anglais", () => {
    expect(classifierNatureFsma("Cession")).toBe("vente");
    expect(classifierNatureFsma("Disposal")).toBe("vente");
  });
  it("classe une donation ou un exercice d'options comme autre", () => {
    expect(classifierNatureFsma("Donation")).toBe("autre");
    expect(classifierNatureFsma("Exercice d'options")).toBe("autre");
  });
});

describe("normaliserNom (Suede)", () => {
  it("egalise malgre la forme juridique et la casse", () => {
    expect(normaliserNom("Volvo, AB")).toBe(normaliserNom("VOLVO AB"));
    expect(normaliserNom("Swedish Orphan Biovitrum AB (publ)")).not.toContain("PUBL");
  });
});

describe("ligneCsv", () => {
  it("decoupe une ligne simple par point-virgule", () => {
    expect(ligneCsv("a;b;c")).toEqual(["a", "b", "c"]);
  });
  it("ignore les points-virgules a l'interieur de guillemets, et retire les guillemets englobants", () => {
    expect(ligneCsv('a;"b;c";d')).toEqual(["a", "b;c", "d"]);
  });
  it("gere les guillemets doubles echappes en un seul guillemet litteral", () => {
    expect(ligneCsv('a;"il dit ""bonjour""";c')).toEqual(["a", 'il dit "bonjour"', "c"]);
  });
});

describe("decoderCsv", () => {
  function encoderUtf16(texte: string, avecBom: boolean, be = false): ArrayBuffer {
    const codes = [...texte].map((c) => c.charCodeAt(0));
    const octets: number[] = [];
    if (avecBom) octets.push(...(be ? [0xfe, 0xff] : [0xff, 0xfe]));
    for (const code of codes) {
      const paire = [code & 0xff, (code >> 8) & 0xff];
      octets.push(...(be ? paire.reverse() : paire));
    }
    return new Uint8Array(octets).buffer;
  }

  it("decode l'UTF-16LE avec BOM", () => {
    expect(decoderCsv(encoderUtf16("Issuer;Nature", true))).toBe("Issuer;Nature");
  });

  it("decode l'UTF-16BE avec BOM", () => {
    expect(decoderCsv(encoderUtf16("Issuer;Nature", true, true))).toBe("Issuer;Nature");
  });

  it("detecte l'UTF-16LE meme SANS BOM — le cas reel du registre suedois", () => {
    expect(decoderCsv(encoderUtf16("Issuer;Nature;Volume;Price", false))).toBe(
      "Issuer;Nature;Volume;Price",
    );
  });

  it("decode l'UTF-8 ordinaire quand il n'y a pas d'octets nuls", () => {
    const utf8 = new TextEncoder().encode("Issuer;Nature").buffer;
    expect(decoderCsv(utf8)).toBe("Issuer;Nature");
  });
});

describe("evaluerLigneFi", () => {
  const base = { nature: "Acquisition", statut: "", option: "", unite: "Quantity" };

  it("reconnait un achat ferme", () => {
    expect(evaluerLigneFi(base)).toBe("achat");
  });

  it("reconnait une vente ferme", () => {
    expect(evaluerLigneFi({ ...base, nature: "Disposal" })).toBe("vente");
  });

  it("ecarte une levee de stock-options meme classee comme acquisition — le cas Sobi", () => {
    // Une ligne a 235,15 SEK alors que le cours tournait autour de 457 SEK :
    // une levee d'options a prix fixe, pas un achat de conviction.
    expect(evaluerLigneFi({ ...base, option: "Yes" })).toBeNull();
  });

  it("ecarte une ligne annulee ou corrigee", () => {
    expect(evaluerLigneFi({ ...base, statut: "Cancelled" })).toBeNull();
  });

  it("ecarte un volume qui n'est pas exprime en nombre de titres", () => {
    expect(evaluerLigneFi({ ...base, unite: "Nominal amount" })).toBeNull();
  });

  it("ecarte une nature qui n'est ni acquisition ni disposal", () => {
    expect(evaluerLigneFi({ ...base, nature: "Correction" })).toBeNull();
  });
});
