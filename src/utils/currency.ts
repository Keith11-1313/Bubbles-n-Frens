export function formatCurrency(amount: number, symbol = '₱'): string {
  return `${symbol}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
