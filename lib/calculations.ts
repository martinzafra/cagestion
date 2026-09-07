export function calculateNights(checkInDate: Date, checkOutDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / msPerDay);
}

export function calculateDailyPricePerNight(
  price: number,
  basis: 'DAY' | 'WEEK' | 'MONTH'
): number {
  switch (basis) {
    case 'DAY':
      return price;
    case 'WEEK':
      return price / 7;
    case 'MONTH':
      return price / 30;
    default:
      return price;
  }
}

export function calculateGuestTotalAmount(
  dailyPrice: number,
  priceBasis: 'DAY' | 'WEEK' | 'MONTH',
  nights: number,
  cleaningCharge: number = 0,
  otherCharge: number = 0
): number {
  const pricePerNight = calculateDailyPricePerNight(dailyPrice, priceBasis);
  const totalNights = pricePerNight * nights;
  return totalNights + cleaningCharge + otherCharge;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  // Date-only strings (YYYY-MM-DD) are parsed directly to avoid
  // timezone shifting the day when converted through a Date object.
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year.slice(-2)}`;
    }
    date = new Date(date);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Compact range for a stay: "1-20 Jul" when both dates fall in the same
// month/year, "1Jul-20Aug" when they don't - used where a booking's dates
// need to fit inline next to its guest name (e.g. a picker list).
export function formatBookingDateRange(checkInDate: string, checkOutDate: string): string {
  const [inYear, inMonth, inDay] = checkInDate.split('-').map(Number);
  const [outYear, outMonth, outDay] = checkOutDate.split('-').map(Number);
  const inAbbr = MONTH_ABBR[inMonth - 1];
  const outAbbr = MONTH_ABBR[outMonth - 1];

  if (inYear === outYear && inMonth === outMonth) {
    return `${inDay}-${outDay} ${inAbbr}`;
  }
  return `${inDay}${inAbbr}-${outDay}${outAbbr}`;
}

export function formatDateISO(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}
