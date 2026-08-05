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

const S = {
  groups: new Set(["macro", "amino"]),
  sort: { id: "__name", dir: 1 },
  q: "", cat: "", page: 1, per: 20,
  sel: 0, favs: new Set(), favsOnly: false,
  dv: false, view: "table", tab: "overview",
  chartNut: "protein", dark: false,
  lens: "", custom: [],
};

/* ---------- persistence ----------
   Every write is guarded: Safari private mode and disabled-storage settings
   throw on setItem, and a reference table must not break because of it. */
const LS_KEY = "vegan-nutrients:v1";
let storageOK = true;

function savePrefs() {
  if (!storageOK) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      favs: [...S.favs], groups: [...S.groups], sort: S.sort, dv: S.dv,
      per: S.per, dark: S.dark, lens: S.lens, custom: S.custom,
      favsOnly: S.favsOnly, cat: S.cat, chartNut: S.chartNut,
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
  if (Array.isArray(p.favs)) S.favs = new Set(p.favs.filter(s => BY_SLUG.has(s)));

  if (Array.isArray(p.groups)) {
    const g = p.groups.filter(x => GROUPS.some(G => G.id === x));
    if (g.length) S.groups = new Set(g);
  }
  if (p.sort && (p.sort.id === "__name" || IDX.has(p.sort.id)))
    S.sort = { id: p.sort.id, dir: p.sort.dir === 1 ? 1 : -1 };
  if (typeof p.dv === "boolean") S.dv = p.dv;
  if (typeof p.dark === "boolean") S.dark = p.dark;
  if (p.per === "All" || [10, 20, 30].includes(p.per)) S.per = p.per;
  if (CATS.includes(p.cat)) S.cat = p.cat;
  if (IDX.has(p.chartNut)) S.chartNut = p.chartNut;

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
    const x = val(a.f, id), y = val(b.f, id);
    if (x === y) return a.f.name.localeCompare(b.f.name);
    if (x === null) return 1;
    if (y === null) return -1;
    return dir * (x - y);
  });
  return r;
}

function paged(r) {
  if (S.per === "All") return r;
  const start = (S.page - 1) * S.per;
  return r.slice(start, start + S.per);
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
  S.page = 1;
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

function renderTable() {
  const c = layout(), r = rows(), page = paged(r);
  const nameSorted = S.sort.id === "__name";
  const L = lensIds();

  const groupHead = GROUPS.filter(g => S.groups.has(g.id)).map(g => {
    const own = c.filter(x => x.group === g.id);
    const anyLens = own.some(x => x.lens);
    return `<th class="grp${anyLens ? " lens" : ""}" data-g="${g.id}" colspan="${own.length}"
      scope="colgroup">${g.label}</th>`;
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
          <span>Food <span class="unit">per 100 g</span></span>
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
          <span class="sr">, show full profile</span></button>
        <button class="fav" type="button" data-fav="${i}" aria-pressed="${isFav(i)}">
          ${isFav(i) ? I.heartFull : I.heart}
          <span class="sr">${isFav(i) ? "Remove" : "Add"} ${esc(f.name)} ${isFav(i) ? "from" : "to"} favourites</span>
        </button></div></td>
      ${c.map(n => {
        const v = val(f, n.id);
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
    `${FOODS.length} vegan foods, ${c.length} nutrient columns. Values per 100 g of food` +
    (S.dv ? ", shown as % of adult daily value." : ".") +
    (lens ? ` ${lens.name} highlighted.` : "");

  const key = $("#noteKey");
  key.hidden = !shownNotes.size;
  key.innerHTML = [...shownNotes].map(n =>
    `<span><sup class="fnote">${esc(n.marker)}</sup> <b>${esc(n.short)}.</b>
     ${esc(n.text)}</span>`).join("");

  syncHeadOffset();
  return r;
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
function renderChart() {
  const n = NUTS[IDX.get(S.chartNut)];
  const r = rows().slice().sort((a, b) => (val(b.f, n.id) ?? -1) - (val(a.f, n.id) ?? -1));
  const max = Math.max(...r.map(x => val(x.f, n.id) ?? 0), 0.0001);
  $("#chartNut").innerHTML = GROUPS.filter(g => S.groups.has(g.id)).map(g =>
    `<optgroup label="${g.label}">` + NUTS.filter(x => x.group === g.id).map(x =>
      `<option value="${x.id}"${x.id === S.chartNut ? " selected" : ""}>${esc(x.label)}</option>`
    ).join("") + "</optgroup>").join("");
  $("#chartRows").innerHTML = r.slice(0, 25).map(({ f }) => {
    const v = val(f, n.id) ?? 0;
    return `<div class="crow">
      <span class="lbl"><span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
        <span>${esc(f.name)}</span></span>
      <span class="track"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span>
      <span class="val">${fmt(v, n)} <span class="unit">${S.dv && n.dv ? "" : n.unit}</span></span>
    </div>`;
  }).join("");
  $("#chartRows").setAttribute("role", "img");
  $("#chartRows").setAttribute("aria-label",
    `Bar chart of ${n.label} across ${Math.min(r.length, 25)} foods, highest first. ` +
    r.slice(0, 25).map(({ f }) => `${f.name} ${fmtText(val(f, n.id), n)}`).join(", "));
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
  const g = id => val(f, id);
  // Overview first, then one tab per group that has its own detail list. Driven
  // off GROUPS so a new group cannot be added to the table and left out of here.
  const DETAIL_TABS = ["vitamin", "mineral", "amino", "plant"];
  const tabs = [["overview", "Overview", I.macro], ...DETAIL_TABS
    .map(id => GROUPS.find(g => g.id === id))
    .filter(Boolean)
    .map(g => [g.id, g.label, g.icon])];

  // The panel shows the same figures as the table, so it carries the same
  // markers, and explains them once at the foot rather than per row.
  const shown = new Set();

  let body;
  if (S.tab === "overview") {
    const macro = ["kcal", "protein", "carbs", "fiber", "fat", "satfat"];
    const top = NUTS.filter(n => n.dv && n.group !== "macro")
      .map(n => ({ n, pc: (g(n.id) ?? 0) / n.dv * 100 }))
      .filter(x => x.pc > 0).sort((a, b) => b.pc - a.pc).slice(0, 6);
    body = `<h4>Macronutrients</h4><dl>` + macro.map(id => {
      const n = NUTS[IDX.get(id)];
      const sub = id === "fiber" || id === "satfat";
      return `<div class="drow${sub ? " sub" : ""}"><dt>${esc(n.label)}</dt>
        <dd>${(g(id) ?? 0).toFixed(n.dp)} ${n.unit}</dd></div>`;
    }).join("") + `</dl>`
      + proteinQualityBlock(f)
      + `<h4 style="margin-top:18px">Top nutrients</h4><dl>` + top.map(({ n, pc }) => {
        const note = noteFor(S.sel, n.id);
        if (note) shown.add(note);
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
        if (note) shown.add(note);
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
      <div class="per">${esc(f.cat)} · per 100 g</div>
    </div>
    <div class="tabs" role="tablist" aria-label="Nutrient detail sections">
      ${tabs.map(([id, label, ic]) => `
        <button type="button" role="tab" data-tab="${id}" id="tab-${id}"
          aria-selected="${S.tab === id}" aria-controls="tabp"
          tabindex="${S.tab === id ? 0 : -1}">${ic}<span>${label}</span></button>`).join("")}
    </div>
    <div class="dbody" id="tabp" role="tabpanel" aria-labelledby="tab-${S.tab}" tabindex="0">${body}${
      [...shown].map(n => `<p class="nodatanote"><sup class="fnote">${esc(n.marker)}</sup>
        <b>${esc(n.short)}.</b> ${esc(n.text)}</p>`).join("")}</div>
    <div class="dfoot">% DV uses general adult reference values. Yours may differ.</div>`;
}

/* ---------- pager + meta ---------- */
function renderPager(total) {
  const pages = S.per === "All" ? 1 : Math.max(1, Math.ceil(total / S.per));
  if (S.page > pages) S.page = pages;
  let h = `<button class="btn" type="button" data-pg="${S.page - 1}" ${S.page === 1 ? "disabled" : ""}>
             ${I.left}<span class="sr">Previous page</span></button>`;
  for (let p = 1; p <= pages; p++) {
    if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - S.page) > 1) {
      if (p === 3) h += `<span style="padding:0 6px;color:var(--faint)">…</span>`;
      continue;
    }
    h += `<button class="btn" type="button" data-pg="${p}" ${p === S.page ? 'aria-current="page"' : ""}
      style="${p === S.page ? "background:var(--green-tint);border-color:var(--green);font-weight:600" : ""}">${p}</button>`;
  }
  h += `<button class="btn" type="button" data-pg="${S.page + 1}" ${S.page === pages ? "disabled" : ""}>
          ${I.right}<span class="sr">Next page</span></button>`;
  $("#pager").innerHTML = `<div style="display:flex;gap:6px;align-items:center">${h}</div>`;

  const c = cols().length;
  const lens = lensById(S.lens);
  $("#meta").innerHTML = `${I.info} Showing <b>${total}</b> of ${FOODS.length} foods ·
    <b>${c}</b> of ${NUTS.length} nutrients` +
    (S.favsOnly ? " · favourites only" : "") + (S.dv ? " · % daily value" : "") +
    (lens ? ` · <span class="lenshint">${esc(lens.name)}</span> highlighted` : "");
  $("#favCount").textContent = S.favs.size || "";
  $("#cmpCount").textContent = "";
}

/* ---------- master render ---------- */
function render() {
  const showChart = S.view === "chart";
  $("#tableView").hidden = showChart;
  $("#chartView").hidden = !showChart;
  $("#vTable").setAttribute("aria-pressed", String(!showChart));
  $("#vChart").setAttribute("aria-pressed", String(showChart));
  document.querySelector('[data-act="compare"]').setAttribute("aria-pressed", String(showChart));
  document.querySelector('[data-act="favs"]').setAttribute("aria-pressed", String(S.favsOnly));
  const r = renderTable();
  if (showChart) renderChart();
  renderDetail();
  renderPager(r.length);
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

  if (t.dataset.pg) { S.page = +t.dataset.pg; render(); $("#scroller").scrollIntoView({ block: "nearest" }); return; }

  if (t.dataset.act === "favs") {
    S.favsOnly = !S.favsOnly; S.page = 1;
    say(S.favsOnly
      ? `Showing favourites only, ${S.favs.size} food${S.favs.size === 1 ? "" : "s"}.`
      : "Showing all foods.");
    savePrefs();
    return render();
  }
  if (t.dataset.act === "clearfilters") {
    S.q = ""; $("#q").value = ""; $("#qClear").hidden = true;
    S.cat = ""; renderCats(); S.page = 1;
    savePrefs();
    say("Search and category cleared.");
    return render();
  }
  if (t.dataset.act === "compare") { S.view = S.view === "chart" ? "table" : "chart"; return render(); }
  if (t.dataset.dlg) return openDialog(t.dataset.dlg);
});

$("#vTable").onclick = () => { S.view = "table"; render(); };
$("#vChart").onclick = () => { S.view = "chart"; render(); };
$("#chartNut").onchange = e => { S.chartNut = e.target.value; savePrefs(); renderChart(); };
$("#perPage").onchange = e => {
  S.per = e.target.value === "All" ? "All" : +e.target.value; S.page = 1; savePrefs(); render();
};
$("#lensSel").onchange = e => setLens(e.target.value);
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
  S.favsOnly = false; S.page = 1; S.lens = "";
  savePrefs();
  renderGroups(); renderCats(); renderLensSelect(); render();
  say("Columns and filters reset. Favourites and saved highlight groups kept.");
};

let qt;
$("#q").oninput = e => {
  S.q = e.target.value; S.page = 1;
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

/* ---------- CSV ---------- */
function csv() {
  const c = cols(), r = rows();
  const head = ["Food", "Also known as", "State", "Category",
                ...c.map(n => `${n.label} (${S.dv && n.dv ? "%DV" : n.unit})`)];
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(",")].concat(r.map(({ f }) =>
    [q(f.name), q(f.alt || ""), q(f.state), q(f.cat), ...c.map(n => {
      const v = val(f, n.id);
      if (v === null) return "";
      return S.dv && n.dv ? Math.round(v / n.dv * 100) : v;
    })].join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob), download: "vegan-nutrients.csv" });
  a.click(); URL.revokeObjectURL(a.href);
  say(`Exported ${r.length} foods and ${c.length} nutrients as CSV.`);
}
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

/* ---------- dialogs ---------- */
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
    <h4>Narrow it down</h4>
    <p>All three ways of narrowing the table sit in the sidebar. <b>Search</b> at the top matches
    on name, alternative name, state and category. <b>Food categories</b> filters to one group of
    foods, and clicking the category you are already in takes you back to all of them. Star foods
    with the heart button and switch on <b>Favourites</b> to see only your shortlist.</p>
    <p><b>Export CSV</b>, above the table, writes out exactly the rows and columns you can
    currently see, so narrowing the table narrows the export with it.</p>
    <h4>What gets remembered</h4>
    <p>Your favourites, saved highlight groups, visible columns, sort order and light or dark mode
    are kept in this browser between visits. Nothing is sent anywhere. It is stored on your own
    machine, so it will not follow you to another device, and clearing site data will clear it.
    <b>Reset columns</b> restores the default view but leaves your favourites and saved groups
    alone.</p>
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
    <p>One caveat. USDA reports 18:1 <em>undifferentiated</em>, meaning the figure bundles a
    small amount of n-7 vaccenic acid in with the n-9 oleic acid. In plant foods 18:1 is
    overwhelmingly oleic, so reading it as omega-9 is the usual convention and a close
    approximation, but it is not a direct n-9 measurement. The 16:1 figure has no such ambiguity.
    A few foods have no measurement at all and show a dash rather than a zero.</p>
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
    <p>Phytosterols, phytic acid, isoflavones and total flavonoids are <em>not</em> here. SR Legacy
    carries no figures at all for the last three, and reaches only 8 to 14 of these foods for
    phytosterols, so those columns would be almost entirely blank. USDA publishes them in separate
    databases that would need their own mapping.</p>
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
      <li><b>Fortification is marked where it drives the figure.</b> Most rows are for the
      unfortified food, and a commercial packet of plant milk or cereal will beat them. Two rows
      are the other way round, because no unfortified version of the product is really sold:
      nutritional yeast and soy milk. Their fortified values carry an asterisk with a note under
      the table. Unfortified nutritional yeast has no B12 at all, and its 12,500% daily value here
      is entirely what the maker added, as is soy milk's B12, calcium and vitamin D. Iodine is not
      a column, so fortification with it is not shown anywhere.</li>
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
      staples and often skipped for minor vegetables and fruit. Artichokes, Jerusalem artichokes
      and blackberries have no published amino acid analysis at all, and a few others are partial.
      Where that is the case the food gets no amino acid score, rather than a score of zero.</li>
    </ul>`],
  about: ["About this database", `
    <p>A single-page reference for the nutrient content of whole plant foods: ${FOODS.length} foods
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
                      vitamin: "vitamins", mineral: "minerals", plant: "carotenoids" };
$("#compBlurb").textContent = `${NUTS.length} nutrients per food: ` +
  GROUPS.map(g => `${NUTS.filter(n => n.group === g.id).length} ${GROUP_BLURB[g.id]}`)
    .join(", ").replace(/, ([^,]*)$/, " and $1") + ".";

// Default to the system theme on a first visit; a stored choice wins over it.
S.dark = matchMedia("(prefers-color-scheme: dark)").matches;
loadPrefs();

// Reflect restored state in the controls that hold their own value.
applyTheme();
$("#perPage").value = String(S.per);
$("#dvBtn").setAttribute("aria-pressed", String(S.dv));
if (S.dv) $("#dvBtn").lastChild.textContent = " Show raw amounts";

renderGroups();
renderCats();
renderLensSelect();
render();

if (S.favs.size) say(`${S.favs.size} saved favourite${S.favs.size === 1 ? "" : "s"} restored.`);
