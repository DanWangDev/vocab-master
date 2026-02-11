export function formatDate(date: Date | string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

export function formatNumber(num: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US').format(num)
}

export function formatPercent(num: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(num)
}
