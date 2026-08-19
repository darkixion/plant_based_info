/**
 * Withdrawing a pairing, and the one thing that must not go with it.
 *
 * A withdrawal deletes the cells a mapping produced. It must not delete the
 * grade, because a grade is per source and per food, and one source can fill
 * several of a food's cells: IFCT's phytate for cooked lentils is dry-basis
 * and goes, while its soluble and insoluble oxalate for the same food stay and
 * still need the proxy mark that says what they were measured on.
 *
 * The withdrawal loop in evidence.mjs used to end with an unconditional delete
 * of the grade, which was right only while every withdrawal took a food's last
 * cell from that source.
 */

/** Whether any cell of this food still rests on the source. */
export function keepsGrade(entry, source) {
  return Object.values(entry?.cells ?? {})
    .some(cell => (cell?.sources ?? []).includes(source));
}
