/* ---------- the data ----------
   Shapes transcribed from src/data/nutrients.json as it actually is. Every
   nutrient carries all seven fields and every food all five; `alt` is the only
   genuinely optional key, on 41 of 131 foods.
   `notes` is optional because build.mjs and this file both read it as
   `data.notes || []`. The type describes what the code believes, not what
   today's data file happens to contain. */
type NutrientGroup = "macro" | "fats" | "amino" | "vitamin" | "mineral" | "plant";
type Unit = "kcal" | "g" | "mg" | "µg";

interface Nutrient {
  id: string; label: string; group: NutrientGroup;
  unit: Unit; dv: number | null; dp: number; why: string;
}
/* 35 of 66 nutrients have no daily value (sugars, water, most fatty acids,
   all amino acids, most carotenoids and flavonoids). Every read must decide
   what to do about that. */
interface Food {
  name: string; state: string; cat: string; colour: string;
  alt?: string; v: readonly (number | null)[];
}
interface Note {
  id: string; marker: string; short: string; text: string;
  cells: Record<string, string[]>;
}
interface Dataset { nutrients: Nutrient[]; foods: Food[]; notes?: Note[]; }

/* ---------- state ----------
   The literal unions are taken from loadPrefs(), which is the authority on
   what a stored preference is allowed to be. */
type Basis = "g" | "kcal";
type WeightUnit = "kg" | "stlb";
/* My day is a third view alongside the table and the chart. */
type View = "table" | "chart" | "day";

interface Sort { id: string; dir: 1 | -1; }
interface DayEntry { slug: string; g: number; }

/* `why` is optional because loadPrefs() builds custom lenses with a conditional
   spread that omits the key entirely when there is no text. */
interface Lens { id: string; name: string; ids: string[]; why?: string; }

interface State {
  groups: Set<NutrientGroup>;
  sort: Sort;
  q: string;
  cat: string;
  sel: number;
  favs: Set<string>;
  favsOnly: boolean;
  dv: boolean;
  basis: Basis;
  view: View;
  tab: string;
  chartNut: string;
  dark: boolean;
  lens: string;
  custom: Lens[];
  day: DayEntry[];
  kg: number;
  wUnit: WeightUnit;
}

/* One row of dayTotals(). `total` is null when nothing in the day list had a
   figure for this nutrient, and `partial` marks a sum that covers only some of
   the foods, which is why no consumer may treat it as a plain number. */
interface DayTotal {
  n: Nutrient;
  total: number | null;
  from: number;
  of: number;
  partial: boolean;
  notes: Note[];
}

/* Both are declared by build.mjs ahead of this file, inside the same script.
   They are not owned by this file and must not be redeclared here. */
declare const DATA: Dataset;
declare const I: Record<string, string>;

const NUTS = DATA.nutrients, FOODS = DATA.foods;
const GROUPS = [
  { id: "macro",   label: "Macronutrients", icon: I.macro },
  { id: "fats",    label: "Omega & fats",   icon: I.fats  },
  { id: "amino",   label: "Amino acids",    icon: I.amino },
  { id: "vitamin", label: "Vitamins",       icon: I.vit   },
  { id: "mineral", label: "Minerals",       icon: I.min   },
  { id: "plant",   label: "Plant compounds", icon: I.plant },
];
const IDX = new Map(NUTS.map((n, i) => [n.id, i]));
const CATS = [...new Set(FOODS.map(f => f.cat))].sort();

/* Stable per-food keys. Favourites are stored by slug, never by array index,
   so a reordered or extended food list cannot silently repoint someone's saved
   favourites at the wrong food. */
const slugify = f => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SLUGS = FOODS.map(slugify);
const BY_SLUG = new Map(SLUGS.map((s, i) => [s, i]));

/* Renaming a food changes its key, and anything stored under the old one is
   simply dropped on load: a favourite someone starred months ago vanishes with
   nothing to say it had gone. One line per rename carries them across, which is
   cheaper than the alternative of never renaming a food.
   Navy beans became Haricot beans, the name the rest of this table's British
   spellings would lead you to expect. */
const RENAMED = { "navy-beans-cooked": "haricot-beans-cooked" };
const currentSlug = s => RENAMED[s] || s;

/* ---------- per-cell notes ----------
   Some figures are true of the product but not of the food. Nutritional yeast
   is sold fortified, so its B vitamins are whatever the maker added and the
   unfortified flakes have almost none; the same goes for the B12, calcium and
   vitamin D in soy milk. That varies cell by cell rather than food by food,
   which is why the note is keyed on both: soy milk's protein is still soy
   milk's protein. Keyed by slug, so reordering the food list cannot repoint a
   note at the wrong row. */
const NOTES = DATA.notes || [];
const NOTE_AT = new Map();
for (const note of NOTES)
  for (const [slug, ids] of Object.entries(note.cells || {}))
    for (const id of ids) NOTE_AT.set(`${slug} ${id}`, note);
const noteFor = (i, id) => NOTE_AT.get(`${SLUGS[i]} ${id}`) || null;

/** The visible marker, plus the same thing said in words for screen readers,
 *  since a lone asterisk announces as punctuation or not at all. */
const noteMark = note =>
  `<sup class="fnote" aria-hidden="true">${esc(note.marker)}</sup>` +
  `<span class="sr">, ${esc(note.short)}</span>`;

/* ---------- highlight lenses ----------
   A lens is a named set of nutrients that cuts across the column groups.
   Only nutrients present in DATA are listed; anything unknown is dropped on load. */
const BUILTIN_LENSES = [
  { id: "eaa", name: "Essential amino acids", ids: ["his","ile","leu","lys","met","phe","thr","trp","val"],
    why: "The nine amino acids the body cannot make and must get from food. A protein is only as useful as its scarcest one, so the lowest of these caps the rest." },
  { id: "creatine", name: "Creatine precursors", ids: ["gly","arg","met"],
    why: "Creatine is not present in plant foods, so vegans synthesise it from these three amino acids. Body stores tend to run lower on a plant-based diet." },
  { id: "bcaa", name: "Branched-chain (BCAA)", ids: ["leu","ile","val"],
    why: "The three amino acids muscle burns directly rather than sending to the liver. Leucine is the one that triggers muscle protein synthesis." },
  { id: "sulphur", name: "Sulphur amino acids", ids: ["met","cys"],
    why: "Methionine and cysteine are scored as a pair because cysteine spares methionine. Pulses are usually short on both, which is what grains make up for." },
  { id: "aromatic", name: "Aromatic amino acids", ids: ["phe","tyr"],
    why: "Phenylalanine and tyrosine are scored as a pair, since the body makes tyrosine from phenylalanine. Both feed dopamine and thyroid hormone production." },
  { id: "iron", name: "Iron & absorption", ids: ["fe","vitc"],
    why: "Plant iron is non-haem and poorly absorbed on its own. Vitamin C in the same meal can multiply uptake severalfold, so the two columns are worth reading together." },
  { id: "bone", name: "Bone health", ids: ["ca","vitd","vitk","mg","p"],
    why: "Calcium is only half the story: vitamin D governs how much you absorb, vitamin K directs it into bone, and magnesium and phosphorus build the mineral itself." },
  { id: "methyl", name: "B12, folate & methylation", ids: ["b12","b9","b6","chol","met"],
    why: "The nutrients that keep homocysteine in check. B12 is the critical gap on a vegan diet, because unfortified plant foods are not a reliable source whatever these figures show." },
  { id: "omega", name: "Omega balance", ids: ["ala","la"],
    why: "The two fats the body cannot make. They compete for the same enzymes, so a diet heavy in omega-6 blunts conversion of omega-3 into the forms the body actually uses." },
  { id: "antiox", name: "Antioxidant vitamins", ids: ["vita","vitc","vite","se"],
    why: "Nutrients that limit oxidative damage, working in different compartments: vitamin C in water, vitamin E in fat, and selenium as part of the enzymes that recycle them." },
  { id: "electro", name: "Electrolytes", ids: ["na","k","mg","ca"],
    why: "The minerals governing fluid balance, nerve signalling and muscle contraction. Whole plant foods are naturally high in potassium and low in sodium, the opposite of most processed food." },
];

/* A day's list is stored as slug and grams, keyed the same way favourites are
   and for the same reason: the food list can be reordered or extended without
   silently repointing someone's entries at the wrong food. A quantity beyond
   this ceiling is a typo rather than a meal, and one extra zero would treble a
   day's totals without looking obviously wrong. */
const DAY_MAX_G = 5000;
const DEFAULT_G = 100;
const DEFAULT_KG = 70;

const S: State = {
  groups: new Set(["macro", "amino"]),
  sort: { id: "__name", dir: 1 },
  q: "", cat: "",
  sel: 0, favs: new Set(), favsOnly: false,
  dv: false, basis: "g", view: "table", tab: "overview",
  chartNut: "protein", dark: false,
  lens: "", custom: [],
  day: [], kg: DEFAULT_KG, wUnit: "kg",
};

/** Anything that is not a usable number becomes zero rather than reaching a
 *  total: one NaN in one quantity would turn all 66 totals into NaN. */
const clampG = g => {
  const n = Math.round(Number(g));
  return isFinite(n) && n > 0 ? Math.min(n, DAY_MAX_G) : 0;
};
/* Kept to one decimal rather than rounded to whole kilograms, because stones
   and pounds have to survive a round trip through it. 11 st 4 lb is 71.67 kg,
   and rounding that to 72 turns it back into 11 st 5 lb, so the pounds field
   would tick up by one the moment it lost focus. A tenth of a kilogram is a
   tenth of a pound, far too small to move a rounded pounds figure.
   Out of range clamps to the nearest end rather than snapping back to the
   default, so a half-typed number does not briefly read as 70. */
const clampKg = kg => {
  const n = Number(kg);
  if (!isFinite(n) || n <= 0) return DEFAULT_KG;
  return Math.round(Math.min(Math.max(n, 30), 250) * 10) / 10;
};

/* ---------- body weight units ----------
   S.kg stays the one canonical value, because the FAO requirements are
   published per kilogram and every figure derived from them reads it. Stones
   and pounds are a display and entry format laid over it, never a second
   source of truth to keep in sync. */
const LB_PER_KG = 2.2046226218, LB_PER_ST = 14;

const kgToStLb = kg => {
  const lb = Math.round(kg * LB_PER_KG);
  return { st: Math.floor(lb / LB_PER_ST), lb: lb % LB_PER_ST };
};
const stLbToKg = (st, lb) => (st * LB_PER_ST + lb) / LB_PER_KG;

/** The weight as the reader chose to see it, for the heading above the amino
 *  acid rows as well as for the fields. */
function weightLabel() {
  if (S.wUnit !== "stlb") return `${+S.kg.toFixed(1)} kg`;
  const { st, lb } = kgToStLb(S.kg);
  return `${st} st ${lb} lb`;
}

/* ---------- persistence ----------
   Every write is guarded: Safari private mode and disabled-storage settings
   throw on setItem, and a reference table must not break because of it. */
const LS_KEY = "vegan-nutrients:v1";
let storageOK = true;

function savePrefs() {
  if (!storageOK) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      favs: [...S.favs], groups: [...S.groups], sort: S.sort, dv: S.dv, basis: S.basis,
      dark: S.dark, lens: S.lens, custom: S.custom,
      favsOnly: S.favsOnly, cat: S.cat, chartNut: S.chartNut,
      day: S.day, kg: S.kg, wUnit: S.wUnit,
    }));
  } catch { storageOK = false; }
}

const lensById = id => id
  ? [...BUILTIN_LENSES, ...S.custom].find(l => l.id === id) || null
  : null;
const lensIds = () => new Set(lensById(S.lens)?.ids || []);

function loadPrefs() {
  let p;
  try { p = JSON.parse(localStorage.getItem(LS_KEY) || "null"); }
  catch { storageOK = false; return; }
  if (!p || typeof p !== "object") return;

  // Favourites: keep only slugs that still exist in the current dataset.
  if (Array.isArray(p.favs))
    S.favs = new Set(p.favs.map(currentSlug).filter(s => BY_SLUG.has(s)));

  if (Array.isArray(p.groups)) {
    const g = p.groups.filter(x => GROUPS.some(G => G.id === x));
    if (g.length) S.groups = new Set(g);
  }
  if (p.sort && (p.sort.id === "__name" || IDX.has(p.sort.id)))
    S.sort = { id: p.sort.id, dir: p.sort.dir === 1 ? 1 : -1 };
  if (typeof p.dv === "boolean") S.dv = p.dv;
  if (p.basis === "g" || p.basis === "kcal") S.basis = p.basis;
  if (typeof p.dark === "boolean") S.dark = p.dark;
  if (CATS.includes(p.cat)) S.cat = p.cat;
  if (IDX.has(p.chartNut)) S.chartNut = p.chartNut;

  // The day list, cleaned the same way favourites are: an entry naming a food
  // that no longer exists is dropped rather than left to render as a blank row,
  // and a quantity that arrives as text or out of range is clamped rather than
  // allowed to put a NaN into every total.
  if (Array.isArray(p.day)) {
    S.day = p.day
      .filter(e => e && e.slug)
      .map(e => ({ slug: currentSlug(e.slug), g: clampG(e.g) }))
      .filter(e => BY_SLUG.has(e.slug));
  }
  if (typeof p.kg === "number" && isFinite(p.kg)) S.kg = clampKg(p.kg);
  if (p.wUnit === "kg" || p.wUnit === "stlb") S.wUnit = p.wUnit;

  if (Array.isArray(p.custom)) {
    S.custom = p.custom
      .filter(l => l && typeof l.name === "string" && Array.isArray(l.ids))
      .map(l => ({ id: String(l.id || ""), name: l.name.slice(0, 40),
                   ids: l.ids.filter(x => IDX.has(x)),
                   ...(typeof l.why === "string" && l.why ? { why: l.why.slice(0, 240) } : {}) }))
      .filter(l => l.id && l.ids.length);
  }
  if (typeof p.lens === "string" && lensById(p.lens)) S.lens = p.lens;

  // Favourites-only with nothing starred would render an empty table on load.
  S.favsOnly = p.favsOnly === true && S.favs.size > 0;
}

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const say = m => { $("#live").textContent = m; };

/* ---------- data helpers ---------- */
const cols = () => NUTS.map((n, i) => ({ ...n, i })).filter(n => S.groups.has(n.group));
const val = (f, id) => f.v[IDX.get(id)];

/* ---------- the display basis ----------
   `val` is the stored figure per 100 g and must stay that way: dayTotals(),
   proteinQuality() and omegaRatio() all read it. A day's totals are grams of
   real food measured against real daily values, and the amino acid score and
   the omega ratio are ratios, which are the same on any basis. Rescaling reads
   at `val` would leave all three looking right and being wrong.

   So the basis lives here instead, and only the table, the detail panel, the
   sort comparator and the CSV read it. Per 100 kcal answers a question per
   100 g cannot -- leafy greens are nothing per 100 g and lead most columns per
   calorie -- but it is not the truer basis, only the opposite bias: it flatters
   watery foods exactly as much as per 100 g flatters dry ones. Which is why it
   is a toggle, and why gramsPer100kcal() is pinned beside every food name. */
const GRAMS_PER = 100;
const KCAL_BASIS = 100;

/** Grams of a food that make 100 kcal. Null if it has no energy figure, since
 *  the division below has nothing to divide by. */
function gramsPer100kcal(f) {
  const k = val(f, "kcal");
  return k ? KCAL_BASIS / k * GRAMS_PER : null;
}

/** How every figure on the page is currently qualified. One source, because the
 *  table caption, the column header, the detail panel and the CSV all say it
 *  and a page that says two different things is worse than one that says none. */
const basisLabel = () => S.basis === "kcal" ? "per 100 kcal" : "per 100 g";

/** The figure to display for a food and nutrient, on the basis now selected.
 *  Energy is exempt: energy per 100 kcal is 100 for every food, so the column
 *  would say nothing. The exemption is here rather than at the four call sites
 *  so the table, the sort order and the CSV cannot disagree about it. */
function shown(f, n) {
  const v = val(f, n.id);
  if (S.basis === "g" || n.id === "kcal" || v === null || v === undefined) return v;
  const k = val(f, "kcal");
  return k ? v / k * KCAL_BASIS : null;
}

/* The table gives every row a state line under its name, so "Bell pepper" three
   times over is unambiguous there. The chart has one line per bar and would
   show three identical labels, so a name shared by more than one food takes its
   state with it. Only the ambiguous ones, to keep the label column short. */
const NAME_COUNT = FOODS.reduce((m, f) => m.set(f.name, (m.get(f.name) || 0) + 1), new Map());
const fullName = f => NAME_COUNT.get(f.name) > 1 && f.state ? `${f.name}, ${f.state}` : f.name;

const isFav = i => S.favs.has(SLUGS[i]);
function toggleFav(i) {
  isFav(i) ? S.favs.delete(SLUGS[i]) : S.favs.add(SLUGS[i]);
  // Un-starring the last favourite while filtered to favourites would leave an
  // empty table with no obvious way back, so drop the filter with it.
  if (S.favsOnly && !S.favs.size) S.favsOnly = false;
  savePrefs();
}

/** Plain text, for aria-labels and anywhere markup would leak. "n/a" marks a
 *  nutrient nobody has published a figure for, which is not the same as zero. */
function fmtText(v, n) {
  if (v === null || v === undefined) return "n/a";
  if (S.dv && n.dv) return v === 0 ? "0%" : Math.round((v / n.dv) * 100) + "%";
  if (v === 0) return "0";
  return v.toFixed(n.dp);
}

/** Display form: same thing, with the "n/a" marked up so it can be greyed. */
function fmt(v, n) {
  return (v === null || v === undefined)
    ? '<span class="na">n/a</span>'
    : fmtText(v, n);
}

/* ---------- derived protein quality ----------
   Scores a food's essential amino acids against the FAO/WHO 2007 requirement
   pattern for adults, in mg per g of protein. Methionine is scored together
   with cysteine and phenylalanine together with tyrosine, because each pair
   spares the other, the same pairing the methodology note describes.
   The lowest-scoring entry is the limiting amino acid: the one that caps how
   much of the protein the body can actually use. */
const FAO_PATTERN = [
  { label: "Histidine",              ids: ["his"],        mg: 15 },
  { label: "Isoleucine",             ids: ["ile"],        mg: 30 },
  { label: "Leucine",                ids: ["leu"],        mg: 59 },
  { label: "Lysine",                 ids: ["lys"],        mg: 45 },
  { label: "Methionine + cysteine",  ids: ["met", "cys"], mg: 22 },
  { label: "Phenylalanine + tyrosine", ids: ["phe", "tyr"], mg: 38 },
  { label: "Threonine",              ids: ["thr"],        mg: 23 },
  { label: "Tryptophan",             ids: ["trp"],        mg: 6 },
  { label: "Valine",                 ids: ["val"],        mg: 39 },
];

function proteinQuality(f) {
  const protein = val(f, "protein");
  // Below about a gram per 100 g the ratios are dominated by rounding, and
  // calling something "a complete protein" on that basis would be misleading.
  if (!protein || protein < 1) return null;

  // An unmeasured amino acid is not a zero. Treating it as one would report a
  // score of 0% and name a limiting acid for a food nobody has ever assayed,
  // which is a fabricated conclusion rather than a missing one.
  if (FAO_PATTERN.some(p => p.ids.some(id => val(f, id) === null || val(f, id) === undefined)))
    return null;

  const scored = FAO_PATTERN.map(p => {
    const mgPerG = p.ids.reduce((s, id) => s + val(f, id), 0) * 1000 / protein;
    return { label: p.label, pc: (mgPerG / p.mg) * 100 };
  });
  if (scored.some(s => !isFinite(s.pc))) return null;

  const limiting = scored.reduce((a, b) => (b.pc < a.pc ? b : a));
  return {
    score: Math.round(limiting.pc),      // amino acid score = the limiting one
    limiting: limiting.label,
    perKcal: (val(f, "kcal") ?? 0) > 0 ? protein / val(f, "kcal") * 100 : null,
  };
}

/** Omega-6 to omega-3, the ratio dietary guidance actually talks about. */
function omegaRatio(f) {
  const la = val(f, "la"), ala = val(f, "ala");
  if (!la || !ala) return null;
  return la >= ala ? { a: la / ala, flip: false } : { a: ala / la, flip: true };
}

/* ---------- the day ----------
   Everything below reads `dayTotals()`, so the rule about partial sums is
   enforced in one place rather than in each of the things that display one. */

/** The day's entries, resolved to foods. An entry whose slug has left the
 *  dataset is dropped here as well as on load, so a stale one cannot survive
 *  a session in which prefs were never re-saved. */
const dayEntries = () => S.day
  .map(e => ({ ...e, i: BY_SLUG.get(e.slug) }))
  .filter(e => e.i !== undefined)
  .map(e => ({ ...e, f: FOODS[e.i] }));

/** Entries that actually contribute. A food listed at 0 g adds nothing to any
 *  total, so counting it in the coverage below would report a gap it does not
 *  cause. */
const dayContributors = () => dayEntries().filter(e => e.g > 0);

const dayGrams = () => dayContributors().reduce((s, e) => s + e.g, 0);

/**
 * Totals every nutrient across the day's list, per nutrient reporting:
 *   total    the sum, or null where no listed food has a figure at all
 *   from/of  how many contributing foods had a figure, out of how many there are
 *   partial  true when those two disagree
 *   notes    the per-cell notes behind the figures that went into the sum
 *
 * `partial` is the whole reason this returns an object rather than a number.
 * Summing whatever happens to be measured produces a total indistinguishable
 * from a complete one, which is exactly the failure the flavonoid columns were
 * built to refuse. Cysteine is missing for 19 of these foods and the flavonoid
 * columns for 90 or more, so a day of six foods will routinely produce sums
 * over three of them. Every consumer of this has to decide what to do about
 * that, and none of them may quietly ignore it.
 */
function dayTotals(): DayTotal[] {
  const list = dayContributors();
  return NUTS.map(n => {
    let total = 0, from = 0;
    const notes = new Set<Note>();
    for (const e of list) {
      const v = val(e.f, n.id);
      if (v === null || v === undefined) continue;
      from++;
      total += v * e.g / 100;                 // every figure in the table is per 100 g
      const note = noteFor(e.i, n.id);
      if (note) notes.add(note);
    }
    return { n, total: from ? total : null, from, of: list.length,
             partial: from > 0 && from < list.length, notes: [...notes] };
  });
}

const totalOf = (totals, id) => totals[IDX.get(id)];

/* ---------- amino acids across a day ----------
   FAO/WHO 2007 publishes adult requirements as milligrams per kilogram of body
   weight per day. FAO_PATTERN above is that same table divided by the 0.66 g/kg
   average protein requirement the pattern is built on, so multiplying back
   recovers it: lysine 45 x 0.66 = 29.7 against a published 30, leucine
   59 x 0.66 = 38.9 against 39, tryptophan 6 x 0.66 = 3.96 against 4. Deriving
   it here rather than typing out a second reference table means the day's
   targets and the per-food score cannot drift apart, which is the same reason
   the amino acid columns are computed from the protein column. */
const PROTEIN_G_PER_KG = 0.66;

/** Grams per day of each FAO entry for a given body weight. The pairs stay
 *  paired: methionine is spared by cysteine and phenylalanine by tyrosine, so
 *  scoring either alone would report a shortfall the body does not have. */
const aaTargets = kg => FAO_PATTERN.map(p => ({
  label: p.label, ids: p.ids, target: p.mg * PROTEIN_G_PER_KG * kg / 1000,
}));

/** Each FAO entry totalled across the day, against its requirement.
 *  Withheld entirely where any contributing food is missing any of the acids
 *  in that entry, since a sum that skips a food understates it. */
function dayAminoAcids(totals) {
  const list = dayContributors();
  if (!list.length) return [];
  return aaTargets(S.kg).map(t => {
    const measured = list.every(e => t.ids.every(id => {
      const v = val(e.f, id);
      return v !== null && v !== undefined;
    }));
    const got = measured
      ? t.ids.reduce((s, id) => s + (totalOf(totals, id).total ?? 0), 0)
      : null;
    return { ...t, got, pc: got === null ? null : got / t.target * 100 };
  });
}

/** The day's protein quality: its totals treated as one food and put through
 *  the same scorer every row in the table uses. This is the figure that answers
 *  "do I have to combine proteins at every meal", because a day of rice and
 *  lentils scores higher than either of them alone.
 *
 *  Withheld if any listed food has any amino acid gap. proteinQuality() already
 *  refuses to score a food with a missing acid, and a day is no different: the
 *  score is capped by the scarcest acid, and there is no knowing whether the
 *  unmeasured one was it. */
function dayProteinQuality(totals) {
  const list = dayContributors();
  if (!list.length) return null;
  const ids = FAO_PATTERN.flatMap(p => p.ids);
  const complete = list.every(e => ids.every(id => {
    const v = val(e.f, id);
    return v !== null && v !== undefined;
  }));
  if (!complete) return null;
  return proteinQuality({ v: totals.map(t => t.total) });
}

/* Nutrients whose daily value is a budget rather than a target. Coming in under
   one of these is not a shortfall and must never be listed as one: "short on
   saturated fat" is the opposite of advice. They get their own list when a day
   goes over instead, which is the direction that means something for them. */
const A_BUDGET = new Set(["kcal", "carbs", "fat", "satfat", "na"]);

/** Nutrients with a reference value, a complete total, and a percentage worth
 *  remarking on. Partial totals are excluded rather than reported: telling
 *  someone they are short of a nutrient a third of their list was never assayed
 *  for is a fabricated conclusion, not a missing one. */
function dayStanding(totals) {
  const scored = totals
    .filter(t => t.n.dv && t.total !== null && !t.partial)
    .map(t => ({ id: t.n.id, label: t.n.label, pc: t.total / t.n.dv * 100,
                 budget: A_BUDGET.has(t.n.id) }));
  const by = (a, b) => a.pc - b.pc;
  return {
    short: scored.filter(x => !x.budget && x.pc < 50).sort(by),
    over: scored.filter(x => !x.budget && x.pc >= 100).sort((a, b) => -by(a, b)),
    budget: scored.filter(x => x.budget && x.pc >= 100).sort((a, b) => -by(a, b)),
  };
}

function addToDay(slug, g = DEFAULT_G) {
  if (!BY_SLUG.has(slug)) return;
  // Adding a food already listed tops up its quantity rather than making a
  // second row that would have to be totalled and edited separately.
  const at = S.day.find(e => e.slug === slug);
  if (at) at.g = clampG(at.g + g);
  else S.day.push({ slug, g: clampG(g) });
  savePrefs();
}

function setDayGrams(slug, g) {
  const at = S.day.find(e => e.slug === slug);
  if (!at) return;
  at.g = clampG(g);
  savePrefs();
}

function removeFromDay(slug) {
  S.day = S.day.filter(e => e.slug !== slug);
  savePrefs();
}

function rows() {
  const q = S.q.trim().toLowerCase();
  let r = FOODS.map((f, i) => ({ f, i }));
  if (S.favsOnly) r = r.filter(x => isFav(x.i));
  if (S.cat) r = r.filter(x => x.f.cat === S.cat);
  if (q) r = r.filter(x =>
    (x.f.name + " " + (x.f.alt || "") + " " + x.f.state + " " + x.f.cat)
      .toLowerCase().includes(q));
  const { id, dir } = S.sort;
  r.sort((a, b) => {
    if (id === "__name") return dir * a.f.name.localeCompare(b.f.name);
    // Sorted on the shown figure, not the stored one: a column ordered by
    // something other than what it displays is a bug people report as one.
    const n = NUTS[IDX.get(id)];
    const x = shown(a.f, n), y = shown(b.f, n);
    if (x === y) return a.f.name.localeCompare(b.f.name);
    if (x === null) return 1;
    if (y === null) return -1;
    return dir * (x - y);
  });
  return r;
}

/* ---------- sidebar groups ----------
   The sidebar is the only place groups are toggled. There used to be a second
   row of pills doing the same job, which meant two controls to keep in sync
   and two places to look. */
function renderGroups() {
  const counts = {};
  NUTS.forEach(n => counts[n.group] = (counts[n.group] || 0) + 1);
  $("#groupNav").innerHTML = GROUPS.map(g => `
    <li><button class="navbtn" type="button" data-grp="${g.id}"
        aria-pressed="${S.groups.has(g.id)}">
      ${g.icon}<span>${g.label}</span>
      <span class="count">${counts[g.id]}</span><span class="dot"></span></button></li>`).join("");
}

/* ---------- sidebar categories ----------
   The same reasoning as the nutrient groups: one control, in one place. This
   used to be a select in the toolbar, which meant the two ways of narrowing the
   table lived in two different parts of the page. Counts come from the data, so
   a category cannot appear here with nothing in it. */
function renderCats() {
  const counts = {};
  FOODS.forEach(f => counts[f.cat] = (counts[f.cat] || 0) + 1);
  const items = [["", "All foods", FOODS.length],
                 ...CATS.map(c => [c, c, counts[c]])];
  $("#catNav").innerHTML = items.map(([id, label, n]) => `
    <li><button class="navbtn sub" type="button" data-cat="${esc(id)}"
        aria-pressed="${S.cat === id}">
      <span>${esc(label)}</span>
      <span class="count">${n}</span><span class="dot"></span></button></li>`).join("");
}

function setCat(cat) {
  // Clicking the category already showing is the way back to everything, so it
  // does not become a filter you can switch on but not off.
  S.cat = cat === S.cat ? "" : cat;
  renderCats();
  say(S.cat ? `Showing ${S.cat} only.` : "Showing all categories.");
  savePrefs();
  render();
}

function toggleGroup(id) {
  S.groups.has(id) ? S.groups.delete(id) : S.groups.add(id);
  // A table with no columns is not a view anyone asked for, so switching off the
  // last group falls back to macronutrients.
  const fellBack = !S.groups.size;
  if (fellBack) S.groups.add("macro");

  // Sync every button from the state rather than only the one just clicked: the
  // fallback switches a group back on that nobody pressed, and that button was
  // left reading "off" while its nine columns sat there in the table. Setting
  // the attribute rather than re-rendering keeps focus on the button.
  document.querySelectorAll("#groupNav [data-grp]").forEach(b =>
    b.setAttribute("aria-pressed", String(S.groups.has(b.dataset.grp))));

  const g = GROUPS.find(x => x.id === id);
  say(fellBack
    ? `The table needs at least one group, so macronutrients stay shown.`
    : `${g.label} ${S.groups.has(id) ? "shown" : "hidden"}. ${cols().length} nutrient columns visible.`);
  savePrefs();
  render();
}

/* ---------- highlight lens ---------- */
function renderLensSelect() {
  // title= gives the native option tooltip on hover; the same sentence is shown
  // in full under the toolbar once a lens is selected, since option tooltips
  // are unavailable to touch and to most screen readers.
  const opt = l => `<option value="${esc(l.id)}"${l.id === S.lens ? " selected" : ""}` +
    `${l.why ? ` title="${esc(l.why)}"` : ""}>${esc(l.name)}</option>`;
  $("#lensSel").innerHTML =
    `<option value=""${S.lens ? "" : " selected"}>None</option>` +
    `<optgroup label="Built in">${BUILTIN_LENSES.map(opt).join("")}</optgroup>` +
    (S.custom.length ? `<optgroup label="Yours">${S.custom.map(opt).join("")}</optgroup>` : "");
  $("#lensSel").classList.toggle("lensactive", !!S.lens);
  renderLensNote();
}

function renderLensNote() {
  const l = lensById(S.lens), box = $("#lensNote");
  if (!l) { box.hidden = true; box.innerHTML = ""; return; }
  const cols = l.ids.map(id => NUTS[IDX.get(id)]?.label).filter(Boolean);
  box.hidden = false;
  box.innerHTML =
    `<b>${esc(l.name)}</b>` +
    (l.why ? ` ${esc(l.why)}` : ` Highlighting ${cols.length} nutrients.`) +
    `<span class="cols">${cols.map(esc).join(" · ")}</span>`;
}

/** Highlighting a nutrient whose group is switched off would highlight nothing,
 *  so selecting a lens turns on whatever groups it needs. */
function setLens(id) {
  S.lens = lensById(id) ? id : "";
  const l = lensById(S.lens);
  if (l) {
    const needed = new Set(l.ids.map(x => NUTS[IDX.get(x)].group));
    const added = [...needed].filter(g => !S.groups.has(g));
    added.forEach(g => S.groups.add(g));
    if (added.length) {
      renderGroups();
      say(`Highlighting ${l.name}. Also showing ${added
        .map(g => GROUPS.find(G => G.id === g).label.toLowerCase()).join(" and ")}.`);
    } else say(`Highlighting ${l.name}, ${l.ids.length} nutrients.`);
  } else say("Highlight cleared.");
  renderLensSelect();
  savePrefs();
  render();
}

/* ---------- what a nutrient does ----------
   A native `title` covers hovering with a mouse and nothing else, so the same
   sentence gets a visible home under the toolbar. Hover or tab onto a column
   header and it explains that nutrient; otherwise it falls back to whichever
   column the table is sorted by, which is what makes it reachable by touch,
   where tapping a header is how you sort. */
let hoverNut = null;

/* Always on screen, never toggled. Appearing on hover would push the table down
   by its own height at the moment the pointer reaches a header, moving the
   header out from under the cursor. So it holds a prompt when there is nothing
   to explain, and the box is tall enough for the longest sentence either way. */
function renderNutNote() {
  const id = hoverNut || (S.sort.id !== "__name" ? S.sort.id : null);
  const n = id ? NUTS[IDX.get(id)] : null;
  $("#nutNote").innerHTML = n && n.why
    ? `<b>${esc(n.label)}</b> ${esc(n.why)}`
    : `Point at a column header, or tab onto one, to read what that nutrient
       does in the body. Sorting by a column leaves its explanation here.`;
}

/* Bound to #thead itself, which survives every re-render of its contents. */
const nutOf = e => {
  const id = e.target.closest?.("[data-sort]")?.dataset.sort;
  return id && id !== "__name" ? id : null;
};
function previewNut(id) {
  if (id === hoverNut) return;
  hoverNut = id;
  renderNutNote();
}
$("#thead").addEventListener("mouseover", e => previewNut(nutOf(e)));
$("#thead").addEventListener("mouseleave", () => previewNut(null));
$("#thead").addEventListener("focusin", e => previewNut(nutOf(e)));
$("#thead").addEventListener("focusout", () => previewNut(null));

/* ---------- table ---------- */
/** Decorates the visible columns with everything the renderer needs to know
 *  about position: where each group starts, and where each run of highlighted
 *  columns begins and ends so the accent rule is drawn once per run rather
 *  than between every adjacent pair. */
function layout() {
  const c = cols(), L = lensIds();
  return c.map((n, k) => {
    const lens = L.has(n.id);
    return { ...n,
      gstart: k === 0 || c[k - 1].group !== n.group,
      lens,
      lensL: lens && (k === 0 || !L.has(c[k - 1].id)),
      lensR: lens && (k === c.length - 1 || !L.has(c[k + 1].id)),
      sorted: S.sort.id === n.id,
    };
  });
}

const colClass = n => [
  n.gstart && "gstart", n.lens && "lens", n.lensL && "lensL",
  n.lensR && "lensR", n.sorted && "sorted",
].filter(Boolean).join(" ");

function renderTable(r) {
  const c = layout(), page = r;
  const nameSorted = S.sort.id === "__name";
  const L = lensIds();

  const groupHead = GROUPS.filter(g => S.groups.has(g.id)).map(g => {
    const own = c.filter(x => x.group === g.id);
    const anyLens = own.some(x => x.lens);
    // The label sits in its own box so it can stick to the left of the
    // scrollport while the group scrolls past underneath it.
    return `<th class="grp${anyLens ? " lens" : ""}" data-g="${g.id}" colspan="${own.length}"
      scope="colgroup"><span class="grplabel">${esc(g.label)}</span></th>`;
  }).join("");

  // Each header explains what its nutrient does: as a native tooltip on hover,
  // in the note under the toolbar on hover or keyboard focus, and as a
  // description a screen reader reads out after the button's own label. The
  // tooltip alone would reach neither keyboard nor screen reader users.
  const cells = c.map(n => {
    const aria = n.sorted ? (S.sort.dir === 1 ? "ascending" : "descending") : "none";
    const unit = S.dv && n.dv ? "%DV" : n.unit;
    return `<th scope="col" aria-sort="${aria}" data-g="${n.group}" class="${colClass(n)}">
      <button class="sortbtn" type="button" data-sort="${n.id}"
        ${n.why ? `title="${esc(n.why)}" aria-describedby="why-${esc(n.id)}"` : ""}>
        <span>${esc(n.label)} <span class="unit">${unit}</span>${
          n.lens ? '<span class="sr">, highlighted</span>' : ""}</span>
        <span class="ar" aria-hidden="true">${n.sorted ? (S.sort.dir === 1 ? I.up : I.down) : I.sortable}</span>
      </button>${n.why ? `<span class="sr" id="why-${esc(n.id)}">${esc(n.why)}</span>` : ""}</th>`;
  }).join("");

  $("#thead").innerHTML = `
    <tr>
      <th class="food${nameSorted ? " sorted" : ""}" rowspan="2" scope="col" aria-sort="${nameSorted ? (S.sort.dir === 1 ? "ascending" : "descending") : "none"}">
        <button class="sortbtn" type="button" data-sort="__name" style="justify-content:flex-start">
          <span>Food <span class="unit">${basisLabel()}</span></span>
          <span class="ar" aria-hidden="true">${nameSorted ? (S.sort.dir === 1 ? I.up : I.down) : I.sortable}</span>
        </button></th>
      ${groupHead}
    </tr><tr>${cells}</tr>`;

  // Only the notes actually on show get a key beneath the table: a legend for a
  // marker nobody can see is just more to read.
  const shownNotes = new Set();
  $("#tbody").innerHTML = page.length ? page.map(({ f, i }) => `
    <tr data-i="${i}" ${S.sel === i ? 'aria-selected="true"' : ""}>
      <td class="food${nameSorted ? " sorted" : ""}"><div class="fcell">
        <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
        <button class="fname" type="button" data-pick="${i}" data-name="${esc(f.name)}">
          <b>${esc(f.name)}${f.alt ? ` <span class="alt">(${esc(f.alt)})</span>` : ""}</b>
          ${f.state ? `<span>${esc(f.state)}</span>` : ""}
          ${S.basis === "kcal" && gramsPer100kcal(f) !== null
            ? `<span class="per100">${Math.round(gramsPer100kcal(f))} g</span>
               <span class="sr">makes 100 kcal</span>` : ""}
          <span class="sr">, show full profile</span></button>
        <button class="fav" type="button" data-fav="${i}" aria-pressed="${isFav(i)}">
          ${isFav(i) ? I.heartFull : I.heart}
          <span class="sr">${isFav(i) ? "Remove" : "Add"} ${esc(f.name)} ${isFav(i) ? "from" : "to"} favourites</span>
        </button></div></td>
      ${c.map(n => {
        const v = shown(f, n);
        const zero = v === 0 || v === null;
        // A note explains where a figure came from, so there has to be one.
        const note = v === null ? null : noteFor(i, n.id);
        if (note) shownNotes.add(note);
        return `<td class="num${zero ? " low" : ""} ${colClass(n)}" data-g="${n.group}">${
          fmt(v, n)}${note ? noteMark(note) : ""}</td>`;
      }).join("")}
    </tr>`).join("")
    : `<tr><td class="empty" colspan="${c.length + 1}">${emptyState()}</td></tr>`;

  const lens = lensById(S.lens);
  $("#cap").textContent =
    `${FOODS.length} vegan foods, ${c.length} nutrient columns. Values ${basisLabel()} of food` +
    (S.dv ? ", shown as % of adult daily value." : ".") +
    (lens ? ` ${lens.name} highlighted.` : "");

  const key = $("#noteKey");
  key.hidden = !shownNotes.size;
  key.innerHTML = [...shownNotes].map(n =>
    `<span><sup class="fnote">${esc(n.marker)}</sup> <b>${esc(n.short)}.</b>
     ${esc(n.text)}</span>`).join("");

  syncHeadOffset();
}

/* Both header rows are sticky: the first at the top of the scroller, the second
   directly beneath it. That only works if the second one's offset is exactly the
   first one's height, and the height depends on the font, the zoom level and the
   group labels themselves. It had been hardcoded at 38px against a row that
   actually measures 36.8, and table rows scrolled visibly through the 1.2px gap.
   Measure it instead. Flooring means any leftover fraction becomes an invisible
   overlap rather than a visible gap. */
function syncHeadOffset() {
  const row = $("#thead").rows[0];
  if (!row) return;
  const h = row.getBoundingClientRect().height;
  if (h) $("#grid").style.setProperty("--head1", `${Math.floor(h)}px`);

  /* The group labels stick just clear of the food column, which is itself
     sticky at the left edge. Its width is content-driven, so measure it too.
     Exactly, not rounded up: the label's resting position is that width plus
     the group cell's own padding, so anything else makes it jump by the
     rounding the moment it sticks. The 12px of padding is the clearance that
     rounding up was there to guarantee. */
  const food = row.cells[0];
  const w = food && food.getBoundingClientRect().width;
  if (w) $("#grid").style.setProperty("--foodw", `${w}px`);
}
addEventListener("resize", syncHeadOffset);

/** The three ways to end up with no rows need three different ways out. */
function emptyState() {
  if (S.favsOnly && !S.favs.size)
    return `<b>No favourites yet</b>Star a food with the heart button to build a shortlist,
            then come back here.
            <div style="margin-top:14px"><button class="btn" type="button" data-act="favs">
              Show all foods</button></div>`;
  if (S.favsOnly)
    return `<b>No favourites match the other filters</b>Your shortlist has
            ${S.favs.size} food${S.favs.size === 1 ? "" : "s"}, but none of them match the
            current search or category.
            <div style="margin-top:14px"><button class="btn" type="button" data-act="clearfilters">
              Clear search and category</button></div>`;
  return `<b>No foods match that search</b>Try a different term, or clear the filters.
          <div style="margin-top:14px"><button class="btn" type="button" data-act="clearfilters">
            Clear search and category</button></div>`;
}

/* ---------- chart ---------- */
function renderChart(all) {
  const n = NUTS[IDX.get(S.chartNut)];
  const r = all.slice().sort((a, b) => (val(b.f, n.id) ?? -1) - (val(a.f, n.id) ?? -1));
  const max = Math.max(...r.map(x => val(x.f, n.id) ?? 0), 0.0001);
  $("#chartNut").innerHTML = GROUPS.filter(g => S.groups.has(g.id)).map(g =>
    `<optgroup label="${g.label}">` + NUTS.filter(x => x.group === g.id).map(x =>
      `<option value="${x.id}"${x.id === S.chartNut ? " selected" : ""}>${esc(x.label)}</option>`
    ).join("") + "</optgroup>").join("");
  $("#chartRows").innerHTML = r.slice(0, 25).map(({ f }) => {
    const v = val(f, n.id) ?? 0;
    return `<div class="crow">
      <span class="lbl"><span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
        <span title="${esc(fullName(f))}">${esc(fullName(f))}</span></span>
      <span class="track"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span>
      <span class="val">${fmt(v, n)} <span class="unit">${S.dv && n.dv ? "" : n.unit}</span></span>
    </div>`;
  }).join("");
  $("#chartRows").setAttribute("role", "img");
  $("#chartRows").setAttribute("aria-label",
    `Bar chart of ${n.label} across ${Math.min(r.length, 25)} foods, highest first. ` +
    r.slice(0, 25).map(({ f }) => `${fullName(f)} ${fmtText(val(f, n.id), n)}`).join(", "));
}

/** Derived figures, computed from the columns already in the table rather than
 *  sourced separately, so they cannot disagree with the rest of the row. */
function proteinQualityBlock(f) {
  const q = proteinQuality(f), o = omegaRatio(f);
  const aaMissing = NUTS.some(n => n.group === "amino" && val(f, n.id) === null);
  if (!q && aaMissing && (val(f, "protein") ?? 0) >= 1)
    return `<h4 style="margin-top:18px">Protein quality</h4>
      <p class="nodatanote" style="margin-top:0">No amino acid score: USDA has not published a
      full amino acid analysis for this food, so there is nothing to score it against. The gap is
      in the source data, not in the food.</p>`;
  if (!q && !o) return "";

  let rows = "";
  if (q) {
    const complete = q.score >= 100;
    rows += `<div class="drow"><dt>Amino acid score</dt>
        <dd class="${complete ? "pc" : ""}">${q.score}%</dd></div>
      <div class="drow"><dt>${complete ? "Lowest relative to need" : "Limiting amino acid"}</dt>
        <dd>${esc(q.limiting)}</dd></div>`;
    if (q.perKcal !== null)
      rows += `<div class="drow"><dt>Protein per 100 kcal</dt>
        <dd>${q.perKcal.toFixed(1)} g</dd></div>`;
  }
  if (o) rows += `<div class="drow"><dt>Omega-6 : omega-3</dt>
      <dd>${o.flip ? `1 : ${o.a.toFixed(1)}` : `${o.a.toFixed(1)} : 1`}</dd></div>`;

  const note = q
    ? (q.score >= 100
        ? "Meets the adult FAO/WHO pattern for every essential amino acid."
        : `Scored against the FAO/WHO adult pattern. ${esc(q.limiting)} caps the
           score; pairing this food with one richer in it raises the total.`)
    : "";

  return `<h4 style="margin-top:18px">Protein quality</h4><dl>${rows}</dl>` +
    (note ? `<p style="font-size:11.5px;color:var(--faint);margin:8px 0 0;line-height:1.4">${note}</p>` : "");
}

/* ---------- detail panel ---------- */
function renderDetail() {
  const f = FOODS[S.sel];
  const g = id => shown(f, NUTS[IDX.get(id)]);
  const inDay = S.day.find(e => e.slug === SLUGS[S.sel]);
  // Overview first, then one tab per group that has its own detail list. Driven
  // off GROUPS so a new group cannot be added to the table and left out of here.
  const DETAIL_TABS = ["vitamin", "mineral", "amino", "plant"];
  const tabs = [["overview", "Overview", I.macro], ...DETAIL_TABS
    .map(id => GROUPS.find(g => g.id === id))
    .filter(Boolean)
    .map(g => [g.id, g.label, g.icon])];

  // The panel shows the same figures as the table, so it carries the same
  // markers, and explains them once at the foot rather than per row.
  const shownNotes = new Set();

  let body;
  if (S.tab === "overview") {
    const macro = ["kcal", "protein", "carbs", "fiber", "fat", "satfat"];
    const top = NUTS.filter(n => n.dv && n.group !== "macro")
      .map(n => ({ n, pc: (g(n.id) ?? 0) / n.dv * 100 }))
      .filter(x => x.pc > 0).sort((a, b) => b.pc - a.pc).slice(0, 6);
    body = `<h4>Macronutrients</h4><dl>` + macro.map(id => {
      const n = NUTS[IDX.get(id)];
      const sub = id === "fiber" || id === "satfat";
      // Energy twice over: the table sorts on kilocalories, but food labelling
      // outside the United States leads with kilojoules. Derived here from the
      // column already present, by the definition of the thermochemical
      // calorie, so it cannot drift away from the figure it converts.
      const kj = id === "kcal" && g("kcal") !== null
        ? ` <span class="pc">· ${Math.round(g("kcal") * 4.184)} kJ</span>` : "";
      return `<div class="drow${sub ? " sub" : ""}"><dt>${esc(n.label)}</dt>
        <dd>${(g(id) ?? 0).toFixed(n.dp)} ${n.unit}${kj}</dd></div>`;
    }).join("") + `</dl>`
      + proteinQualityBlock(f)
      + `<h4 style="margin-top:18px">Top nutrients</h4><dl>` + top.map(({ n, pc }) => {
        const note = noteFor(S.sel, n.id);
        if (note) shownNotes.add(note);
        return `<div class="drow"><dt>${esc(n.label)}</dt>
          <dd class="pc">${Math.round(pc)}% DV${note ? noteMark(note) : ""}</dd></div>`;
      }).join("") + `</dl>`;
  } else {
    const list = NUTS.filter(n => n.group === S.tab);
    const max = Math.max(...list.map(n => g(n.id) ?? 0), 0.0001);
    const L = lensIds();
    const unmeasured = list.filter(n => g(n.id) === null || g(n.id) === undefined).length;
    body = `<h4>${esc(GROUPS.find(g => g.id === S.tab)?.label || S.tab)}</h4>
      <dl>` + list.map(n => {
        const v = g(n.id);
        // Distinguish "measured as none" from "never measured": rendering a
        // missing figure as 0.000 asserts an absence nobody established.
        const none = v === null || v === undefined;
        const pc = !none && n.dv ? Math.round(v / n.dv * 100) : null;
        const note = none ? null : noteFor(S.sel, n.id);
        if (note) shownNotes.add(note);
        return `<div class="drow${L.has(n.id) ? " lensrow" : ""}" style="display:block">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <dt>${esc(n.label)}</dt>
            <dd>${none ? `<span class="nodata">not measured</span>`
              : `${v.toFixed(n.dp)} ${n.unit}${pc !== null ? ` <span class="pc">· ${pc}%</span>` : ""}${
                 note ? noteMark(note) : ""}`}</dd>
          </div>
          ${none ? "" : `<div class="minibar" aria-hidden="true"><i style="width:${(v / max * 100).toFixed(1)}%"></i></div>`}
        </div>`;
      }).join("") + `</dl>` +
      (unmeasured ? `<p class="nodatanote">${unmeasured === list.length
          ? "USDA publishes no figures at all for this group in this food."
          : `USDA publishes no figure for ${unmeasured} of the ${list.length}.`}
        Unmeasured is not the same as none: nobody has analysed it, rather than
        having analysed it and found nothing.</p>` : "");
  }

  $("#detail").innerHTML = `
    <div class="dhead">
      <button class="fav" type="button" data-fav="${S.sel}" aria-pressed="${isFav(S.sel)}">
        ${isFav(S.sel) ? I.heartFull : I.heart}
        <span class="sr">${isFav(S.sel) ? "Remove from" : "Add to"} favourites</span></button>
      <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
      <h3>${esc(f.name)}</h3>
      ${f.alt ? `<div class="st">also known as ${esc(f.alt)}</div>` : ""}
      ${f.state ? `<div class="st">${esc(f.state)}</div>` : ""}
      <div class="per">${esc(f.cat)} · ${basisLabel()}</div>
      <button class="btn dayadd-btn" type="button" data-dayadd="${S.sel}">${I.plus}
        ${inDay ? `Add another ${DEFAULT_G} g` : "Add to my day"}</button>
      ${inDay ? `<div class="inday">${inDay.g} g in your day</div>` : ""}
    </div>
    <div class="tabs" role="tablist" aria-label="Nutrient detail sections">
      ${tabs.map(([id, label, ic]) => `
        <button type="button" role="tab" data-tab="${id}" id="tab-${id}"
          aria-selected="${S.tab === id}" aria-controls="tabp"
          tabindex="${S.tab === id ? 0 : -1}">${ic}<span>${label}</span></button>`).join("")}
    </div>
    <div class="dbody" id="tabp" role="tabpanel" aria-labelledby="tab-${S.tab}" tabindex="0">${body}${
      [...shownNotes].map(n => `<p class="nodatanote"><sup class="fnote">${esc(n.marker)}</sup>
        <b>${esc(n.short)}.</b> ${esc(n.text)}</p>`).join("")}</div>
    <div class="dfoot">% DV uses general adult reference values. Yours may differ.</div>`;
}

/* ---------- meta ----------
   The table lists every food it has, in one scrolling box. It used to paginate
   at twenty rows, which meant sorting by a column and then paging to find where
   your food had gone, and which put a second control on the page for something
   the scrollbar already did. */
function renderMeta(total) {
  const c = cols().length;
  const lens = lensById(S.lens);
  $("#meta").innerHTML = `${I.info} Showing <b>${total}</b> of ${FOODS.length} foods ·
    <b>${c}</b> of ${NUTS.length} nutrients` +
    (S.favsOnly ? " · favourites only" : "") + (S.dv ? " · % daily value" : "") +
    (S.basis === "kcal" ? " · per 100 kcal" : "") +
    // The reason the two controls are separate rather than one three-way switch.
    // A %DV per 100 kcal figure scales by 20 over a 2000 kcal day, so one number
    // reads the whole table without anyone learning 60-odd daily values.
    (S.dv && S.basis === "kcal"
      ? ` · <span class="lenshint">5% here is a full day's worth</span> at 2000 kcal` : "") +
    (lens ? ` · <span class="lenshint">${esc(lens.name)}</span> highlighted` : "");
  $("#favCount").textContent = S.favs.size || "";
  // Counted from the entries that resolve to a food, not from the stored list.
  // An entry naming a food that has left the dataset draws no row, so counting
  // it here would promise one more than the view can show.
  $("#dayCount").textContent = dayEntries().length || "";
}

/* ---------- my day ---------- */

/** A total in its own units. Rounded to the nutrient's own decimal places, the
 *  same as every other figure on the page. */
const fmtTotal = (v, n) => v === null ? "not measured" : `${v.toFixed(n.dp)} ${n.unit}`;

function renderDayList() {
  const list = dayEntries();
  const box = $("#dayList");
  if (!list.length) {
    box.innerHTML = `<div class="dayempty">
      <b>Nothing in your day yet</b>
      <p>Search above to add a food and say how much of it you had. Everything on
         this page is per 100 g, and this is where that turns into what you
         actually ate.</p>
      ${S.favs.size ? `<p>You have ${S.favs.size} favourite${S.favs.size === 1 ? "" : "s"},
         which come up first in the search above.</p>` : `<p>Star foods with the heart
         button in the table and they will come up first here.</p>`}</div>`;
    return;
  }
  box.innerHTML = `<div class="daylist">` + list.map(({ f, g, slug }) => `
    <div class="dayrow" data-slug="${esc(slug)}">
      <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
      <span class="dayname">
        <b>${esc(f.name)}</b>
        <span>${f.state ? `${esc(f.state)} · ` : ""}${esc(f.cat)}</span></span>
      <span class="dayqty">
        <button class="stp" type="button" data-daystep="${esc(slug)}" data-by="-10"
          ${g <= 0 ? "disabled" : ""}>${I.minus}<span class="sr">Less ${esc(f.name)}</span></button>
        <input type="number" inputmode="numeric" data-dayg="${esc(slug)}" value="${g}"
          min="0" max="${DAY_MAX_G}" step="10"
          aria-label="Grams of ${esc(f.name)}${f.state ? `, ${esc(f.state)}` : ""}">
        <span class="u">g</span>
        <button class="stp" type="button" data-daystep="${esc(slug)}" data-by="10"
          ${g >= DAY_MAX_G ? "disabled" : ""}>${I.plus}<span class="sr">More ${esc(f.name)}</span></button>
      </span>
      <button class="rm" type="button" data-dayrm="${esc(slug)}">${I.x}
        <span class="sr">Remove ${esc(f.name)} from your day</span></button>
    </div>`).join("") + `</div>
    <div class="dayfoot">
      <button class="btn" type="button" data-act="dayclear">${I.x} Clear the day</button>
      <span class="push">${list.length} food${list.length === 1 ? "" : "s"} ·
        <b>${dayGrams()} g</b> in total</span>
    </div>`;
}

/** One row per nutrient, in the groups the sidebar has switched on, so that
 *  control keeps the single meaning it has in the table. */
/** Which FAO entry each amino acid is scored under, keyed by nutrient id: its
 *  own where it stands alone, its pair's where it does not. Methionine is
 *  spared by cysteine and phenylalanine by tyrosine, so each of those is
 *  measured against the pair's requirement and says so on the row. The eleven
 *  non-essential acids appear in none of the entries and get no percentage,
 *  because FAO publishes no requirement for them. */
/* Counted rather than typed. The first version of the note beside these said
   "eleven", which was the number of acids the FAO entries cover rather than the
   number they leave out. */
const FAO_SCORED = new Set(FAO_PATTERN.flatMap(p => p.ids));
const NON_ESSENTIAL = NUTS.filter(n => n.group === "amino" && !FAO_SCORED.has(n.id)).length;

function aminoRefsByNutrient(totals) {
  const m = new Map();
  for (const a of dayAminoAcids(totals))
    for (const id of a.ids)
      m.set(id, { ...a, partners: a.ids.filter(x => x !== id) });
  return m;
}

function renderDayTotals(totals) {
  const list = dayContributors();
  const box = $("#dayTotals");
  if (!list.length) { box.innerHTML = ""; return; }

  const aaRef = aminoRefsByNutrient(totals);
  const shownNotes = new Set();
  const body = GROUPS.filter(g => S.groups.has(g.id)).map(g => {
    const rows = totals.filter(t => t.n.group === g.id).map(t => {
      const { n, total, partial, from, of, notes } = t;
      /* Amino acids carry no `dv`, because a gram of lysine means nothing
         against a whole-diet figure; they are scored against the FAO/WHO
         requirement for a body weight instead. Same percentage as the summary
         beside this, from the same function, so the two cannot disagree. */
      const aa = aaRef.get(n.id);
      const pc = n.dv && total !== null ? total / n.dv * 100 : aa ? aa.pc : null;
      const pairedWith = aa && aa.partners.length
        ? `<span class="qual">with ${aa.partners
            .map(id => NUTS[IDX.get(id)].label.toLowerCase()).join(" and ")}</span>` : "";
      notes.forEach(x => shownNotes.add(x));
      return `<div class="totrow${total === null ? " none" : ""}">
        <span class="totname">${esc(n.label)}${notes.map(noteMark).join("")}${pairedWith}</span>
        <span class="totval">${total === null
          ? `<span class="nodata">not measured</span>`
          : `${total.toFixed(n.dp)} <span class="u">${esc(n.unit)}</span>`}</span>
        <span class="totbar" aria-hidden="true">${pc === null ? ""
          : `<i class="${pc >= 100 ? "full" : ""}" style="width:${Math.min(pc, 100).toFixed(1)}%"></i>`}</span>
        <span class="totpc">${pc === null
          ? `<span class="noref" aria-hidden="true">&ndash;</span>
             <span class="sr">no ${n.group === "amino" ? "published requirement" : "daily value published"}</span>`
          : `${Math.round(pc)}%`}</span>
        <span class="totcov">${partial ? `from ${from} of ${of}` : ""}</span>
      </div>`;
    }).join("");
    // data-g carries the group's colour to the heading, the same attribute and
    // the same six colours the table header uses, so a group reads as one
    // colour wherever it appears.
    // Amino acids are the one group not measured against a daily value, so the
    // column says what they are measured against instead.
    const amino = g.id === "amino";
    return `<div class="totgroup" data-g="${g.id}"><h4>${g.icon}${esc(g.label)}</h4>
      <div class="tothead" aria-hidden="true">
        <span>Nutrient</span><span>Total</span><span></span>
        <span>${amino ? "of requirement" : "of daily value"}</span><span></span>
      </div>${rows}
      ${amino ? `<p class="nodatanote">Against the FAO/WHO adult requirement for
        ${esc(weightLabel())}, which you can change in the panel beside this. The
        ${NON_ESSENTIAL} the body can build for itself have no published requirement, so
        they show a total only.</p>` : ""}
    </div>`;
  }).join("");

  box.innerHTML = `<div class="totals">${body}</div>` +
    (shownNotes.size ? `<div class="notekey">${[...shownNotes].map(n =>
      `<span><sup class="fnote">${esc(n.marker)}</sup> <b>${esc(n.short)}.</b>
       ${esc(n.text)}</span>`).join("")}</div>` : "") +
    `<p class="nodatanote" style="margin-top:12px">Percentages use the same general adult
     reference values as the rest of the page, and the FAO/WHO requirement for your body
     weight where amino acids are concerned. Rows with no reference figure show a total
     only: the fat fractions and the carotenoids are already counted inside the totals above
     them, so a percentage would show the same intake twice.</p>`;
}

/** Always shown, whatever the totals say, because each of these is a wrong
 *  conclusion the totals actively invite. A list of what you are short of
 *  implies the list is complete, and it is not. */
const DAY_NOTES = [
  ["B12", `The one figure to check, and the one this view can most easily mislead you
    about. Unfortified plant foods are not a source: seaweed's B12 is inactive analogues, and
    every microgram in the yeast and soy milk rows was added by the maker. A supplement or a
    reliably fortified food is standard advice whatever this total reads.`],
  ["Iodine is not in this data", `USDA publishes no dependable per-food iodine figures for plant
    foods, so there is no column and no total. It is a real requirement and a common gap on a
    plant-based diet, and its absence here is not evidence that you have enough.`],
  ["Intake is not absorption", `Plant iron is non-haem and absorbed poorly on its own, though
    vitamin C in the same meal multiplies it. Calcium from oxalate-rich greens is largely
    unavailable, and phytates in wholegrains and pulses hold back zinc and iron. A total well
    over 100% can still leave you short.`],
];

/** The nine FAO entries, kept paired: methionine is spared by cysteine and
 *  phenylalanine by tyrosine, so a percentage on either alone would report a
 *  shortfall the body does not have. Rendered on its own so that changing the
 *  body weight can redraw these rows without rebuilding the panel around the
 *  field being typed into. */
const aminoRows = totals => dayAminoAcids(totals).map(a =>
  `<div class="drow"><dt>${esc(a.label)}</dt>
    <dd>${a.got === null ? `<span class="nodata">not measured</span>`
      : `${a.got.toFixed(2)} g <span class="pc">· ${Math.round(a.pc)}%</span>`}</dd></div>`).join("");

/** The weight field, in whichever unit is chosen, plus the one control that
 *  chooses. Two inputs in stones and pounds, because that is how the number is
 *  said, and each carries its own label since one `for` cannot name two. */
function weightRow() {
  const unit = (id, label) =>
    `<button type="button" data-wunit="${id}" aria-pressed="${S.wUnit === id}">${label}</button>`;
  const field = (id, val, unitLabel, max, name) =>
    `<input type="number" inputmode="numeric" id="${id}" data-w value="${val}"
       min="0"${max ? ` max="${max}"` : ""} step="1" aria-label="Body weight in ${name}">
     <span class="u">${unitLabel}</span>`;

  const { st, lb } = kgToStLb(S.kg);
  const fields = S.wUnit === "stlb"
    // No maximum on pounds: 14 or more is a valid thing to type on the way to a
    // number, and it rolls up into stones when the field is left.
    ? field("dayStones", st, "st", 40, "stones") + field("dayPounds", lb, "lb", null, "pounds")
    : field("dayKg", +S.kg.toFixed(1), "kg", 250, "kilograms");

  return `<div class="kgrow">
    <span class="wlbl">Body weight</span>
    <span class="seg wunit" role="group" aria-label="Body weight unit">
      ${unit("kg", "kg")}${unit("stlb", "st lb")}</span>
    <span class="wfields">${fields}</span>
  </div>`;
}

/** Whatever the fields currently say, in kilograms. */
function readWeight() {
  if (S.wUnit !== "stlb") return Number($("#dayKg").value);
  return stLbToKg(Number($("#dayStones").value) || 0, Number($("#dayPounds").value) || 0);
}

function renderDaySummary(totals) {
  const list = dayContributors();
  const box = $("#daySum");
  const notes = `<div class="dayadvice">` + DAY_NOTES.map(([h, p]) =>
    `<div><b>${esc(h)}</b> ${esc(p.replace(/\s+/g, " "))}</div>`).join("") + `</div>`;

  if (!list.length) {
    box.innerHTML = `<div class="dhead"><h3>Your day</h3>
      <div class="per">nothing added yet</div></div>
      <div class="dbody"><p class="nodatanote" style="margin-top:0">Add a food and its
      totals appear here, in units and as a percentage of a daily value.</p>${notes}</div>`;
    return;
  }

  const kcal = totalOf(totals, "kcal"), protein = totalOf(totals, "protein");
  const fibre = totalOf(totals, "fiber");
  const head = [kcal, protein, fibre].map(t => {
    const pc = t.n.dv && t.total !== null ? Math.round(t.total / t.n.dv * 100) : null;
    return `<div class="drow"><dt>${esc(t.n.label)}</dt>
      <dd>${fmtTotal(t.total, t.n)}${pc === null ? "" : ` <span class="pc">· ${pc}%</span>`}</dd></div>`;
  }).join("");

  const q = dayProteinQuality(totals);
  // A ratio between two partial sums is a ratio between two unknowns, so it is
  // withheld unless every listed food was measured for both.
  const oComplete = ["ala", "la"].every(id => !totalOf(totals, id).partial);
  const o = oComplete ? omegaRatio({ v: totals.map(t => t.total) }) : null;
  const { short, over, budget } = dayStanding(totals);

  const jump = x => `<button class="jump" type="button" data-daysort="${esc(x.id)}">
    <span>${esc(x.label)}</span><b>${Math.round(x.pc)}%</b>
    <span class="ar" aria-hidden="true">${I.right}</span>
    <span class="sr">, show the foods highest in it</span></button>`;

  box.innerHTML = `
    <div class="dhead"><h3>Your day</h3>
      <div class="per">${list.length} food${list.length === 1 ? "" : "s"} · ${dayGrams()} g</div></div>
    <div class="dbody">
      <dl>${head}</dl>

      <h4 style="margin-top:18px">Protein quality</h4>
      ${q ? `<dl>
        <div class="drow"><dt>Amino acid score</dt>
          <dd class="${q.score >= 100 ? "pc" : ""}">${q.score}%</dd></div>
        <div class="drow"><dt>${q.score >= 100 ? "Lowest relative to need" : "Limiting amino acid"}</dt>
          <dd>${esc(q.limiting)}</dd></div>
        ${q.perKcal !== null ? `<div class="drow"><dt>Protein per 100 kcal</dt>
          <dd>${q.perKcal.toFixed(1)} g</dd></div>` : ""}
      </dl>
      <p class="nodatanote">${q.score >= 100
        ? `Across the whole day this meets the adult FAO/WHO pattern for every essential amino
           acid. Foods that fall short on their own cover each other here, which is why
           combining proteins within a single meal is not necessary.`
        : `Scored across the day rather than per food, which is the basis that matters:
           ${esc(q.limiting)} caps it, so adding something richer in that raises the whole day.`}</p>`
      : `<p class="nodatanote" style="margin-top:0">No score: at least one food in your day has
         no published amino acid analysis, and a sum that skips it would understate the day.
         The gap is in the source data rather than in what you ate.</p>`}

      <h4 style="margin-top:18px">Amino acids
        <span class="lenscount" id="aaKg">against FAO/WHO for ${weightLabel()}</span></h4>
      <dl id="aaRows">${aminoRows(totals)}</dl>
      ${weightRow()}
      <p class="nodatanote">Amino acid requirements are published per kilogram of body weight,
      so this one figure is what the percentages above are measured against. Stones and pounds
      are converted to it rather than kept alongside it. Nothing else on the page uses your
      weight.</p>

      ${o ? `<h4 style="margin-top:18px">Omega balance</h4><dl>
        <div class="drow"><dt>Omega-6 : omega-3</dt>
          <dd>${o.flip ? `1 : ${o.a.toFixed(1)}` : `${o.a.toFixed(1)} : 1`}</dd></div></dl>` : ""}

      ${short.length ? `<h4 style="margin-top:18px">Short on</h4>
        <div class="jumps">${short.slice(0, 8).map(jump).join("")}</div>
        <p class="nodatanote">Under half a daily value. Pick one to see the foods richest in
        it. Nutrients where any food in your day was never assayed are left out rather than
        reported as a shortfall that might not be one.</p>` : ""}

      ${over.length ? `<h4 style="margin-top:18px">Comfortable</h4>
        <div class="jumps">${over.slice(0, 8).map(jump).join("")}</div>` : ""}

      ${budget.length ? `<h4 style="margin-top:18px">Above the guideline</h4>
        <div class="jumps">${budget.map(jump).join("")}</div>
        <p class="nodatanote">These are the figures a daily value caps rather than sets, so
        they are listed here when a day goes over rather than under.</p>` : ""}

      ${notes}
    </div>
    <div class="dfoot">Totals cover only what you have listed. A gap here is as likely to mean
      a food you have not added as a nutrient you are short of.</div>`;
}

function renderDay() {
  const totals = dayTotals();
  renderDayList();
  renderDayTotals(totals);
  renderDaySummary(totals);
}

/* ---------- master render ---------- */
function render() {
  const showChart = S.view === "chart", showDay = S.view === "day";
  $("#browseView").hidden = showDay;
  $("#dayView").hidden = !showDay;
  $("#tableView").hidden = showChart || showDay;
  $("#chartView").hidden = !showChart;
  $("#vTable").setAttribute("aria-pressed", String(S.view === "table"));
  $("#vChart").setAttribute("aria-pressed", String(showChart));
  document.querySelector('[data-act="favs"]').setAttribute("aria-pressed", String(S.favsOnly));

  /* My day lives in the sidebar rather than in the segmented control, because
     Table and Chart are two renderings of the same food list and this is not:
     it is somewhere else to be. So the sidebar is the one place that switches
     between them, and the segmented control goes away while you are here along
     with everything else that only describes the table. */
  $("#vDay").setAttribute("aria-pressed", String(showDay));
  // aria-current="" reads as "not current", so remove it rather than blank it.
  if (showDay) $("#navFoods").removeAttribute("aria-current");
  else $("#navFoods").setAttribute("aria-current", "true");
  for (const sel of ["#viewGrp", ".lensgrp", "#dvBtn", "#nutNote", "#meta"])
    $(sel).hidden = showDay;
  if (showDay) $("#lensNote").hidden = true; else renderLensNote();

  /* The rows are worked out once and handed to everything that draws them, so
     the table, the chart and the meta line cannot disagree about what is on
     screen. The detail panel follows them: filtering to fruit used to leave it
     still describing lentils, a food the table no longer had, which is the one
     place two parts of the page held different ideas of one piece of state. An
     empty result set has nothing to move to, so the panel keeps what it had. */
  const r = rows();
  if (r.length && !r.some(x => x.i === S.sel)) S.sel = r[0].i;

  renderTable(r);
  if (showChart) renderChart(r);
  renderDetail();
  renderDay();
  renderMeta(r.length);
  renderNutNote();
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;

  if (t.dataset.grp) return toggleGroup(t.dataset.grp);
  if (t.dataset.cat !== undefined) return setCat(t.dataset.cat);

  if (t.dataset.sort) {
    const id = t.dataset.sort;
    if (S.sort.id === id) S.sort.dir *= -1;
    else S.sort = { id, dir: id === "__name" ? 1 : -1 };
    const label = id === "__name" ? "Food name" : NUTS[IDX.get(id)].label;
    say(`Sorted by ${label}, ${S.sort.dir === 1 ? "ascending" : "descending"}.`);
    savePrefs();
    return render();
  }

  if (t.dataset.pick !== undefined) {
    S.sel = +t.dataset.pick;
    say(`${FOODS[S.sel].name} selected.`);
    return render();
  }

  if (t.dataset.fav !== undefined) {
    const i = +t.dataset.fav;
    toggleFav(i);
    say(`${FOODS[i].name} ${isFav(i) ? "added to" : "removed from"} favourites.`);
    return render();
  }

  if (t.dataset.tab) {
    S.tab = t.dataset.tab;
    renderDetail();
    return document.querySelector(`[data-tab="${S.tab}"]`)?.focus();
  }

  if (t.dataset.act === "favs") {
    S.favsOnly = !S.favsOnly;
    say(S.favsOnly
      ? `Showing favourites only, ${S.favs.size} food${S.favs.size === 1 ? "" : "s"}.`
      : "Showing all foods.");
    savePrefs();
    return render();
  }
  if (t.dataset.act === "clearfilters") {
    S.q = ""; $("#q").value = ""; $("#qClear").hidden = true;
    S.cat = ""; renderCats();
    savePrefs();
    say("Search and category cleared.");
    return render();
  }
  if (t.dataset.dlg) return openDialog(t.dataset.dlg);

  // ---- my day ----
  if (t.dataset.dayadd !== undefined) {
    const i = +t.dataset.dayadd;
    const fromSearch = !!t.closest("#daySug");
    addToDay(SLUGS[i], DEFAULT_G);
    const now = S.day.find(e => e.slug === SLUGS[i]);
    say(`${FOODS[i].name} in your day at ${now.g} g.`);
    // Adding from the detail panel leaves you where you were: the count on the
    // count in the sidebar says it landed, and being thrown into another view
    // mid-browse is not what pressing "add" asked for.
    if (fromSearch) { $("#dayQ").value = ""; $("#daySug").hidden = true; }
    render();
    // Straight to the quantity, which is the next thing anyone wants to change.
    return fromSearch && document.querySelector(`[data-dayg="${SLUGS[i]}"]`)?.focus();
  }
  if (t.dataset.dayrm) {
    const f = FOODS[BY_SLUG.get(t.dataset.dayrm)];
    removeFromDay(t.dataset.dayrm);
    say(`${f ? f.name : "Food"} removed from your day.`);
    return render();
  }
  if (t.dataset.daystep) {
    const slug = t.dataset.daystep;
    const at = S.day.find(x => x.slug === slug);
    if (!at) return;
    setDayGrams(slug, at.g + +t.dataset.by);
    return render();
  }
  if (t.dataset.wunit) {
    if (t.dataset.wunit === S.wUnit) return;
    S.wUnit = t.dataset.wunit === "stlb" ? "stlb" : "kg";
    savePrefs();
    // Only the display changes: S.kg is untouched, so switching back and forth
    // cannot walk the weight away from what was entered.
    renderDaySummary(dayTotals());
    say(`Body weight in ${S.wUnit === "stlb" ? "stones and pounds" : "kilograms"}, ${weightLabel()}.`);
    return document.querySelector("[data-w]")?.focus();
  }
  if (t.dataset.act === "dayclear") {
    const n = S.day.length;
    S.day = [];
    savePrefs();
    say(`Cleared ${n} food${n === 1 ? "" : "s"} from your day.`);
    return render();
  }
  /* The way back to the table from a shortfall. Being told you are low on
     selenium is only useful next to the foods that have some, and this is the
     one click between them. */
  if (t.dataset.daysort) {
    const id = t.dataset.daysort, n = NUTS[IDX.get(id)];
    S.view = "table";
    S.sort = { id, dir: -1 };
    // Landing on a table sorted by a column you cannot see is the same problem
    // selecting a lens has, and gets the same answer: switch its group on.
    const added = !S.groups.has(n.group);
    if (added) { S.groups.add(n.group); renderGroups(); }
    savePrefs();
    render();
    $("#scroller").scrollIntoView({ block: "nearest" });
    return say(`Showing the table sorted by ${n.label}, highest first.` + (added
      ? ` Also showing ${GROUPS.find(g => g.id === n.group).label.toLowerCase()}.` : ""));
  }
});

$("#vTable").onclick = () => { S.view = "table"; render(); };
$("#vChart").onclick = () => { S.view = "chart"; render(); };
/* Pressing it again is the way back, the same as clicking the category you are
   already in, so it does not become a view you can switch on but not off. */
$("#vDay").onclick = () => {
  S.view = S.view === "day" ? "table" : "day";
  say(S.view === "day" ? "Showing your day." : "Showing the food table.");
  render();
};
$("#navFoods").addEventListener("click", () => {
  if (S.view !== "day") return;
  S.view = "table";
  render();
});
$("#chartNut").onchange = e => { S.chartNut = e.target.value; savePrefs(); renderChart(rows()); };
$("#lensSel").onchange = e => setLens(e.target.value);
$("#basisBtn").onclick = e => {
  S.basis = S.basis === "g" ? "kcal" : "g";
  const perKcal = S.basis === "kcal";
  e.currentTarget.setAttribute("aria-pressed", String(perKcal));
  e.currentTarget.lastChild.textContent = perKcal ? " Show per 100 g" : " Show per 100 kcal";
  say(perKcal ? "Showing figures per 100 kcal." : "Showing figures per 100 g.");
  savePrefs();
  render();
};
$("#dvBtn").onclick = e => {
  S.dv = !S.dv;
  e.currentTarget.setAttribute("aria-pressed", String(S.dv));
  e.currentTarget.lastChild.textContent = S.dv ? " Show raw amounts" : " Show % daily value";
  say(S.dv ? "Showing percentage of daily value." : "Showing raw amounts.");
  savePrefs();
  render();
};
/* Resets the view, not the user's own data: favourites and saved highlight
   groups took effort to create and are not what "reset columns" means. */
$("#resetBtn").onclick = () => {
  S.groups = new Set(["macro", "amino"]); S.sort = { id: "protein", dir: -1 };
  S.q = ""; $("#q").value = ""; $("#qClear").hidden = true;
  S.cat = "";
  S.dv = false; $("#dvBtn").setAttribute("aria-pressed", "false");
  $("#dvBtn").lastChild.textContent = " Show % daily value";
  S.basis = "g"; $("#basisBtn").setAttribute("aria-pressed", "false");
  $("#basisBtn").lastChild.textContent = " Show per 100 kcal";
  S.favsOnly = false; S.lens = "";
  savePrefs();
  renderGroups(); renderCats(); renderLensSelect(); render();
  say("Columns and filters reset. Favourites, your day and saved highlight groups kept.");
};

let qt;
$("#q").oninput = e => {
  S.q = e.target.value;
  $("#qClear").hidden = !S.q;
  clearTimeout(qt);
  qt = setTimeout(() => { render(); say(`${rows().length} foods match.`); }, 160);
};
$("#qClear").onclick = () => { S.q = ""; $("#q").value = ""; $("#qClear").hidden = true; $("#q").focus(); render(); };

function applyTheme() {
  document.documentElement.dataset.theme = S.dark ? "dark" : "";
  $("#themeBtn").setAttribute("aria-pressed", String(S.dark));
  $("#themeIc").innerHTML = S.dark ? I.sun : I.moon;
  $("#themeTx").textContent = S.dark ? "Light mode" : "Dark mode";
}
$("#themeBtn").onclick = () => { S.dark = !S.dark; applyTheme(); savePrefs(); };

/* ---------- my day: adding, and quantities ----------
   The table rows gained no button for this. A second icon beside the heart on
   every one of 128 rows reads as an extra column of furniture, and building a
   day is a thing people do by naming foods rather than by hunting for them. So
   the way in is a search here and a button in the detail panel, and the table
   stays as it was. */
const DAY_SUGGESTIONS = 8;

/** Favourites first, then the rest, so the hearts earn a second job instead of
 *  competing with this. */
function daySuggestions(q) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const hit = FOODS.map((f, i) => ({ f, i }))
    .filter(({ f }) => (`${f.name} ${f.alt || ""} ${f.state || ""} ${f.cat}`)
      .toLowerCase().includes(t));
  const rank = ({ f, i }) =>
    (isFav(i) ? 0 : 2) + (f.name.toLowerCase().startsWith(t) ? 0 : 1);
  return hit.sort((a, b) => rank(a) - rank(b) || a.f.name.localeCompare(b.f.name))
    .slice(0, DAY_SUGGESTIONS);
}

function renderDaySuggestions() {
  const box = $("#daySug"), list = daySuggestions($("#dayQ").value);
  box.hidden = !list.length;
  $("#dayQ").setAttribute("aria-expanded", String(!!list.length));
  box.innerHTML = list.map(({ f, i }) => {
    const already = S.day.some(e => e.slug === SLUGS[i]);
    return `<button type="button" role="option" aria-selected="false" data-dayadd="${i}">
      <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
      <span class="s-name"><b>${esc(f.name)}${f.alt ? ` <span class="alt">(${esc(f.alt)})</span>` : ""}</b>
        <span>${f.state ? `${esc(f.state)} · ` : ""}${esc(f.cat)}</span></span>
      ${isFav(i) ? `<span class="s-fav" aria-hidden="true">${I.heartFull}</span>` : ""}
      <span class="s-add">${already ? `+${DEFAULT_G} g` : `${DEFAULT_G} g`}</span>
      <span class="sr">${already ? `already in your day, add another ${DEFAULT_G} grams`
        : `add ${DEFAULT_G} grams`}</span></button>`;
  }).join("");
}

$("#dayQ").oninput = renderDaySuggestions;
$("#dayQ").onfocus = renderDaySuggestions;
$("#dayQ").onkeydown = e => {
  if (e.key === "Escape") { $("#daySug").hidden = true; $("#dayQ").setAttribute("aria-expanded", "false"); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); return $("#daySug button")?.focus(); }
  if (e.key === "Enter") { e.preventDefault(); $("#daySug button")?.click(); }
};
/* Arrow keys walk the list, so it can be used without a pointer and without
   tabbing through every option to reach the one you want. */
$("#daySug").addEventListener("keydown", e => {
  const opts = [...$("#daySug").querySelectorAll("button")];
  const i = opts.indexOf(e.target);
  if (i === -1) return;
  if (e.key === "ArrowDown") { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
  if (e.key === "ArrowUp") { e.preventDefault(); (i ? opts[i - 1] : $("#dayQ")).focus(); }
  if (e.key === "Escape") { e.preventDefault(); $("#daySug").hidden = true; $("#dayQ").focus(); }
});
/* Clicking away closes it. Checking focus rather than the click target means
   tabbing out closes it too. */
document.addEventListener("focusin", e => {
  if (!$("#dayView").hidden && !e.target.closest(".dayadd")) {
    $("#daySug").hidden = true;
    $("#dayQ").setAttribute("aria-expanded", "false");
  }
});

/* Typing a quantity must not redraw the field being typed into, so this updates
   the totals and the summary and leaves the list alone. */
$("#dayList").addEventListener("input", e => {
  const slug = e.target.dataset?.dayg;
  if (!slug) return;
  setDayGrams(slug, e.target.value);
  const totals = dayTotals();
  renderDayTotals(totals);
  renderDaySummary(totals);
});
/* Blur is where the clamped value goes back into the field: showing 5000 the
   moment somebody types the first digit of 500 would be worse than waiting. */
$("#dayList").addEventListener("change", e => {
  if (e.target.dataset?.dayg) render();
});

/* Same reasoning as the quantity fields: redraw the figures the weight feeds,
   not the field being typed into. */
$("#daySum").addEventListener("input", e => {
  if (e.target.dataset?.w === undefined) return;
  S.kg = clampKg(readWeight());
  savePrefs();
  const totals = dayTotals();
  $("#aaRows").innerHTML = aminoRows(totals);
  $("#aaKg").textContent = `against FAO/WHO for ${weightLabel()}`;
  // The amino acid column in the totals is scored against the same weight, so
  // it has to move with it. Safe to rebuild: the field being typed into is here
  // in the summary, not in there.
  renderDayTotals(totals);
});
/* On the way out, put back what the value actually is: clamped into range, and
   with any pounds over thirteen rolled up into stones. */
$("#daySum").addEventListener("change", e => {
  if (e.target.dataset?.w === undefined) return;
  if (S.wUnit === "stlb") {
    const { st, lb } = kgToStLb(S.kg);
    $("#dayStones").value = st;
    $("#dayPounds").value = lb;
  } else $("#dayKg").value = +S.kg.toFixed(1);
});

/* roving tabindex across the detail tabs */
document.addEventListener("keydown", e => {
  if (!e.target.matches?.('[role="tab"]')) return;
  const t = [...document.querySelectorAll('[role="tab"]')];
  const i = t.indexOf(e.target);
  let j = null;
  if (e.key === "ArrowRight") j = (i + 1) % t.length;
  if (e.key === "ArrowLeft") j = (i - 1 + t.length) % t.length;
  if (e.key === "Home") j = 0;
  if (e.key === "End") j = t.length - 1;
  if (j === null) return;
  e.preventDefault();
  S.tab = t[j].dataset.tab; renderDetail();
  document.querySelector(`[data-tab="${S.tab}"]`).focus();
});

/* ---------- CSV ----------
   One button, and it has always meant "write out what I can currently see", so
   in the day view it writes the day rather than the table. */
const csvQuote = s => `"${String(s).replace(/"/g, '""')}"`;

function download(lines, name) {
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: name });
  a.click(); URL.revokeObjectURL(a.href);
}

function csvTable() {
  const c = cols(), r = rows(), q = csvQuote;
  // The basis rides on every column heading rather than sitting in a note at
  // the top: a rescaled figure under an unlabelled heading is a file nobody can
  // interpret a month later, which is the failure the %DV suffix already avoids.
  const per = basisLabel();
  const head = ["Food", "Also known as", "State", "Category",
                ...c.map(n => `${n.label} (${S.dv && n.dv ? "%DV" : n.unit} ${per})`)];
  const lines = [head.map(q).join(",")].concat(r.map(({ f }) =>
    [q(f.name), q(f.alt || ""), q(f.state), q(f.cat), ...c.map(n => {
      const v = shown(f, n);
      if (v === null) return "";
      return S.dv && n.dv ? Math.round(v / n.dv * 100) : v;
    })].join(",")));
  download(lines, "vegan-nutrients.csv");
  say(`Exported ${r.length} foods and ${c.length} nutrients as CSV.`);
}

/** One row per food with its quantity, then the totals, then the percentages,
 *  then the coverage, so a partial sum stays labelled as one outside the page
 *  as well as on it. */
function csvDay() {
  const c = cols(), totals = dayTotals(), list = dayContributors(), q = csvQuote;
  const at = id => totals[IDX.get(id)];
  const head = ["Food", "State", "Grams", ...c.map(n => `${n.label} (${n.unit})`)];
  const lines = [head.map(q).join(",")];

  for (const { f, g } of list)
    lines.push([q(f.name), q(f.state || ""), g, ...c.map(n => {
      const v = val(f, n.id);
      return v === null ? "" : +(v * g / 100).toFixed(6);
    })].join(","));

  lines.push([q("Total"), q(""), dayGrams(),
    ...c.map(n => at(n.id).total === null ? "" : +at(n.id).total.toFixed(6))].join(","));
  lines.push([q("% of daily value"), q(""), "",
    ...c.map(n => n.dv && at(n.id).total !== null
      ? Math.round(at(n.id).total / n.dv * 100) : "")].join(","));
  lines.push([q("Foods measured"), q(""), "",
    ...c.map(n => `${at(n.id).from} of ${at(n.id).of}`).map(q)].join(","));

  download(lines, "my-day.csv");
  say(`Exported your day, ${list.length} foods and ${c.length} nutrients, as CSV.`);
}

const csv = () => S.view === "day" ? csvDay() : csvTable();
$("#csvBtn").onclick = csv;

/* ---------- custom highlight groups ---------- */
function renderNutPick(chosen = new Set()) {
  $("#nutPick").innerHTML = GROUPS.map(g => {
    const list = NUTS.filter(n => n.group === g.id);
    return `<div class="lensgroup"><h5>${esc(g.label)}</h5><div class="nutgrid">` +
      list.map(n => `<label><input type="checkbox" name="nut" value="${esc(n.id)}"
        ${chosen.has(n.id) ? "checked" : ""}> ${esc(n.label)}</label>`).join("") +
      `</div></div>`;
  }).join("");
  updateLensCount();
}

const pickedNuts = () =>
  [...document.querySelectorAll('#nutPick input[name=nut]:checked')].map(i => i.value);

function updateLensCount() {
  const n = pickedNuts().length;
  $("#lensCount").textContent = n ? `· ${n} selected` : "· none selected yet";
}

function renderSavedLenses() {
  const box = $("#savedLenses");
  if (!S.custom.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<p style="font-size:13.5px;font-weight:600;color:var(--ink);margin:0 0 8px">
      Your highlight groups</p>` +
    S.custom.map(l => `<div class="savedlens">
      <span class="swatch" aria-hidden="true" style="width:11px;height:11px;border-radius:3px;
        background:var(--lens-bg);border:2px solid var(--lens-line);flex:none"></span>
      <span>${esc(l.name)}</span>
      <span class="lenscount">${l.ids.length} nutrient${l.ids.length === 1 ? "" : "s"}</span>
      <button class="rm" type="button" data-rmlens="${esc(l.id)}">${I.x}
        <span class="sr">Delete ${esc(l.name)}</span></button></div>`).join("");
}

function openLensEditor() {
  $("#lensErr").textContent = "";
  $("#lensName").value = "";
  $("#lensWhy").value = "";
  renderSavedLenses();
  // Pre-tick whatever is highlighted now, so refining a built-in lens into your
  // own variant is a couple of clicks rather than starting from nothing.
  renderNutPick(lensIds());
  $("#lensDlg").showModal();
  $("#lensName").focus();
}

$("#lensEdit").onclick = openLensEditor;
$("#lensCancel").onclick = () => $("#lensDlg").close();
$("#lensX").onclick = () => $("#lensDlg").close();
$("#nutPick").addEventListener("change", updateLensCount);

$("#savedLenses").addEventListener("click", e => {
  const b = e.target.closest("[data-rmlens]");
  if (!b) return;
  const id = b.dataset.rmlens;
  const gone = S.custom.find(l => l.id === id);
  S.custom = S.custom.filter(l => l.id !== id);
  if (S.lens === id) S.lens = "";
  savePrefs();
  renderSavedLenses(); renderLensSelect(); render();
  say(`Deleted highlight group ${gone ? gone.name : ""}.`);
});

$("#lensForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#lensName").value.trim();
  const ids = pickedNuts();
  if (!name) { $("#lensErr").textContent = "Give the group a name."; $("#lensName").focus(); return; }
  if (!ids.length) { $("#lensErr").textContent = "Pick at least one nutrient."; return; }

  const id = "c" + Date.now().toString(36);
  const why = $("#lensWhy").value.trim().slice(0, 240);
  S.custom.push({ id, name: name.slice(0, 40), ids, ...(why ? { why } : {}) });
  savePrefs();
  $("#lensDlg").close();
  setLens(id);                       // also switches on any groups it needs
  say(`Saved highlight group ${name}, ${ids.length} nutrients.`);
});

/* ---------- dialogs ----------
   The methodology note names the foods USDA has never assayed for amino acids.
   Counted from the data rather than typed out, because that list grows every
   time a minor fruit or vegetable is added and a hardcoded one goes quietly
   wrong: it would still name three foods long after there were five. */
const AMINO_IDS = NUTS.filter(n => n.group === "amino").map(n => n.id);
const aminoGaps = f => AMINO_IDS.filter(id => val(f, id) === null).length;
const NO_AMINOS = FOODS.filter(f => aminoGaps(f) === AMINO_IDS.length);
const PART_AMINOS = FOODS.filter(f => aminoGaps(f) > 0 && aminoGaps(f) < AMINO_IDS.length);
const andList = names => names.slice().sort()
  .join(", ").replace(/, ([^,]*)$/, " and $1");

/* Likewise the foods whose figures depend on fortification: named from the note
   itself, so adding a food to it cannot leave the prose describing two. */
const FORTIFIED = NOTES.find(n => n.id === "fortified");
const FORTIFIED_FOODS = Object.keys(FORTIFIED?.cells || {})
  .map(s => FOODS[BY_SLUG.get(s)]).filter(Boolean);

/* And how far the flavonoid data reaches. Counted, not typed, for the same
   reason: the flavonoid columns are the sparsest in the table, so a number
   describing them is the one most likely to be quietly overtaken by a new
   food. A food counts as reached if any one subclass was measured for it. */
const FLAV_IDS = ["anthocyanidins", "flavan3ols", "flavonols"];
const FLAV_REACHED = FOODS.filter(f => FLAV_IDS.some(id => val(f, id) !== null)).length;

/* And how many omega figures are approximated from an undifferentiated total
   rather than measured as the named isomer. Counted from the note itself for
   the same reason as the rest: the number moves whenever a food is added or a
   column is re-pulled, and a typed one would quietly stop being true. */
const UNDIFF = NOTES.find(n => n.id === "undifferentiated");
const UNDIFF_CELLS = Object.values(UNDIFF?.cells || {}).flat().length;

const DLG = {
  how: ["How to use", `
    <h4>Show the columns you want</h4>
    <p>The <b>Nutrient groups</b> buttons in the sidebar switch whole groups of columns on and
    off. Each group has its own background tint in the table, so you can tell at a glance where one
    ends and the next begins. Amino acids and macronutrients start visible; turn on vitamins,
    minerals, omega oils and plant compounds as you need them.</p>
    <h4>Sort by anything</h4>
    <p>Every column header is a button. One click sorts high to low, a second reverses it. The
    sorted column is shown in bold all the way down, so you can keep your place while scrolling
    sideways. Sorting applies to the whole dataset, not just the page you are looking at.</p>
    <h4>Highlight what you came for</h4>
    <p>The <b>Highlight</b> menu picks out a set of nutrients wherever they sit in the table:
    the nine essential amino acids, the three the body uses to make creatine, the pair that matter
    for iron absorption, and so on. Choosing one switches on any column group it needs.</p>
    <p>Press <b>Custom…</b> to build your own from any combination of nutrients and give it a name.
    Your groups are saved in this browser and appear in the same menu.</p>
    <h4>Compare like for like</h4>
    <p><b>Show % daily value</b> converts every column that has a reference value into a percentage,
    which makes a milligram of selenium and a gram of protein comparable at a glance.</p>
    <h4>Build a day and total it</h4>
    <p>The table answers what is in a food. <b>My day</b>, in the sidebar under Favourites, answers
    what you got. Type a food into the box at the top, say how many grams, and every one of the
    ${NUTS.length} nutrients is totalled across the list, in its own units and as a percentage of a
    daily value. Your favourites come up first in that search, and there is an <b>Add to my day</b>
    button in the detail panel for when you spot something while browsing.</p>
    <p>The summary beside it is the part worth reading. It scores the amino acids of the
    <em>whole day</em> rather than of any one food, which is the basis that matters: cereals run short on
    lysine and pulses on the sulphur pair, so rice and lentils together score higher than either on
    its own. That is why combining proteins within a single meal is unnecessary. Under it,
    <b>Short on</b> lists what fell below half a daily value, and each entry is a button that takes
    you back to the table sorted by that nutrient, so "low on selenium" becomes "here is what has
    some" in one click.</p>
    <p>Two things the totals will not do. A figure summed over foods where some were never
    assayed is marked with how many it covers, and left out of <b>Short on</b> entirely, because a
    shortfall nobody measured is not a shortfall anybody knows about. And nothing whose daily value
    is a budget rather than a target, saturated fat and sodium among them, is ever reported as
    something you are short of.</p>
    <h4>Narrow it down</h4>
    <p>All three ways of narrowing the table sit in the sidebar. <b>Search</b> at the top matches
    on name, alternative name, state and category. <b>Food categories</b> filters to one group of
    foods, and clicking the category you are already in takes you back to all of them. Star foods
    with the heart button and switch on <b>Favourites</b> to see only your shortlist.</p>
    <p><b>Export CSV</b>, above the table, writes out exactly the rows and columns you can
    currently see, so narrowing the table narrows the export with it.</p>
    <h4>What gets remembered</h4>
    <p>Your favourites, the foods and quantities in your day, saved highlight groups, visible
    columns, sort order and light or dark mode are kept in this browser between visits. Nothing is
    sent anywhere. It is stored on your own machine, so it will not follow you to another device,
    and clearing site data will clear it. <b>Reset columns</b> restores the default view but leaves
    your favourites, your day and your saved groups alone.</p>
    <h4>Keyboard</h4>
    <p>Everything is reachable by tab. The table region itself is focusable, so you can scroll it
    sideways with the arrow keys. The detail panel tabs move with left and right arrows.</p>`],
  meth: ["Methodology and limits", `
    <h4>Where the numbers come from</h4>
    <p>Macronutrients, vitamins, minerals and fat fractions follow USDA FoodData Central entries for
    the food in the state listed: cooked where it says cooked, dry where it says dry. Figures are
    representative values for the food, not a lab analysis of any particular packet.</p>
    <h4>How amino acids are calculated</h4>
    <p>Each food has a profile of amino acids expressed as grams per 100 g of <em>protein</em>. The
    figures in the table are that profile multiplied by the food's protein content, so the amino acid
    columns always reconcile with the protein column. It also means cooked and dry forms of the same
    food share one profile, because water content divides out.</p>
    <h4>The omega columns</h4>
    <p>Four named omega columns sit alongside the monounsaturated and polyunsaturated totals.
    Omega-3 is <b>ALA</b> and omega-6 is <b>LA</b>, the two your body cannot make. Omega-9
    (<b>oleic</b>) and omega-7 (<b>palmitoleic</b>) are the two main monounsaturated fractions, and
    both are counted inside the monounsaturated total rather than in addition to it.</p>
    <p>Some of these figures are <em>undifferentiated</em>, meaning USDA measured a chain length
    without separating the isomers within it. Omega-9 is the clearest case: 18:1 bundles a small
    amount of n-7 vaccenic acid in with the n-9 oleic acid. In plant foods 18:1 is overwhelmingly
    oleic, so reading it as omega-9 is the usual convention and a close approximation, but it is
    not a direct n-9 measurement. The 16:1 figure behind omega-7 has no such ambiguity.</p>
    <p>ALA and LA are published both ways, and for most foods only the undifferentiated 18:3 and
    18:2 exist. Leaving those cells empty would have emptied two thirds of both columns, including
    pecans, macadamias, tahini, coconut and cocoa, so the undifferentiated figure is used and the
    cell is marked with ${UNDIFF ? `a “${esc(UNDIFF.marker)}”` : "a marker"}. ${UNDIFF_CELLS} of
    the figures in those two columns came this way, and the rest are direct measurements of the
    named isomer. The approximation holds for the same reason it does for omega-9: in plant foods
    18:2 is essentially all LA and 18:3 essentially all ALA. The one thing that would break it is
    gamma-linolenic acid, an omega-6 sharing the 18:3 chain length, and the food here that carries
    it in any quantity is hemp, which has a directly measured figure and takes no approximation.
    A few foods have no measurement either way and show a dash rather than a zero.</p>
    <p><b>ALA is not EPA and DHA.</b> The long-chain omega-3s that the brain, eyes and heart
    actually use are built from ALA by a pathway that converts only a few per cent of it, less in
    men than in women, and less still on a diet high in omega-6, which is what the two columns
    read together are for. No whole plant food is a meaningful direct source: USDA finds EPA in
    four of these ${FOODS.length} foods and DHA in one, all at traces as likely to be assay noise
    as anything real, which is why neither gets a column. The dependable vegan source is an algae
    oil supplement, which is where the fish get theirs. The seaweeds in this table are not a
    substitute for it; the algae cultured for oil are different organisms from nori and kelp.</p>
    <h4>The saturated fats</h4>
    <p>The macronutrient group carries a single saturated fat total. The three columns here say
    what it is made of, because the fractions behave differently enough that the total on its own
    hides more than it shows. <b>Palmitic (16:0)</b> is the most abundant and the one dietary
    advice about saturated fat is mostly about, the fraction most consistently shown to raise LDL
    cholesterol. <b>Stearic (18:0)</b> is largely converted into oleic acid in the body and leaves
    LDL roughly where it found it. <b>Lauric (12:0)</b> raises LDL but raises HDL alongside it.</p>
    <p>The three are a subset of the saturated total and never the whole of it, since the shorter
    and longer chains are left out, so they will usually sum to less than the figure above them.
    None carries a daily value, because the saturated total already does and counting the same
    grams twice would overstate them. Coconut is the food this makes legible: almost all of its
    saturated fat is lauric, which is close to absent everywhere else in the table, and is why
    coconut never sits neatly on either side of the saturated fat argument.</p>
    <h4>The plant compounds group</h4>
    <p>Five carotenoids: the orange, red and yellow pigments plants make, which is why the richest
    figures sit with the carrots, peppers, tomatoes and dark leaves rather than with the pulses and
    grains. <b>Beta-carotene</b>, <b>alpha-carotene</b> and <b>beta-cryptoxanthin</b> are provitamin
    A, meaning the body converts them into retinol; <b>lutein and zeaxanthin</b> concentrate in the
    retina; <b>lycopene</b> does neither and is counted for its own sake.</p>
    <p>None of the five carries a daily value here, deliberately. Only vitamin A has one, and the
    vitamin A column already counts the provitamin-A carotenoids through it, so giving them
    percentages of their own would show the same intake twice. Conversion is also poor and varies
    between people, so a microgram of beta-carotene is not a microgram of retinol.</p>
    <p>Then three flavonoid subclasses: <b>anthocyanidins</b>, the red and purple berry pigments;
    <b>flavan-3-ols</b>, the catechins behind the astringency of tea and apple skin; and
    <b>flavonols</b>, quercetin and its relatives, the most widespread of the three in vegetables.
    These are the closest the table comes to answering "what about antioxidants", and they come
    from a different USDA release than everything else, the Database for the Flavonoid Content of
    Selected Foods. It measured only ${FLAV_REACHED} of these ${FOODS.length} foods, so these
    columns are mostly blank, and that is the state of the evidence rather than an
    omission.</p>
    <p><b>A blank here is not a zero, and the two are worth telling apart.</b> USDA published
    individual compounds, not subclass totals, so each figure is a sum. A sum is only shown where
    the whole subclass was measured. Cocoa powder has the largest single flavan-3-ol figure in the
    source, but only two of the five catechins were ever measured for it, so it shows no data
    rather than a total that understates by an unknown amount.</p>
    <p>There is deliberately no <em>total flavonoid</em> column and no antioxidant score. A total
    would sum a different set of subclasses for each food, so two rows could not be compared. As
    for a single antioxidant number, USDA withdrew its own ORAC database in 2012, on the grounds
    that antioxidant capacity measured in a test tube predicts nothing useful in the body.</p>
    <p>Phytosterols, phytic acid, isoflavones and proanthocyanidins are <em>not</em> here. For
    phytic acid, isoflavones and proanthocyanidins, SR Legacy carries no figures at all.
    Phytosterols it does carry, for 24 of these foods, but the 24 are the wrong ones. Sesame,
    sunflower seeds and pistachios tower over a long tail of fruit and vegetables at single-figure
    milligrams, while almonds, walnuts and avocado, the foods most associated with phytosterols,
    have no figure whatever. A column that ranks foods by which of them happened to be assayed
    would say more about USDA's sampling than about the foods, which is worse than no column.
    USDA's expanded flavonoid release would reach twice as many of these foods, but it gets there
    by imputing values from other foods rather than measuring them, which is the one thing this
    table will not do.</p>
    <h4>Amino acid score and the limiting amino acid</h4>
    <p>The protein quality figures are <em>derived</em> from the columns already in the table, not
    sourced separately, so they cannot disagree with the rest of the row. Each essential amino acid
    is expressed as milligrams per gram of protein and compared with the FAO/WHO 2007 requirement
    pattern for adults. The lowest of those ratios is the amino acid score, and the amino acid
    responsible is the <b>limiting</b> one, the one that caps how much of the protein your body can
    put to use.</p>
    <p>Methionine is scored together with cysteine, and phenylalanine together with tyrosine,
    because each pair spares the other. A score at or above 100% means the food meets the adult
    pattern across the board; below it, combining that food with one richer in the limiting acid
    raises the total. This is why grains and pulses complement each other so neatly: cereals run
    short on lysine, pulses on the sulphur pair, and each covers the other's gap.</p>
    <p>Two caveats. The score says nothing about <em>digestibility</em>, which is what fuller
    measures like PDCAAS and DIAAS add, and plant proteins generally digest less completely than
    animal ones. And a score computed on a food with very little protein is mostly rounding noise,
    so it is not shown below about a gram per 100 g.</p>
    <h4>What a day's totals can and cannot tell you</h4>
    <p>The <b>My day</b> view multiplies each food by the grams you entered and adds the results
    up. That is the only basis on which a shortfall means anything, and it is worth being clear
    about what it does not know.</p>
    <p><b>It only knows what you listed.</b> A nutrient reading zero is far more often a food you
    have not added than a nutrient you are short of. Nothing here is a record of what you ate.</p>
    <p><b>A total summed over foods that were never assayed is marked as one.</b> Cysteine has no
    figure for ${FOODS.filter(f => val(f, "cys") === null).length} of these ${FOODS.length} foods
    and the flavonoid columns are blank for most, so a day of half a dozen foods will routinely
    produce sums over three of them. Those carry the count they cover, they are left out of
    <em>Short on</em>, and the day's amino acid score is withheld altogether if any food in the
    list is missing any of the nine. A partial sum that reads like a complete one is the same
    failure the flavonoid columns are built to refuse, and a totals view would otherwise produce
    it in every column rather than one.</p>
    <p><b>Amino acids are scored against body weight.</b> FAO/WHO publishes adult requirements per
    kilogram, so the day view takes one figure for that and defaults to 70 kg. Those targets are
    derived from the same requirement pattern the per-food score uses, multiplied back by the
    0.66 g/kg protein requirement the pattern is built on, so the two cannot disagree. Nothing else
    on the page uses your weight.</p>
    <p><b>Intake is not absorption</b>, and this is where that matters most. Plant iron is
    non-haem and poorly absorbed alone, though vitamin C in the same meal multiplies it. Calcium
    from oxalate-rich greens is largely unavailable. Phytates in wholegrains and pulses hold back
    zinc and iron. A total comfortably over 100% can still leave you short, and no figure here
    accounts for it.</p>
    <p><b>Iodine has no column, so it has no total.</b> A view that lists what you are short of
    implies the list is complete. It is not, and iodine is a real requirement and a common gap on a
    plant-based diet. Nor are there upper limits: the one worth knowing unaided is selenium, where
    a couple of Brazil nuts covers a day and a handful every day is too many.</p>
    <h4>What "daily value" means here</h4>
    <p>Percentages use general adult reference intakes: FDA Daily Values for vitamins and minerals,
    and the FAO/WHO 2007 scoring pattern where amino acids are concerned. They are a common yardstick,
    not a personal target. Requirements shift with age, sex, body size, pregnancy, lactation,
    medication and illness.</p>
    <h4>Known caveats</h4>
    <ul>
      <li><b>Protein is estimated from nitrogen.</b> Standard analysis multiplies nitrogen by 6.25,
      which counts non-protein nitrogen too. This overstates protein in some foods, spirulina
      especially, because it is rich in nucleic acids.</li>
      <li><b>Sulphur and aromatic amino acids work in pairs.</b> Methionine is spared by cysteine and
      phenylalanine by tyrosine. Judge those four columns as two pairs, not four separate rows.</li>
      <li><b>Selenium tracks the soil, not the seed.</b> The Brazil nut figure is a typical value and
      real nuts vary by more than an order of magnitude.</li>
      <li><b>Vitamin E here is alpha-tocopherol alone.</b> It is the form that carries a daily value
      and the one the body holds on to, but it is not the only one in food. Most nuts and seeds
      contain more gamma-tocopherol than alpha, pumpkin seeds, pecans, walnuts and flaxseed
      especially, and none of that is counted in this column. Read it as the vitamin E your body
      will bank rather than as everything in the food with vitamin E activity.</li>
      <li><b>Fortification is marked where it drives the figure.</b> Most rows are for the
      unfortified food, and a commercial packet of plant milk or cereal will beat them. A few are
      the other way round, because no unfortified version of the product is really sold:
      ${andList(FORTIFIED_FOODS.map(fullName))}. Those values carry
      ${FORTIFIED ? `a “${esc(FORTIFIED.marker)}”` : "a marker"} with a note under the table.
      Yeast contains no B12 whatever, so every microgram in the yeast rows was put there by the
      maker, along with most of their thiamin, riboflavin, niacin and folate; the same goes for
      soy milk's B12, calcium and vitamin D. Iodine is not a column, so fortification with it is
      not shown anywhere.</li>
      <li><b>Seaweed is not a B12 source.</b> Nori and kelp show zero here, which is the right
      answer for the wrong-looking reason. They do contain corrinoids that some assays count as
      B12, but they are inactive analogues the body cannot use, and there is evidence that they
      compete with real B12 rather than substituting for it. A seaweed figure quoted elsewhere as
      B12 is usually measuring those. The same caution applies to tempeh and miso, whose traces
      come from bacteria on the surface and are too small and too variable to rely on. There is no
      dependable unfortified plant source, which is why a supplement is the standard advice.</li>
      <li><b>Iodine is not included</b>, as reliable per-food values are scarce for plant foods.</li>
      <li><b>“n/a” is not a zero.</b> It means USDA publishes no figure for that nutrient in that
      food. Amino acids are the common gap: they are expensive to assay, so they are measured for
      staples and often skipped for minor vegetables and fruit. ${andList(NO_AMINOS.map(fullName))}
      ${NO_AMINOS.length === 1 ? "has" : "have"} no published amino acid analysis at all, and
      ${PART_AMINOS.length} more ${PART_AMINOS.length === 1 ? "is" : "are"} partial:
      ${andList(PART_AMINOS.map(fullName))}. A single missing amino acid is enough, since the
      score is capped by the scarcest one and there is no way to know whether the missing column
      was the scarcest. Where that is the case the food gets no amino acid score, rather than a
      score of zero.</li>
    </ul>`],
  about: ["About this database", `
    <p>A single-page reference for the nutrient content of plant-based wholefoods: ${FOODS.length} foods
    across ${NUTS.length} nutrients, all per 100 g, all sortable and filterable.</p>
    <h4>Why per 100 g</h4>
    <p>It is the only basis on which foods compare fairly. Bear in mind that cooked legumes and
    grains are mostly water, so a realistic portion of lentils delivers far more than the per-100 g
    figure suggests, while nobody eats 100 g of spirulina.</p>
    <h4>Not medical advice</h4>
    <p>This is reference data, not a nutrition plan. If you are making significant dietary changes,
    managing a health condition, pregnant, or feeding a child, talk to a dietitian or your GP.
    One specific note: vitamin B12 is not reliably available from unfortified plant foods, and a
    supplement or reliably fortified food is standard advice on a vegan diet.</p>`],
};
let lastFocus = null;
function openDialog(k) {
  const [t, b] = DLG[k];
  lastFocus = document.activeElement;
  $("#dlgT").textContent = t; $("#dlgB").innerHTML = b;
  $("#dlg").showModal();
}
$("#dlgX").onclick = () => $("#dlg").close();
$("#dlg").addEventListener("close", () => lastFocus?.focus());
$("#dlg").addEventListener("click", e => { if (e.target.id === "dlg") $("#dlg").close(); });

/* ---------- boot ---------- */
$("#totalFoods").textContent = FOODS.length;

// Derived from the data so adding a column cannot leave the prose behind.
const GROUP_BLURB = { macro: "macronutrients", fats: "fat fractions", amino: "amino acids",
                      vitamin: "vitamins", mineral: "minerals", plant: "plant compounds" };
$("#compBlurb").textContent = `${NUTS.length} nutrients per food: ` +
  GROUPS.map(g => `${NUTS.filter(n => n.group === g.id).length} ${GROUP_BLURB[g.id]}`)
    .join(", ").replace(/, ([^,]*)$/, " and $1") + ".";

// Default to the system theme on a first visit; a stored choice wins over it.
S.dark = matchMedia("(prefers-color-scheme: dark)").matches;
loadPrefs();

// Reflect restored state in the controls that hold their own value.
applyTheme();
$("#dvBtn").setAttribute("aria-pressed", String(S.dv));
if (S.dv) $("#dvBtn").lastChild.textContent = " Show raw amounts";
$("#basisBtn").setAttribute("aria-pressed", String(S.basis === "kcal"));
if (S.basis === "kcal") $("#basisBtn").lastChild.textContent = " Show per 100 g";

renderGroups();
renderCats();
renderLensSelect();
render();

if (S.favs.size) say(`${S.favs.size} saved favourite${S.favs.size === 1 ? "" : "s"} restored.`);
