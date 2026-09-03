import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { AppLink } from "../lib/types";
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, CHAMP, TITRE_SECTION } from "../lib/theme";
import { activer, desactiver, etatActuel, verifieCompatibilite } from "../lib/push";
import type { EtatAbonnement } from "../lib/push";
import { exporterDonnees } from "../lib/export";

function estIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

export default function AccountPage() {
  const [email, setEmail] = useState<string>("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [liens, setLiens] = useState<AppLink[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const [etatPush, setEtatPush] = useState<EtatAbonnement | "verification">("verification");
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const compat = verifieCompatibilite();

  const [exportBusy, setExportBusy] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    chargerLiens();
    if (compat.supporte) {
      etatActuel().then(setEtatPush);
    } else {
      setEtatPush("non-abonne");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chargerLiens() {
    const { data } = await supabase
      .from("app_links")
      .select("*")
      .order("created_at", { ascending: true });
    setLiens((data as AppLink[]) ?? []);
  }

  async function ajouterLien(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    let lienComplet = url.trim();
    if (!/^https?:\/\//i.test(lienComplet)) lienComplet = `https://${lienComplet}`;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("app_links")
      .insert({ user_id: u.user!.id, label: label.trim(), url: lienComplet });
    if (error) setErr(error.message);
    setLabel("");
    setUrl("");
    await chargerLiens();
  }

  async function retirerLien(id: string) {
    await supabase.from("app_links").delete().eq("id", id);
    await chargerLiens();
  }

  async function activerPush() {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const r = await activer();
      setEtatPush(r);
      setPushMsg(
        r === "abonne"
          ? "Notifications activées sur cet appareil."
          : "Autorisation refusée : les notifications restent désactivées.",
      );
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : String(e));
    }
    setPushBusy(false);
  }

  async function desactiverPush() {
    setPushBusy(true);
    await desactiver();
    setEtatPush("non-abonne");
    setPushMsg("Notifications désactivées sur cet appareil.");
    setPushBusy(false);
  }

  async function exporter() {
    setExportBusy(true);
    setExportErr(null);
    try {
      await exporterDonnees();
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : String(e));
    }
    setExportBusy(false);
  }

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
    <div className="space-y-6 max-w-xl">
      <section className={`${CARTE} p-5 space-y-2`}>
        <h2 className="font-semibold">Compte</h2>
        <p className="text-sm text-slate-600">
          Connecté en tant que <span className="font-medium">{email}</span>
        </p>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Vos données</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Cet outil vit entièrement dans un projet que vous seul maintenez :
          avoir votre propre copie de vos pistes, simulations, notes et
          réglages est une précaution simple. Le fichier téléchargé exclut
          volontairement les jetons de notification de vos appareils, qui
          n'ont pas leur place hors de cet outil.
        </p>
        {exportErr && <p className="text-sm text-red-600">{exportErr}</p>}
        <button className={BOUTON_DOUX} onClick={exporter} disabled={exportBusy}>
          {exportBusy ? "Préparation…" : "Exporter mes données (JSON)"}
        </button>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Mes applications</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Des raccourcis vers vos propres applications bancaires et
          d'investissement — celles que vous utilisez déjà. Chaque lien ouvre
          l'application ou le site dans un nouvel onglet ; cet outil ne s'y
          connecte jamais et ne voit ni compte ni solde.
        </p>
        <ul className="text-sm divide-y">
          {liens.map((l) => (
            <li key={l.id} className="py-2 flex justify-between items-center gap-3">
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-700 hover:underline truncate"
              >
                {l.label} ↗
              </a>
              <button
                className="text-xs text-red-600 hover:underline shrink-0"
                onClick={() => retirerLien(l.id)}
              >
                Retirer
              </button>
            </li>
          ))}
          {liens.length === 0 && (
            <li className="py-2 text-slate-500">Aucun raccourci ajouté.</li>
          )}
        </ul>
        <form onSubmit={ajouterLien} className="flex flex-wrap gap-2">
          <input
            className={`${CHAMP} flex-1 min-w-32`}
            placeholder="Nom (ex. KBC Mobile)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className={`${CHAMP} flex-1 min-w-40`}
            placeholder="Adresse (ex. mobile.kbc.be)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className={BOUTON_PRINCIPAL}>Ajouter</button>
        </form>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Installer sur l'écran d'accueil</h2>
        {estIOS() ? (
          <ol className="text-base text-slate-600 leading-relaxed list-decimal pl-5 space-y-1.5">
            <li>
              Ouvrez cette page dans <strong>Safari</strong> (pas un autre
              navigateur — seul Safari le permet sur iPhone/iPad).
            </li>
            <li>
              Touchez le bouton <strong>Partager</strong> (le carré avec une
              flèche vers le haut) dans la barre du bas.
            </li>
            <li>
              Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis
              confirmez.
            </li>
          </ol>
        ) : (
          <p className="text-base text-slate-600 leading-relaxed">
            Ouvrez cette page dans Safari sur votre iPhone ou iPad, touchez le
            bouton Partager, puis « Sur l'écran d'accueil ». Une icône
            apparaît, l'application s'ouvre alors en plein écran comme les
            autres.
          </p>
        )}
        <p className="text-xs text-slate-500">
          C'est la même page web, sans rien à installer depuis un magasin
          d'applications : aucune donnée supplémentaire n'est collectée.
        </p>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Notifications</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Un message est envoyé après chaque synchronisation hebdomadaire s'il
          y a du nouveau — un simple décompte factuel (« 3 nouvelles pistes »),
          jamais une incitation à agir dans l'urgence. Réglage par appareil :
          à répéter sur chaque iPhone ou iPad depuis lequel vous consultez
          l'outil, une fois l'app ajoutée à l'écran d'accueil.
        </p>
        {!compat.supporte && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
            {compat.raison}
          </p>
        )}
        {pushMsg && <p className="text-sm text-slate-600">{pushMsg}</p>}
        {compat.supporte && etatPush !== "verification" && (
          <button
            className={etatPush === "abonne" ? BOUTON_DOUX : BOUTON_PRINCIPAL}
            onClick={etatPush === "abonne" ? desactiverPush : activerPush}
            disabled={pushBusy}
          >
            {pushBusy
              ? "…"
              : etatPush === "abonne"
                ? "Désactiver sur cet appareil"
                : "Activer les notifications"}
          </button>
        )}
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Changer le mot de passe</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            placeholder="Nouveau mot de passe (8 caractères min.)"
            className={`${CHAMP} w-full`}
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            required
            placeholder="Confirmer le nouveau mot de passe"
            className={`${CHAMP} w-full`}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            autoComplete="new-password"
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button type="submit" disabled={busy} className={BOUTON_PRINCIPAL}>
            {busy ? "Modification…" : "Modifier le mot de passe"}
          </button>
        </form>
      </section>

      {/* Version affichee : une page gardee en cache par le navigateur est
          autrement indistinguable d'une publication qui n'aurait pas eu lieu.
          Comparer cette date a celle du dernier deploiement repond a la
          question en une seconde. */}
      <section className={`${CARTE} p-5 space-y-1`}>
        <h3 className={TITRE_SECTION}>Version</h3>
        <p className="text-sm text-slate-600">
          Application compilée le{" "}
          <span className="tabular-nums">
            {new Date(__DATE_BUILD__).toLocaleString("fr-BE")}
          </span>
          .
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Si cette date est plus ancienne que la dernière mise à jour annoncée,
          c'est une copie gardée par votre navigateur. Fermez complètement
          l'application et rouvrez-la : la page est désormais rechargée depuis
          le réseau à chaque ouverture, et la version en cache ne sert plus que
          hors connexion.
        </p>
      </section>
    </div>
  );
}
