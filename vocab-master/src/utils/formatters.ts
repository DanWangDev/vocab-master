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

export function formatRelativeTime(date: Date | string, locale: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const isZh = locale === 'zh-CN'

  if (diffMinutes < 1) return isZh ? '刚刚' : 'Just now'
  if (diffMinutes < 60) return isZh ? `${diffMinutes}分钟前` : `${diffMinutes}m ago`
  if (diffHours < 24) return isZh ? `${diffHours}小时前` : `${diffHours}h ago`
  if (diffDays === 1) return isZh ? '昨天' : 'Yesterday'
  if (diffDays < 7) return isZh ? `${diffDays}天前` : `${diffDays}d ago`

  return formatDate(date, locale)
}
