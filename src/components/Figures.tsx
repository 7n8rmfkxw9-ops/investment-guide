/**
 * Figures des cours, en SVG dessine a la main.
 *
 * Aucune image distante ni bibliotheque de graphiques : une figure de cours
 * doit s'afficher hors ligne, peser quelques centaines d'octets, et rester
 * nette a n'importe quelle taille. Les courbes sont calculees a partir des
 * formules qu'elles illustrent — la courbe de capitalisation est reellement
 * (1 + r)ⁿ, pas une jolie parabole dessinee a vue.
 *
 * Accessibilite : chaque figure porte `role="img"` et un `aria-label` qui
 * decrit ce qu'elle montre. Un lecteur d'ecran doit apprendre la meme chose
 * que l'oeil, faute de quoi la figure est un trou dans le cours.
 */

const AXE = "#cbd5e1";
const INDIGO = "#4f46e5";
const AMBRE = "#d97706";
const ARDOISE = "#64748b";

function Cadre({
  label,
  children,
  hauteur = 200,
}: {
  label: string;
  children: React.ReactNode;
  hauteur?: number;
}) {
  return (
    <svg
      viewBox={`0 0 320 ${hauteur}`}
      className="w-full h-auto"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {children}
    </svg>
  );
}

/** Chemin d'une fonction echantillonnee sur [0, 1] puis mise a l'echelle. */
function chemin(
  f: (t: number) => number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  max: number,
  pas = 40,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= pas; i++) {
    const t = i / pas;
    const x = x0 + t * (x1 - x0);
    const y = y0 - (f(t) / max) * (y0 - y1);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function Axes({ yLabel, xLabel }: { yLabel: string; xLabel: string }) {
  return (
    <>
      <line x1="34" y1="12" x2="34" y2="160" stroke={AXE} strokeWidth="1.5" />
      <line x1="34" y1="160" x2="308" y2="160" stroke={AXE} strokeWidth="1.5" />
      <text x="4" y="18" fontSize="9" fill={ARDOISE}>
        {yLabel}
      </text>
      <text x="250" y="176" fontSize="9" fill={ARDOISE}>
        {xLabel}
      </text>
    </>
  );
}

/** Capitalisation : l'exponentielle contre la droite. */
function Croissance() {
  const r = 0.07;
  const ans = 30;
  const max = Math.pow(1 + r, ans);
  return (
    <Cadre label="Deux courbes partant de 100 € : une droite pour des intérêts simples, une courbe qui s'envole pour des intérêts composés. L'écart, presque nul les cinq premières années, devient considérable après vingt ans.">
      <Axes yLabel="capital" xLabel="années" />
      {[0, 10, 20, 30].map((a) => (
        <text key={a} x={34 + (a / ans) * 274 - 5} y="172" fontSize="9" fill={ARDOISE}>
          {a}
        </text>
      ))}
      <path
        d={chemin((t) => 1 + r * ans * t, 34, 308, 160, 12, max)}
        fill="none"
        stroke={ARDOISE}
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      <path
        d={chemin((t) => Math.pow(1 + r, ans * t), 34, 308, 160, 12, max)}
        fill="none"
        stroke={INDIGO}
        strokeWidth="2.5"
      />
      <text x="120" y="140" fontSize="10" fill={ARDOISE}>
        intérêts simples
      </text>
      <text x="150" y="52" fontSize="10" fill={INDIGO} fontWeight="600">
        intérêts composés
      </text>
    </Cadre>
  );
}

/** Distribution tres asymetrique des rendements d'actions. */
function Asymetrie() {
  const barres = [2, 9, 22, 34, 26, 16, 9, 5, 3, 2, 1.4, 1, 0.7, 0.5, 0.4, 0.3];
  const max = Math.max(...barres);
  const l = 274 / barres.length;
  return (
    <Cadre label="Histogramme très asymétrique : une masse de titres à rendement faible ou négatif à gauche, et une longue traîne d'exceptions à droite. La médiane est nettement à gauche de la moyenne.">
      <Axes yLabel="nombre de titres" xLabel="rendement" />
      {barres.map((h, i) => (
        <rect
          key={i}
          x={35 + i * l}
          y={160 - (h / max) * 140}
          width={l - 2}
          height={(h / max) * 140}
          fill={i < 4 ? "#a5b4fc" : INDIGO}
          opacity={i < 4 ? 0.85 : 0.9}
        />
      ))}
      <line x1={35 + 3.5 * l} y1="12" x2={35 + 3.5 * l} y2="160" stroke={ARDOISE} strokeWidth="1.5" strokeDasharray="3 3" />
      <text x={35 + 3.5 * l - 22} y="26" fontSize="9" fill={ARDOISE}>
        médiane
      </text>
      <line x1={35 + 6.5 * l} y1="12" x2={35 + 6.5 * l} y2="160" stroke={AMBRE} strokeWidth="1.5" />
      <text x={35 + 6.5 * l + 4} y="26" fontSize="9" fill={AMBRE} fontWeight="600">
        moyenne
      </text>
    </Cadre>
  );
}

/** Le risque total baisse avec le nombre de titres, jusqu'a un plancher. */
function RisqueDiversification() {
  const plancher = 0.42;
  const f = (t: number) => plancher + (1 - plancher) / (1 + 24 * t);
  return (
    <Cadre label="Courbe décroissante : le risque d'un portefeuille chute rapidement quand on passe de 1 à 20 titres, puis se stabilise sur un plancher qu'aucune diversification ne franchit — le risque de marché.">
      <Axes yLabel="risque" xLabel="nombre de titres" />
      <line x1="34" y1={160 - plancher * 148} x2="308" y2={160 - plancher * 148} stroke={AMBRE} strokeWidth="1.5" strokeDasharray="4 4" />
      <text x="180" y={160 - plancher * 148 - 6} fontSize="9" fill={AMBRE} fontWeight="600">
        risque systématique
      </text>
      <path d={chemin(f, 34, 308, 160, 12, 1)} fill="none" stroke={INDIGO} strokeWidth="2.5" />
      <text x="72" y="46" fontSize="9" fill={ARDOISE}>
        risque spécifique
      </text>
      <text x="72" y="58" fontSize="9" fill={ARDOISE}>
        (il disparaît)
      </text>
      {[1, 10, 20, 30].map((n, i) => (
        <text key={n} x={34 + (i / 3) * 274 - 4} y="172" fontSize="9" fill={ARDOISE}>
          {n}
        </text>
      ))}
    </Cadre>
  );
}

/** Frontiere efficiente : le rendement pour un risque donne. */
function Frontiere() {
  return (
    <Cadre label="Nuage de portefeuilles possibles, borné en haut à gauche par une courbe : la frontière efficiente. Les portefeuilles situés en dessous offrent moins de rendement pour le même risque.">
      <Axes yLabel="rendement" xLabel="risque" />
      {Array.from({ length: 46 }).map((_, i) => {
        const a = (i * 2.399) % 1;
        const b = ((i * 7.13) % 10) / 10;
        const x = 70 + a * 210;
        const y = 150 - (Math.sqrt(a) * 0.62 + 0.2 * b) * 120;
        return <circle key={i} cx={x} cy={y} r="2.6" fill="#c7d2fe" />;
      })}
      <path
        d={chemin((t) => 0.18 + Math.sqrt(t) * 0.78, 60, 300, 160, 12, 1)}
        fill="none"
        stroke={INDIGO}
        strokeWidth="2.5"
      />
      <text x="150" y="40" fontSize="10" fill={INDIGO} fontWeight="600">
        frontière efficiente
      </text>
      <text x="120" y="130" fontSize="9" fill={ARDOISE}>
        portefeuilles dominés
      </text>
    </Cadre>
  );
}

/** L'eventail des resultats se resserre avec l'horizon. */
function DispersionHorizon() {
  const haut = (t: number) => 0.55 + 0.42 * Math.exp(-2.6 * t);
  const bas = (t: number) => 0.55 - 0.5 * Math.exp(-2.2 * t);
  return (
    <Cadre label="Deux courbes qui partent très écartées et se rapprochent : l'éventail des rendements annualisés possibles se resserre à mesure que la durée de détention s'allonge, autour d'une médiane stable.">
      <Axes yLabel="rendement annualisé" xLabel="durée" />
      <path
        d={`${chemin(haut, 34, 308, 160, 12, 1)} ${chemin(bas, 308, 34, 160, 12, 1).replace("M", "L")} Z`}
        fill="#e0e7ff"
      />
      <path d={chemin(haut, 34, 308, 160, 12, 1)} fill="none" stroke={INDIGO} strokeWidth="1.8" />
      <path d={chemin(bas, 34, 308, 160, 12, 1)} fill="none" stroke={AMBRE} strokeWidth="1.8" />
      <line x1="34" y1={160 - 0.55 * 148} x2="308" y2={160 - 0.55 * 148} stroke={ARDOISE} strokeWidth="1.2" strokeDasharray="3 3" />
      <text x="238" y={160 - 0.55 * 148 - 5} fontSize="9" fill={ARDOISE}>
        médiane
      </text>
      <text x="40" y="30" fontSize="9" fill={INDIGO}>
        meilleur cas
      </text>
      <text x="40" y="152" fontSize="9" fill={AMBRE}>
        pire cas
      </text>
      {["1 an", "10 ans", "30 ans"].map((l, i) => (
        <text key={l} x={34 + (i / 2) * 250} y="172" fontSize="9" fill={ARDOISE}>
          {l}
        </text>
      ))}
    </Cadre>
  );
}

/** Les frais rognent une part croissante du capital final. */
function FraisTemps() {
  const brut = (t: number) => Math.pow(1.07, 30 * t);
  const net = (t: number) => Math.pow(1.055, 30 * t);
  const max = Math.pow(1.07, 30);
  return (
    <Cadre label="Deux courbes de capitalisation, l'une à 7 % l'autre à 5,5 %. L'écart entre les deux, presque invisible les premières années, représente près d'un tiers du capital au bout de trente ans.">
      <Axes yLabel="capital" xLabel="années" />
      <path
        d={`${chemin(brut, 34, 308, 160, 12, max)} ${chemin(net, 308, 34, 160, 12, max).replace("M", "L")} Z`}
        fill="#fee2e2"
      />
      <path d={chemin(brut, 34, 308, 160, 12, max)} fill="none" stroke={INDIGO} strokeWidth="2.5" />
      <path d={chemin(net, 34, 308, 160, 12, max)} fill="none" stroke={AMBRE} strokeWidth="2.5" />
      <text x="120" y="40" fontSize="10" fill={INDIGO} fontWeight="600">
        sans frais
      </text>
      <text x="150" y="96" fontSize="10" fill={AMBRE} fontWeight="600">
        avec 1,5 %/an
      </text>
      <text x="212" y="132" fontSize="9" fill="#b91c1c">
        ce que les frais
      </text>
      <text x="212" y="143" fontSize="9" fill="#b91c1c">
        ont pris
      </text>
    </Cadre>
  );
}

/** Chronologie d'une declaration : ce qui reste quand vous la lisez. */
function DelaiPublication() {
  return (
    <Cadre label="Frise chronologique : l'opération a lieu au jour zéro, la déclaration paraît deux jours plus tard pour un initié et quarante-cinq jours plus tard pour un portefeuille trimestriel. Le prix a déjà bougé entre-temps." hauteur={150}>
      <line x1="24" y1="70" x2="300" y2="70" stroke={AXE} strokeWidth="2" />
      {[
        { x: 30, l: "opération", s: "jour 0", c: INDIGO },
        { x: 110, l: "Form 4", s: "2 jours", c: INDIGO },
        { x: 250, l: "13F", s: "45 jours", c: AMBRE },
      ].map((p) => (
        <g key={p.l}>
          <circle cx={p.x} cy="70" r="5" fill={p.c} />
          <text x={p.x} y="56" fontSize="10" fill={p.c} fontWeight="600" textAnchor="middle">
            {p.l}
          </text>
          <text x={p.x} y="88" fontSize="9" fill={ARDOISE} textAnchor="middle">
            {p.s}
          </text>
        </g>
      ))}
      <rect x="30" y="104" width="220" height="18" rx="9" fill="#fee2e2" />
      <text x="140" y="117" fontSize="9" fill="#b91c1c" textAnchor="middle">
        le cours a déjà bougé pendant ce temps
      </text>
    </Cadre>
  );
}

/** Nominal contre reel : l'ecart creuse par l'inflation. */
function InflationReel() {
  const nom = (t: number) => Math.pow(1.07, 30 * t);
  const reel = (t: number) => Math.pow(1.07 / 1.02, 30 * t);
  const max = Math.pow(1.07, 30);
  return (
    <Cadre label="Deux courbes partant de 100 € : la valeur affichée atteint 761 € en trente ans, mais le pouvoir d'achat réel n'atteint que 420 €. Près de la moitié du gain n'existe qu'à l'écran.">
      <Axes yLabel="valeur de 100 €" xLabel="années" />
      <path d={chemin(nom, 34, 308, 160, 12, max)} fill="none" stroke={INDIGO} strokeWidth="2.5" />
      <path d={chemin(reel, 34, 308, 160, 12, max)} fill="none" stroke={AMBRE} strokeWidth="2.5" strokeDasharray="5 4" />
      <text x="196" y="34" fontSize="10" fill={INDIGO} fontWeight="600">
        761 € affichés
      </text>
      <text x="188" y="106" fontSize="10" fill={AMBRE} fontWeight="600">
        420 € réels
      </text>
    </Cadre>
  );
}

export const FIGURES: Record<string, () => JSX.Element> = {
  croissance: Croissance,
  asymetrie: Asymetrie,
  risqueDiversification: RisqueDiversification,
  frontiere: Frontiere,
  dispersionHorizon: DispersionHorizon,
  fraisTemps: FraisTemps,
  delaiPublication: DelaiPublication,
  inflationReel: InflationReel,
};

export type CleFigure = keyof typeof FIGURES;

export function Figure({ cle, legende }: { cle: string; legende: string }) {
  const F = FIGURES[cle];
  if (!F) return null;
  return (
    <figure className="my-4 rounded-2xl bg-slate-50 p-4">
      <F />
      <figcaption className="mt-2 text-sm text-slate-500 leading-relaxed">
        {legende}
      </figcaption>
    </figure>
  );
}
