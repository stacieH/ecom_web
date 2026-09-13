/**
 * "₱1,980" for whole pesos and "₱1,000.50" otherwise. Built with integer
 * arithmetic so the output never depends on the browser's number formatting.
 */
export function formatPeso(centavos: number): string {
  const sign = centavos < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(centavos));
  const pesos = Math.floor(absolute / 100);
  const cents = absolute % 100;
  const grouped = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${sign}₱${grouped}${cents === 0 ? '' : `.${String(cents).padStart(2, '0')}`}`;
}
