/**
 * FAO/INFOODS BioFoodComp 4.0 and AnFooD 2.0, the raffinose family: the cell
 * rule for the oligosaccharide columns.
 *
 * Three properties of these two releases decide everything here.
 *
 * They sample cultivars and treatments rather than foods, as PhyFoodComp does,
 * so a food is mapped to a list of rows and the cell is the span of what they
 * found. But the mapping is per component rather than per food, which phytate
 * never needed: row 144 is the only cooked chickpea in either workbook carrying
 * verbascose, and rows 126, 129 and 132 are boiled Egyptian cultivars carrying
 * raffinose alone. All four are the right food and they answer for different
 * columns, so which rows a cell rests on is a fact about the column, not about
 * the food.
 *
 * They report an analysed absence, `nd`, on 7 of their 412 readings. That is a
 * finding and the widest disagreement there is, so it enters the span as zero
 * rather than being filtered out with the blanks. Dropping it is how AFCD's
 * 74 ug of iodine in rolled oats against MEXT's not detected once printed as
 * 74 alone, and reconcile.mjs carries the same rule for the same reason.
 *
 * And they are compilations that turn out to be clean. All 157 rows in the
 * pool cite a primary paper, none of them a food composition table, so unlike
 * fao_phytate.mjs there is no admission rule here and nothing to refuse. That
 * is a finding rather than an omission: the question was asked, and the answer
 * is FAO-OLIGOS-PROVENANCE.md. It holds only for the three columns this
 * extraction takes, and a pass that ever draws a fourth component from these
 * workbooks has to ask it again of whatever rows that pass returns.
 *
 * The pairing itself is not a rule and is not here. It is banked by a human in
 * page-map-fao-oligos.json with a grade and a note.
 *
 * Licence: © FAO, non-commercial use only. See LICENCES.md.
 */
import { spanCell } from "./reconcile.mjs";

const SOURCE = "fao-oligosaccharides";

/**
 * The cells a banked mapping produces, and the components it banks that the
 * page has no column for.
 *
 * `columns` is the page's own list rather than a copy of it, because the third
 * component these workbooks carry has no column today: verbascose was removed
 * after one value, every other source reporting the raffinose family on a
 * dry-matter basis for raw seed, and row 144's 0.42 g per 100 g stays banked
 * against its return. Writing it would fail validation as an unknown component;
 * hard-coding the two columns that exist would keep it unwritten on the day the
 * third comes back. So the caller passes what the page can read, and a
 * component outside that is reported rather than dropped in silence.
 */
export function faoOligosCells(entry, rows, columns) {
  const has = new Set(columns);
  const cells = {}, noColumn = [];

  for (const [id, list] of Object.entries(entry.components ?? {})) {
    if (!has.has(id)) { noColumn.push(id); continue; }

    /* A row silent about a component is a gap, and a row that looked and found
       nothing is a zero. Only the second is a reading, which is why the two
       cannot share a filter. */
    const readings = (list ?? []).map(i => rows[i]?.[id]).filter(Boolean);
    const figures = readings
      .map(c => (c.state === "not-detected" ? 0 : c.value))
      .filter(v => typeof v === "number");
    if (!figures.length) continue;

    cells[id] = figures.some(v => v !== 0) || readings.some(c => c.state !== "not-detected")
      ? spanCell(figures, [SOURCE])
      : { state: "not-detected", sources: [SOURCE] };
  }
  return { cells, noColumn };
}
