// Edge Function `journal` — actualites financieres.
//
// Ne sert plus que les flux d'actualite. La bibliotheque de lectures (fiches
// Wikifin, conseils, checklists) a ete deplacee cote frontend dans
// `src/lib/education.ts` : une liste fixe n'a aucune raison de couter un
// aller-retour reseau, et surtout le frontend se republie tout seul a chaque
// fusion alors que cette fonction demande un deploiement manuel — y laisser
// les liens revenait a retarder chaque ajout.
//
// Deux flux, tous deux publiquement publies par leur editeur :
//
//  - FSMA (regulateur belge) : actualites et, surtout, mises en garde contre
//    des acteurs non agrees. La lecture la plus protectrice qui soit.
//  - La finance pour tous (Institut pour l'education financiere du public,
//    France) : actualite economique et financiere generale. Tout n'y concerne
//    pas l'investissement et le cadre fiscal cite est francais — c'est dit a
//    l'utilisateur plutot que corrige par un filtre par mots-cles, qui
//    laisserait passer des hors-sujet tout en ecartant des articles utiles.
//
// Aucune synthese, aucun resume reecrit par un modele : on relaie le titre et
// le lien tels que publies. Rien ici ne recommande un placement.

import { createClient } from "npm:@supabase/supabase-js@2";
import { verifierAppelant } from "../_shared/auth.ts";
import { categorieFsma, parserFlux } from "../_shared/flux.ts";
import type { ArticleFlux } from "../_shared/flux.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA = "Mozilla/5.0 (compatible; veille-investissement personnelle)";
const FSMA_RSS = "https://www.fsma.be/fr/news-articles/rss.xml";

/** Flux secondaires, en plus de celui de la FSMA. */
const AUTRES_FLUX = [
  {
    cle: "lfpt",
    nom: "La finance pour tous",
    detail:
      "Institut pour l'éducation financière du public (France). Actualité économique et financière générale : tout n'y concerne pas l'investissement, et le cadre fiscal cité est français.",
    pays: "🇫🇷",
    accueil: "https://www.lafinancepourtous.com/",
    rss: "https://www.lafinancepourtous.com/feed/",
    limite: 15,
  },
];

async function lireFlux(url: string, limite: number): Promise<ArticleFlux[]> {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`flux indisponible (${r.status})`);
  return parserFlux(await r.text(), limite);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  // Reserve aux utilisateurs de l'application : sans cela, la seule cle
  // anonyme (publique par construction) suffirait a faire tourner ce proxy
  // vers les flux pour n'importe qui.
  const verif = await verifierAppelant(req, supabase);
  if (!verif.ok) return json({ erreur: verif.message }, 401);

  try {
    // Les flux sont lus en parallele et chacun porte son erreur : une source
    // en panne ne doit jamais vider la page des autres.
    const [resFsma, ...resAutres] = await Promise.all([
      lireFlux(FSMA_RSS, 30)
        .then((articles) => ({ articles, erreur: null as string | null }))
        .catch((e) => ({
          articles: [] as ArticleFlux[],
          erreur: e instanceof Error ? e.message : String(e),
        })),
      ...AUTRES_FLUX.map((f) =>
        lireFlux(f.rss, f.limite)
          .then((articles) => ({ ...f, articles, erreur: null as string | null }))
          .catch((e) => ({
            ...f,
            articles: [] as ArticleFlux[],
            erreur: e instanceof Error ? e.message : String(e),
          })),
      ),
    ]);

    return json({
      fsma: resFsma.articles.map((a) => ({ ...a, categorie: categorieFsma(a.lien) })),
      erreurFsma: resFsma.erreur,
      autres: resAutres.map(({ rss: _rss, limite: _limite, ...reste }) => reste),
    });
  } catch (e) {
    return json({ erreur: e instanceof Error ? e.message : String(e) }, 502);
  }
});
