// Natural comparator: numbers embedded in strings sort by value, not
// lexicographically, so an Invoice # or Booking Ref column reads
// 2, 9, 10 instead of 10, 2, 9. Falls straight through to a normal
// numeric or string comparison for non-string / non-numeric values.
export function compareSortValues(va: string | number, vb: string | number): number {
  if (typeof va === 'number' && typeof vb === 'number') {
    return va - vb;
  }
  return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
}
