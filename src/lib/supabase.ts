import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null quand l'environnement n'est pas configuré : l'app bascule en mode démo. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
