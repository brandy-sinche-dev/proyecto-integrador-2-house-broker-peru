export function formatMoney(value: number, currency?: string) {
  const amount = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(value)
  return currency === 'USD' ? `US$ ${amount}` : `S/. ${amount}`
}
