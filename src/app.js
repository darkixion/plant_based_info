const NUTS = DATA.nutrients, FOODS = DATA.foods;
const GROUPS = [
  { id: "macro",   label: "Macronutrients", icon: I.macro },
  { id: "fats",    label: "Omega & fats",   icon: I.fats  },
  { id: "amino",   label: "Amino acids",    icon: I.amino },
  { id: "vitamin", label: "Vitamins",       icon: I.vit   },
  { id: "mineral", label: "Minerals",       icon: I.min   },
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

/* ---------- highlight lenses ----------
   A lens is a named set of nutrients that cuts across the column groups.
   Only nutrients present in DATA are listed; anything unknown is dropped on load. */
const BUILTIN_LENSES = [
  { id: "eaa",       name: "Essential amino acids", ids: ["his","ile","leu","lys","met","phe","thr","trp","val"] },
  { id: "creatine",  name: "Creatine precursors",   ids: ["gly","arg","met"] },
  { id: "bcaa",      name: "Branched-chain (BCAA)", ids: ["leu","ile","val"] },
  { id: "sulphur",   name: "Sulphur amino acids",   ids: ["met","cys"] },
  { id: "aromatic",  name: "Aromatic amino acids",  ids: ["phe","tyr"] },
  { id: "iron",      name: "Iron & absorption",     ids: ["fe","vitc"] },
  { id: "bone",      name: "Bone health",           ids: ["ca","vitd","vitk","mg","p"] },
  { id: "methyl",    name: "B12, folate & methylation", ids: ["b12","b9","b6","chol","met"] },
  { id: "omega",     name: "Omega balance",         ids: ["ala","la"] },
  { id: "antiox",    name: "Antioxidant vitamins",  ids: ["vita","vitc","vite","se"] },
  { id: "electro",   name: "Electrolytes",          ids: ["na","k","mg","ca"] },
];

const S = {
  groups: new Set(["macro", "amino"]),
  sort: { id: "protein", dir: -1 },
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
  if (p.sort && IDX.has(p.sort.id) || p.sort?.id === "__name")
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
                   ids: l.ids.filter(x => IDX.has(x)) }))
      .filter(l => l.id && l.ids.length);
  }
  if (typeof p.lens === "string" && lensById(p.lens)) S.lens = p.lens;

  // Favourites-only with nothing starred would render an empty table on load.
  S.favsOnly = p.favsOnly === true && S.favs.size > 0;
}

const lensById = id => id
  ? [...BUILTIN_LENSES, ...S.custom].find(l => l.id === id) || null
  : null;
const lensIds = () => new Set(lensById(S.lens)?.ids || []);

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const say = m => { $("#live").textContent = m; };

/* ---------- data helpers ---------- */
const cols = () => NUTS.map((n, i) => ({ ...n, i })).filter(n => S.groups.has(n.group));
const val = (f, id) => f.v[IDX.get(id)];

function fmt(v, n) {
  if (v === null || v === undefined) return "—";
  if (S.dv && n.dv) return v === 0 ? "0%" : Math.round((v / n.dv) * 100) + "%";
  if (v === 0) return "0";
  return v.toFixed(n.dp);
}

function rows() {
  const q = S.q.trim().toLowerCase();
  let r = FOODS.map((f, i) => ({ f, i }));
  if (S.favsOnly) r = r.filter(x => S.favs.has(x.i));
  if (S.cat) r = r.filter(x => x.f.cat === S.cat);
  if (q) r = r.filter(x =>
    (x.f.name + " " + x.f.state + " " + x.f.cat).toLowerCase().includes(q));
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

/* ---------- sidebar groups + pills ---------- */
function renderGroups() {
  const counts = {};
  NUTS.forEach(n => counts[n.group] = (counts[n.group] || 0) + 1);
  $("#groupNav").innerHTML = GROUPS.map(g => `
    <li><button class="navbtn" type="button" data-grp="${g.id}"
        aria-pressed="${S.groups.has(g.id)}">
      ${g.icon}<span>${g.label}</span>
      <span class="count">${counts[g.id]}</span><span class="dot"></span></button></li>`).join("");
  $("#pills").innerHTML = GROUPS.map(g => `
    <button class="pill" type="button" data-grp="${g.id}" aria-pressed="${S.groups.has(g.id)}">
      ${g.icon}<span>${g.label}</span><span class="n">${counts[g.id]}</span></button>`).join("");
}

function toggleGroup(id) {
  S.groups.has(id) ? S.groups.delete(id) : S.groups.add(id);
  if (!S.groups.size) S.groups.add("macro");
  const on = S.groups.has(id);
  const g = GROUPS.find(x => x.id === id);
  document.querySelectorAll(`[data-grp="${id}"]`)
    .forEach(b => b.setAttribute("aria-pressed", String(on)));
  say(`${g.label} ${on ? "shown" : "hidden"}. ${cols().length} nutrient columns visible.`);
  render();
}

/* ---------- table ---------- */
function renderTable() {
  const c = cols(), r = rows(), page = paged(r);
  const nameSorted = S.sort.id === "__name";

  const groupHead = GROUPS.filter(g => S.groups.has(g.id)).map(g => {
    const n = c.filter(x => x.group === g.id).length;
    return `<th class="grp" data-g="${g.id}" colspan="${n}" scope="colgroup">${g.label}</th>`;
  }).join("");

  const cells = c.map(n => {
    const active = S.sort.id === n.id;
    const aria = active ? (S.sort.dir === 1 ? "ascending" : "descending") : "none";
    const unit = S.dv && n.dv ? "%DV" : n.unit;
    return `<th scope="col" aria-sort="${aria}">
      <button class="sortbtn" type="button" data-sort="${n.id}">
        <span>${esc(n.label)} <span class="unit">${unit}</span></span>
        <span class="ar" aria-hidden="true">${active ? (S.sort.dir === 1 ? I.up : I.down) : I.sortable}</span>
      </button></th>`;
  }).join("");

  $("#thead").innerHTML = `
    <tr>
      <th class="food" rowspan="2" scope="col" aria-sort="${nameSorted ? (S.sort.dir === 1 ? "ascending" : "descending") : "none"}">
        <button class="sortbtn" type="button" data-sort="__name" style="justify-content:flex-start">
          <span>Food <span class="unit">per 100 g</span></span>
          <span class="ar" aria-hidden="true">${nameSorted ? (S.sort.dir === 1 ? I.up : I.down) : I.sortable}</span>
        </button></th>
      ${groupHead}
    </tr><tr>${cells}</tr>`;

  $("#tbody").innerHTML = page.length ? page.map(({ f, i }) => `
    <tr data-i="${i}" ${S.sel === i ? 'aria-selected="true"' : ""}>
      <td class="food"><div class="fcell">
        <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
        <button class="fname" type="button" data-pick="${i}">
          <b>${esc(f.name)}</b>${f.state ? `<span>${esc(f.state)}</span>` : ""}
          <span class="sr">— show full profile</span></button>
        <button class="fav" type="button" data-fav="${i}" aria-pressed="${S.favs.has(i)}">
          ${S.favs.has(i) ? I.heartFull : I.heart}
          <span class="sr">${S.favs.has(i) ? "Remove" : "Add"} ${esc(f.name)} ${S.favs.has(i) ? "from" : "to"} favourites</span>
        </button></div></td>
      ${c.map(n => {
        const v = val(f, n.id);
        const zero = v === 0 || v === null;
        return `<td class="num${zero ? " low" : ""}">${fmt(v, n)}</td>`;
      }).join("")}
    </tr>`).join("")
    : `<tr><td class="empty" colspan="${c.length + 1}">
         <b>No foods match that search</b>Try a different term, or clear the filters.</td></tr>`;

  $("#cap").textContent =
    `${FOODS.length} vegan foods, ${c.length} nutrient columns. Values per 100 g of food` +
    (S.dv ? ", shown as % of adult daily value." : ".");
  return r;
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
    r.slice(0, 25).map(({ f }) => `${f.name} ${fmt(val(f, n.id), n)}`).join(", "));
}

/* ---------- detail panel ---------- */
function renderDetail() {
  const f = FOODS[S.sel];
  const g = id => val(f, id);
  const tabs = [["overview", "Overview", I.macro], ["vitamin", "Vitamins", I.vit],
                ["mineral", "Minerals", I.min], ["amino", "Amino acids", I.amino]];

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
    }).join("") + `</dl>
      <h4 style="margin-top:18px">Top nutrients</h4><dl>` + top.map(({ n, pc }) => `
        <div class="drow"><dt>${esc(n.label)}</dt>
          <dd class="pc">${Math.round(pc)}% DV</dd></div>`).join("") + `</dl>`;
  } else {
    const list = NUTS.filter(n => n.group === S.tab);
    const max = Math.max(...list.map(n => g(n.id) ?? 0), 0.0001);
    body = `<h4>${S.tab === "amino" ? "Amino acids" : S.tab === "vitamin" ? "Vitamins" : "Minerals"}</h4>
      <dl>` + list.map(n => {
        const v = g(n.id) ?? 0;
        const pc = n.dv ? Math.round(v / n.dv * 100) : null;
        return `<div class="drow" style="display:block">
          <div style="display:flex;justify-content:space-between;gap:10px">
            <dt>${esc(n.label)}</dt>
            <dd>${v.toFixed(n.dp)} ${n.unit}${pc !== null ? ` <span class="pc">· ${pc}%</span>` : ""}</dd>
          </div>
          <div class="minibar" aria-hidden="true"><i style="width:${(v / max * 100).toFixed(1)}%"></i></div>
        </div>`;
      }).join("") + `</dl>`;
  }

  $("#detail").innerHTML = `
    <div class="dhead">
      <button class="fav" type="button" data-fav="${S.sel}" aria-pressed="${S.favs.has(S.sel)}">
        ${S.favs.has(S.sel) ? I.heartFull : I.heart}
        <span class="sr">${S.favs.has(S.sel) ? "Remove from" : "Add to"} favourites</span></button>
      <span class="sw" style="--c:${f.colour}" aria-hidden="true"></span>
      <h3>${esc(f.name)}</h3>
      ${f.state ? `<div class="st">${esc(f.state)}</div>` : ""}
      <div class="per">${esc(f.cat)} · per 100 g</div>
    </div>
    <div class="tabs" role="tablist" aria-label="Nutrient detail sections">
      ${tabs.map(([id, label, ic]) => `
        <button type="button" role="tab" data-tab="${id}" id="tab-${id}"
          aria-selected="${S.tab === id}" aria-controls="tabp"
          tabindex="${S.tab === id ? 0 : -1}">${ic}<span>${label}</span></button>`).join("")}
    </div>
    <div class="dbody" id="tabp" role="tabpanel" aria-labelledby="tab-${S.tab}" tabindex="0">${body}</div>
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
  $("#meta").innerHTML = `${I.info} Showing <b>${total}</b> of ${FOODS.length} foods ·
    <b>${c}</b> of ${NUTS.length} nutrients` +
    (S.favsOnly ? " · favourites only" : "") + (S.dv ? " · % daily value" : "");
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
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;

  if (t.dataset.grp) return toggleGroup(t.dataset.grp);

  if (t.dataset.sort) {
    const id = t.dataset.sort;
    if (S.sort.id === id) S.sort.dir *= -1;
    else S.sort = { id, dir: id === "__name" ? 1 : -1 };
    const label = id === "__name" ? "Food name" : NUTS[IDX.get(id)].label;
    say(`Sorted by ${label}, ${S.sort.dir === 1 ? "ascending" : "descending"}.`);
    return render();
  }

  if (t.dataset.pick !== undefined) {
    S.sel = +t.dataset.pick;
    say(`${FOODS[S.sel].name} selected.`);
    return render();
  }

  if (t.dataset.fav !== undefined) {
    const i = +t.dataset.fav;
    S.favs.has(i) ? S.favs.delete(i) : S.favs.add(i);
    say(`${FOODS[i].name} ${S.favs.has(i) ? "added to" : "removed from"} favourites.`);
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
    say(S.favsOnly ? "Showing favourites only." : "Showing all foods.");
    return render();
  }
  if (t.dataset.act === "compare") { S.view = S.view === "chart" ? "table" : "chart"; return render(); }
  if (t.dataset.dlg) return openDialog(t.dataset.dlg);
});

$("#vTable").onclick = () => { S.view = "table"; render(); };
$("#vChart").onclick = () => { S.view = "chart"; render(); };
$("#chartNut").onchange = e => { S.chartNut = e.target.value; renderChart(); };
$("#perPage").onchange = e => {
  S.per = e.target.value === "All" ? "All" : +e.target.value; S.page = 1; render();
};
$("#catSel").onchange = e => { S.cat = e.target.value; S.page = 1; render(); };
$("#dvBtn").onclick = e => {
  S.dv = !S.dv;
  e.currentTarget.setAttribute("aria-pressed", String(S.dv));
  e.currentTarget.lastChild.textContent = S.dv ? " Show raw amounts" : " Show % daily value";
  say(S.dv ? "Showing percentage of daily value." : "Showing raw amounts.");
  render();
};
$("#resetBtn").onclick = () => {
  S.groups = new Set(["macro", "amino"]); S.sort = { id: "protein", dir: -1 };
  S.q = ""; $("#q").value = ""; S.cat = ""; $("#catSel").value = "";
  S.dv = false; $("#dvBtn").setAttribute("aria-pressed", "false");
  S.favsOnly = false; S.page = 1;
  renderGroups(); render(); say("Columns and filters reset.");
};

let qt;
$("#q").oninput = e => {
  S.q = e.target.value; S.page = 1;
  $("#qClear").hidden = !S.q;
  clearTimeout(qt);
  qt = setTimeout(() => { render(); say(`${rows().length} foods match.`); }, 160);
};
$("#qClear").onclick = () => { S.q = ""; $("#q").value = ""; $("#qClear").hidden = true; $("#q").focus(); render(); };

$("#themeBtn").onclick = e => {
  S.dark = !S.dark;
  document.documentElement.dataset.theme = S.dark ? "dark" : "";
  e.currentTarget.setAttribute("aria-pressed", String(S.dark));
  $("#themeIc").innerHTML = S.dark ? I.sun : I.moon;
  $("#themeTx").textContent = S.dark ? "Light mode" : "Dark mode";
};

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
  const head = ["Food", "State", "Category", ...c.map(n => `${n.label} (${S.dv && n.dv ? "%DV" : n.unit})`)];
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(",")].concat(r.map(({ f }) =>
    [q(f.name), q(f.state), q(f.cat), ...c.map(n => {
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
$("#csvBtn").onclick = csv; $("#csvBtn2").onclick = csv;

/* ---------- dialogs ---------- */
const DLG = {
  how: ["How to use", `
    <h4>Show the columns you want</h4>
    <p>The five category buttons — in the sidebar or the row under the headline — switch whole
    groups of columns on and off. Amino acids and macronutrients start visible; turn on vitamins,
    minerals and omega oils as you need them.</p>
    <h4>Sort by anything</h4>
    <p>Every column header is a button. One click sorts high to low, a second reverses it. Sorting
    applies to the whole dataset, not just the page you are looking at.</p>
    <h4>Compare like for like</h4>
    <p><b>Show % daily value</b> converts every column that has a reference value into a percentage,
    which makes a milligram of selenium and a gram of protein comparable at a glance.</p>
    <h4>Narrow it down</h4>
    <p>Search by name or category, filter to one food group, or star foods and switch on
    <b>Favourites</b> to see only your shortlist. <b>Export CSV</b> writes out exactly the rows and
    columns you can currently see.</p>
    <h4>Keyboard</h4>
    <p>Everything is reachable by tab. The table region itself is focusable, so you can scroll it
    sideways with the arrow keys. The detail panel tabs move with left and right arrows.</p>`],
  meth: ["Methodology and limits", `
    <h4>Where the numbers come from</h4>
    <p>Macronutrients, vitamins, minerals and fat fractions follow USDA FoodData Central entries for
    the food in the state listed — cooked where it says cooked, dry where it says dry. Figures are
    representative values for the food, not a lab analysis of any particular packet.</p>
    <h4>How amino acids are calculated</h4>
    <p>Each food has a profile of amino acids expressed as grams per 100 g of <em>protein</em>. The
    figures in the table are that profile multiplied by the food's protein content, so the amino acid
    columns always reconcile with the protein column. It also means cooked and dry forms of the same
    food share one profile, because water content divides out.</p>
    <h4>What "daily value" means here</h4>
    <p>Percentages use general adult reference intakes — FDA Daily Values for vitamins and minerals,
    and the FAO/WHO 2007 scoring pattern where amino acids are concerned. They are a common yardstick,
    not a personal target. Requirements shift with age, sex, body size, pregnancy, lactation,
    medication and illness.</p>
    <h4>Known caveats</h4>
    <ul>
      <li><b>Protein is estimated from nitrogen.</b> Standard analysis multiplies nitrogen by 6.25,
      which counts non-protein nitrogen too. This overstates protein in some foods — spirulina
      especially, because it is rich in nucleic acids.</li>
      <li><b>Sulphur and aromatic amino acids work in pairs.</b> Methionine is spared by cysteine and
      phenylalanine by tyrosine. Judge those four columns as two pairs, not four separate rows.</li>
      <li><b>Selenium tracks the soil, not the seed.</b> The Brazil nut figure is a typical value and
      real nuts vary by more than an order of magnitude.</li>
      <li><b>Fortification is invisible here.</b> Values are for the unfortified food. Commercial
      plant milks, cereals and nutritional yeast are often fortified with B12, D, calcium and iodine,
      and the packet will beat these figures.</li>
      <li><b>Iodine is not included</b>, as reliable per-food values are scarce for plant foods.</li>
    </ul>`],
  about: ["About this database", `
    <p>A single-page reference for the nutrient content of whole plant foods: 44 foods across
    53 nutrients, all per 100 g, all sortable and filterable.</p>
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
$("#catSel").innerHTML = `<option value="">All categories</option>` +
  CATS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
$("#totalFoods").textContent = FOODS.length;
renderGroups();
render();
