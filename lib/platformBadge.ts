// Fixed initials + brand color per platform, not a generic transform.
// Booking.com, Airbnb and Idealista use their real official icon colors
// (sampled from their app icons); the rest use the app's own palette.
export const PLATFORM_BADGE: Record<
  string,
  { text: string; className: string; textClassName?: string }
> = {
  Bookings: { text: 'B.', className: 'bg-[#003580]' },
  Airbnb: { text: 'Ai', className: 'bg-[#FF5A5F]' },
  Idealista: { text: 'id', className: 'bg-[#D9F563]', textClassName: 'text-black' },
  Vrvo: { text: 'Vr', className: 'bg-teal-500' },
  Clara: { text: 'C', className: 'bg-orange-500' },
  Owners: { text: 'Ow', className: 'bg-gray-500' },
  Organic: { text: 'Or', className: 'bg-brown-500' },
};

export function getPlatformBadge(
  platformName?: string
): { text: string; className: string; textClassName?: string } {
  if (!platformName) return { text: '—', className: 'bg-gray-400' };
  return PLATFORM_BADGE[platformName] || { text: platformName.slice(0, 2), className: 'bg-gray-400' };
}
