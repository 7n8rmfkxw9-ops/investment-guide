/**
 * Application des migrations via l'API de gestion Supabase.
 *
 * Pourquoi pas `supabase db push` : la CLI se connecte directement a Postgres
 * et exige donc le mot de passe de la base, un secret de plus a deposer. L'API
 * de gestion — celle qu'utilise l'editeur SQL du tableau de bord — accepte le
 * jeton de compte que le depot possede deja.
 *
 * Deux modes :
 *
 *   node scripts/appliquer-migrations.mjs inspecter
 *       Lecture seule. Dit ce qui existe deja et ce qui a ete applique.
 *
 *   node scripts/appliquer-migrations.mjs appliquer <fichier.sql> [...]
 *       Applique les fichiers donnes, dans l'ordre, puis inscrit leur version
 *       dans l'historique pour qu'un futur `supabase db push` ne les rejoue pas.
 *
 * Variables attendues : SUPABASE_ACCESS_TOKEN, PROJECT_REF.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

// Le controle des variables vit dans le point d'entree, pas au chargement du
// module : `decouper` doit rester importable par les tests, qui n'ont aucune
// raison d'avoir un jeton.
function config() {
  const jeton = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.PROJECT_REF;
  if (!jeton || !ref) {
    console.error("SUPABASE_ACCESS_TOKEN et PROJECT_REF sont requis.");
    process.exit(1);
  }
  return { jeton, ref };
}

async function executer(sql) {
  const { jeton, ref } = config();
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${jeton}` },
    body: JSON.stringify({ query: sql }),
  });
  const texte = await r.text();
  if (!r.ok) {
    const e = new Error(`${r.status} — ${texte.slice(0, 600)}`);
    e.statut = r.status;
    throw e;
  }
  try {
    return JSON.parse(texte);
  } catch {
    return texte;
  }
}

/**
 * Decoupe un fichier SQL en instructions.
 *
 * Un simple `split(";")` serait faux ici pour deux raisons, et les deux sont
 * presentes dans ces fichiers :
 *
 *   - le texte des cours est en francais et contient des points-virgules a
 *     l'interieur des chaines (« il peut etre place, prete, investi ; le
 *     second ne le peut pas encore ») ;
 *   - les fonctions PL/pgSQL sont delimitees par $$ et leur corps en contient
 *     a chaque ligne.
 *
 * On suit donc l'etat : chaine simple (avec '' comme echappement), commentaire
 * de ligne, commentaire de bloc, et guillemet-dollar avec son etiquette.
 */
export function decouper(sql) {
  const out = [];
  let debut = 0;
  let i = 0;
  let dansChaine = false;
  let dansLigne = false;
  let dansBloc = false;
  let etiquette = null; // $$ ou $nom$

  while (i < sql.length) {
    const c = sql[i];
    const d = sql[i + 1];

    if (dansLigne) {
      if (c === "\n") dansLigne = false;
      i += 1;
      continue;
    }
    if (dansBloc) {
      if (c === "*" && d === "/") {
        dansBloc = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (etiquette) {
      if (sql.startsWith(etiquette, i)) {
        i += etiquette.length;
        etiquette = null;
        continue;
      }
      i += 1;
      continue;
    }
    if (dansChaine) {
      // '' a l'interieur d'une chaine est un guillemet echappe, pas une fin.
      if (c === "'" && d === "'") {
        i += 2;
        continue;
      }
      if (c === "'") dansChaine = false;
      i += 1;
      continue;
    }

    if (c === "-" && d === "-") {
      dansLigne = true;
      i += 2;
      continue;
    }
    if (c === "/" && d === "*") {
      dansBloc = true;
      i += 2;
      continue;
    }
    if (c === "'") {
      dansChaine = true;
      i += 1;
      continue;
    }
    if (c === "$") {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (m) {
        etiquette = m[0];
        i += m[0].length;
        continue;
      }
    }
    if (c === ";") {
      const instruction = sql.slice(debut, i + 1).trim();
      if (instruction.length > 1) out.push(instruction);
      debut = i + 1;
      i += 1;
      continue;
    }
    i += 1;
  }

  const reste = sql.slice(debut).trim();
  if (reste.length > 0 && !/^(--|\/\*)/.test(reste)) out.push(reste);
  return out;
}

/** Regroupe des instructions en lots sous une taille donnee. */
function lots(instructions, tailleMax) {
  const out = [];
  let courant = [];
  let taille = 0;
  for (const s of instructions) {
    if (courant.length > 0 && taille + s.length > tailleMax) {
      out.push(courant);
      courant = [];
      taille = 0;
    }
    courant.push(s);
    taille += s.length + 1;
  }
  if (courant.length > 0) out.push(courant);
  return out;
}

// ---------------------------------------------------------------------------

async function inspecter() {
  const tables = await executer(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name;",
  );
  console.log("Tables publiques :");
  for (const t of tables) console.log(`  ${t.table_name}`);

  let histo;
  try {
    histo = await executer(
      "select version from supabase_migrations.schema_migrations order by version;",
    );
  } catch (e) {
    console.log(`\nHistorique de migrations : absent (${e.message.slice(0, 120)})`);
    return;
  }
  console.log(`\nHistorique de migrations (${histo.length}) :`);
  for (const h of histo) console.log(`  ${h.version}`);
}

async function appliquer(fichiers) {
  for (const f of fichiers) {
    const sql = readFileSync(f, "utf8");
    const version = basename(f).split("_")[0];
    const instructions = decouper(sql);
    console.log(`\n${basename(f)} — ${instructions.length} instructions`);

    // Un envoi unique quand le fichier est petit ; sinon des lots, l'API
    // refusant les charges trop grosses. Chaque instruction reste entiere :
    // un bloc verifie et sa liaison voyagent ensemble, donc la contrainte
    // differee est satisfaite quel que soit le decoupage.
    const paquets = lots(instructions, 120_000);
    let n = 0;
    for (const [k, paquet] of paquets.entries()) {
      await executer(paquet.join("\n"));
      n += paquet.length;
      if (paquets.length > 1) {
        console.log(`  lot ${k + 1}/${paquets.length} — ${n}/${instructions.length}`);
      }
    }

    await executer(`
      create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (version text primary key);
      insert into supabase_migrations.schema_migrations (version) values ('${version}')
        on conflict (version) do nothing;
    `);
    console.log(`  appliquée, version ${version} inscrite à l'historique`);
  }
}

const [mode, ...reste] = process.argv.slice(2);
if (mode === undefined) {
  // Importe comme module (tests) : rien a faire.
} else if (mode === "inspecter") {
  await inspecter();
} else if (mode === "appliquer") {
  if (reste.length === 0) {
    console.error("Aucun fichier à appliquer.");
    process.exit(1);
  }
  await appliquer(reste);
} else {
  console.error("Usage : appliquer-migrations.mjs inspecter | appliquer <fichier.sql>...");
  process.exit(1);
}
