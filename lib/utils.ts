export function formatCurrency(amount: number): string {
  return '₩' + amount.toLocaleString('ko-KR')
}

export function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, '.')
}

export function getMonthLastDay(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}
