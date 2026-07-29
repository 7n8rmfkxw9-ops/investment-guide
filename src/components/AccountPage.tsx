import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BOUTON_PRINCIPAL, CARTE } from "../lib/theme";

export default function AccountPage() {
  const [email, setEmail] = useState<string>("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (pw1.length < 8) {
      setErr("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy(false);
    if (error) {
      setErr(error.message);
    } else {
      setMsg("Mot de passe modifié. Il sera demandé à ta prochaine connexion.");
      setPw1("");
      setPw2("");
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <section className={`${CARTE} p-5 space-y-2`}>
        <h2 className="font-semibold">Compte</h2>
        <p className="text-sm text-slate-600">
          Connecté en tant que <span className="font-medium">{email}</span>
        </p>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Changer le mot de passe</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            placeholder="Nouveau mot de passe (8 caractères min.)"
            className="w-full border rounded px-3 py-2 text-sm"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            required
            placeholder="Confirmer le nouveau mot de passe"
            className="w-full border rounded px-3 py-2 text-sm"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button
            type="submit"
            disabled={busy}
            className={`${BOUTON_PRINCIPAL}`}
          >
            {busy ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </form>
      </section>
    </div>
  );
}
