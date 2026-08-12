/* ---------- the data ----------
   Shapes transcribed from src/data/nutrients.json as it actually is. Every
   nutrient carries all seven fields and every food all five; `alt` is the only
   genuinely optional key, on 41 of 131 foods.
   `notes` is optional because build.mjs and this file both read it as
   `data.notes || []`. The type describes what the code believes, not what
   today's data file happens to contain. */
type NutrientGroup = "macro" | "fats" | "amino" | "vitamin" | "mineral" | "carbdetail" | "acids" | "plant" | "other";
type Unit = "kcal" | "g" | "mg" | "µg";

interface Nutrient {
  id: string; label: string; group: NutrientGroup;
  unit: Unit; dv: number | null; dp: number; why: string;
  /* An evidence column. Its figures come from outside USDA and live in EV,
     keyed by food slug, rather than in any food's `v`. Optional because the
     other 70 columns do not carry it, and the absence is what makes them
     ordinary. See the EvidenceCell block below. */
  evidence?: true;
  /* Where this column sits on screen, as the id of the one it follows. Only an
     evidence column needs it, because only an evidence column is stored
     somewhere other than where it is shown. See COL_ORDER. */
  after?: string;
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
interface Portion { label: string; g: number; }
interface Dataset { nutrients: Nutrient[]; foods: Food[]; notes?: Note[]; }

/* ---------- evidence ----------
   Components USDA defines an id for and publishes no value of, gathered from
   national food composition tables instead. Six states, because "no number"
   means six different things here and collapsing them throws away the most
   useful thing the data says: a component assayed and found absent is a
   finding, and a component nobody assayed is evidence of nothing. A food with
   no entry at all is a seventh thing again, and is represented by absence.

   `range` is not a failure to decide. Where sources disagree beyond 2x with no
   one of them odd enough to drop, the breadth is the honest answer: kidney bean
   biotin is 3.7 in Japan, 0.5 in the UK and 1.3 in Australia. `disputed` keeps
   a dropped outlier named rather than deleting it. */
type EvState = "measured" | "range" | "trace" | "not-detected" | "estimated" | "not-measured";
/* A cell carries only what varies between components of one food. The unit is
   on the column definition in nutrients.json, the basis is "per 100 g" for
   every cell in the file, and the preparation and match grade belong to the
   food's mapping rather than to any one component. Holding a unit here as well
   would let the two disagree; not holding it makes that unrepresentable. */
interface EvidenceCell {
  state: EvState;
  value?: number; low?: number; high?: number;
  sources?: string[];
  n?: number; disputed?: { source: string; value: number }[];
}
/* One reviewed mapping from this page's food to a source's row, and the cells
   that mapping made reachable. `match` is graded by a human and `proxy` must
   stay visible to a reader wherever its values appear. */
interface EvidenceFood {
  prep: string;
  match: "exact" | "close" | "proxy";
  cells: Record<string, EvidenceCell>;
}
interface EvSource {
  title: string; publisher: string; country: string; url: string; quality: string;
}

/* ---------- bioavailability ----------
   What helps or hinders absorption of a nutrient. Explanation, never
   arithmetic: nothing in here is ever applied to a figure, because every
   absorption factor is a range that depends on the meal, the person and their
   iron status, and a single number would be invented data wearing a
   measurement's clothes.

   The agent is the half worth looking at. The other side of an interaction is
   frequently not a column: phytate, oxalate and tannins are substances the
   table has no figure for, and soaking, sprouting and fermenting are not
   substances at all. A model that only related nutrient ids to nutrient ids
   could not have carried most of what matters here. */
type InteractionAgent =
  | { kind: "nutrient"; id: string }
  | { kind: "food"; slug: string }
  | { kind: "substance"; label: string }
  | { kind: "practice"; label: string };
interface Interaction {
  id: string;
  /* An array, so one record serves every nutrient it is true of. The five
     carotenoids share one fat entry rather than five copies that could drift. */
  affects: string[];
  direction: "up" | "down";
  agent: InteractionAgent;
  short: string;
  /* What the My day hint needs in order to stay honest. A "same meal" record
     can never be reported as having happened, because a day is not a meal. */
  when: "same meal" | "same day" | "preparation";
  text: string;
  /* An array, because a record may rest on more than one study. The oxalate
     entry quotes spinach from one paper and kale from another, and an earlier
     single-source field let it name only the first. build.mjs now refuses both
     a citation that does not resolve and a source nothing cites. */
  cites: string[];
}
interface Interactions { sources: Record<string, string>; interactions: Interaction[]; }

/* ---------- what food alone will not supply ----------
   The companion to the interactions above. That data says you absorb less of a
   figure than it looks; this says the figure is not here at all.

   Three tiers, and they are different kinds of claim rather than degrees of the
   same one:
     gap     food will not supply this. Asserts something about the world, so
             build.mjs requires a citation.
     plan    present but thin. Describes this table, and its evidence is
             computed from it rather than quoted.
     unseen  the dataset cannot show this. Says only what is absent, which the
             data itself demonstrates. */
type GapTier = "gap" | "plan" | "unseen";
interface Gap {
  id: string;
  tier: GapTier;
  /* The columns this is about. Empty where there is none, which is the case
     for iodine and for everything in the unseen tier, and is exactly why the
     evidence below has to cope with having nothing to compute. */
  nutrients: string[];
  label: string;
  role: string;
  why: string;
  closing: string;
  cites: string[];
}
interface Gaps { sources: Record<string, string>; gaps: Gap[]; }

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
  dayTab: "inputs" | "day" | "totals";
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
/* Every key of src/data/icons.json, written out rather than described as
   `Record<string, string>`. An index signature makes each read `string |
   undefined` under noUncheckedIndexedAccess, and interpolating undefined into a
   template is legal, so a key renamed in that file would put the literal word
   "undefined" into the page at seventeen sites with nothing to report it.
   Listed out, each read is a plain string and a rename that is not carried
   across is a compile error at every site that reads it. This list has to be
   kept level with icons.json, which is the one thing the compiler cannot check
   here: the file is inlined by build.mjs rather than imported. */
declare const I: Record<
  "leaf" | "compare" | "heart" | "heartFull" | "help" | "book" | "info" | "dl" |
  "moon" | "sun" | "search" | "x" | "pct" | "grid" | "eye" |
  "macro" | "fats" | "amino" | "vit" | "min" | "carb" | "acid" | "up" | "down" | "sortable" |
  "right" | "plant" | "other" | "plus" | "minus", string>;
/* Portion weights, injected by build.mjs from src/data/portions.json the same
   way DATA is. 190 of the 193 foods have at least one; the three that do not
   have no USDA row at all, so an index read is genuinely optional here rather
   than a missing measurement being papered over. */
declare const P: Record<string, Portion[]>;
/* Bioavailability interactions, injected the same way. build.mjs validates that
   every record points at a nutrient and a food that exist and cites a source
   that resolves, so the reads below can be direct. */
declare const X: Interactions;
/* The nutrient gaps, injected the same way. */
declare const G: Gaps;
/* The evidence values, keyed by food slug then component id, and the sources
   they cite. Injected the same way, and validated by build.mjs the same way:
   every cell names a food and a component that exist, and every value names a
   source that resolves. Reads below can be direct because of that. */
declare const EV: Record<string, EvidenceFood>;
declare const SRCS: Record<string, EvSource>;

const NUTS = DATA.nutrients, FOODS = DATA.foods;
const GROUPS = [
  { id: "macro",   label: "Macronutrients", icon: I.macro },
  { id: "fats",    label: "Omega & fats",   icon: I.fats  },
  { id: "amino",   label: "Amino acids",    icon: I.amino },
  { id: "vitamin", label: "Vitamins",       icon: I.vit   },
  { id: "mineral", label: "Minerals",       icon: I.min   },
  { id: "carbdetail", label: "Carbohydrate detail", icon: I.carb },
  { id: "acids",   label: "Organic acids",  icon: I.acid },
  { id: "plant",   label: "Plant compounds", icon: I.plant },
  { id: "other",   label: "Anti-nutrients",  icon: I.other },
] satisfies { id: NutrientGroup; label: string; icon: string }[];
/* Evidence columns are deliberately absent from IDX, so val() throws on one.
   That is the point rather than an oversight: an evidence value is not a
   per-100-g figure in `v` and must never reach dayTotals(), proteinQuality() or
   a daily-value percentage. The throw turns a mistake into a loud failure on
   the spot rather than into a wrong number nobody notices. build.mjs counts the
   value arrays the same way, so the two cannot drift apart. */
const VNUTS = NUTS.filter(n => !n.evidence);
const IDX = new Map(VNUTS.map((n, i) => [n.id, i]));
const CATS = [...new Set(FOODS.map(f => f.cat))].sort();

/* Stable per-food keys. Favourites are stored by slug, never by array index,
   so a reordered or extended food list cannot silently repoint someone's saved
   favourites at the wrong food. */
const slugify = (f: Food) => `${f.name} ${f.state || ""}`
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SLUGS = FOODS.map(slugify);
const BY_SLUG = new Map(SLUGS.map((s, i) => [s, i]));

/* ---------- lookups ----------
   The ways this file reaches into the dataset, each saying in its name what a
   miss means. `nut`, `foodAt`, `slugAt` and `groupOf` throw, the same as val()
   does and for the same reason: an id or an index the dataset does not carry is
   a coding error rather than an unmeasured figure, and yielding undefined would
   carry it into the page as the word "undefined" or as a zero. `nutOpt` and
   `foodBySlug` are for the callers where a miss is a real possibility, such as
   a slug read back from a saved day list. */
/* Every column, evidence included, which is why this is not IDX. IDX answers
   "where in `v`", and an evidence column is nowhere in `v`; this answers "which
   column", and an evidence column is one of those. Reading a nutrient through
   IDX would make nut("biotin") throw in the sort comparator and the detail
   panel, both of which have every right to ask about a column that exists. */
const BY_ID = new Map(NUTS.map(n => [n.id, n]));
const nutOpt = (id: string): Nutrient | undefined => BY_ID.get(id);
const nut = (id: string): Nutrient => {
  const n = nutOpt(id);
  if (!n) throw new Error(`unknown nutrient id: ${id}`);
  return n;
};
const foodAt = (i: number): Food => {
  const f = FOODS[i];
  if (!f) throw new Error(`no food at index ${i}`);
  return f;
};
const slugAt = (i: number): string => {
  const s = SLUGS[i];
  if (s === undefined) throw new Error(`no food at index ${i}`);
  return s;
};
const foodBySlug = (slug: string): Food | undefined => {
  const i = BY_SLUG.get(slug);
  return i === undefined ? undefined : FOODS[i];
};
/* GROUPS lists all eight NutrientGroup values today, which is why this cannot
   miss for a nutrient's own group. The `satisfies` on it does not hold it to
   that: it constrains each id to be a group, not the set to be complete, so
   deleting a row would still type-check and would reach the throw below on the
   detail render path. Throwing is the right answer if that ever happens. */
const groupOf = (id: NutrientGroup) => {
  const g = GROUPS.find(x => x.id === id);
  if (!g) throw new Error(`unknown nutrient group: ${id}`);
  return g;
};
const isGroup = (x: unknown): x is NutrientGroup => GROUPS.some(g => g.id === x);

/* Renaming a food changes its key, and anything stored under the old one is
   simply dropped on load: a favourite someone starred months ago vanishes with
   nothing to say it had gone. One line per rename carries them across, which is
   cheaper than the alternative of never renaming a food.
   Navy beans became Haricot beans, the name the rest of this table's British
   spellings would lead you to expect. */
const RENAMED: Record<string, string> = { "navy-beans-cooked": "haricot-beans-cooked" };
const currentSlug = (s: string) => RENAMED[s] || s;

/* ---------- per-cell notes ----------
   Some figures are true of the product but not of the food. Nutritional yeast
   is sold fortified, so its B vitamins are whatever the maker added and the
   unfortified flakes have almost none; the same goes for the B12, calcium and
   vitamin D in soy milk. That varies cell by cell rather than food by food,
   which is why the note is keyed on both: soy milk's protein is still soy
   milk's protein. Keyed by slug, so reordering the food list cannot repoint a
   note at the wrong row. */
const NOTES = DATA.notes || [];
const NOTE_AT = new Map<string, Note>();
for (const note of NOTES)
  for (const [slug, ids] of Object.entries(note.cells || {}))
    for (const id of ids) NOTE_AT.set(`${slug} ${id}`, note);
const noteFor = (i: number, id: string) => NOTE_AT.get(`${slugAt(i)} ${id}`) || null;

/* The notes that belong to the Absorption tab rather than to the figure itself.
   Fortification and the undifferentiated marker both explain where a number
   came from; these two explain what happens to it after you eat it, which is a
   different question and a different tab. Listed by id rather than detected,
   because the distinction is editorial and not visible in the data. */
const ABSORB_NOTES = new Set(["oxalate-high", "oxalate-low"]);

/** The visible marker, plus the same thing said in words for screen readers,
 *  since a lone asterisk announces as punctuation or not at all. */
const noteMark = (note: Note) =>
  `<sup class="fnote" aria-hidden="true">${esc(note.marker)}</sup>` +
  `<span class="sr">, ${esc(note.short)}</span>`;

/* ---------- bioavailability lookups ----------
   Two indexes over one list, so an interaction is written once and read from
   either end. Iron's view lists vitamin C as an enhancer; vitamin C's view says
   it raises iron absorption. Both come out of the same record, which is the
   whole reason the data is a list of relationships rather than two lists of
   names hung off each nutrient. Two lists drift, and this project has watched
   prose drift behind data three times already. */
const INTERACTIONS = X.interactions;

/** Interactions on this nutrient's own absorption. What helps or hinders it. */
const AFFECTING = new Map<string, Interaction[]>();
for (const x of INTERACTIONS)
  for (const id of x.affects)
    AFFECTING.set(id, [...(AFFECTING.get(id) || []), x]);

/** Interactions where this nutrient is the agent. What it does to others. */
const ACTING = new Map<string, Interaction[]>();
for (const x of INTERACTIONS)
  if (x.agent.kind === "nutrient")
    ACTING.set(x.agent.id, [...(ACTING.get(x.agent.id) || []), x]);

const affecting = (id: string) => AFFECTING.get(id) || [];
const acting = (id: string) => ACTING.get(id) || [];
const hasInteractions = (id: string) => affecting(id).length > 0 || acting(id).length > 0;

/** The nutrients an interaction's agent side names, for rendering "raises
 *  absorption of iron" on vitamin C's own view. */
const affectedLabels = (x: Interaction) =>
  x.affects.map(id => nutOpt(id)?.label ?? id);

/* How many foods deep a column counts as "a meaningful source" when the
   nutrient has no daily value to measure against. 10 of 131. A judgement rather
   than a measurement, which is why it is named and in one place. */
const RANK_DEPTH = 10;

/** The nutrients a food is a meaningful enough source of to be worth showing
 *  its absorption story, by the only two rules the data allows.
 *
 *  Two rules because **39 of the 70 nutrients have no daily value**, and that
 *  includes every carotenoid and every flavonoid. A percent-of-daily-value
 *  threshold on its own would be structurally silent on carotenoids needing fat
 *  in the meal, which is one of the most useful facts here.
 *
 *  Reads val() rather than shown(), deliberately: whether a food is a good
 *  source of iron is a fact about the food, and it must not change when the
 *  reader flips the display to per 100 kcal. */
function sourceOf(f: Food): string[] {
  const out: string[] = [];
  // VNUTS, and both rules below say why. Rule 1 divides by a daily value, which
  // an evidence column has none of, and rule 2 ranks a food against the same
  // column in the other 130, which means reading `v` at a position an evidence
  // column does not occupy. build.mjs refuses an interaction naming one, so
  // this is belt and braces rather than the only guard.
  for (const n of VNUTS) {
    if (!hasInteractions(n.id)) continue;
    const v = val(f, n.id);
    if (v === null || v <= 0) continue;
    if (n.dv) {
      // Rule 1: a meaningful share of a day's reference intake.
      if (v / n.dv >= 0.1) out.push(n.id);
    } else {
      // Rule 2: no reference intake exists, so rank against the other foods.
      // Counting how many beat it is cheaper than sorting all 131.
      const at = IDX.get(n.id);
      if (at === undefined) continue;
      let above = 0;
      for (const other of FOODS) {
        const w = other.v[at];
        if (typeof w === "number" && w > v && ++above >= RANK_DEPTH) break;
      }
      if (above < RANK_DEPTH) out.push(n.id);
    }
  }
  return out;
}

/* ---------- the evidence under a gap ----------
   Measured off this table rather than typed into gaps.json, for the same reason
   the amino acid gap list and the flavonoid coverage count are computed: a
   sentence with a number in it stops being true the day the data moves, and
   nobody notices. Add a food tomorrow and these correct themselves.

   `unfortified` is the load-bearing word. The three highest B12 figures in this
   table are nutritional yeast, soy milk and yeast extract, and all three are
   whatever the manufacturer added. Counting them would turn the strongest
   evidence for the gap into evidence against it. */
/* Three states, not two, and the middle one carries most of the weight. A cell
   that was assayed and came back with nothing is a *finding of absence*; a cell
   nobody assayed is not evidence of anything. Collapsing them into "carries a
   figure" throws away the strongest thing this table has to say: 123 of these
   131 foods were measured for B12 and found to contain none. */
interface GapEvidence {
  above: number; zero: number; unassayed: number; of: number;
  fortified: number; bestPc: number | null; bestFood: string | null;
}

function gapEvidence(id: string): GapEvidence | null {
  const n = nutOpt(id);
  // Every count below is over `v`, and an evidence column is not in it.
  // build.mjs refuses a gap naming one, so this is the second lock.
  if (!n || n.evidence) return null;
  let above = 0, zero = 0, unassayed = 0, fortified = 0;
  let bestPc: number | null = null, bestFood: string | null = null;
  FOODS.forEach((f, i) => {
    const v = val(f, id);
    if (v === null) { unassayed++; return; }
    if (v === 0) { zero++; return; }
    above++;
    if (noteFor(i, id)?.id === "fortified") { fortified++; return; }
    // Only an unfortified food can be the best of them, and only a nutrient
    // with a daily value can be put as a share of one.
    if (n.dv) {
      const pc = v / n.dv * 100;
      if (bestPc === null || pc > bestPc) { bestPc = pc; bestFood = f.name; }
    }
  });
  return { above, zero, unassayed, of: FOODS.length, fortified, bestPc, bestFood };
}

/** The evidence as sentences, or "" where the entry names no column. */
function gapEvidenceText(g: Gap): string {
  const parts = g.nutrients.map(id => {
    const e = gapEvidence(id);
    if (!e) return "";
    const nm = nutOpt(id)?.label ?? id;
    const bits = [`${e.above} of ${e.of} foods ${
      e.above === 1 ? "has" : "have"} any at all`];
    if (e.fortified) bits.push(`${e.fortified} of those ${
      e.fortified === 1 ? "is" : "are"} fortification rather than the food`);
    // The finding of absence, which is the strongest part and the part a
    // "no data" phrasing would have hidden.
    if (e.zero) bits.push(`${e.zero} were measured and found to contain none`);
    if (e.unassayed) bits.push(`${e.unassayed} ${
      e.unassayed === 1 ? "was" : "were"} never assayed`);
    if (e.bestPc !== null && e.bestFood)
      bits.push(`the best unfortified is ${esc(e.bestFood)}, at ${
        Math.round(e.bestPc)}% of a daily value per 100 g`);
    return `<li><b>${esc(nm)}:</b> ${bits.join("; ")}.</li>`;
  }).filter(Boolean);
  if (!parts.length) return "";
  return `<ul class="gapev"><li class="gapevhead">Measured from this table,
    not quoted:</li>${parts.join("")}</ul>`;
}

/** How the agent is named in prose, whichever of the four kinds it is. */
function agentLabel(a: InteractionAgent): string {
  if (a.kind === "nutrient") return nutOpt(a.id)?.label ?? a.id;
  if (a.kind === "food") return foodBySlug(a.slug)?.name ?? a.slug;
  return a.label;
}

/* ---------- column presets ----------
   A preset is a named set of nutrients that cuts across the column groups, and
   selecting one narrows the table to exactly those columns.
   Only nutrients present in DATA are listed; anything unknown is dropped on load. */
const BUILTIN_LENSES = [
  { id: "essentials", name: "⭐ Essentials", ids: ["kcal","protein","carbs","fiber","fat","satfat","ala","la","vitc","vite","vitk","ca","fe","mg","k","zn","na"],
    why: "The core nutrients most people are likely to care about, keeping the table concise." },
  { id: "amino", name: "Protein & Amino Acids", ids: ["protein","his","ile","leu","lys","met","cys","phe","tyr","thr","trp","val"],
    why: "Total protein alongside the essential amino acids and their precursors." },
  { id: "fats", name: "Fats & Omegas", ids: ["fat","satfat","mufa","pufa","ala","la","palmitoleic","oleic","epa","dha"],
    why: "A detailed breakdown of dietary fats, including saturated, monounsaturated, polyunsaturated, and all major omegas." },
  { id: "carbs", name: "Fibre & Carbohydrates", ids: ["carbs","fiber","solfibre","insolfibre","resstarch","starch","sugars","fructose","glucose","sucrose","inulin","raffinose","stachyose","verbascose"],
    why: "Total carbohydrates and fibre, broken down into specific sugars, starches, and complex oligosaccharides." },
  { id: "iron", name: "Iron & Absorption", ids: ["fe","vitc"],
    why: "Plant iron is non-haem and poorly absorbed on its own. Vitamin C in the same meal can multiply uptake severalfold." },
  { id: "bone", name: "Bone Health", ids: ["ca","vitd","vitk","mg","p"],
    why: "Calcium is only half the story: vitamin D governs how much you absorb, vitamin K directs it into bone, and magnesium and phosphorus build the mineral itself." },
  { id: "methyl", name: "B12 & Folate", ids: ["b12","b9","b6","chol"],
    why: "The nutrients that keep homocysteine in check. B12 is the critical gap on a vegan diet." },
  { id: "antiox", name: "Antioxidants", ids: ["vitc","vite","se","betacar","luteinzea","lycopene","anthocyanidins","flavan3ols","flavonols","phenolics","coq10","coq9","melatonin","squalene","ergothioneine"],
    why: "Nutrients and bioactive compounds that limit oxidative damage." },
  { id: "phyto", name: "Plant Compounds", ids: ["phytosterols","phenolics","anthocyanidins","flavan3ols","flavonols","lignans","proanthocyanidins","glucosinolates","coq10","coq9","melatonin","squalene","ergothioneine"],
    why: "A comprehensive look at health-promoting phytochemicals and bioactives." },
  { id: "electro", name: "Electrolytes", ids: ["na","k","ca","mg"],
    why: "The minerals governing fluid balance, nerve signalling and muscle contraction." },
  { id: "minabs", name: "Mineral Absorption", ids: ["phytate","oxalate","oxalate_sol","fe","ca","zn"],
    why: "Anti-nutrients that can bind to essential minerals and inhibit their absorption." },
  { id: "all", name: "All nutrients", ids: ["__ALL__"],
    why: "Shows the full available nutrient set in the entire database." }
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
  // Every group on by default, derived from GROUPS rather than listed, so a
  // seventh group is shown the day it is added instead of being invisible
  // until somebody remembers this line.
  groups: new Set(GROUPS.map(g => g.id)),
  sort: { id: "__name", dir: 1 },
  q: "", cat: "",
  sel: 0, favs: new Set(), favsOnly: false,
  dv: false, basis: "g", view: "table", tab: "overview",
  chartNut: "protein", dark: false,
  lens: "essentials", custom: [],
  day: [], kg: DEFAULT_KG, wUnit: "kg", dayTab: "inputs",
};

/** Anything that is not a usable number becomes zero rather than reaching a
 *  total: one NaN in one quantity would turn all 66 totals into NaN. */
const clampG = (g: unknown) => {
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
const clampKg = (kg: number) => {
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

const kgToStLb = (kg: number) => {
  const lb = Math.round(kg * LB_PER_KG);
  return { st: Math.floor(lb / LB_PER_ST), lb: lb % LB_PER_ST };
};
const stLbToKg = (st: number, lb: number) => (st * LB_PER_ST + lb) / LB_PER_KG;

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

const lensById = (id: string) => id
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
    // The typeof is not ceremony: this is stored data, and currentSlug returns
    // a number unchanged if a favourite was written as one.
    S.favs = new Set(p.favs.map(currentSlug)
      .filter((s: unknown): s is string => typeof s === "string" && BY_SLUG.has(s)));

  if (Array.isArray(p.groups)) {
    const g: NutrientGroup[] = p.groups.filter(isGroup);
    if (g.length) S.groups = new Set(g);
  }
  // BY_ID rather than IDX: an evidence column sorts, on the midpoint of a range
  // where it has one, so a saved sort on it has to survive a reload.
  if (p.sort && (p.sort.id === "__name" || BY_ID.has(p.sort.id)))
    S.sort = { id: p.sort.id, dir: p.sort.dir === 1 ? 1 : -1 };
  if (typeof p.dv === "boolean") S.dv = p.dv;
  if (p.basis === "g" || p.basis === "kcal") S.basis = p.basis;
  if (typeof p.dark === "boolean") S.dark = p.dark;
  if (CATS.includes(p.cat)) S.cat = p.cat;
  // IDX rather than BY_ID here, and deliberately: the chart scales bars against
  // a maximum, which is arithmetic over a single figure, and a range is not
  // one. Evidence columns are absent from the chart's own list for the same
  // reason, so this refuses a saved choice the list can no longer offer.
  if (IDX.has(p.chartNut)) S.chartNut = p.chartNut;

  // The day list, cleaned the same way favourites are: an entry naming a food
  // that no longer exists is dropped rather than left to render as a blank row,
  // and a quantity that arrives as text or out of range is clamped rather than
  // allowed to put a NaN into every total.
  if (Array.isArray(p.day)) {
    S.day = p.day
      .filter((e: { slug?: unknown; g?: unknown }) => e && typeof e.slug === "string")
      .map((e: { slug: string; g?: unknown }) => ({ slug: currentSlug(e.slug), g: clampG(e.g) }))
      .filter((e: DayEntry) => BY_SLUG.has(e.slug));
  }
  if (typeof p.kg === "number" && isFinite(p.kg)) S.kg = clampKg(p.kg);
  if (p.wUnit === "kg" || p.wUnit === "stlb") S.wUnit = p.wUnit;

  if (Array.isArray(p.custom)) {
    S.custom = p.custom
      .filter((l: { id?: unknown; name?: unknown; ids?: unknown; why?: unknown }) =>
        l && typeof l.name === "string" && Array.isArray(l.ids))
      .map((l: { id?: unknown; name: string; ids: unknown[]; why?: unknown }) => ({
        id: String(l.id || ""), name: l.name.slice(0, 40),
        // BY_ID: a preset only chooses columns, so an evidence column belongs
        // in one, and filtering on IDX would drop it silently on reload.
        ids: l.ids.filter((x: unknown): x is string => typeof x === "string" && BY_ID.has(x)),
        ...(typeof l.why === "string" && l.why ? { why: l.why.slice(0, 240) } : {}) }))
      .filter((l: Lens) => l.id && l.ids.length);
  }
  if (typeof p.lens === "string" && lensById(p.lens)) S.lens = p.lens;

  // Favourites-only with nothing starred would render an empty table on load.
  S.favsOnly = p.favsOnly === true && S.favs.size > 0;
}

/* The page's own elements are part of the build: src/index.html ships in the
   same artifact, so a selector that does not match is a build error rather
   than a runtime condition to handle. Throwing says so at the point of
   failure instead of yielding null and failing further away. */
const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

/* For the handful of lookups whose element genuinely may not be on the page
   yet, such as a suggestion button that only exists while the list is open. */
const $opt = <T extends HTMLElement = HTMLElement>(sel: string): T | null =>
  document.querySelector<T>(sel);

/* e.target is EventTarget|null to the type system. These narrow it once, so
   handlers stop reaching for .dataset and .closest through optional calls. */
const targetEl = (e: Event): HTMLElement | null =>
  e.target instanceof HTMLElement ? e.target : null;
const targetInput = (e: Event): HTMLInputElement | null =>
  e.target instanceof HTMLInputElement ? e.target : null;

/* Element, not HTMLElement, because a click can land on an inline SVG icon
   inside a button and SVGElement does not inherit from HTMLElement.
   Element is the right floor here: closest() and matches() are both
   Element methods. */
const targetAnyEl = (e: Event): Element | null =>
  e.target instanceof Element ? e.target : null;

/* The regex matches exactly the five keys of this table, so the fallback is
   unreachable. It is there because a lookup by string key cannot prove that to
   the compiler, not because a sixth character is expected. */
const ESCAPES: Record<string, string> =
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ESCAPES[c] ?? c);
const say = (m: string) => { $("#live").textContent = m; };

/* ---------- data helpers ---------- */
/* ---------- column order ----------
   Two different sequences live in nutrients.json and this is where they part.

   **Position in the array is the position of the value** in every food's `v`,
   which is why nothing may be reordered there: moving one entry silently
   repoints 131 rows, and the result looks like plausible data rather than an
   error. An evidence column occupies no `v` position at all, so it is appended
   at the end of the file where it disturbs no index.

   **Order on screen is this list.** Left as file order it put two macro columns
   and one vitamin column after the plant group, which broke the header outright:
   the label row draws one cell per group with a colspan, so a group appearing
   twice puts every label from there rightwards over the wrong columns.

   So: group order first, then an optional `after` naming the column a nutrient
   belongs beside. Only the three evidence columns carry one, and build.mjs
   checks that each names a real column in the same group. Computed once,
   because none of it depends on state. */
const GROUP_AT = new Map(GROUPS.map((g, i) => [g.id, i]));
const COL_ORDER = (() => {
  const out = NUTS.map((n, i) => ({ ...n, i }))
    .sort((a, b) => (GROUP_AT.get(a.group) ?? 0) - (GROUP_AT.get(b.group) ?? 0));
  /* In file order, so a chain resolves: insoluble fibre sits after soluble
     fibre, which has already been moved into place behind total fibre. */
  for (const n of out.filter(x => x.after)) {
    const anchor = out.findIndex(x => x.id === n.after);
    if (anchor === -1) continue;               // build.mjs refuses this case
    out.splice(out.indexOf(n), 1);
    out.splice(out.findIndex(x => x.id === n.after) + 1, 0, n);
  }
  return out;
})();
const cols = () => {
  if (S.lens === "all") return COL_ORDER;
  if (S.lens) {
    const l = lensById(S.lens);
    if (l) return COL_ORDER.filter(c => l.ids.includes(c.id));
  }
  return COL_ORDER.filter(n => S.groups.has(n.group));
};
/* Takes Pick<Food, "v"> rather than Food because it reads nothing but the
   value vector. That is also why the day view can hand it a day's totals
   wrapped as { v: [...] } rather than a real food. */
const val = (f: Pick<Food, "v">, id: string): number | null => {
  const i = IDX.get(id);
  if (i === undefined) throw new Error(`unknown nutrient id: ${id}`);
  return f.v[i] ?? null;
};

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
function gramsPer100kcal(f: Food) {
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
function shown(f: Food, n: Nutrient) {
  /* An evidence column is not a per-100-g figure in `v` and has no basis to
     rescale, so it never reaches val(), which would throw on it. Returning null
     rather than throwing here keeps the four call sites honest without making
     each one guard before it calls: a caller that forgets evidence gets a blank
     cell it will notice, and one that remembers goes through ev() instead. */
  if (n.evidence) return null;
  const v = val(f, n.id);
  if (S.basis === "g" || n.id === "kcal" || v === null) return v;
  const k = val(f, "kcal");
  return k ? v / k * KCAL_BASIS : null;
}

/* ---------- evidence values ----------
   Undefined is a real answer here and means no data, so this is one of the few
   helpers that returns undefined rather than throwing. The distinction the rest
   of the page rests on: undefined is nobody has an entry for this food and this
   component, while a cell reading `not-measured` is a source that carries the
   food, carries the component, and says it did not assay this one. */
const ev = (slug: string, id: string): EvidenceCell | undefined => EV[slug]?.cells[id];
/* The mapping behind a food's cells. Separate from ev() because a reader needs
   the match grade even where they are looking at one component. */
const evFood = (slug: string): EvidenceFood | undefined => EV[slug];

/* Six states and six renderings, with no default branch: the union is closed,
   so a seventh state added to the data without being added here is a compile
   error rather than a blank cell. */
const evText = (c: EvidenceCell | undefined, dp: number): string => {
  if (!c) return "no data";
  switch (c.state) {
    case "measured":  return c.value!.toFixed(dp);
    case "range":     return `${c.low!.toFixed(dp)} to ${c.high!.toFixed(dp)}`;
    case "estimated": return c.value!.toFixed(dp);
    case "trace":         return "trace";
    case "not-detected":  return "none detected";
    case "not-measured":  return "not measured";
  }
};

/* A range sorts by its midpoint, which is the only defensible single point on
   it. Everything that is not a figure sorts as absent, which is where n/a
   already sorts. */
const evSortKey = (slug: string, id: string): number | null => {
  const c = ev(slug, id);
  if (!c) return null;
  if (c.state === "measured" || c.state === "estimated") return c.value ?? null;
  if (c.state === "range") return (c.low! + c.high!) / 2;
  return null;
};

/* The table gives every row a state line under its name, so "Bell pepper" three
   times over is unambiguous there. The chart has one line per bar and would
   show three identical labels, so a name shared by more than one food takes its
   state with it. Only the ambiguous ones, to keep the label column short. */
const NAME_COUNT = FOODS.reduce(
  (m, f) => m.set(f.name, (m.get(f.name) || 0) + 1), new Map<string, number>());
const fullName = (f: Food) =>
  (NAME_COUNT.get(f.name) ?? 0) > 1 && f.state ? `${f.name}, ${f.state}` : f.name;

const isFav = (i: number) => S.favs.has(slugAt(i));
function toggleFav(i: number) {
  isFav(i) ? S.favs.delete(slugAt(i)) : S.favs.add(slugAt(i));
  // Un-starring the last favourite while filtered to favourites would leave an
  // empty table with no obvious way back, so drop the filter with it.
  if (S.favsOnly && !S.favs.size) S.favsOnly = false;
  savePrefs();
}

/** Plain text, for aria-labels and anywhere markup would leak. "n/a" marks a
 *  nutrient nobody has published a figure for, which is not the same as zero. */
function fmtText(v: number | null, n: Nutrient) {
  if (v === null) return "n/a";
  if (S.dv && n.dv) return v === 0 ? "0%" : Math.round((v / n.dv) * 100) + "%";
  if (v === 0) return "0";
  return v.toFixed(n.dp);
}

/** Display form: same thing, with the "n/a" marked up so it can be greyed. */
function fmt(v: number | null, n: Nutrient) {
  return v === null
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

function proteinQuality(f: Pick<Food, "v">) {
  const protein = val(f, "protein");
  // Below about a gram per 100 g the ratios are dominated by rounding, and
  // calling something "a complete protein" on that basis would be misleading.
  if (!protein || protein < 1) return null;

  // An unmeasured amino acid is not a zero. Treating it as one would report a
  // score of 0% and name a limiting acid for a food nobody has ever assayed,
  // which is a fabricated conclusion rather than a missing one. Checked while
  // summing rather than in a pass of its own, so there is no point at which a
  // missing figure could reach the arithmetic below.
  const scored: { label: string; pc: number }[] = [];
  for (const p of FAO_PATTERN) {
    let grams = 0;
    for (const id of p.ids) {
      const v = val(f, id);
      if (v === null) return null;
      grams += v;
    }
    const mgPerG = grams * 1000 / protein;
    scored.push({ label: p.label, pc: (mgPerG / p.mg) * 100 });
  }
  if (scored.some(s => !isFinite(s.pc))) return null;

  const limiting = scored.reduce((a, b) => (b.pc < a.pc ? b : a));
  const kcal = val(f, "kcal");
  return {
    score: Math.round(limiting.pc),      // amino acid score = the limiting one
    limiting: limiting.label,
    perKcal: kcal !== null && kcal > 0 ? protein / kcal * 100 : null,
  };
}

/** Omega-6 to omega-3, the ratio dietary guidance actually talks about. */
function omegaRatio(f: Pick<Food, "v">) {
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
const dayEntries = () => S.day.flatMap(e => {
  const i = BY_SLUG.get(e.slug);
  if (i === undefined) return [];
  const f = FOODS[i];
  return f ? [{ ...e, i, f }] : [];
});

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
  /* VNUTS, so a day has no row for an evidence column at all. That is the
     invariant made structural rather than remembered: there is no total to
     show, no percentage to take of it and nothing for "Short on" to read. It
     also keeps this array indexed exactly as IDX is, which totalOf() relies on.
     If soluble fibre ever ought to be totalled, it has to become a column in
     `v` first, with everything that implies about where its figures came
     from. */
  return VNUTS.map(n => {
    let total = 0, from = 0;
    const notes = new Set<Note>();
    for (const e of list) {
      const v = val(e.f, n.id);
      if (v === null) continue;
      from++;
      total += v * e.g / 100;                 // every figure in the table is per 100 g
      const note = noteFor(e.i, n.id);
      if (note) notes.add(note);
    }
    return { n, total: from ? total : null, from, of: list.length,
             partial: from > 0 && from < list.length, notes: [...notes] };
  });
}

/* Reads a row of dayTotals() by nutrient id, which is indexed the same way NUTS
   is. Throws on an id the dataset does not have, the same as val() and for the
   same reason: every caller here names a nutrient it knows is in the table, so
   a miss is a coding error rather than a figure nobody measured. */
const totalOf = (totals: DayTotal[], id: string): DayTotal => {
  const i = IDX.get(id);
  const t = i === undefined ? undefined : totals[i];
  if (!t) throw new Error(`no day total for nutrient id: ${id}`);
  return t;
};

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
const aaTargets = (kg: number) => FAO_PATTERN.map(p => ({
  label: p.label, ids: p.ids, target: p.mg * PROTEIN_G_PER_KG * kg / 1000,
}));

/** Each FAO entry totalled across the day, against its requirement.
 *  Withheld entirely where any contributing food is missing any of the acids
 *  in that entry, since a sum that skips a food understates it. */
function dayAminoAcids(totals: DayTotal[]) {
  const list = dayContributors();
  if (!list.length) return [];
  return aaTargets(S.kg).map(t => {
    const measured = list.every(e => t.ids.every(id => val(e.f, id) !== null));
    // Summed only where every listed food carried every acid in the entry, so
    // the totals behind it are complete ones. A null is carried through rather
    // than counted as nothing, which would understate the entry.
    const got = measured
      ? t.ids.reduce<number | null>((s, id) => {
          const v = totalOf(totals, id).total;
          return s === null || v === null ? null : s + v;
        }, 0)
      : null;
    return got === null
      ? { ...t, got: null, pc: null }
      : { ...t, got, pc: got / t.target * 100 };
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
function dayProteinQuality(totals: DayTotal[]) {
  const list = dayContributors();
  if (!list.length) return null;
  const ids = FAO_PATTERN.flatMap(p => p.ids);
  const complete = list.every(e => ids.every(id => val(e.f, id) !== null));
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
function dayStanding(totals: DayTotal[]) {
  const scored = totals
    // A type predicate rather than a plain filter: the guard is the same one,
    // but a plain filter does not carry it into the map below.
    .filter((t): t is DayTotal & { n: Nutrient & { dv: number }; total: number } =>
      t.n.dv !== null && t.n.dv > 0 && t.total !== null && !t.partial)
    .map(t => ({ id: t.n.id, label: t.n.label, pc: t.total / t.n.dv * 100,
                 budget: A_BUDGET.has(t.n.id) }));
  const by = (a: { pc: number }, b: { pc: number }) => a.pc - b.pc;
  return {
    short: scored.filter(x => !x.budget && x.pc < 50).sort(by),
    over: scored.filter(x => !x.budget && x.pc >= 100).sort((a, b) => -by(a, b)),
    budget: scored.filter(x => x.budget && x.pc >= 100).sort((a, b) => -by(a, b)),
  };
}

/* ---------- what the reader has not seen yet ----------
   The day is edited on one of its three sections and read on the other two, so
   adding a food changes two panels that are not on screen and the reader has no
   way of knowing either of them moved. Every route to a change goes through the
   four functions below, so this is the one place that has to know.

   Not in S, and deliberately not saved: it is a fact about this sitting rather
   than about the day, and a dot restored on load would be pointing at a change
   nobody made. renderDay() clears whichever section is being looked at, which
   also makes the first render after any change clear the section the change was
   made on, since that is the one showing. */
/** The three sections, their buttons and their panels. One list, so a fourth
 *  cannot be added to the strip and then be the one nobody remembered to hide,
 *  mark or clear. */
const DAY_TABS: [State["dayTab"], string, string][] = [
  ["inputs", "#dayTabInputs", "#dayInputsContainer"],
  ["day", "#dayTabDay", "#daySumContainer"],
  ["totals", "#dayTabTotals", "#dayTotalsContainer"]];

const dayUnseen = new Set<State["dayTab"]>();
function dayChanged() {
  for (const [id] of DAY_TABS) if (id !== S.dayTab) dayUnseen.add(id);
  savePrefs();
  renderDayDots();
}

/** The dots alone. Typing a quantity must not redraw the field being typed
 *  into, so that path cannot call renderDay(), and a change made by typing is
 *  exactly the kind the other two sections need to advertise. */
function renderDayDots() {
  for (const [id, tab] of DAY_TABS) $(`${tab} .tdot`).hidden = !dayUnseen.has(id);
}

/** Returns the entry the day now holds for that slug, or null if the slug names
 *  no food. The caller announces the quantity, and reading it back off the list
 *  afterwards would be looking up something this already has. */
function addToDay(slug: string, g: number = DEFAULT_G): DayEntry | null {
  if (!BY_SLUG.has(slug)) return null;
  // Adding a food already listed tops up its quantity rather than making a
  // second row that would have to be totalled and edited separately.
  const at = S.day.find(e => e.slug === slug);
  const entry = at || { slug, g: 0 };
  entry.g = clampG(entry.g + g);
  if (!at) S.day.push(entry);
  dayChanged();
  return entry;
}

function setDayGrams(slug: string, g: number | string) {
  const at = S.day.find(e => e.slug === slug);
  if (!at) return;
  const was = at.g;
  at.g = clampG(g);
  // Typing over a quantity with the same number is not a change, and a dot that
  // appears when nothing moved teaches the reader to ignore dots.
  if (at.g === was) { savePrefs(); return; }
  dayChanged();
}

function removeFromDay(slug: string) {
  S.day = S.day.filter(e => e.slug !== slug);
  dayChanged();
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
    const n = nut(id);
    const x = n.evidence ? evSortKey(slugAt(a.i), n.id) : shown(a.f, n);
    const y = n.evidence ? evSortKey(slugAt(b.i), n.id) : shown(b.f, n);
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
/* The buttons describe what is on the screen, not what `S.groups` holds. The two
   were the same thing until a preset could narrow the columns on its own: after
   that the sidebar went on showing all nine groups pressed, with their full
   counts, while the table under it held four groups and seventeen columns. A
   control that reports a state the page is not in is worse than no control. */
function renderGroups() {
  const counts: Record<string, number> = {};
  NUTS.forEach(n => counts[n.group] = (counts[n.group] || 0) + 1);
  const on: Record<string, number> = {};
  cols().forEach(n => on[n.group] = (on[n.group] || 0) + 1);
  $("#groupNav").innerHTML = GROUPS.map(g => {
    const shown = on[g.id] ?? 0, all = counts[g.id] ?? 0;
    // "3/24" only where a preset is showing part of a group. Off is off, and
    // the unpressed button already says so without a nought beside it.
    const partial = shown > 0 && shown < all;
    return `
    <li><button class="navbtn" type="button" data-grp="${g.id}"
        aria-pressed="${shown > 0}"${partial
          ? ` title="${shown} of the ${all} ${g.label.toLowerCase()} columns are showing"` : ""}>
      ${g.icon}<span>${g.label}</span>
      <span class="count">${partial ? `${shown}/${all}` : all}</span>
      ${partial ? `<span class="sr">, ${shown} of ${all} showing</span>` : ""}
      <span class="dot"></span></button></li>`;
  }).join("");
}

/* ---------- sidebar categories ----------
   The same reasoning as the nutrient groups: one control, in one place. This
   used to be a select in the toolbar, which meant the two ways of narrowing the
   table lived in two different parts of the page. Counts come from the data, so
   a category cannot appear here with nothing in it. */
function renderCats() {
  const counts: Record<string, number> = {};
  FOODS.forEach(f => counts[f.cat] = (counts[f.cat] || 0) + 1);
  const items = [["", "All foods", FOODS.length],
                 ...CATS.map(c => [c, c, counts[c]])];
  $("#catNav").innerHTML = items.map(([id, label, n]) => `
    <li><button class="navbtn sub" type="button" data-cat="${esc(id)}"
        aria-pressed="${S.cat === id}">
      <span>${esc(label)}</span>
      <span class="count">${n}</span><span class="dot"></span></button></li>`).join("");
}

function setCat(cat: string) {
  // Clicking the category already showing is the way back to everything, so it
  // does not become a filter you can switch on but not off.
  S.cat = cat === S.cat ? "" : cat;
  renderCats();
  say(S.cat ? `Showing ${S.cat} only.` : "Showing all categories.");
  savePrefs();
  render();
}

function toggleGroup(id: NutrientGroup) {
  if (S.lens) {
    /* Carry the preset's groups over as the new selection before flipping the
       one that was pressed. The sidebar now says which groups are on screen, so
       pressing one has to act on what it says: clearing the preset and flipping
       against the old `S.groups` turned "also show me amino acids" into hiding
       them, because all nine groups were still switched on underneath a preset
       that was showing four. */
    S.groups = new Set(cols().map(n => n.group));
    S.lens = "";
    renderLensSelect();
  }
  S.groups.has(id) ? S.groups.delete(id) : S.groups.add(id);
  // A table with no columns is not a view anyone asked for, so switching off the
  // last group falls back to macronutrients.
  const fellBack = !S.groups.size;
  if (fellBack) S.groups.add("macro");

  // Re-render the whole strip rather than setting the one attribute that was
  // clicked: the fallback switches a group back on that nobody pressed, and
  // leaving a preset behind turns every partial count back into a whole one.
  // The re-render replaces the button, so focus has to be put back on it.
  renderGroups();
  $(`#groupNav [data-grp="${id}"]`).focus();

  say(fellBack
    ? `The table needs at least one group, so macronutrients stay shown.`
    : `${groupOf(id).label} ${S.groups.has(id) ? "shown" : "hidden"}. ${cols().length} nutrient columns visible.`);
  savePrefs();
  render();
}

/* ---------- column presets ---------- */
/* The last entry in the menu is an action rather than a lens: choosing it opens
   the editor. A value no lens id can collide with, since every built-in id is a
   word and every custom one is "c" followed by a timestamp. */
const LENS_ADD = "__add";

function renderLensSelect() {
  // title= gives the native option tooltip on hover; the same sentence is shown
  // in full under the toolbar once a lens is selected, since option tooltips
  // are unavailable to touch and to most screen readers.
  const opt = (l: Lens) => `<option value="${esc(l.id)}"${l.id === S.lens ? " selected" : ""}` +
    `${l.why ? ` title="${esc(l.why)}"` : ""}>${esc(l.name)}</option>`;
  $("#lensSel").innerHTML =
    `<option value=""${S.lens ? "" : " selected"}>None</option>` +
    `<optgroup label="Built in">${BUILTIN_LENSES.map(opt).join("")}</optgroup>` +
    (S.custom.length ? `<optgroup label="Yours">${S.custom.map(opt).join("")}</optgroup>` : "") +
    `<option value="${LENS_ADD}" title="Build your own preset from any nutrients.">Add…</option>`;
  $("#lensSel").classList.toggle("lensactive", !!S.lens);
  renderLensNote();
}

function renderLensNote() {
  const l = lensById(S.lens), box = $("#lensNote");
  if (!l) { box.hidden = true; box.innerHTML = ""; return; }
  const cols = l.ids.map(id => nutOpt(id)?.label).filter(label => label !== undefined);
  box.hidden = false;
  box.innerHTML =
    `<b>${esc(l.name)}</b>` +
    // The fallback is what a custom preset saved without a description shows,
    // which is every custom preset until someone types one.
    (l.why ? ` ${esc(l.why)}` : ` Showing ${cols.length} nutrients.`) +
    `<span class="cols">${cols.map(esc).join(" · ")}</span>`;
}

/** A preset is now the whole answer to which columns are on screen: it filters
 *  them rather than accenting them, so it replaces the group toggles for as long
 *  as it is selected instead of switching the groups it needs back on. Pressing
 *  a group is what clears it, in toggleGroup. */
function setLens(id: string) {
  S.lens = lensById(id) ? id : "";
  const l = lensById(S.lens);
  if (l) {
    if (l.id === "all") {
      say(`Applying preset ${l.name}. Showing all columns.`);
    } else {
      say(`Applying preset ${l.name}, ${l.ids.length} columns.`);
    }
  } else {
    say("Preset cleared.");
  }
  renderLensSelect();
  // The sidebar reports which groups have columns, and choosing a preset is the
  // other half of what decides that.
  renderGroups();
  savePrefs();
  render();
}

/* ---------- what a nutrient does ----------
   A native `title` covers hovering with a mouse and nothing else, so the same
   sentence gets a visible home under the toolbar. Hover or tab onto a column
   header and it explains that nutrient; otherwise it falls back to whichever
   column the table is sorted by, which is what makes it reachable by touch,
   where tapping a header is how you sort. */
let hoverNut: string | null = null;

/* Always on screen, never toggled. Appearing on hover would push the table down
   by its own height at the moment the pointer reaches a header, moving the
   header out from under the cursor. So it holds a prompt when there is nothing
   to explain, and the box is tall enough for the longest sentence either way. */
function renderNutNote() {
  const id = hoverNut || (S.sort.id !== "__name" ? S.sort.id : null);
  const n = id ? nutOpt(id) : null;
  $("#nutNote").innerHTML = n && n.why
    ? `<b>${esc(n.label)}</b> ${esc(n.why)}${gapLine(n.id)}${absorptionLine(n.id)}`
    : `Point at a column header, or tab onto one, to read what that nutrient
       does in the body. Sorting by a column leaves its explanation here.`;
}

/** The compressed absorption view for one nutrient: what raises it, what lowers
 *  it, and what it does to others. Names only, since this box has one line to
 *  spare; the dialog carries the mechanisms and the sources.
 *
 *  Returns "" for the 50-odd nutrients with no interaction on record, which is
 *  most of them. An empty row of arrows would read as "nothing affects this",
 *  and nobody has established that. */
/** A warning above the absorption line, for the columns that are in the table
 *  but cannot be relied on. Nothing for the sixty-odd columns with no gap
 *  entry, for the same reason absorptionLine() stays silent: an empty marker
 *  would assert a reassurance nobody established. */
const GAP_BY_NUTRIENT = new Map<string, Gap>();
for (const g of G.gaps)
  for (const id of g.nutrients) GAP_BY_NUTRIENT.set(id, g);

function gapLine(id: string): string {
  const g = GAP_BY_NUTRIENT.get(id);
  if (!g) return "";
  const word = g.tier === "gap" ? "Food will not supply this" : "Thin here, worth planning";
  return `<span class="gapwarn gapwarn-${g.tier}">
    <b aria-hidden="true">!</b> ${esc(word)}.
    <button class="absorbmore" type="button" data-dlg="gaps">Nutrient gaps</button></span>`;
}

/** Up to three names, then a count. The full list is in the dialog. */
const cap3 = (names: string[]) =>
  names.length <= 3 ? names.join(", ")
    : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;

function absorptionLine(id: string): string {
  const up = affecting(id).filter(x => x.direction === "up");
  const down = affecting(id).filter(x => x.direction === "down");
  const does = acting(id);
  if (!up.length && !down.length && !does.length) return "";

  const names = (list: Interaction[]) =>
    list.map(x => esc(x.short)).join(" · ");
  const parts = [
    up.length ? `<span class="up"><b aria-hidden="true">↑</b>
      <span class="sr">Absorption raised by </span>${names(up)}</span>` : "",
    down.length ? `<span class="down"><b aria-hidden="true">↓</b>
      <span class="sr">Absorption lowered by </span>${names(down)}</span>` : "",
    // The agent side of the same records, which is what makes vitamin C's own
    // column say something useful rather than nothing. Capped at three names:
    // fat is the agent for both the carotenoid record and the fat-soluble
    // vitamin one, so spelled out in full it listed nine nutrients and made
    // this box half as tall again as any other column's.
    does.length ? `<span class="does">${does.map(x =>
      `${x.direction === "up" ? "Raises" : "Lowers"} ${esc(cap3(affectedLabels(x)))}`)
      .join("; ")}</span>` : "",
  ].filter(Boolean);

  return `<span class="absorb">${parts.join("")}
    <button class="absorbmore" type="button" data-dlg="bio">Absorption</button></span>`;
}

/* Bound to #thead itself, which survives every re-render of its contents.
   targetAnyEl, not targetEl: the sort arrows are inline SVG, so hovering or
   focusing one makes e.target an SVGElement. */
const nutOf = (e: Event): string | null => {
  const id = targetAnyEl(e)?.closest<HTMLElement>("[data-sort]")?.dataset.sort;
  return id && id !== "__name" ? id : null;
};
function previewNut(id: string | null) {
  if (id === hoverNut) return;
  hoverNut = id;
  renderNutNote();
}
$("#thead").addEventListener("mouseover", e => previewNut(nutOf(e)));
$("#thead").addEventListener("mouseleave", () => previewNut(null));
$("#thead").addEventListener("focusin", e => previewNut(nutOf(e)));
$("#thead").addEventListener("focusout", () => previewNut(null));

/* ---------- table ---------- */
/* 100 g of a dried spice is a jar of it rather than a helping, and every figure
   here is per 100 g. That is not a rounding problem, it changes what the table
   appears to say: turmeric leads iron, cinnamon leads fibre and oregano leads
   calcium, all of them ahead of foods anyone eats by the plateful. So the
   largest portion USDA publishes is pinned beside the name, for exactly the
   reason the grams per 100 kcal figure is pinned there, and by food rather than
   by category: a cup of chopped parsley really is 60 g, and saying so is as
   much the point as saying that a generous spoon of turmeric is nine. */
const SEASONINGS = "Herbs & Spices";
const seasoningPortion = (f: Food, slug: string): Portion | null => {
  if (f.cat !== SEASONINGS) return null;
  const ps = portionsFor(slug);
  return ps.length ? ps.reduce((a, b) => (b.g > a.g ? b : a)) : null;
};

/** Decorates the visible columns with everything the renderer needs to know
 *  about position: which of them starts a new group, and which one is sorted. */
function layout() {
  const c = cols();
  return c.map((n, k) => {
    // The neighbours themselves rather than their indices: absent is exactly
    // what "first column" and "last column" meant when this read k === 0.
    const prev = c[k - 1];
    return { ...n,
      gstart: !prev || prev.group !== n.group,
      sorted: S.sort.id === n.id,
    };
  });
}

const colClass = (n: ReturnType<typeof layout>[number]) => [
  n.gstart && "gstart", n.sorted && "sorted",
].filter(Boolean).join(" ");

function renderTable(r: ReturnType<typeof rows>) {
  const c = layout(), page = r;
  const nameSorted = S.sort.id === "__name";

  /* One cell per unbroken run of columns from the same group, counted off the
     columns actually on screen rather than off the group toggles. A preset
     filters the columns instead of highlighting them, so most presets leave a
     group with only some of its columns and several leave it with none, and the
     two are no longer the same question: which groups are switched on, and
     which groups have a column left. Asking the first one wrote colspan="0" for
     an emptied group, which is not "no cell" but a cell one column wide, so
     every label from there rightwards sat over the wrong columns and four empty
     labels trailed off the end. Reading the runs also covers the other
     direction, a preset showing a column whose group is switched off, which is
     reachable from saved preferences and left that column with no label. */
  const runs: { id: NutrientGroup; span: number }[] = [];
  for (const n of c) {
    const last = runs[runs.length - 1];
    if (last && last.id === n.group) last.span++;
    else runs.push({ id: n.group, span: 1 });
  }
  const groupHead = runs.map(r =>
    // The label sits in its own box so it can stick to the left of the
    // scrollport while the group scrolls past underneath it.
    `<th class="grp" data-g="${r.id}" colspan="${r.span}"
      scope="colgroup"><span class="grplabel">${esc(groupOf(r.id).label)}</span></th>`).join("");

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
        <span>${esc(n.label)} <span class="unit">${unit}</span></span>
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
  const shownNotes = new Set<Note>();
  $("#tbody").innerHTML = page.length ? page.map(({ f, i }) => {
    // Null where the food has no energy figure to divide by, which is why it is
    // read once here rather than tested and then read again.
    const per100 = S.basis === "kcal" ? gramsPer100kcal(f) : null;
    // Null for everything that is not a seasoning, which is all but five foods.
    const spoon = seasoningPortion(f, slugAt(i));
    return `
    <tr data-i="${i}" ${S.sel === i ? 'aria-selected="true"' : ""}>
      <td class="food${nameSorted ? " sorted" : ""}"><div class="fcell">
        <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
        <button class="fname" type="button" data-pick="${i}" data-name="${esc(f.name)}">
          <b>${esc(f.name)}${f.alt ? ` <span class="alt">(${esc(f.alt)})</span>` : ""}</b>
          ${f.state ? `<span>${esc(f.state)}</span>` : ""}
          ${per100 === null ? ""
            : `<span class="per100">${Math.round(per100)} g</span>
               <span class="sr">makes 100 kcal</span>`}
          ${spoon === null ? ""
            : `<span class="scale">${esc(spoon.label)} = ${Math.max(1, Math.round(spoon.g))} g</span>
               <span class="sr">, against the 100 g every figure here is measured on</span>`}
          <span class="sr">, show full profile</span></button>
        <button class="fav" type="button" data-fav="${i}" aria-pressed="${isFav(i)}">
          ${isFav(i) ? I.heartFull : I.heart}
          <span class="sr">${isFav(i) ? "Remove" : "Add"} ${esc(f.name)} ${isFav(i) ? "from" : "to"} favourites</span>
        </button></div></td>
      ${c.map(n => {
        // data-n on both branches deliberately: a selector that only works for
        // the new columns is a selector that silently stops testing the old
        // ones. data-ev carries the state so the stylesheet can tell a figure
        // from prose without the script deciding how either one looks.
        if (n.evidence) {
          /* In the % daily value view there is no percentage to show, because
             no daily value is published for any of these three. Printing the
             gram figure instead would put a number under a caption promising
             percentages, and next to eight macronutrient columns that all did
             flip, which reads as a figure rather than as an exemption. Same
             dash and same accessible wording the day totals already use for a
             nutrient with no reference intake. */
          if (S.dv) return `<td class="num ${colClass(n)}" data-g="${n.group}"` +
            ` data-n="${esc(n.id)}" data-ev="nodv">` +
            `<span class="noref" aria-hidden="true">&ndash;</span>` +
            `<span class="sr">no daily value published</span></td>`;
          const cell = ev(slugAt(i), n.id);
          const proxy = cell && evFood(slugAt(i))?.match === "proxy" ? ` data-match="proxy"` : "";
          return `<td class="num ${colClass(n)}" data-g="${n.group}" data-n="${esc(n.id)}"` +
                 ` data-ev="${cell ? cell.state : "none"}"${proxy}>${esc(evText(cell, n.dp))}</td>`;
        }
        const v = shown(f, n);
        const zero = v === 0 || v === null;
        // A note explains where a figure came from, so there has to be one.
        const note = v === null ? null : noteFor(i, n.id);
        if (note) shownNotes.add(note);
        return `<td class="num${zero ? " low" : ""} ${colClass(n)}" data-g="${n.group}" data-n="${esc(n.id)}">${
          fmt(v, n)}${note ? noteMark(note) : ""}</td>`;
      }).join("")}
    </tr>`;
  }).join("")
    : `<tr><td class="empty" colspan="${c.length + 1}">${emptyState()}</td></tr>`;

  /* The caption is the only place that says what is on screen, so it has to say
     how much of the data that is: a search leaves it showing three rows, and a
     caption that still read "131 vegan foods" would be describing the dataset
     rather than the table under it. */
  const lens = lensById(S.lens);
  $("#cap").textContent =
    (page.length === FOODS.length
      ? `${FOODS.length} vegan foods`
      : `Showing ${page.length} of ${FOODS.length} vegan foods`) +
    (c.length === NUTS.length
      ? `, all ${c.length} nutrient columns`
      : `, ${c.length} of ${NUTS.length} nutrient columns`) +
    `. Values ${basisLabel()} of food` +
    (S.dv ? ", shown as % of adult daily value." : ".") +
    (S.favsOnly ? " Favourites only." : "") +
    (lens ? ` ${lens.name} preset applied.` : "") +
    // The reason the two controls are separate rather than one three-way switch.
    // A %DV per 100 kcal figure scales by 20 over a 2000 kcal day, so one number
    // reads the whole table without anyone learning 60-odd daily values.
    (S.dv && S.basis === "kcal" ? " 5% here is a full day's worth at 2000 kcal." : "");

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
  const row = $<HTMLTableSectionElement>("#thead").rows[0];
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

  /* How much of the table can be seen at once. The caption is the one part of
     the table that has to know: its own box is as wide as the table, so without
     a cap its text runs off the side of the screen rather than wrapping. See
     the `caption > span` rule. */
  const seen = $("#scroller").clientWidth;
  if (seen) $("#grid").style.setProperty("--scrollw", `${seen}px`);
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
function renderChart(all: ReturnType<typeof rows>) {
  const n = nut(S.chartNut);
  // Unmeasured sorts below a measured zero, so the bars people came to compare
  // are at the top and the foods nobody assayed fall to the bottom.
  const r = all.slice().sort((a, b) => (val(b.f, n.id) ?? -1) - (val(a.f, n.id) ?? -1));
  const measured = r.map(x => val(x.f, n.id)).filter(v => v !== null);
  const max = Math.max(...measured, 0.0001);
  // Evidence columns are not offered: a bar length is a figure divided by the
  // largest figure, and a range has neither. They are in the table, where a
  // range can be printed as one, and out of here, where it cannot be drawn.
  $("#chartNut").innerHTML = GROUPS.filter(g => S.groups.has(g.id)).map(g =>
    `<optgroup label="${g.label}">` + NUTS.filter(x => x.group === g.id && !x.evidence).map(x =>
      `<option value="${x.id}"${x.id === S.chartNut ? " selected" : ""}>${esc(x.label)}</option>`
    ).join("") + "</optgroup>").join("");
  $("#chartRows").innerHTML = r.slice(0, 25).map(({ f }) => {
    // A food nobody assayed for this nutrient says so, the same as its cell in
    // the table does. It used to read a substituted zero, which drew an empty
    // bar labelled "0" against foods with a measured zero beside it, and said
    // "n/a" in the aria-label of the very same row.
    const v = val(f, n.id);
    return `<div class="crow">
      <span class="lbl"><span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
        <span title="${esc(fullName(f))}">${esc(fullName(f))}</span></span>
      <span class="track"><i style="width:${v === null ? "0" : (v / max * 100).toFixed(1)}%"></i></span>
      <span class="val">${fmt(v, n)} <span class="unit">${
        v === null || (S.dv && n.dv) ? "" : n.unit}</span></span>
    </div>`;
  }).join("");
  $("#chartRows").setAttribute("role", "img");
  $("#chartRows").setAttribute("aria-label",
    `Bar chart of ${n.label} across ${Math.min(r.length, 25)} foods, highest first. ` +
    r.slice(0, 25).map(({ f }) => `${fullName(f)} ${fmtText(val(f, n.id), n)}`).join(", "));
}

/** Derived figures, computed from the columns already in the table rather than
 *  sourced separately, so they cannot disagree with the rest of the row. */
function proteinQualityBlock(f: Food) {
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
  const f = foodAt(S.sel);
  const g = (id: string) => shown(f, nut(id));
  /* A sibling rather than a change to g(): g() returns a number and five places
     format it, while an evidence cell has six renderings and no basis to
     rescale. Keeping them apart is what stops a range being handed to
     toFixed(). */
  const gEv = (id: string) => evText(ev(slugAt(S.sel), id), nut(id).dp);
  const inDay = S.day.find(e => e.slug === slugAt(S.sel));
  // Overview first, then one tab per group that has its own detail list. A
  // hand-written list rather than GROUPS, because macro and fats are shown in
  // the overview instead. A test asserts every group holding evidence columns
  // appears here, since those cells carry sources the panel is the only place
  // to show.
  const DETAIL_TABS: NutrientGroup[] = ["fats", "vitamin", "mineral", "carbdetail", "acids", "amino", "plant", "other"];
  const tabs = [["overview", "Overview", I.macro],
    ...DETAIL_TABS.map(id => groupOf(id)).map(g => [g.id, g.label, g.icon]),
    ["absorption", "Absorption", I.eye]];

  // The panel shows the same figures as the table, so it carries the same
  // markers, and explains them once at the foot rather than per row.
  const shownNotes = new Set<Note>();

  let body;
  if (S.tab === "overview") {
    // The two fibre fractions sit directly under the total they divide, which
    // is the only place they mean anything: 3.2 g of soluble fibre is a
    // statement about the 9.4 g above it.
    const macro = ["kcal", "protein", "carbs", "fiber", "solfibre", "insolfibre", "resstarch", "fat", "satfat"];
    // A type predicate rather than a plain filter: the same guard, but a plain
    // filter does not carry it into the map. An unmeasured nutrient is dropped
    // rather than scored, since a zero would rank it against real figures.
    const top = NUTS
      .filter((n): n is Nutrient & { dv: number } =>
        n.dv !== null && n.dv > 0 && n.group !== "macro")
      .flatMap(n => {
        const v = g(n.id);
        return v === null ? [] : [{ n, pc: v / n.dv * 100 }];
      })
      .filter(x => x.pc > 0).sort((a, b) => b.pc - a.pc).slice(0, 6);
    body = `<h4>Macronutrients</h4><dl>` + macro.map(id => {
      const n = nut(id);
      const sub = id === "fiber" || id === "satfat" || !!n.evidence;
      if (n.evidence) {
        const c = ev(slugAt(S.sel), id);
        // Only a figure takes a unit. "trace" and "not measured" are prose, and
        // "trace g" would read as a quantity.
        const figure = c && (c.state === "measured" || c.state === "range" || c.state === "estimated");
        return `<div class="drow sub"><dt>${esc(n.label)}</dt>
          <dd>${figure ? `${esc(gEv(id))} ${esc(n.unit)}`
            : `<span class="nodata">${esc(gEv(id))}</span>`}</dd></div>`;
      }
      const v = g(id);
      // Energy twice over: the table sorts on kilocalories, but food labelling
      // outside the United States leads with kilojoules. Derived here from the
      // column already present, by the definition of the thermochemical
      // calorie, so it cannot drift away from the figure it converts.
      const kj = id === "kcal" && v !== null
        ? ` <span class="pc">· ${Math.round(v * 4.184)} kJ</span>` : "";
      // Saturated fat has no figure for three of these foods, and this row used
      // to render that as 0.0 g while the same food's cell in the table said
      // n/a. Unmeasured says so here too.
      return `<div class="drow${sub ? " sub" : ""}"><dt>${esc(n.label)}</dt>
        <dd>${v === null ? `<span class="nodata">not measured</span>`
          : `${v.toFixed(n.dp)} ${n.unit}${kj}`}</dd></div>`;
    }).join("") + `</dl>`
      + proteinQualityBlock(f)
      + `<h4 style="margin-top:18px">Top nutrients</h4><dl>` + top.map(({ n, pc }) => {
        const note = noteFor(S.sel, n.id);
        if (note) shownNotes.add(note);
        return `<div class="drow"><dt>${esc(n.label)}</dt>
          <dd class="pc">${Math.round(pc)}% DV${note ? noteMark(note) : ""}</dd></div>`;
      }).join("") + `</dl>`;
  } else if (S.tab === "absorption") {
    /* What is known about getting this food's nutrients out of it.
       The entries are chosen by sourceOf(), from the food's own figures, and
       the text of each is nutrient-level and generic: nothing here claims
       anything about this food that its own numbers did not establish. The one
       exception is the curated note, which is a reviewed food-specific fact and
       is marked as such. */
    const ids = sourceOf(f);
    // VNUTS: a per-cell note explains where a figure in `v` came from, and
    // val() throws on anything else. Evidence columns carry their provenance in
    // the cell itself instead, as sources and a match grade.
    const curated = VNUTS.flatMap(n => {
      const note = val(f, n.id) === null ? null : noteFor(S.sel, n.id);
      // Only the two absorption notes belong here. Fortification and the
      // undifferentiated marker are about where a figure came from, not about
      // what happens to it after you eat it, and they have their own homes.
      return note && ABSORB_NOTES.has(note.id) ? [{ n, note }] : [];
    });
    for (const { note } of curated) shownNotes.add(note);

    body = `<h4>Absorption</h4>` +
      (curated.length ? curated.map(({ n, note }) => `
        <div class="biorow curated">
          <div class="biohead"><b>${esc(n.label)}</b>
            <span class="biowhen">this food</span></div>
          <p>${esc(note.text)}</p>
        </div>`).join("") : "") +
      (ids.length ? ids.map(id => {
        const n = nut(id);
        const rows = affecting(id).map(x => `
          <div class="biorow ${x.direction}">
            <div class="biohead">
              <span class="bioarrow" aria-hidden="true">${x.direction === "up" ? "↑" : "↓"}</span>
              <b>${esc(agentLabel(x.agent))}</b>
              <span class="biowhen">${esc(x.when)}</span>
            </div>
            <p>${esc(x.text)}</p>
          </div>`).join("");
        return `<h5 class="biofor">${esc(n.label)}</h5>${rows}`;
      }).join("")
        : `<p class="nodatanote">Nothing on record applies to this food. That means no
           interaction has been recorded for the nutrients it is a meaningful source of,
           not that its nutrients are absorbed whole.</p>`) +
      `<p class="nodatanote">These are general facts about the nutrients, shown because this
       food's own figures make it a meaningful source of them. Nothing above adjusts a figure.
       <button class="absorbmore" type="button" data-dlg="bio">Sources</button></p>`;
  } else {
    const list = NUTS.filter(n => n.group === S.tab);
    // Evidence columns are held apart from all three of these. The bar scale is
    // arithmetic over comparable figures and biotin's micrograms are not
    // comparable with vitamin C's milligrams anyway; and the count below is a
    // statement about what USDA published, which an outside source neither
    // helps nor hurts.
    const usda = list.filter(n => !n.evidence);
    const measured = usda.map(n => g(n.id)).filter(v => v !== null);
    const max = Math.max(...measured, 0.0001);
    const L = lensIds();
    const unmeasured = usda.length - measured.length;
    body = `<h4>${esc(GROUPS.find(g => g.id === S.tab)?.label || S.tab)}</h4>
      <dl>` + list.map(n => {
        if (n.evidence) {
          const c = ev(slugAt(S.sel), n.id);
          const figure = c && (c.state === "measured" || c.state === "range" || c.state === "estimated");
          // Named, because a reader comparing this against a figure they have
          // seen elsewhere deserves to know which country's table it came from.
          const from = c?.sources?.length
            ? ` <span class="pc">· ${esc(c.sources.map(s => SRCS[s]?.country ?? s).join(", "))}</span>` : "";
          return `<div class="drow${L.has(n.id) ? " lensrow" : ""}" style="display:block">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <dt>${esc(n.label)}</dt>
              <dd>${figure ? `${esc(evText(c, n.dp))} ${esc(n.unit)}${from}`
                : `<span class="nodata">${esc(evText(c, n.dp))}</span>`}</dd>
            </div>
          </div>`;
        }
        const v = g(n.id);
        // Distinguish "measured as none" from "never measured": rendering a
        // missing figure as 0.000 asserts an absence nobody established.
        const none = v === null;
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

  $("#detailDlg").innerHTML = `
  <form method="dialog">
    <div class="fhead" style="--c:${f.colour}">
      <span class="sw" aria-hidden="true"></span>
      <div class="fid">
        <h3>${esc(f.name)}</h3>
        ${f.alt ? `<div class="st">also known as ${esc(f.alt)}</div>` : ""}
        <div class="per">${[
          // One line of provenance rather than three stacked ones. The state
          // belongs with the category and the basis: they are all answers to
          // "what exactly am I reading", and reading them as a sentence is what
          // lets the name above be a name.
          f.state && esc(f.state), esc(f.cat), basisLabel(),
          // The same scale the table pins beside the name. This panel is where
          // someone reads a seasoning's full profile, so it is where the
          // difference between a spoonful and 100 g matters most.
          (() => {
            const spoon = seasoningPortion(f, slugAt(S.sel));
            return spoon && `${esc(spoon.label)} = ${Math.max(1, Math.round(spoon.g))} g`;
          })(),
        // A segment at a time, each one unbreakable, so a line that has to wrap
        // wraps at a separator. "1 tbsp = 9 g" broken after the "1" reads as a
        // different measurement.
        ].filter(Boolean).map(s => `<span>${s}</span>`).join(" · ")}</div>
      </div>
      <div class="facts">
        <button class="fav" type="button" data-fav="${S.sel}" aria-pressed="${isFav(S.sel)}">
          ${isFav(S.sel) ? I.heartFull : I.heart}
          <span class="sr">${isFav(S.sel) ? "Remove from" : "Add to"} favourites</span></button>
        <div class="factadd">
          <button class="btn dayadd-btn" type="button" data-dayadd="${S.sel}">${I.plus}
            ${inDay ? `Add another ${DEFAULT_G} g` : "Add to my day"}</button>
          ${inDay ? `<div class="inday">${inDay.g} g in your day</div>` : ""}
        </div>
      </div>
      <button class="x" type="submit" aria-label="Close details"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="dlgbody">
      <div class="tabs" role="tablist" aria-label="Nutrient detail sections">
        ${tabs.map(([id, label, icon]) => `
          <button type="button" role="tab" data-tab="${id}" id="tab-${id}"
            aria-selected="${S.tab === id}" aria-controls="tabp"
            tabindex="${S.tab === id ? 0 : -1}">${icon}<span>${label}</span></button>`).join("")}
      </div>
      <div class="dbody" id="tabp" role="tabpanel" aria-labelledby="tab-${S.tab}" tabindex="0">${body}${
        [...shownNotes].map(n => `<p class="nodatanote"><sup class="fnote">${esc(n.marker)}</sup>
          <b>${esc(n.short)}.</b> ${esc(n.text)}</p>`).join("")}</div>
      <div class="dfoot">% DV uses general adult reference values. Yours may differ.</div>
    </div>
  </form>`;
}

/* ---------- sidebar counts ----------
   What is on screen is said once, in the table caption. This used to be a
   second line above the table saying the same thing in different words, which
   left two places to keep in step and one of them was always the stale one. */
function renderCounts() {
  $("#favCount").textContent = S.favs.size ? String(S.favs.size) : "";
  // Counted from the entries that resolve to a food, not from the stored list.
  // An entry naming a food that has left the dataset draws no row, so counting
  // it here would promise one more than the view can show.
  $("#dayCount").textContent = dayEntries().length ? String(dayEntries().length) : "";
}

/* ---------- my day ---------- */

/** A total in its own units. Rounded to the nutrient's own decimal places, the
 *  same as every other figure on the page. */
const fmtTotal = (v: number | null, n: Nutrient) => v === null ? "not measured" : `${v.toFixed(n.dp)} ${n.unit}`;

/* `?? []` is not the substitution the no-invented-data rule forbids: an absent
   key means USDA published no portion for that food, and an empty list is
   exactly what that means. No nutrition figure passes through here. */
const portionsFor = (slug: string): Portion[] => P[slug] ?? [];

/** The select is derived from the stored grams rather than from a stored
 *  choice, so typing a quantity or using the steppers moves it with no extra
 *  wiring. Matching on clampG() is what makes that work: the stored quantity
 *  is always a whole number, and a tablespoon of lentils weighs 12.3 g, so
 *  comparing against the raw figure would never match and the control would
 *  read "custom" the instant after it was used. */
function portionSelect(slug: string, f: Food, g: number): string {
  const ps = portionsFor(slug);
  if (!ps.length) return "";
  const at = ps.findIndex(p => clampG(p.g) === g);
  return `<select data-dayportion="${esc(slug)}"
      aria-label="Portion of ${esc(f.name)}${f.state ? `, ${esc(f.state)}` : ""}">
      <option value="" disabled${at === -1 ? " selected" : ""}>custom</option>` +
    ps.map((p, i) =>
      `<option value="${i}"${i === at ? " selected" : ""}>${esc(p.label)} · ${p.g} g</option>`)
      .join("") + `</select>`;
}

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
        ${portionSelect(slug, f, g)}
        <span class="qtyf">
          <button class="stp" type="button" data-daystep="${esc(slug)}" data-by="-10"
            ${g <= 0 ? "disabled" : ""}>${I.minus}<span class="sr">Less ${esc(f.name)}</span></button>
          <input type="number" inputmode="numeric" data-dayg="${esc(slug)}" value="${g}"
            min="0" max="${DAY_MAX_G}" step="10"
            aria-label="Grams of ${esc(f.name)}${f.state ? `, ${esc(f.state)}` : ""}">
          <span class="u">g</span>
          <button class="stp" type="button" data-daystep="${esc(slug)}" data-by="10"
            ${g >= DAY_MAX_G ? "disabled" : ""}>${I.plus}<span class="sr">More ${esc(f.name)}</span></button>
        </span>
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

function aminoRefsByNutrient(totals: DayTotal[]) {
  const m = new Map<string, ReturnType<typeof dayAminoAcids>[number] & { partners: string[] }>();
  for (const a of dayAminoAcids(totals))
    for (const id of a.ids)
      m.set(id, { ...a, partners: a.ids.filter(x => x !== id) });
  return m;
}

function renderDayTotals(totals: DayTotal[]) {
  const list = dayContributors();
  const box = $("#dayTotals");
  if (!list.length) { box.innerHTML = ""; return; }

  const aaRef = aminoRefsByNutrient(totals);
  const shownNotes = new Set<Note>();
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
            .map(id => nut(id).label.toLowerCase()).join(" and ")}</span>` : "";
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
/* The names of what a plant diet does not reliably supply, and which of them
   this view cannot total at all because there is no column. Both come off
   gaps.json rather than being typed here.
   This replaced two hand-written notes, one for B12 and one for iodine, which
   between them restated a good deal of that dataset in prose. Same cut-back
   "Intake is not absorption" got when the interaction data arrived, and for the
   same reason: two copies of a fact drift, and the prose copy is the one that
   silently stops being true. */
const GAP_NAMES = G.gaps.filter(g => g.tier === "gap");
const gapList = (list: Gap[]) =>
  list.map(g => g.label).join(", ").replace(/, ([^,]*)$/, " and $1");

const DAY_NOTES: [string, string][] = [
  ["What no total here can include", `${gapList(GAP_NAMES)} are the things a
    plant-based diet does not reliably supply, and every one of them is either
    absent from this table or close to zero across it. ${
      gapList(GAP_NAMES.filter(g => !g.nutrients.length))} has no column at all,
    so it is in no total on this page and its absence here says nothing about
    whether you had enough. What each does, and the two ways people close the
    gap, is under Nutrient gaps in the sidebar.`],
  /* Deliberately short now. It used to spell out the iron, calcium and zinc
     interactions here in prose, which was a second hand-written copy of what
     src/data/interactions.json says, and the two would have drifted the moment
     either changed. The specifics live in one place and this points at it. */
  ["Intake is not absorption", `These totals are what you ate, not what you absorbed, and for
    several nutrients the gap is large. What is known about it is under Absorption in the
    sidebar. A total well over 100% can still leave you short.`],
];

/* ---------- pairings across the day's list ----------
   Which recorded interactions both halves of are actually sitting in today's
   list. This is the one place the interaction data touches the day view, and
   the honesty constraint runs the whole way through it: **absorption is a
   per-meal effect and a day is not a meal.** So this can say two foods here can
   interact, and it can never say they did. `when` is a field rather than a
   sentence precisely so that this function can filter on it rather than a
   reader having to notice a caveat.

   Only agents that are themselves in the table can be found: a nutrient column
   or a named food. Phytate and oxalate have no column, so a day full of
   wholegrains cannot be detected here and is not claimed to be. */
interface Pairing { x: Interaction; nutrient: Nutrient; from: Food; via: Food; }

function dayPairings(): Pairing[] {
  const list = dayContributors();
  if (list.length < 1) return [];
  // A food counts as supplying a nutrient on the same rule the detail panel
  // uses, so the two views cannot disagree about what "a source of" means.
  const supplies = new Map<string, Food[]>();
  for (const e of list)
    for (const id of sourceOf(e.f))
      supplies.set(id, [...(supplies.get(id) || []), e.f]);

  const out: Pairing[] = [];
  for (const x of INTERACTIONS) {
    // "preparation" is about what you do to a food, not about what else is on
    // the plate, so it has no pairing to report.
    if (x.when !== "same meal") continue;
    // Bound to a local so the discriminant narrows. Narrowing does not survive
    // a repeated `x.agent.kind` check across the arms of a conditional.
    const a = x.agent;
    const via = a.kind === "nutrient" ? supplies.get(a.id)?.[0]
      : a.kind === "food" ? list.find(e => slugAt(e.i) === a.slug)?.f
      : undefined;
    if (!via) continue;
    for (const id of x.affects) {
      const from = supplies.get(id)?.[0];
      // Not the same food on both sides: "your peppers' vitamin C helps your
      // peppers' iron" is true and useless, and reads as a mistake.
      if (!from || from === via) continue;
      out.push({ x, nutrient: nut(id), from, via });
    }
  }
  return out;
}

/** The nine FAO entries, kept paired: methionine is spared by cysteine and
 *  phenylalanine by tyrosine, so a percentage on either alone would report a
 *  shortfall the body does not have. Rendered on its own so that changing the
 *  body weight can redraw these rows without rebuilding the panel around the
 *  field being typed into. */
const aminoRows = (totals: DayTotal[]) => dayAminoAcids(totals).map(a =>
  `<div class="drow"><dt>${esc(a.label)}</dt>
    <dd>${a.got === null ? `<span class="nodata">not measured</span>`
      : `${a.got.toFixed(2)} g <span class="pc">· ${Math.round(a.pc)}%</span>`}</dd></div>`).join("");

/** The weight field, in whichever unit is chosen, plus the one control that
 *  chooses. Two inputs in stones and pounds, because that is how the number is
 *  said, and each carries its own label since one `for` cannot name two. */
function weightRow() {
  const unit = (id: string, label: string) =>
    `<button type="button" data-wunit="${id}" aria-pressed="${S.wUnit === id}">${label}</button>`;
  // Not `val`: that is the module-level reader of a nutrient figure, and a
  // parameter of the same name would quietly shadow it for anything added here.
  const field = (id: string, shownValue: number, unitLabel: string, max: number | null, name: string) =>
    `<input type="number" inputmode="numeric" id="${id}" data-w value="${shownValue}"
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
  if (S.wUnit !== "stlb") return Number($<HTMLInputElement>("#dayKg").value);
  return stLbToKg(Number($<HTMLInputElement>("#dayStones").value) || 0, Number($<HTMLInputElement>("#dayPounds").value) || 0);
}

function renderDaySummary(totals: DayTotal[]) {
  const list = dayContributors();
  const box = $("#daySum");
  /* Pairings first, because they are about today's list rather than about
     nutrition in general, and the general notes below are the same three every
     time. Each says what could interact and refuses to say that it did: a day
     is not a meal, and this view has no idea which of these were eaten
     together. That is the same rule the totals already live by, where a sum
     over foods some of which were never assayed says so rather than looking
     complete. */
  const pairs = dayPairings();
  const pairCard = pairs.length ? `<div class="paircard">
    <b>Worth pairing</b>
    <ul>${pairs.map(({ x, nutrient, from, via }) => `<li class="${x.direction}">
      <span aria-hidden="true">${x.direction === "up" ? "↑" : "↓"}</span>
      ${esc(via.name)} ${x.direction === "up" ? "could help" : "could hold back"}
      the ${esc(nutrient.label.toLowerCase())} in ${esc(from.name)}</li>`).join("")}</ul>
    <span class="paircaveat">Only in the same meal. This list is a day, so it cannot know
    whether any of these were eaten together.</span></div>` : "";

  const notes = `<div class="dayadvice">` + pairCard + DAY_NOTES.map(([h, p]) =>
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
    /* The same rule and the same words as the totals list below, because this
       is the most prominent figure in the view and a partial sum here reads as
       a complete one with a percentage beside it. All three of these have a
       figure for every food today, so this costs nothing until the day someone
       adds a food that does not, which is exactly how the saturated fat gap
       came about. */
    const cov = t.partial
      ? ` <span class="cov">from ${t.from} of ${t.of}</span>` : "";
    return `<div class="drow"><dt>${esc(t.n.label)}</dt>
      <dd>${fmtTotal(t.total, t.n)}${pc === null ? "" : ` <span class="pc">· ${pc}%</span>`}${cov}</dd></div>`;
  }).join("");

  const q = dayProteinQuality(totals);
  // A ratio between two partial sums is a ratio between two unknowns, so it is
  // withheld unless every listed food was measured for both.
  const oComplete = ["ala", "la"].every(id => !totalOf(totals, id).partial);
  const o = oComplete ? omegaRatio({ v: totals.map(t => t.total) }) : null;
  const { short, over, budget } = dayStanding(totals);

  const jump = (x: ReturnType<typeof dayStanding>["short"][number]) => `<button class="jump" type="button" data-daysort="${esc(x.id)}">
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

  // Looking at a section is what counts as having seen it, and this runs for
  // whichever one is showing, so it is the only place that needs to say so.
  dayUnseen.delete(S.dayTab);

  /* tabindex alongside aria-selected: the three are one stop in the tab order,
     and only the selected one is that stop. */
  for (const [id, tab, panel] of DAY_TABS) {
    const on = S.dayTab === id;
    $(panel).hidden = !on;
    $(tab).setAttribute("aria-selected", String(on));
    $(tab).setAttribute("tabindex", on ? "0" : "-1");
  }
  renderDayDots();
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
  $('[data-act="favs"]').setAttribute("aria-pressed", String(S.favsOnly));

  /* My day lives in the sidebar rather than in the segmented control, because
     Table and Chart are two renderings of the same food list and this is not:
     it is somewhere else to be. So the sidebar is the one place that switches
     between them, and the segmented control goes away while you are here along
     with everything else that only describes the table. */
  $("#vDay").setAttribute("aria-pressed", String(showDay));
  // aria-current="" reads as "not current", so remove it rather than blank it.
  if (showDay) $("#navFoods").removeAttribute("aria-current");
  else $("#navFoods").setAttribute("aria-current", "true");
  for (const sel of ["#viewGrp", ".lensgrp", "#dvBtn", "#nutNote"])
    $(sel).hidden = showDay;
  if (showDay) $("#lensNote").hidden = true; else renderLensNote();

  /* The rows are worked out once and handed to everything that draws them, so
     the table, the chart and the meta line cannot disagree about what is on
     screen. The detail panel follows them: filtering to fruit used to leave it
     still describing lentils, a food the table no longer had, which is the one
     place two parts of the page held different ideas of one piece of state. An
     empty result set has nothing to move to, so the panel keeps what it had. */
  const r = rows();
  const first = r[0];
  if (first && !r.some(x => x.i === S.sel)) S.sel = first.i;

  renderTable(r);
  if (showChart) renderChart(r);
  renderDetail();
  renderDay();
  renderCounts();
  renderNutNote();
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  // targetAnyEl, not targetEl: a click on a button's own SVG icon (the heart,
  // an "x") makes e.target an SVGElement, which targetEl's HTMLElement check
  // would drop.
  const t = targetAnyEl(e)?.closest("button");
  if (!t) return;

  // Every data-grp on the page is written from GROUPS, so the check is a
  // formality; it is here because reaching toggleGroup with anything else would
  // put a group nothing renders into the saved preferences.
  if (isGroup(t.dataset.grp)) return toggleGroup(t.dataset.grp);
  if (t.dataset.cat !== undefined) return setCat(t.dataset.cat);

  if (t.dataset.sort) {
    const id = t.dataset.sort;
    if (S.sort.id === id) S.sort.dir *= -1;
    else S.sort = { id, dir: id === "__name" ? 1 : -1 };
    const label = id === "__name" ? "Food name" : nut(id).label;
    say(`Sorted by ${label}, ${S.sort.dir === 1 ? "ascending" : "descending"}.`);
    savePrefs();
    return render();
  }

  if (t.dataset.pick !== undefined) {
    S.sel = +t.dataset.pick;
    say(`${foodAt(S.sel).name} selected.`);
    render();
    $<HTMLDialogElement>("#detailDlg").showModal();
    return;
  }

  if (t.dataset.fav !== undefined) {
    const i = +t.dataset.fav;
    toggleFav(i);
    say(`${foodAt(i).name} ${isFav(i) ? "added to" : "removed from"} favourites.`);
    return render();
  }

  if (t.dataset.tab) {
    S.tab = t.dataset.tab;
    renderDetail();
    return $(`[data-tab="${S.tab}"]`).focus();
  }

  if (t.dataset.daytab) {
    S.dayTab = t.dataset.daytab as "inputs" | "day" | "totals";
    renderDay();
    return $(`[data-daytab="${S.dayTab}"]`).focus();
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
    S.q = ""; $<HTMLInputElement>("#q").value = ""; $("#qClear").hidden = true;
    S.cat = ""; renderCats();
    savePrefs();
    say("Search and category cleared.");
    return render();
  }
  if (isDialogKey(t.dataset.dlg)) return openDialog(t.dataset.dlg);

  // ---- my day ----
  if (t.dataset.dayadd !== undefined) {
    const i = +t.dataset.dayadd;
    const fromSearch = !!t.closest("#daySug");
    const slug = slugAt(i);
    // The entry the day now holds, from the call that made it, rather than
    // looked up again afterwards.
    const now = addToDay(slug, DEFAULT_G);
    if (now) say(`${foodAt(i).name} in your day at ${now.g} g.`);
    // Adding from the detail panel leaves you where you were: the count on the
    // count in the sidebar says it landed, and being thrown into another view
    // mid-browse is not what pressing "add" asked for.
    if (fromSearch) { $<HTMLInputElement>("#dayQ").value = ""; $("#daySug").hidden = true; }
    render();
    // Straight to the quantity, which is the next thing anyone wants to change.
    return fromSearch && $(`[data-dayg="${slug}"]`).focus();
  }
  if (t.dataset.dayrm) {
    const f = foodBySlug(t.dataset.dayrm);
    removeFromDay(t.dataset.dayrm);
    say(`${f ? f.name : "Food"} removed from your day.`);
    return render();
  }
  if (t.dataset.daystep) {
    const slug = t.dataset.daystep, by = t.dataset.by;
    const at = S.day.find(x => x.slug === slug);
    // Every data-daystep on the page is written with its data-by beside it. A
    // missing one would read as NaN and clamp the quantity to nothing, so the
    // step is left undone instead.
    if (!at || by === undefined) return;
    setDayGrams(slug, at.g + +by);
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
    return $("[data-w]").focus();
  }
  if (t.dataset.act === "dayclear") {
    const n = S.day.length;
    S.day = [];
    dayChanged();
    say(`Cleared ${n} food${n === 1 ? "" : "s"} from your day.`);
    return render();
  }
  /* The way back to the table from a shortfall. Being told you are low on
     selenium is only useful next to the foods that have some, and this is the
     one click between them. */
  if (t.dataset.daysort) {
    const id = t.dataset.daysort, n = nut(id);
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
      ? ` Also showing ${groupOf(n.group).label.toLowerCase()}.` : ""));
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

/* ---------- the sidebar on a narrow screen ----------
   Whether the sidebar is showing is one attribute on the shell, and the rules
   that read it live inside a max-width query. Widen the window past it and both
   the hiding rule and this one stop applying, so the sidebar comes back
   whatever the attribute says. That is why there is no resize listener here and
   no width for this code to know: a state left over from a narrow window cannot
   strand the sidebar off screen on a wide one.
   Not persisted, on purpose. Which foods you are looking at is worth
   remembering between visits; whether a menu happened to be open is not. */
const shellEl = $("#shell"), navToggle = $("#navToggle");
function setNav(open: boolean) {
  if (open) shellEl.dataset.nav = "open";
  else delete shellEl.dataset.nav;
  navToggle.setAttribute("aria-expanded", String(open));
  $("#navToggleTx").textContent = open ? "Close" : "Menu";
}
navToggle.onclick = () => {
  const open = shellEl.dataset.nav !== "open";
  setNav(open);
  say(open ? "Menu open." : "Menu closed.");
};

/* Choosing a category or a destination closes the menu, because what you chose
   is in the table behind it. Toggling a nutrient group does not: that is a
   multi-select somebody works through several at a time, and closing on the
   first one would make the other seven cost a reopen each. Search does not
   either, for the same reason.
   Focus goes back to the button, because the control that was just clicked is
   about to be display:none and focus on a hidden element lands on the body.
   #navFoods is the exception: it is a link to #main and moves focus itself. */
$("#side").addEventListener("click", e => {
  // targetAnyEl, not targetEl: these rows carry inline SVG icons, so a click on
  // an icon makes e.target an SVGElement.
  const t = targetAnyEl(e)?.closest("a,button");
  if (!t || !t.matches("[data-cat],#navFoods,#vFavs,#vDay")) return;
  if (shellEl.dataset.nav !== "open") return;
  setNav(false);
  if (t.id !== "navFoods") navToggle.focus();
});
const chartSel = $<HTMLSelectElement>("#chartNut");
chartSel.onchange = () => { S.chartNut = chartSel.value; savePrefs(); renderChart(rows()); };

const lensSel = $<HTMLSelectElement>("#lensSel");
lensSel.onchange = () => {
  // "Add…" is an action, not a choice. Put the control back to whatever preset
  // is selected now *before* opening the editor, so cancelling the dialog does
  // not leave the menu reading "Add…" over an unchanged table.
  if (lensSel.value === LENS_ADD) { renderLensSelect(); openLensEditor(); return; }
  setLens(lensSel.value);
};

const basisBtn = $("#basisBtn");
basisBtn.onclick = () => {
  S.basis = S.basis === "g" ? "kcal" : "g";
  const perKcal = S.basis === "kcal";
  basisBtn.setAttribute("aria-pressed", String(perKcal));
  if (basisBtn.lastChild) basisBtn.lastChild.textContent = perKcal ? " Show per 100 g" : " Show per 100 kcal";
  say(perKcal ? "Showing figures per 100 kcal." : "Showing figures per 100 g.");
  savePrefs();
  render();
};
const dvBtn = $("#dvBtn");
dvBtn.onclick = () => {
  S.dv = !S.dv;
  dvBtn.setAttribute("aria-pressed", String(S.dv));
  if (dvBtn.lastChild) dvBtn.lastChild.textContent = S.dv ? " Show raw amounts" : " Show % daily value";
  say(S.dv ? "Showing percentage of daily value." : "Showing raw amounts.");
  savePrefs();
  render();
};
let qt: ReturnType<typeof setTimeout>;
const qInput = $<HTMLInputElement>("#q");
qInput.oninput = () => {
  S.q = qInput.value;
  $("#qClear").hidden = !S.q;
  clearTimeout(qt);
  qt = setTimeout(() => { render(); say(`${rows().length} foods match.`); }, 160);
};
$("#qClear").onclick = () => { S.q = ""; qInput.value = ""; $("#qClear").hidden = true; qInput.focus(); render(); };

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
function daySuggestions(q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const hit = FOODS.map((f, i) => ({ f, i }))
    .filter(({ f }) => (`${f.name} ${f.alt || ""} ${f.state || ""} ${f.cat}`)
      .toLowerCase().includes(t));
  const rank = ({ f, i }: { f: Food; i: number }) =>
    (isFav(i) ? 0 : 2) + (f.name.toLowerCase().startsWith(t) ? 0 : 1);
  return hit.sort((a, b) => rank(a) - rank(b) || a.f.name.localeCompare(b.f.name))
    .slice(0, DAY_SUGGESTIONS);
}

function renderDaySuggestions() {
  const box = $("#daySug"), list = daySuggestions($<HTMLInputElement>("#dayQ").value);
  box.hidden = !list.length;
  $("#dayQ").setAttribute("aria-expanded", String(!!list.length));
  box.innerHTML = list.map(({ f, i }) => {
    const already = S.day.some(e => e.slug === slugAt(i));
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
  if (e.key === "ArrowDown") { e.preventDefault(); return $opt("#daySug button")?.focus(); }
  if (e.key === "Enter") { e.preventDefault(); $opt("#daySug button")?.click(); }
};
/* Arrow keys walk the list, so it can be used without a pointer and without
   tabbing through every option to reach the one you want. */
$("#daySug").addEventListener("keydown", e => {
  const opts = [...$("#daySug").querySelectorAll<HTMLElement>("button")];
  const t = targetEl(e);
  const i = t ? opts.indexOf(t) : -1;
  if (i === -1) return;
  // i is an index into opts, so both of these land on an option that is there.
  if (e.key === "ArrowDown") { e.preventDefault(); opts[(i + 1) % opts.length]?.focus(); }
  if (e.key === "ArrowUp") { e.preventDefault(); (i ? opts[i - 1] : $("#dayQ"))?.focus(); }
  if (e.key === "Escape") { e.preventDefault(); $("#daySug").hidden = true; $("#dayQ").focus(); }
});
/* Clicking away closes it. Checking focus rather than the click target means
   tabbing out closes it too. */
document.addEventListener("focusin", e => {
  if (!$("#dayView").hidden && !targetEl(e)?.closest(".dayadd")) {
    $("#daySug").hidden = true;
    $("#dayQ").setAttribute("aria-expanded", "false");
  }
});

/* Typing a quantity must not redraw the field being typed into, so this updates
   the totals and the summary and leaves the list alone. */
$("#dayList").addEventListener("input", e => {
  const input = targetInput(e);
  if (!input?.dataset.dayg) return;
  setDayGrams(input.dataset.dayg, input.value);
  const totals = dayTotals();
  renderDayTotals(totals);
  renderDaySummary(totals);
});
/* Blur is where the clamped value goes back into the field: showing 5000 the
   moment somebody types the first digit of 500 would be worse than waiting. */
$("#dayList").addEventListener("change", e => {
  const t = targetEl(e);
  if (!t) return;
  const slug = t.dataset.dayportion;
  if (slug !== undefined) {
    // Choosing goes through setDayGrams like every other route to a quantity,
    // so clamping, saving and the totals all behave identically. The empty
    // value is the disabled "custom" option: guard on it explicitly, since
    // +"" is 0 and would otherwise read as the first real portion.
    const p = t instanceof HTMLSelectElement && t.value !== ""
      ? portionsFor(slug)[+t.value] : undefined;
    if (p) setDayGrams(slug, p.g);
    render();
    // render() rebuilds #dayList and throws focus to <body>. Chrome and
    // Firefox fire change on every arrow press on a closed select, so without
    // this a keyboard user could never reach a later option: each press would
    // apply, lose focus, and need a tab back before the next arrow did anything.
    return $opt(`[data-dayportion="${slug}"]`)?.focus();
  }
  if (t.dataset.dayg) render();
});

/* Same reasoning as the quantity fields: redraw the figures the weight feeds,
   not the field being typed into. */
$("#daySum").addEventListener("input", e => {
  if (targetEl(e)?.dataset.w === undefined) return;
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
  if (targetEl(e)?.dataset.w === undefined) return;
  if (S.wUnit === "stlb") {
    const { st, lb } = kgToStLb(S.kg);
    $<HTMLInputElement>("#dayStones").value = String(st);
    $<HTMLInputElement>("#dayPounds").value = String(lb);
  } else $<HTMLInputElement>("#dayKg").value = String(+S.kg.toFixed(1));
});

/* Roving tabindex, once for each strip of tabs on the page.

   The query used to be every [role=tab] in the document, which was the same set
   as the detail tabs right up until "My day" grew a strip of its own. After that
   the day's three tabs sat in front of the detail's ten in document order, so
   arrowing left off the first detail tab landed on a day tab, found no data-tab
   on it and returned: the wrap in both directions stopped working and nothing
   said why. A tab belongs to its own tablist, so ask that rather than the
   document. */
document.addEventListener("keydown", e => {
  const tab = targetEl(e);
  if (!tab?.matches('[role="tab"]')) return;
  const strip = tab.closest('[role="tablist"]');
  if (!strip) return;
  const t = [...strip.querySelectorAll<HTMLElement>('[role="tab"]')];
  const i = t.indexOf(tab);
  let j = null;
  if (e.key === "ArrowRight") j = (i + 1) % t.length;
  if (e.key === "ArrowLeft") j = (i - 1 + t.length) % t.length;
  if (e.key === "Home") j = 0;
  if (e.key === "End") j = t.length - 1;
  if (j === null) return;
  const to = t[j];
  if (!to) return;
  e.preventDefault();
  // Which strip it is decides what "select this tab" means. Both carry their
  // selection in the state rather than in the DOM, so both re-render.
  if (to.dataset.daytab) {
    S.dayTab = to.dataset.daytab as State["dayTab"];
    renderDay();
    $(`[data-daytab="${S.dayTab}"]`).focus();
    return;
  }
  if (to.dataset.tab === undefined) return;
  S.tab = to.dataset.tab; renderDetail();
  $(`[data-tab="${S.tab}"]`).focus();
});

/* ---------- CSV ----------
   One button, and it has always meant "write out what I can currently see", so
   in the day view it writes the day rather than the table. */
const csvQuote = (s: unknown) => `"${String(s).replace(/"/g, '""')}"`;

function download(lines: string[], name: string) {
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
  // An evidence heading names neither the basis toggle nor %DV, because it obeys
  // neither: the figure is always per 100 g and there is no daily value to take
  // a percentage of. Saying "evidence" is what stops the column being read as
  // one more USDA measurement a month later.
  const head = ["Food", "Also known as", "State", "Category",
                ...c.map(n => n.evidence
                  ? `${n.label} (${n.unit} per 100 g, evidence)`
                  : `${n.label} (${S.dv && n.dv ? "%DV" : n.unit} ${per})`)];
  const lines = [head.map(q).join(",")].concat(r.map(({ f, i }) =>
    [q(f.name), q(f.alt || ""), q(f.state), q(f.cat), ...c.map(n => {
      // Quoted, because a range is text: "0.5 to 3.7" has to survive the round
      // trip as what it is rather than be rounded into a number it is not.
      if (n.evidence) return q(evText(ev(slugAt(i), n.id), n.dp));
      const v = shown(f, n);
      if (v === null) return "";
      return S.dv && n.dv ? Math.round(v / n.dv * 100) : v;
    })].join(",")));
  download(lines, "vegan-nutrients.csv");
  say(`Exported ${r.length} foods and ${c.length} nutrients as CSV.`);
}

/** Today as YYYY-MM-DD, from the local calendar. `toISOString()` is UTC, which
 *  files an evening export west of Greenwich under tomorrow's date. */
function today() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** One row per food with its quantity, then the totals, then the percentages,
 *  then the coverage, so a partial sum stays labelled as one outside the page
 *  as well as on it. */
function csvDay() {
  // Evidence columns are dropped from the day export rather than left blank in
  // it, for the same reason the day view has no row for them: there is no total
  // of an evidence value, so a column of empty cells under a heading promising
  // one would be a question the file cannot answer.
  const c = cols().filter(n => !n.evidence);
  const totals = dayTotals(), list = dayContributors(), q = csvQuote;
  const at = (id: string) => totalOf(totals, id);
  // Read once rather than per row, so an export running over midnight cannot
  // file half a day under one date and half under the next. Every row carries
  // it, including the summary rows, so several days concatenate into one sheet
  // that can still be grouped by day.
  const date = q(today());
  const head = ["Date", "Food", "State", "Grams", ...c.map(n => `${n.label} (${n.unit})`)];
  const lines = [head.map(q).join(",")];

  for (const { f, g } of list)
    lines.push([date, q(f.name), q(f.state || ""), g, ...c.map(n => {
      const v = val(f, n.id);
      return v === null ? "" : +(v * g / 100).toFixed(6);
    })].join(","));

  lines.push([date, q("Total"), q(""), dayGrams(),
    ...c.map(n => { const v = at(n.id).total; return v === null ? "" : +v.toFixed(6); })].join(","));
  lines.push([date, q("% of daily value"), q(""), "",
    ...c.map(n => {
      const v = at(n.id).total;
      return n.dv && v !== null ? Math.round(v / n.dv * 100) : "";
    })].join(","));
  lines.push([date, q("Foods measured"), q(""), "",
    ...c.map(n => `${at(n.id).from} of ${at(n.id).of}`).map(q)].join(","));

  download(lines, "my-day.csv");
  say(`Exported your day, ${list.length} foods and ${c.length} nutrients, as CSV.`);
}

const csv = () => S.view === "day" ? csvDay() : csvTable();
$("#csvBtn").onclick = csv;

/* ---------- custom presets ---------- */
function renderNutPick(chosen: Set<string> = new Set()) {
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
  [...document.querySelectorAll<HTMLInputElement>('#nutPick input[name=nut]:checked')].map(i => i.value);

function updateLensCount() {
  const n = pickedNuts().length;
  $("#lensCount").textContent = n ? `· ${n} selected` : "· none selected yet";
}

function renderSavedLenses() {
  const box = $("#savedLenses");
  if (!S.custom.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<p style="font-size:13.5px;font-weight:600;color:var(--ink);margin:0 0 8px">
      Your presets</p>` +
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
  $<HTMLInputElement>("#lensName").value = "";
  $<HTMLInputElement>("#lensWhy").value = "";
  renderSavedLenses();
  /* Pre-tick the columns the selected preset is showing, so refining a built-in
     into your own variant is a couple of clicks rather than starting from
     nothing. The preset's own id list is the wrong thing to read: "All
     nutrients" carries the sentinel `__ALL__`, which matches no nutrient, so
     the one preset where the answer is "everything" opened with nothing ticked.
     With no preset selected this is empty, which is the blank slate it was. */
  renderNutPick(new Set(S.lens ? cols().map(n => n.id) : []));
  $<HTMLDialogElement>("#lensDlg").showModal();
  $("#lensName").focus();
}

$("#lensCancel").onclick = () => $<HTMLDialogElement>("#lensDlg").close();
$("#lensX").onclick = () => $<HTMLDialogElement>("#lensDlg").close();
$("#nutPick").addEventListener("change", updateLensCount);

$("#savedLenses").addEventListener("click", e => {
  // targetAnyEl, not targetEl: the delete button's content is an "x" SVG icon,
  // so a click there lands on an SVGElement rather than an HTMLElement.
  const b = targetAnyEl(e)?.closest<HTMLElement>("[data-rmlens]");
  if (!b) return;
  const id = b.dataset.rmlens;
  const gone = S.custom.find(l => l.id === id);
  S.custom = S.custom.filter(l => l.id !== id);
  if (S.lens === id) S.lens = "";
  savePrefs();
  renderSavedLenses(); renderLensSelect(); render();
  say(`Deleted preset ${gone ? gone.name : ""}.`);
});

$("#lensForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $<HTMLInputElement>("#lensName").value.trim();
  const ids = pickedNuts();
  if (!name) { $("#lensErr").textContent = "Give the group a name."; $("#lensName").focus(); return; }
  if (!ids.length) { $("#lensErr").textContent = "Pick at least one nutrient."; return; }

  const id = "c" + Date.now().toString(36);
  const why = $<HTMLInputElement>("#lensWhy").value.trim().slice(0, 240);
  S.custom.push({ id, name: name.slice(0, 40), ids, ...(why ? { why } : {}) });
  savePrefs();
  $<HTMLDialogElement>("#lensDlg").close();
  setLens(id);                       // narrows the table to the nutrients picked
  say(`Saved preset ${name}, ${ids.length} nutrients.`);
});

/* ---------- dialogs ----------
   The methodology note names the foods USDA has never assayed for amino acids.
   Counted from the data rather than typed out, because that list grows every
   time a minor fruit or vegetable is added and a hardcoded one goes quietly
   wrong: it would still name three foods long after there were five. */
const AMINO_IDS = NUTS.filter(n => n.group === "amino").map(n => n.id);
const aminoGaps = (f: Food) => AMINO_IDS.filter(id => val(f, id) === null).length;
const NO_AMINOS = FOODS.filter(f => aminoGaps(f) === AMINO_IDS.length);
const PART_AMINOS = FOODS.filter(f => aminoGaps(f) > 0 && aminoGaps(f) < AMINO_IDS.length);
const andList = (names: string[]) => names.slice().sort()
  .join(", ").replace(/, ([^,]*)$/, " and $1");

/* Likewise the foods whose figures depend on fortification: named from the note
   itself, so adding a food to it cannot leave the prose describing two. */
const FORTIFIED = NOTES.find(n => n.id === "fortified");
const FORTIFIED_FOODS = Object.keys(FORTIFIED?.cells || {})
  .flatMap(s => foodBySlug(s) || []);

/* And how far the flavonoid data reaches. Counted, not typed, for the same
   reason: the flavonoid columns are the sparsest in the table, so a number
   describing them is the one most likely to be quietly overtaken by a new
   food. A food counts as reached if any one subclass was measured for it. */
const FLAV_IDS = ["anthocyanidins", "flavan3ols", "flavonols"];
const FLAV_REACHED = FOODS.filter(f => FLAV_IDS.some(id => val(f, id) !== null)).length;

/* Foods carrying more gamma-tocopherol than alpha. Counted rather than typed
   for the reason the amino acid gap list is: the hand-written version of this
   named four foods and quietly went wrong as more were added. It could not
   derive from the data until gamma had a column, which is most of why the
   column is worth having. */
const GAMMA_OVER_ALPHA = FOODS.filter(f => {
  const a = val(f, "vite"), g = val(f, "gammatoc");
  return a !== null && g !== null && g > a;
});

/* Categories with no phytosterol figure anywhere in them. The gaps in this
   column are not scattered: whole categories are empty, which is a fairer
   statement of the limit than naming a few foods and a truer one than a
   coverage count on its own. */
const STEROL_EMPTY_CATS = [...new Set(FOODS.map(f => f.cat))]
  .filter(c => FOODS.every(f => f.cat !== c || val(f, "phytosterols") === null));
const STEROL_FOODS = FOODS.filter(f => val(f, "phytosterols") !== null);
/* The unassayed nuts and seeds, named from the data rather than typed. The
   README picked out almonds, walnuts and avocado by hand; the table holds
   fifteen such nuts and seeds, and a hand-picked three is the same defect as
   the vitamin E list two caveats up. */
const STEROL_MISSING_RICH = FOODS.filter(f =>
  (f.cat === "Nuts" || f.cat === "Seeds") && val(f, "phytosterols") === null);

/* And how many omega figures are approximated from an undifferentiated total
   rather than measured as the named isomer. Counted from the note itself for
   the same reason as the rest: the number moves whenever a food is added or a
   column is re-pulled, and a typed one would quietly stop being true. */
const UNDIFF = NOTES.find(n => n.id === "undifferentiated");
const UNDIFF_CELLS = Object.values(UNDIFF?.cells || {}).flat().length;

/* ---------- the bioavailability reference ----------
   Built from src/data/interactions.json rather than written out, for the same
   reason the amino acid gap list and the fortified food list are computed: a
   hand-written copy of a dataset is a copy that stops being true. Add a record
   and it appears here, in the nutrient note and in the detail panel together,
   or in none of them. */
function bioDialog(): string {
  /* Grouped by the nutrient whose absorption changes, because that is the
     question somebody arrives with: not "what does phytate do" but "why is the
     iron figure not the whole story".

     Grouped by the whole affected *set* rather than one nutrient at a time,
     which matters because a record may name several. The first version walked
     NUTS and printed each nutrient's records under its own heading, so the one
     fat entry shared by vitamins A, D, E and K appeared four times word for
     word, and the carotenoid one five times. Keying on the set prints each
     record once, under a heading naming everything it covers. */
  const groups = new Map<string, Interaction[]>();
  for (const x of INTERACTIONS) {
    const key = x.affects.join("+");
    groups.set(key, [...(groups.get(key) || []), x]);
  }
  // Table order, taken from the first nutrient of each set, so the dialog runs
  // in the same sequence as the columns rather than in dataset order.
  const at = (key: string) => IDX.get(key.split("+")[0] ?? "") ?? 999;
  const byNutrient = [...groups.entries()]
    .sort((a, b) => at(a[0]) - at(b[0]))
    .map(([key, list]) => {
      const heading = key.split("+")
        .map(id => nutOpt(id)?.label ?? id)
        .join(", ").replace(/, ([^,]*)$/, " and $1");
      const rows = list.map(x => `
        <div class="biorow ${x.direction}">
          <div class="biohead">
            <span class="bioarrow" aria-hidden="true">${x.direction === "up" ? "↑" : "↓"}</span>
            <b>${esc(agentLabel(x.agent))}</b>
            <span class="biowhen">${esc(x.when)}</span>
          </div>
          <p>${esc(x.text)}</p>
          ${x.cites.map(k => `<cite>${esc(X.sources[k] ?? k)}</cite>`).join("")}
        </div>`).join("");
      return `<h4>${esc(heading)}</h4>${rows}`;
    }).join("");

  return `
    <p>Every figure in this table is a measurement of what is <em>in</em> a food. How much of it
    reaches you is a different question, and for some nutrients the gap between the two is
    large enough to change what the number means. This page is what is known about that gap.</p>
    <p><b>No figure on this page is ever adjusted for absorption.</b> Iron reads 3.30 mg because
    3.30 mg is what was measured. Absorption depends on the rest of the meal, on the person, and
    on how much of the nutrient they already have, so any single "absorbable" number would be an
    invention dressed as a measurement. What is offered instead is the reasoning, with its
    sources, so you can apply it yourself.</p>
    ${byNutrient}
    <h4>What is not here</h4>
    <p>This list is deliberately short. It holds the interactions that are well enough established
    to cite, and no others, so a nutrient with no entry means nothing has been recorded here rather
    than that nothing affects it. There is no phytate or oxalate column in the table either: USDA's
    USDA does not publish those figures, so the amounts in any particular food are not
    something this page knows.</p>
    <p>Nor is there any advice about supplements, doses or timing beyond meals. This page describes
    foods.</p>`;
}

/* ---------- what food alone will not supply ----------
   Built from src/data/gaps.json plus the table itself, for the reason the
   Absorption dialog is: a hand-written copy of a dataset is a copy that stops
   being true. */
function gapsDialog(): string {
  const tier = (t: GapTier) => G.gaps.filter(g => g.tier === t);
  const block = (g: Gap) => `
    <div class="gaprow ${g.tier}">
      <h4>${esc(g.label)}</h4>
      ${g.role ? `<p class="gaprole">${esc(g.role)}</p>` : ""}
      <p>${esc(g.why)}</p>
      ${gapEvidenceText(g)}
      ${g.closing ? `<p class="gapclose"><b>Closing it.</b> ${esc(g.closing)}</p>` : ""}
      ${g.cites.map(k => `<cite>${esc(G.sources[k] ?? k)}</cite>`).join("")}
    </div>`;

  return `
    <p>Most of this page is about what is in a food. This page is about the
    handful of things that are not in any of them, or are there in amounts too
    small to count on. It is the companion to <b>Absorption</b>: that one says you
    get less of a figure than it looks, this one says the figure is not here.</p>
    <p><b>No doses, and no products.</b> What each of these does, why the gap is
    there, and the two ways people close it. Anything past that is a question for
    a dietitian or a GP, and it changes with age, pregnancy and where you live.</p>

    <h3 class="gaphead">Food will not supply these</h3>
    ${tier("gap").map(block).join("")}

    <h3 class="gaphead">Worth planning for</h3>
    ${tier("plan").map(block).join("")}

    <h3 class="gaphead">What this data cannot see</h3>
    <p>Named so that their absence is not read as their being fine. Each was
    checked against the source data rather than assumed.</p>
    ${tier("unseen").map(block).join("")}`;
}

const DLG = {
  how: ["How to use", `
    <h4>Show the columns you want</h4>
    <p>The table opens on the <b>Essentials</b> preset, which is a readable width. The
    <b>Nutrient groups</b> buttons in the sidebar switch whole groups of columns on and off, and
    pressing any of them clears the preset and hands the choice back to you. Each group has its own
    background tint in the table, so you can tell at a glance where one ends and the next begins.
    All ${GROUPS.length} groups together make for a very wide table; switch off the ones you are not
    reading and the rest close up.</p>
    <h4>Sort by anything</h4>
    <p>Every column header is a button. One click sorts high to low, a second reverses it. The
    sorted column is shown in bold all the way down, so you can keep your place while scrolling
    sideways. Sorting applies to the whole dataset, not just the page you are looking at.</p>
    <h4>Choose combinations of columns</h4>
    <p>The <b>Presets</b> menu holds curated combinations of columns: total protein with the
    essential amino acids, the pair that matter for iron absorption, the five that build bone, and
    so on. Choosing one narrows the table to exactly those columns, so what you want to read is
    there without scrolling past everything else. <b>All nutrients</b> puts every column back.</p>
    <p>Choose <b>Add…</b>, the last entry in that menu, to build your own from any combination of
    nutrients and give it a name. Your groups are saved in this browser and appear in the same
    menu.</p>
    <h4>Compare like for like</h4>
    <p><b>Show % daily value</b> converts every column that has a reference value into a percentage,
    which makes a milligram of selenium and a gram of protein comparable at a glance.</p>
    <p>Every figure is per 100 g, which is a helping of most things here and a jarful of a dried
    spice. Sorting by iron puts turmeric above everything, so the herbs and spices carry the weight
    of a real spoonful beside their names: a generous spoon of turmeric is 9 g, and the row beside
    it is measuring 100.</p>
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
    <p>Your favourites, the foods and quantities in your day, saved presets, visible
    columns, sort order and light or dark mode are kept in this browser between visits. Nothing is
    sent anywhere. It is stored on your own machine, so it will not follow you to another device,
    and clearing site data will clear it.</p>
    <p>Nothing here sets an expiry date, so it is kept until something clears it. Safari is the
    exception worth knowing about: it deletes stored data for a site you have not used in seven
    days, which is a rule of the browser rather than of this page.</p>
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
    <p>Phytic acid, isoflavones and proanthocyanidins are <em>not</em> here. USDA publishes no
    figures at all for any of the three. USDA's expanded flavonoid release would reach twice as
    many of these foods, but it gets there by imputing values from other foods rather than
    measuring them, which is the one thing this table will not do.</p>
    <p>Phytosterols used to be grouped with those three as another compound left out, and that was
    wrong: the coverage that ruled it out then is no better or worse than the flavonoid columns
    above, which shipped anyway. Phytosterols has its own column now, past the flavonoids, with its
    coverage caveat kept under "Known caveats" below rather than repeated here.</p>
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
    <p><b>Iodine has a column now, and still no total.</b> A view that lists what you are
    short of implies the list is complete. Iodine is a real requirement and a common gap on a
    plant-based diet, and its figures here come from Japan rather than from the table the totals
    are built on, so they are shown per food and never summed. Nor are there upper limits: the one
    worth knowing unaided is selenium, where a couple of Brazil nuts covers a day and a handful
    every day is too many.</p>
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
      and the one the body holds on to, but it is not the only one in food.
      ${GAMMA_OVER_ALPHA.length} of these foods contain more gamma-tocopherol than alpha:
      ${andList(GAMMA_OVER_ALPHA.map(fullName))}. None of that counts towards the vitamin E
      column, which is why gamma has a column of its own beside it. Read vitamin E as the amount
      your body will bank rather than as everything in the food with vitamin E activity.</li>
      <li><b>Phytosterols are measured for a minority of these foods.</b> USDA has a figure for
      ${STEROL_FOODS.length} of these foods and none at all for anything in
      ${andList(STEROL_EMPTY_CATS)}. Even among the nuts and seeds, where phytosterols
      concentrate, ${STEROL_MISSING_RICH.length} have no figure:
      ${andList(STEROL_MISSING_RICH.map(fullName))}. Read the column as how much was found in
      the foods that were tested, never as a ranking: sesame and sunflower seeds sit on top
      partly because they are among the few that were assayed at all.</li>
      <li><b>Fortification is marked where it drives the figure.</b> Most rows are for the
      unfortified food, and a commercial packet of plant milk or cereal will beat them. A few are
      the other way round, because no unfortified version of the product is really sold:
      ${andList(FORTIFIED_FOODS.map(fullName))}. Those values carry
      ${FORTIFIED ? `a “${esc(FORTIFIED.marker)}”` : "a marker"} with a note under the table.
      Yeast contains no B12 whatever, so every microgram in the yeast rows was put there by the
      maker, along with most of their thiamin, riboflavin, niacin and folate; the same goes for
      soy milk's B12, calcium and vitamin D. Iodine is shown per food from an outside source, so
      fortification with it is not tracked here the way the B12, calcium and vitamin D added to
      soy milk are.</li>
      <li><b>Seaweed and B12 is two different stories, not one.</b> This entry used to say
      flatly that seaweed's B12 is inactive analogues, and that is right about spirulina and
      wrong about nori. Spirulina is largely pseudovitamin B12, which the body cannot use and
      which some assays count anyway, so a spirulina figure quoted as B12 is usually measuring
      that. Dried purple laver is the genuine exception: it carries active B12, around 77.6 µg
      per 100 g, and it has raised B12 status in animals and in one small human trial. It is
      still not something to depend on, because toasting and seasoning roughly halve it, drying
      can turn the active forms into analogues, and the human evidence is thin. Nori and kelp
      show zero in this table because USDA publishes zero for them, which is its own caveat. The
      traces in tempeh and miso come from bacteria and are too small and too variable to count on.
      See <b>Nutrient gaps</b> for the whole of it.</li>
      <li><b>Iodine comes from outside this table.</b> USDA measures it in plenty of other foods and
      publishes a figure for none of these, so the column is built from Japan's tables instead. It is
      shown per food, it carries its source, and it enters no total. See
      <b>Nutrient gaps</b>.</li>
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

  bio: ["Absorption and bioavailability", bioDialog()],
  gaps: ["What food alone will not supply", gapsDialog()],
} satisfies Record<string, [title: string, body: string]>;

/* The data-dlg attributes in src/index.html are exactly these three keys. The
   check is what makes the lookup in openDialog total rather than a promise. */
const isDialogKey = (k: string | undefined): k is keyof typeof DLG =>
  k !== undefined && Object.hasOwn(DLG, k);

let lastFocus: HTMLElement | null = null;
function openDialog(k: keyof typeof DLG) {
  const [t, b] = DLG[k];
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  $("#dlgT").textContent = t; $("#dlgB").innerHTML = b;
  $<HTMLDialogElement>("#dlg").showModal();
}
$("#dlgX").onclick = () => $<HTMLDialogElement>("#dlg").close();
$("#dlg").addEventListener("close", () => lastFocus?.focus());
$("#dlg").addEventListener("click", e => { if (targetEl(e)?.id === "dlg") $<HTMLDialogElement>("#dlg").close(); });

/* ---------- boot ---------- */
$("#totalFoods").textContent = String(FOODS.length);

// Derived from the data so adding a column cannot leave the prose behind.
const GROUP_BLURB: Record<NutrientGroup, string> = { macro: "macronutrients", fats: "fat fractions", amino: "amino acids",
                      vitamin: "vitamins", mineral: "minerals", carbdetail: "carbohydrate detail",
                      acids: "organic acids", plant: "plant compounds", other: "anti-nutrients" };
$("#compBlurb").textContent = `${NUTS.length} nutrients per food: ` +
  GROUPS.map(g => `${NUTS.filter(n => n.group === g.id).length} ${GROUP_BLURB[g.id]}`)
    .join(", ").replace(/, ([^,]*)$/, " and $1") + ".";

// Default to the system theme on a first visit; a stored choice wins over it.
S.dark = matchMedia("(prefers-color-scheme: dark)").matches;
loadPrefs();

// Reflect restored state in the controls that hold their own value.
applyTheme();
dvBtn.setAttribute("aria-pressed", String(S.dv));
if (S.dv && dvBtn.lastChild) dvBtn.lastChild.textContent = " Show raw amounts";
basisBtn.setAttribute("aria-pressed", String(S.basis === "kcal"));
if (S.basis === "kcal" && basisBtn.lastChild) basisBtn.lastChild.textContent = " Show per 100 g";

renderGroups();
renderCats();
renderLensSelect();
render();

if (S.favs.size) say(`${S.favs.size} saved favourite${S.favs.size === 1 ? "" : "s"} restored.`);
