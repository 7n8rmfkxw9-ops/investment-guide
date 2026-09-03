/**
 * Moteur de propositions.
 *
 * Trois etapes, dans cet ordre et jamais melangees :
 *
 *   1. lire l'etat personnel et les signaux ;
 *   2. evaluer les regles — TypeScript deterministe, teste, sans reseau ;
 *   3. deposer les brouillons dans la boite de validation.
 *
 * Une quatrieme etape, facultative et isolee, reformule les propositions en
 * francais clair via l'API Anthropic. Elle intervient APRES le calcul, ne peut
 * rien modifier de ce qui a ete calcule, et son echec est sans consequence.
 *
 * Ce que cette fonction ne fait jamais : agir. Approuver une proposition change
 * un statut, rien d'autre. Aucun ordre, aucun courrier, aucune resiliation.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifierAppelant } from "../_shared/auth.ts";
import { evaluerAssurances } from "../_shared/regles/assurances.ts";
import type { Brouillon, Contexte, Fait, Signal } from "../_shared/regles/types.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: entetes });
}

// ---------------------------------------------------------------------------
// Chargement du contexte

// deno-lint-ignore no-explicit-any
async function chargerContexte(db: any, userId: string): Promise<Contexte> {
  const [faits, signaux] = await Promise.all([
    db.from("personal_facts").select("key,value,unit,domain,verified_at,review_cadence_months")
      .eq("user_id", userId),
    db.from("signals").select("id,source_url,observed_at,summary,domain,payload")
      .eq("user_id", userId).order("observed_at", { ascending: false }).limit(500),
  ]);
  if (faits.error) throw faits.error;
  if (signaux.error) throw signaux.error;

  return {
    maintenant: new Date(),
    // deno-lint-ignore no-explicit-any
    faits: (faits.data ?? []).map((f: any): Fait => ({
      key: f.key,
      value: f.value,
      unit: f.unit,
      domain: f.domain,
      verifiedAt: f.verified_at,
      reviewCadenceMonths: f.review_cadence_months,
    })),
    // deno-lint-ignore no-explicit-any
    signaux: (signaux.data ?? []).map((s: any): Signal => ({
      id: s.id,
      sourceUrl: s.source_url,
      observedAt: s.observed_at,
      summary: s.summary,
      domain: s.domain,
      payload: s.payload ?? {},
    })),
  };
}

// ---------------------------------------------------------------------------
// Depot des brouillons

/**
 * Une proposition en attente et identique n'est pas redeposee.
 *
 * Sans cela, chaque execution empilerait la meme alerte : la boite de
 * validation deviendrait un flux, et un flux ne se valide pas, il se subit.
 * L'identite d'une proposition, c'est sa regle et son raisonnement — si le
 * raisonnement a change, c'est une nouvelle proposition.
 */
// deno-lint-ignore no-explicit-any
async function deposer(db: any, userId: string, b: Brouillon): Promise<string | null> {
  const regle = await db.from("rules").select("id,active,explains_content_block_id")
    .eq("key", b.regle).maybeSingle();
  if (regle.error) throw regle.error;
  if (!regle.data || !regle.data.active) return null;

  const existante = await db.from("proposals").select("id,rationale_md")
    .eq("user_id", userId).eq("rule_id", regle.data.id).eq("status", "pending").maybeSingle();
  if (existante.error) throw existante.error;
  if (existante.data?.rationale_md === b.rationaleMd) return null;

  // Le raisonnement a change : l'ancienne proposition en attente n'est plus
  // d'actualite. La perimer laisse une trace dans le journal, la supprimer
  // effacerait le fait qu'elle a existe.
  if (existante.data) {
    const p = await db.from("proposals").update({ status: "expired" }).eq("id", existante.data.id);
    if (p.error) throw p.error;
  }

  const insert = await db.from("proposals").insert({
    user_id: userId,
    rule_id: regle.data.id,
    // `trigger_type` n'est pas envoye : le declencheur `aligner_trigger_type`
    // le renseigne depuis la regle avant que la contrainte NOT NULL ne soit
    // verifiee. L'envoyer d'ici laisserait croire que l'appelant en decide.
    title: b.titre,
    payload: b.payload,
    rationale_md: b.rationaleMd,
    // Le raisonnement est une derivation deterministe sur les faits de
    // l'utilisateur et des signaux sources. Ce n'est pas une mesure publiee, et
    // ce n'est surtout pas une sortie de modele : `mecanique_standard` est le
    // seul niveau honnete pour une proposition.
    evidence_level: "mecanique_standard",
    source_urls: b.sourceUrls,
    expires_at: b.expiresAt,
    explains_content_block_id: regle.data.explains_content_block_id,
  }).select("id").single();
  if (insert.error) throw insert.error;
  return insert.data.id as string;
}

// ---------------------------------------------------------------------------
// Reformulation
//
// Le seul usage autorise d'un modele de langage dans cette application, et il
// est enferme ici : il recoit un raisonnement DEJA CALCULE et le reecrit en
// francais courant. Il ne produit aucun chiffre, aucune date, aucune regle.
//
// Sa sortie est stockee a part, marquee `sortie_modele`, et l'interface
// l'affiche comme telle. Si l'appel echoue, la proposition s'affiche avec son
// gabarit brut : le modele est un confort, jamais une dependance.

const CONSIGNE = [
  "Tu reformules en français simple un raisonnement déjà calculé, destiné à un particulier",
  "qui débute. Règles absolues :",
  "- ne change aucun chiffre, aucune date, aucun nom ;",
  "- n'ajoute aucune information, aucun conseil, aucune estimation ;",
  "- n'enlève aucun avertissement ni aucune mention de donnée manquante ;",
  "- ne dis jamais quoi acheter, vendre, souscrire ou résilier ;",
  "- reste sous 120 mots, en phrases courtes.",
  "Si le texte mentionne des informations manquantes, garde-les au premier plan.",
].join("\n");

async function reformuler(rationale: string): Promise<string | null> {
  if (!anthropicKey) return null;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system: CONSIGNE,
        messages: [{ role: "user", content: rationale }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const texte = data?.content?.[0]?.text;
    return typeof texte === "string" && texte.trim().length > 0 ? texte.trim() : null;
  } catch {
    // Panne, quota, delai depasse : la proposition reste lisible sans cela.
    return null;
  }
}

// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });

  const db = createClient(url, serviceKey);
  const verif = await verifierAppelant(req, db);
  if (!verif.ok) return reponse({ erreur: verif.message }, 401);

  let corps: { action?: string; userId?: string } = {};
  try {
    corps = await req.json();
  } catch {
    corps = {};
  }

  // Appel par le cron (cle de service) : l'utilisateur doit etre nomme.
  const userId = verif.userId ?? corps.userId;
  if (!userId) return reponse({ erreur: "utilisateur non identifié" }, 400);

  try {
    const ctx = await chargerContexte(db, userId);
    const brouillons = evaluerAssurances(ctx);

    const deposees: string[] = [];
    for (const b of brouillons) {
      const id = await deposer(db, userId, b);
      if (id) deposees.push(id);
    }

    // Reformulation apres coup, jamais dans le chemin de decision. Une panne
    // ici ne doit pas empecher les propositions d'exister.
    let reformulees = 0;
    for (const id of deposees) {
      const p = await db.from("proposals").select("rationale_md").eq("id", id).single();
      if (p.error || !p.data) continue;
      const clair = await reformuler(p.data.rationale_md as string);
      if (!clair) continue;
      const maj = await db.from("proposals")
        .update({ rationale_plain: clair, rationale_plain_evidence: "sortie_modele" })
        .eq("id", id);
      if (!maj.error) reformulees += 1;
    }

    return reponse({
      evaluees: brouillons.length,
      deposees: deposees.length,
      reformulees,
      modeleDisponible: Boolean(anthropicKey),
    });
  } catch (e) {
    return reponse({ erreur: String((e as Error).message ?? e) }, 500);
  }
});
