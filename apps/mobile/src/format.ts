const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Hand-rolled so they don't depend on the device's Intl support.

/** "30 Oct", as in the web table. The weekday is on the listing's detail. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]!.slice(0, 3)}`;
}

/** "Friday 30 October", for the listing's detail. */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const formatPrice = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
