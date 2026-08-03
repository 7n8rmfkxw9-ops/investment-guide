// Logique pure de lecture et de classification, partagee par les trois
// fonctions de synchronisation (sync-edgar, sync-fsma, sync-fi).
//
// Regroupee ici a dessein : chaque bug reel trouve dans ce projet en testant
// manuellement contre des donnees reelles vivait dans une de ces fonctions
// (valeurs 13F mal a l'echelle, Form 4 mal attribue a la mauvaise societe,
// lien FSMA non reconnu selon la langue, encodage du CSV suedois, levees de
// stock-options presentees comme des achats). Aucune de ces fonctions ne
// fait d'entree/sortie reseau : elles ne dependent que de leurs arguments,
// ce qui permet de les verrouiller par des tests qui n'ont jamais besoin
// d'appeler un vrai site.

// ---------------------------------------------------------------------------
// SEC EDGAR

/** CIK sur 10 chiffres, tel qu'exige par les URL de l'API EDGAR. */
export function padCik(cik: string): string {
  return cik.replace(/\D/g, "").padStart(10, "0");
}

export function accessionNoDash(acc: string): string {
  return acc.replace(/-/g, "");
}

export function filingIndexUrl(cik: string, acc: string): string {
  const c = String(Number(cik.replace(/\D/g, "")));
  return `https://www.sec.gov/Archives/edgar/data/${c}/${accessionNoDash(acc)}`;
}

/** URL humaine vers la page d'index du filing (utilisee comme source_url). */
export function filingHumanUrl(cik: string, acc: string): string {
  return `${filingIndexUrl(cik, acc)}/${acc}-index.htm`;
}

/**
 * Normalise un nom d'entreprise pour le rapprocher du referentiel
 * company_tickers.json malgre les variations de forme juridique.
 */
export function normalizeIssuerName(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(
      /\b(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|HOLDINGS|HLDGS|GROUP|GRP|THE|CL|CLASS|A|B|C|COM|NEW|DEL|SHS|ADR|ADS)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Les 13F declarent les valeurs de position en dollars (et non en milliers
 * comme avant l'amendement SEC de 2023). On formate en Md$/M$ car les
 * montants bruts sont illisibles.
 */
export function formatUsd(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} Md$`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")} M$`;
  return `${v.toLocaleString("fr-FR")} $`;
}

/**
 * Un flux Form 4 d'une societe suivie contient aussi des depots ou elle
 * n'est que le declarant, pour des titres d'un AUTRE emetteur (une banque
 * declarant sa participation dans un fonds, par exemple). On se fie a
 * l'emetteur declare dans le document lui-meme, jamais a la societe qu'on
 * pensait suivre — c'est l'exacte cause du bug qui avait attribue une vente
 * Nuveen a Bank of America.
 */
export function estAutreEmetteur(rawDocIssuerCik: string, rawIssuerCik: string): boolean {
  const doc = rawDocIssuerCik.replace(/\D/g, "");
  if (!doc) return false;
  const ref = rawIssuerCik.replace(/\D/g, "");
  return Number(doc) !== Number(ref);
}

export interface Mouvement13F {
  signal: "13f_new" | "13f_increase" | "13f_decrease";
  deltaPct: number | null;
}

/**
 * Classe l'evolution d'une position 13F entre deux trimestres. Le seuil de
 * 10 % ecarte le bruit d'arrondi sans masquer un vrai renforcement ou
 * allegement. Ne couvre pas la sortie totale (prevShares present, currShares
 * absent) : ce cas se detecte structurellement — une ligne qui disparait du
 * portefeuille — et n'a pas besoin de comparaison de seuil.
 */
export function classifierMouvement13F(
  prevShares: number | null,
  currShares: number,
): Mouvement13F | null {
  if (prevShares == null) return { signal: "13f_new", deltaPct: null };
  if (currShares > prevShares * 1.1) {
    return { signal: "13f_increase", deltaPct: ((currShares - prevShares) / prevShares) * 100 };
  }
  if (currShares < prevShares * 0.9) {
    return { signal: "13f_decrease", deltaPct: ((currShares - prevShares) / prevShares) * 100 };
  }
  return null;
}

/**
 * Societe visee par un depot 13D/13G, lue dans l'en-tete SGML du depot.
 *
 * Le 13D/13G est depose par l'investisseur *au sujet d'une autre societe* :
 * contrairement au 13F et au Form 4, le document lui-meme est du HTML libre,
 * impossible a analyser de facon fiable. L'en-tete SGML, lui, est structure
 * et stable — c'est donc la seule source retenue. On y prend le nom, le CIK
 * et le secteur de la societe visee ; on ne tente PAS d'extraire le
 * pourcentage detenu, qui n'existe que dans le corps HTML : mieux vaut ne
 * rien afficher qu'un chiffre faux sur une participation.
 */
export interface CibleSchedule13 {
  nom: string;
  cik: string;
  secteur: string | null;
}

export function extraireCibleSchedule13(entete: string): CibleSchedule13 | null {
  // L'en-tete contient plusieurs blocs (SUBJECT COMPANY, FILED BY) : ne lire
  // que ce qui suit SUBJECT COMPANY, sinon on identifierait le declarant
  // lui-meme comme la societe visee.
  const texte = entete.replace(/<[^>]+>/g, "\n");
  const debut = texte.search(/SUBJECT COMPANY:/i);
  if (debut < 0) return null;
  const bloc = texte.slice(debut, debut + 1200);

  const nom = bloc.match(/COMPANY CONFORMED NAME:\s*(.+)/i)?.[1]?.trim();
  const cik = bloc.match(/CENTRAL INDEX KEY:\s*(\d+)/i)?.[1]?.trim();
  if (!nom || !cik) return null;

  const sicBrut = bloc.match(/STANDARD INDUSTRIAL CLASSIFICATION:\s*(.+)/i)?.[1]?.trim();
  const secteur = sicBrut
    // Retirer le code numerique entre crochets : "SERVICES [7990]" -> "SERVICES"
    ? sicBrut.replace(/\s*\[\d+\]\s*$/, "").replace(/&amp;/g, "&").trim() || null
    : null;

  return { nom, cik: String(Number(cik)), secteur };
}

/**
 * Distingue une prise de participation active d'une detention passive.
 *
 * 13D : l'investisseur declare vouloir peser sur la societe (siege au
 *       conseil, changement de strategie, cession…).
 * 13G : detention passive, sans intention d'influencer.
 *
 * La difference est le coeur du signal : confondre les deux reviendrait a
 * presenter un placement indiciel comme une offensive d'actionnaire.
 * Les amendements (« /A ») sont ecartes : ils modifient une declaration
 * existante, souvent pour un ajustement mineur, et generaient du bruit.
 */
export function classifierSchedule13(
  formulaire: string,
): "13d" | "13g" | null {
  const f = formulaire.toUpperCase().trim();
  if (/\/A$/.test(f)) return null;
  if (/^(SC|SCHEDULE)\s*13D$/.test(f)) return "13d";
  if (/^(SC|SCHEDULE)\s*13G$/.test(f)) return "13g";
  return null;
}

// ---------------------------------------------------------------------------
// FSMA (Belgique)

export function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Convertit un nombre au format belge ("517.809,50") en nombre. */
export function parseBeNumber(s: string): number {
  const clean = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export function champ(c: Record<string, string>, ...cles: string[]): string {
  for (const k of cles) if (c[k]) return c[k];
  return "";
}

export interface FsmaRow {
  path: string;
  publishedAt: string; // JJ/MM/AAAA
  issuer: string;
  person: string;
}

/**
 * Extrait une ligne du tableau public FSMA. Selon la langue de la page, le
 * lien de detail est soit une URL parlante (/en/manager-transaction/barco-66)
 * soit un identifiant de noeud (/fr/node/619576) — c'est precisement le
 * detail qui avait casse l'extraction la premiere fois : la version
 * francaise du site n'utilise que la seconde forme.
 */
export function extraireLigneFsma(tr: string): FsmaRow | null {
  const cells = (tr.match(/<td[\s\S]*?<\/td>/g) ?? []).map(stripTags);
  const link = tr.match(/href="(\/[a-z]{2}\/(?:manager-transaction\/[^"]+|node\/\d+))"/);
  if (cells.length < 3 || !link) return null;
  return { path: link[1], publishedAt: cells[0], issuer: cells[1], person: cells[2] };
}

/**
 * Classe le libelle FSMA de type de transaction. Seuls les achats et ventes
 * fermes ont un sens de marche : donations, transferts et exercices
 * d'options n'en ont pas et sont ecartes par l'appelant.
 */
export function classifierNatureFsma(nature: string): "achat" | "vente" | "autre" {
  if (/acquisition|achat|purchase|subscription|souscription/i.test(nature)) return "achat";
  if (/cession|vente|disposal|sale/i.test(nature)) return "vente";
  return "autre";
}

// ---------------------------------------------------------------------------
// Finansinspektionen (Suede)

/** Normalise un nom de societe pour comparer malgre les suffixes juridiques. */
export function normaliserNom(s: string): string {
  return s
    .toUpperCase()
    .replace(/\(PUBL\)/g, " ")
    .replace(/[^A-Z0-9ÅÄÖ ]/g, " ")
    .replace(/\b(AB|ASA|OYJ|PLC|SE|NV|SA|GROUP|HOLDING|HOLDINGS)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Decoupe une ligne CSV en respectant les guillemets. */
export function ligneCsv(ligne: string): string[] {
  const out: string[] = [];
  let cur = "";
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        dansGuillemets = !dansGuillemets;
      }
    } else if (c === ";" && !dansGuillemets) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/**
 * Le CSV de la FI est encode en UTF-16, mais sans marqueur d'encodage (BOM).
 * On detecte donc aussi le cas sans BOM : dans un texte latin encode en
 * UTF-16LE, un octet sur deux vaut zero.
 */
export function decoderCsv(buf: ArrayBuffer): string {
  const octets = new Uint8Array(buf);
  if (octets[0] === 0xff && octets[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buf);
  }
  if (octets[0] === 0xfe && octets[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buf);
  }
  const echantillon = Math.min(octets.length, 400);
  let zerosImpairs = 0;
  let zerosPairs = 0;
  for (let i = 0; i < echantillon; i++) {
    if (octets[i] === 0) (i % 2 === 1 ? zerosImpairs++ : zerosPairs++);
  }
  if (zerosImpairs > echantillon / 4) return new TextDecoder("utf-16le").decode(buf);
  if (zerosPairs > echantillon / 4) return new TextDecoder("utf-16be").decode(buf);
  return new TextDecoder("utf-8").decode(buf);
}

/**
 * Decide si une ligne du registre FI represente un achat, une vente, ou doit
 * etre ecartee. Regroupe les quatre filtres qui avaient laisse passer des
 * levees de stock-options presentees comme des achats de conviction : le
 * drapeau du registre a lui seul ne suffit pas (il est renseigne de facon
 * inegale), d'ou la verification supplementaire sur l'unite du volume.
 */
export function evaluerLigneFi(l: {
  nature: string;
  statut: string;
  option: string;
  unite: string;
}): "achat" | "vente" | null {
  const estAchat = /acquisition/i.test(l.nature);
  const estVente = /disposal/i.test(l.nature);
  if (!estAchat && !estVente) return null;
  // Lignes annulees ou corrigees : pas des operations reelles.
  if (/cancel|annull/i.test(l.statut)) return null;
  // Levee de stock-options : prix fixe d'avance, pas un choix d'investir au
  // cours du jour.
  if (/^yes$/i.test(l.option)) return null;
  // Volumes non exprimes en nombre de titres (montant nominal, par exemple) :
  // pas comparables a un cours par action.
  if (l.unite && !/quantity/i.test(l.unite)) return null;
  return estAchat ? "achat" : "vente";
}
