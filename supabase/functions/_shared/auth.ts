// Verification d'appelant, partagee par toutes les fonctions qui ne doivent
// etre declenchees que par le cron hebdomadaire (cle de role service) ou par
// l'utilisateur de l'application (JWT de session).
//
// `verify_jwt: false` est necessaire au niveau de la plateforme pour que le
// cron (qui envoie la cle de role service, pas un JWT de session utilisateur)
// puisse appeler ces fonctions. Mais cela laisse aussi n'importe qui appeler
// la fonction avec la seule cle anonyme — publique par nature, puisqu'elle
// est integree au code cote client — sans jamais s'etre authentifie. Cette
// verification ferme cet ecart : elle exige soit la cle de role service, soit
// un JWT qui correspond reellement a un compte utilisateur.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export type ResultatVerification =
  | { ok: true; userId: string | null }
  | { ok: false; message: string };

export async function verifierAppelant(
  req: Request,
  supabase: SupabaseClient,
): Promise<ResultatVerification> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, message: "authentification requise" };

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    // Appel du cron hebdomadaire : aucun utilisateur precis associe.
    return { ok: true, userId: null };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { ok: false, message: "authentification requise" };
  return { ok: true, userId: data.user.id };
}
