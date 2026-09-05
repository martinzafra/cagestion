// Fixed palette assigned by alphabetical apartment name order, so the same
// apartment always gets the same color across reloads regardless of fetch
// order, as long as the apartment list itself doesn't change.
const PALETTE = [
  { dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-800' },
  { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  { dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' },
  { dot: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800' },
  { dot: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-800' },
  { dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800' },
  { dot: 'bg-pink-500', chip: 'bg-pink-100 text-pink-800' },
];

export interface ApartmentColor {
  dot: string;
  chip: string;
}

export function getApartmentColorMap(
  apartments: { id: string; name: string }[]
): Map<string, ApartmentColor> {
  const sorted = [...apartments].sort((a, b) => a.name.localeCompare(b.name));
  const map = new Map<string, ApartmentColor>();
  sorted.forEach((apt, idx) => {
    map.set(apt.id, PALETTE[idx % PALETTE.length]);
  });
  return map;
}
