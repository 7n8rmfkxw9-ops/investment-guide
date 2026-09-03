/**
 * Migration du cours : de `src/lib/cours.ts` vers la base.
 *
 * Migration a l'identique. Le script ne reecrit rien, n'enrichit rien,
 * n'ajoute aucun chapitre. Il transpose une structure TypeScript en lignes.
 *
 * La projection elle-meme vit dans `src/lib/projection.ts`, ou elle est
 * testee : `projection.test.ts` fait l'aller-retour complet et exige que les
 * 196 ecrans se reconstruisent a l'identique. Ce script ne fait que mettre en
 * SQL ce que cette projection produit — il ne decide de rien.
 *
 * Idempotent : chaque objet porte une cle stable (`temps`, `sharpe1991`) et
 * l'ecriture passe par un `on conflict ... do update`. Rejouer le script sur
 * une base deja peuplee la remet dans l'etat du fichier source, sans doublon.
 *
 * Deux usages :
 *
 *   npm run migrer:cours > seed.sql
 *   npm run migrer:cours -- --rapport
 *
 * Le premier produit le SQL a passer a `psql`. Le second n'ecrit rien et
 * affiche l'inventaire, dont la liste des blocs ambigus a trancher.
 *
 * Execute par `vite-node`, deja present via vitest : il resout les imports sans
 * extension exactement comme l'application, donc le script lit le meme graphe
 * de modules que ce que l'utilisateur voit a l'ecran.
 */

import { CHAPITRES, PARTIES } from "../src/lib/cours";
import { ETUDES, lienDoi } from "../src/lib/etudes";
import { lignesDuChapitre, lignesDuProgramme } from "../src/lib/projection";

// ---------------------------------------------------------------------------
// Echappement

function q(v: string | null | undefined): string {
  if (v === null || v === undefined) return "null";
  return `'${v.replace(/'/g, "''")}'`;
}

function j(v: unknown): string {
  return `${q(JSON.stringify(v))}::jsonb`;
}

// ---------------------------------------------------------------------------
// Blocs ambigus

/**
 * Blocs dont le niveau de preuve merite un arbitrage humain.
 *
 * Signale un bloc qui enonce une mesure — un pourcentage, un verbe de constat,
 * une periode d'observation — tout en etant classe `mecanique_standard`. Ce
 * n'est pas une erreur : le chapitre cite bien sa source plus loin, dans ses
 * blocs `etude`. C'est un endroit ou quelqu'un pourrait vouloir rattacher la
 * reference au paragraphe lui-meme, et ce quelqu'un ne peut pas etre le script.
 */
const INDICES_EMPIRIQUES =
  /\b(\d{1,3}(?:,\d+)?\s?%|selon l['’]étude|les auteurs|l['’]étude (?:de|montre)|mesuré|observé sur|sur la période|échantillon|données de \d{4})/i;

interface Ambigu {
  chapitre: string;
  position: number;
  type: string;
  extrait: string;
}

function blocsAmbigus(): Ambigu[] {
  const out: Ambigu[] = [];
  for (const c of CHAPITRES) {
    // Un chapitre arithmetique ne cite aucune etude : il n'y a rien a
    // rattacher, et le signaler serait du bruit.
    if (c.etudes.length === 0) continue;
    lignesDuChapitre(c).forEach((l, i) => {
      if (l.niveau !== "mecanique_standard") return;
      if (!INDICES_EMPIRIQUES.test(l.bodyMd)) return;
      out.push({
        chapitre: c.cle,
        position: i + 1,
        type: l.blockType,
        extrait: l.bodyMd.slice(0, 110).replace(/\s+/g, " "),
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Generation du SQL

function seed(): string {
  const l: string[] = [];
  l.push("-- Genere par scripts/migrer-cours.ts — ne pas editer a la main.");
  l.push("-- Rejouable : chaque objet est identifie par sa cle stable.");
  l.push("begin;");
  l.push("");

  l.push("-- Sources ------------------------------------------------------------");
  for (const e of Object.values(ETUDES)) {
    l.push(
      "insert into sources (key, title, authors, year, publisher, url, doi, finding, limitations) values (" +
        [
          q(e.cle),
          q(e.titre),
          q(e.auteurs),
          String(e.annee),
          q(e.publication),
          q(lienDoi(e.doi)),
          q(e.doi),
          q(e.resultat),
          q(e.limites),
        ].join(", ") +
        ")\n  on conflict (key) do update set title = excluded.title, authors = excluded.authors," +
        " year = excluded.year, publisher = excluded.publisher, url = excluded.url, doi = excluded.doi," +
        " finding = excluded.finding, limitations = excluded.limitations;",
    );
  }
  l.push("");

  l.push("-- Parties ------------------------------------------------------------");
  PARTIES.forEach((p, i) => {
    l.push(
      `insert into parts (key, title, subtitle, position) values (${q(p.cle)}, ${q(p.titre)}, ${q(p.sousTitre)}, ${i + 1})\n` +
        "  on conflict (key) do update set title = excluded.title, subtitle = excluded.subtitle, position = excluded.position;",
    );
  });
  l.push("");

  l.push("-- Chapitres ----------------------------------------------------------");
  for (const c of CHAPITRES) {
    l.push(
      "insert into chapters (part_id, key, number, title, question, minutes, icon, nature)\n" +
        `  select id, ${q(c.cle)}, ${c.numero}, ${q(c.titre)}, ${q(c.question)}, ${c.minutes}, ${q(c.icone)}, ${q(c.nature)}\n` +
        `  from parts where key = ${q(c.partie)}\n` +
        "  on conflict (key) do update set part_id = excluded.part_id, number = excluded.number," +
        " title = excluded.title, question = excluded.question, minutes = excluded.minutes," +
        " icon = excluded.icon, nature = excluded.nature;",
    );
  }
  l.push("");

  l.push("-- Blocs --------------------------------------------------------------");
  l.push("-- Les blocs d'un chapitre sont remplaces en bloc : leur position est leur");
  l.push("-- identite, et un bloc retire du fichier source doit disparaitre de la base.");
  l.push("-- La contrainte de source obligatoire etant differee, la suppression et la");
  l.push("-- reinsertion tiennent dans la meme transaction sans jamais laisser un bloc");
  l.push("-- verifie orphelin au moment du COMMIT.");
  l.push(
    `delete from content_blocks where chapter_id in (select id from chapters where key in (${CHAPITRES.map((c) => q(c.cle)).join(", ")}));`,
  );
  l.push("");

  for (const { chapitre, lignes } of lignesDuProgramme()) {
    const c = CHAPITRES.find((x) => x.cle === chapitre)!;
    l.push(`-- ${c.numero}. ${c.titre}`);
    lignes.forEach((b, i) => {
      const ref = `bloc_${chapitre}_${i + 1}`;
      l.push(
        `with ${ref} as (\n` +
          "  insert into content_blocks (chapter_id, block_type, payload, body_md, position, figure_ref, evidence_level)\n" +
          `  select id, ${q(b.blockType)}, ${j(b.payload)}, ${q(b.bodyMd)}, ${i + 1}, ${q(b.figureRef)}, ${q(b.niveau)}\n` +
          `  from chapters where key = ${q(chapitre)}\n` +
          "  returning id\n" +
          ")\n" +
          (b.sources.length > 0
            ? "insert into content_block_sources (content_block_id, source_id)\n" +
              `  select ${ref}.id, sources.id from ${ref}, sources where sources.key in (${b.sources.map(q).join(", ")});`
            : `select id from ${ref};`),
      );
    });
    l.push("");
  }

  l.push("commit;");
  l.push("");
  return l.join("\n");
}

// ---------------------------------------------------------------------------
// Rapport

function rapport(): string {
  const l: string[] = [];
  const toutes = lignesDuProgramme().flatMap((p) => p.lignes);
  const parType = new Map<string, number>();
  for (const b of toutes) parType.set(b.blockType, (parType.get(b.blockType) ?? 0) + 1);
  const verifies = toutes.filter((b) => b.niveau === "fait_verifie").length;

  l.push("Inventaire");
  l.push(`  parties          ${PARTIES.length}`);
  l.push(`  chapitres        ${CHAPITRES.length}`);
  l.push(`  blocs            ${toutes.length}`);
  l.push(`    fait_verifie   ${verifies}`);
  l.push(`    mecanique_std  ${toutes.length - verifies}`);
  l.push(`  sources          ${Object.keys(ETUDES).length}`);
  l.push(`  figures          ${toutes.filter((b) => b.figureRef !== null).length}`);
  l.push("");
  l.push("Blocs par type");
  for (const [t, n] of [...parType].sort((a, b) => b[1] - a[1])) {
    l.push(`  ${t.padEnd(12)} ${n}`);
  }

  const amb = blocsAmbigus();
  l.push("");
  l.push(`Blocs ambigus a trancher : ${amb.length}`);
  l.push("  Classes mecanique_standard, mais ils enoncent une mesure. Le chapitre");
  l.push("  cite bien sa source dans ses blocs `etude` ; la question est de savoir");
  l.push("  s'il faut rattacher la reference au paragraphe lui-meme. Le script ne");
  l.push("  tranche pas : il n'inventera pas quelle etude justifie quelle phrase.");
  l.push("");
  for (const a of amb) {
    l.push(`  ${a.chapitre} #${a.position} (${a.type})`);
    l.push(`    ${a.extrait}…`);
  }
  return l.join("\n");
}

// ---------------------------------------------------------------------------

process.stdout.write(process.argv.slice(2).includes("--rapport") ? `${rapport()}\n` : seed());
