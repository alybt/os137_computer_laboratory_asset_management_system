export function cn(...values) {
  return values.flat().filter(Boolean).join(' ')
}

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }
  return (compact ? compactCurrencyFormatter : currencyFormatter).format(
    Number(value),
  )
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-PH').format(Number(value))
}

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  let normalized = String(value)
  // The API stores UTC timestamps without an offset. Tell the browser so the
  // value is rendered in local time instead of being treated as local already.
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(normalized) &&
    !/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)
  ) {
    normalized += 'Z'
  }
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateShort(value) {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(value) {
  const date = parseDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function timeAgo(value) {
  const date = parseDate(value)
  if (!date) return '—'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export function titleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function daysFromNow(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function isOverdue(dateValue) {
  const date = parseDate(dateValue)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}
