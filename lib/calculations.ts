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

export function formatDateISO(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}
