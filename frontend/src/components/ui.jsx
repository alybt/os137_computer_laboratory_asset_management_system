import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Search,
  X,
} from 'lucide-react'
import { cn } from '../lib/format'
import { resultRange, pageNumbers } from '../lib/inventoryView'
import {
  ASSET_CONDITION,
  ASSET_STATUS,
  ASSIGNMENT_STATUS,
  MAINTENANCE_STATUS,
  ROLE,
} from '../lib/constants'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cn('animate-spin', className)} />
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-slate-400">
      <Spinner className="h-7 w-7 text-brand-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-7 text-center">
      <div className="flex h-7 w-7 items-center justify-center text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">Something went wrong</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn-secondary mt-1" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-7 text-center">
      <div className="flex h-7 w-7 items-center justify-center text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon: Icon,
}) {
  const dialogRef = useRef(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector('input,select,textarea,button,[tabindex="0"]')?.focus(), 0)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key === 'Tab') {
        const nodes = [...(dialogRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]') || [])].filter(node => node.getClientRects().length)
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      previousFocus?.focus()
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/40 p-0  sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className={cn(
          'flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-sm sm:rounded-[10px]',
          sizes[size] || sizes.md,
        )}
        ref={dialogRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          {Icon && (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-transparent text-brand-600">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button type="button" className="icon-btn -mr-1" aria-label="Close dialog" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Delete this record?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      icon={AlertTriangle}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Review the information before continuing. Records removed here cannot be
        recovered.
      </p>
    </Modal>
  )
}

export function Pagination({ page, pages, total, pageSize, onPageChange }) {
  if (!total) return null
  const [start, end] = resultRange(page, pageSize, total)
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
      <p className="text-xs font-medium text-slate-500">
        Showing <span className="text-slate-700">{start}</span>–
        <span className="text-slate-700">{end}</span> of{' '}
        <span className="text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="icon-btn border border-slate-200"
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageNumbers(page, pages).map((number, index, numbers) => <span key={number} className="inline-flex items-center">
          {index > 0 && number - numbers[index - 1] > 1 && <span className="px-1" aria-hidden="true">…</span>}
          <button type="button" className={number === page ? 'btn-primary !px-3 !py-1.5' : 'icon-btn'} aria-label={`Page ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>
        </span>)}
        <button
          type="button"
          className="icon-btn border border-slate-200"
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="input pl-10"
      />
    </div>
  )
}

export function Avatar({ name = '', size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  }
  const palette = [
    'bg-indigo-500',
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
  ]
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0)
  const color = palette[hash % palette.length]
  const label = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        color,
        sizes[size],
      )}
    >
      {label || '?'}
    </span>
  )
}

export function StatusBadge({ kind, value }) {
  const maps = {
    asset: ASSET_STATUS,
    condition: ASSET_CONDITION,
    assignment: ASSIGNMENT_STATUS,
    maintenance: MAINTENANCE_STATUS,
    role: ROLE,
  }
  const meta = maps[kind]?.[value]
  if (!meta) return <span className="status-badge badge-neutral">{value || '—'}</span>
  return (
    <span className={meta.className}>
      {kind === 'asset' && (
        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      )}
      {meta.label}
    </span>
  )
}

export function StatCard({ label, value, hint, icon: Icon, accent='brand' }) {
  return <div className="card summary-card">
    {Icon && <div className={`summary-icon ${['brand','emerald','sky','amber'].includes(accent)?accent:'brand'}`}><Icon size={22} aria-hidden="true"/></div>}
    <div className="min-w-0"><p className="summary-label">{label}</p><p className="summary-value">{value}</p>{hint && <p className="summary-hint">{hint}</p>}</div>
  </div>
}

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}) {
  return (
    <section className={cn('card overflow-hidden', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded bg-transparent text-slate-500">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
