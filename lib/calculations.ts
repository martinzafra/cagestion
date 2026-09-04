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
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateISO(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}
