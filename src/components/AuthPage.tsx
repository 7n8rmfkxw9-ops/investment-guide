import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else setInfo("Compte créé. Vérifiez votre e-mail si la confirmation est activée.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg shadow p-6 w-full max-w-sm space-y-4"
      >
        <h1 className="text-lg font-semibold">Veille investissement</h1>
        <p className="text-xs text-slate-500">
          Outil personnel — usage strictement individuel.
        </p>
        <input
          type="email"
          required
          placeholder="E-mail"
          className="w-full border rounded px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Mot de passe"
          className="w-full border rounded px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition shadow-sm"
        >
          {mode === "signin" ? "Se connecter" : "Créer un compte"}
        </button>
        <button
          type="button"
          className="w-full text-xs text-slate-500 hover:text-slate-800"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin"
            ? "Pas de compte ? En créer un"
            : "Déjà un compte ? Se connecter"}
        </button>
      </form>
    </div>
  );
}
