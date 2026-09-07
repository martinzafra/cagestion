export interface ApartmentColor {
  dot: string;
  chip: string;
  border: string;
}

// Explicit, memorable color assigned per apartment name, so the same
// apartment always reads as the same color everywhere (calendar bookings,
// filter chip legend) regardless of fetch order.
const NAME_COLORS: Record<string, ApartmentColor> = {
  Alexandrite: { dot: 'bg-red-500', chip: 'bg-red-100 text-red-800', border: 'border-red-500' },
  Barbarita: { dot: 'bg-royal-500', chip: 'bg-royal-100 text-royal-800', border: 'border-royal-500' },
  'Casa Artur': { dot: 'bg-brown-500', chip: 'bg-brown-100 text-brown-800', border: 'border-brown-500' },
  Catamaran: { dot: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800', border: 'border-violet-500' },
  TMB: { dot: 'bg-green-500', chip: 'bg-green-100 text-green-800', border: 'border-green-500' },
};

// Fallback palette for any apartment name not in the explicit map above
// (e.g. a newly-added apartment), assigned by alphabetical order so it's
// still stable across reloads.
const FALLBACK_PALETTE = [
  { dot: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-800', border: 'border-cyan-500' },
  { dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-800', border: 'border-orange-500' },
  { dot: 'bg-pink-500', chip: 'bg-pink-100 text-pink-800', border: 'border-pink-500' },
  { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-500' },
  { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800', border: 'border-amber-500' },
];

export function getApartmentColorMap(
  apartments: { id: string; name: string }[]
): Map<string, ApartmentColor> {
  const sorted = [...apartments].sort((a, b) => a.name.localeCompare(b.name));
  const map = new Map<string, ApartmentColor>();
  let fallbackIdx = 0;
  sorted.forEach((apt) => {
    const color = NAME_COLORS[apt.name] || FALLBACK_PALETTE[fallbackIdx++ % FALLBACK_PALETTE.length];
    map.set(apt.id, color);
  });
  return map;
}
