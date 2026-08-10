# Handover: session of 2026-08-08/09

Written for the next session to pick up where this one left off. Read
`HANDOVER.md` and `README.md` first; this file covers only what changed or was
discovered in this session.

## Branch and git state

On branch `evidence-columns-phase-2a`, ahead of `main`. Nothing is pushed;
`origin/main` is behind `main`, which is behind this branch. A parallel session
may also be working on this branch and may have committed work not reflected
here.

## What this session did

### Research, no code changes

1. **Read the full handover and all referenced plans.** Mapped every commit on
   `evidence-columns-phase-2a` to its plan task. Tasks 1 through 6 of the
   Phase 2a plan are done and committed. Task 7 (documentation) was the only
   remaining work. All 159 tests pass.

2. **Inventoried every food property available across all source data.** The
   full list is in the artifact `candidate_properties.md` in this session's
   brain directory. The short version: 89 columns exist now, and roughly 40
   more are reachable across the eight databases already extracted. The
   most promising additions ranked by data readiness:

   - **Betaine**: 57/57 coverage from USDA SR Legacy, ready now via
     `tools/usda.mjs pull`. Spares choline in methylation.
   - **Proanthocyanidins**: USDA separate `.accdb` database, 283 foods. The
     handover's top open item. The `.accdb` reader already exists.
   - **Phytate**: 298/304 IFCT rows already extracted. The key anti-nutrient.
     Blocked on IFCT food mappings (Phase 2b).
   - **Lignans**: 661 Phenol-Explorer rows. Not in any plan yet.
   - **Oxalate soluble/insoluble**: 291/312 IFCT rows. Phase 2b.
   - **Boron**: Frida, 49 fresh-weight values. Phase 2b.
   - **Inulin**: AFCD, 46 rows. Phase 2b.
   - Plus hydroxycinnamic acids (MEXT), flavones (Phenol-Explorer),
     oligosaccharides (IFCT/AFCD/CoFID), chloride (AFCD), saponins (IFCT).

3. **Analysed what existing phases cover versus what is missing.** The
   original evidence design planned 35 columns total. Phase 1 shipped 3,
   Phase 2a shipped 16, Phase 2b plans 16 more (blocked on mapping exercises
   for AFCD, IFCT, CoFID and Frida). What is NOT covered by any phase:

   - **Betaine** (USDA column, not an evidence column)
   - **Proanthocyanidins** (needs spec + USDA database download)
   - **Lignans, flavones, hydroxycinnamic acids** (Phenol-Explorer, needs
     food mapping and a new tool)
   - **Chloride, sulphur** (AFCD, would come free with AFCD mapping)
   - **MEXT organic acids not in Phase 2a** (lactic, acetic, chlorogenic,
     caffeic, ferulic, p-coumaric acids)

4. **Confirmed preparation-matching safety is thorough.** Three layers:
   mapping grades (exact/close/proxy with visible markers), reconciliation
   Rule 1 ("preparation gates everything"), and build validation refusing
   cells whose `prep` disagrees with their food's state.

### Work attempted (may or may not have completed)

5. **Task 7 of Phase 2a plan** (documentation updates to README.md,
   tools/evidence/README.md, and HANDOVER.md). This was delegated to a
   subagent. Check git log for a commit with message matching
   "Write down what phase 2a did and what phase 2b needs" or similar.
   If the commit is not present, Task 7 is still undone. The plan at
   `docs/superpowers/plans/2026-08-07-evidence-columns-phase-2a.md`
   lines 870-907 has the full spec for what Task 7 should contain.

6. **Betaine column addition** was researched but may not have been
   executed. Check whether `betaine` appears in `src/data/nutrients.json`.
   If not, the steps are:
   - Add `betaine` to `COLUMN_TO_USDA` and `KNOWN` in `tools/usda.mjs`
     (USDA nutrient id 1198)
   - Add the column definition to `src/data/nutrients.json` (appended at end,
     after oxalate; group: vitamin, sits beside choline; unit: mg; dp: 1;
     no daily value)
   - Run `node tools/usda.mjs pull betaine`
   - Run `npm run build` and `npm test`

7. **Moving the pufa check into build.mjs** was researched. The check
   lives in `tools/usda.mjs` and verifies that for each food,
   ALA + LA <= PUFA (within tolerance). The six rows that used to fail
   were fixed by the fat re-pull (seventh session), so the check should
   now pass in the build. Check whether `build.mjs` now contains a pufa
   consistency check. If not, the work is still to do.

## What to do next

In priority order:

1. **Check whether Task 7 was committed.** If not, complete it. The plan
   has the full spec.

2. **Check whether betaine was added.** If not, add it per the steps above.

3. **Move the pufa check into build.mjs.** Small task, closes a real gap.

4. **Add a `--dry-run` test for `usda.mjs add`** in `test/tools.mjs`.
   Both new columns (gamma-tocopherol and phytosterols) broke `add` by
   omitting `COLUMN_TO_USDA`, and both times it was found by hand.

5. **Proanthocyanidins**: the next spec to write. Download the USDA
   Proanthocyanidin database, run it through the existing `.accdb` reader,
   check coverage against the 131 foods, and decide whether to add a column.

6. **Phase 2b mapping exercises**: AFCD, IFCT, CoFID, Frida. The mapping
   is the slow part. Each database needs a reviewed `page-map-*.json` file
   matching its foods to this page's 131 foods, with exact/close/proxy
   grades and preparation checks.

7. **Phenol-Explorer integration**: not in any plan. Would unlock lignans,
   flavones, hydroxycinnamic acids, and more. Needs a food mapping exercise
   and a tool similar to `flavonoids.mjs`.

## Conventions to preserve

All of these are enforced by tests or build checks:

- No em dashes anywhere
- No invented data, no `?? 0` or `|| 0` on nutrition figures
- Evidence values never enter `v` arrays, totals, %DV, amino acid scores,
  or "Short on"
- Array position in `nutrients.json` must never be reordered
- `build.mjs` must stay dependency-free
- Food mappings are reviewed by a human and committed
- Prose describing data derives from the data

## Files that matter

- `HANDOVER.md`: the main handover, session by session
- `README.md`: the durable documentation
- `docs/superpowers/plans/`: implementation plans
- `docs/superpowers/specs/`: design specs
- `tools/evidence/`: extracted data from 8+ databases, with `sources.json`
  as the index and `RECONCILIATION.md` for cross-source findings
- `src/data/nutrients.json`: column definitions (array position is the
  position in each food's `v` array; evidence columns appended at end)
- `src/data/evidence.json`: evidence cell data, keyed by food slug then
  component id
- `src/app.ts`: the application source (compiles to `dist/app.js`)
- `build.mjs`: turns `src/` into `index.html`
- `tools/usda.mjs`: pulls USDA SR Legacy data
- `tools/evidence.mjs`: generates evidence columns from the evidence store
- `tools/flavonoids.mjs`: pulls USDA flavonoid data
- `test/smoke.mjs`: browser tests (the bulk of the suite)
- `test/tools.mjs`: tool tests (non-browser)

# Handover: session 15 (Current)

## What this session did

- **Added New Foods**: Successfully added Papaya, Goji berries, and an exhaustive list of common oils (Rapeseed/Canola, Sunflower, Sesame, Walnut, Avocado, Olive, Peanut, Flaxseed/Linseed, Soybean, Coconut) to `tools/food-additions.json`.
- **Ingested New Foods**: Ran `node tools/usda.mjs add` to fetch data for all these new foods into `src/data/nutrients.json`. 
- **Flavonoid Subclasses**: Added Flavanones and Flavones by extracting `Eriodictyol`, `Hesperetin`, `Naringenin` and `Apigenin`, `Luteolin` respectively from the USDA Flavonoid Database (Release 3.3).
- **Isoflavones**: Created a new workflow (`tools/isoflavones.mjs`) to pull Isoflavones (`Daidzein`, `Genistein`, `Glycitein`) specifically from the USDA Expanded Flavonoid Database (`FDB-EXP_R01-1.accdb`), explicitly ignoring imputed zeroes.
- **Bug Fix**: Fixed a bug in `usda.mjs` where `cmdAdd` didn't account for evidence columns when initializing `f.v`, which caused `build.mjs` to fail validation.

## Next Steps

- **Phase 2b (Mappings)**: To answer your question—yes, adding the other health-relevant columns like Phytate, Lignans, Soluble Oxalate, Prebiotic Fibers, etc., is covered by the upcoming Phase 2b. These columns depend on datasets like AFCD, IFCT, CoFID, and Frida, which require careful, manual cross-referencing (mapping) to make sure raw isn't mapped to cooked, etc. The infrastructure is there, but the mappings themselves are the slow part.
- **Coenzyme Q10**: As discussed in the previous session, we are holding off on CoQ10 while you personally investigate data sources for it.
- **Commit**: The changes are all working and `npm test` passes. You should commit them!
