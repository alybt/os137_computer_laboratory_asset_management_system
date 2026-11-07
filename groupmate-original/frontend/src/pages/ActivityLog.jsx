import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatDateTime, timeAgo } from '../lib/format'
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SearchInput,
  Spinner,
} from '../components/ui'

const ACTION_META = {
  login: { label: 'Sign in', icon: LogIn, className: 'bg-sky-50 text-sky-600' },
  create: { label: 'Created', icon: Plus, className: 'bg-emerald-50 text-emerald-600' },
  update: { label: 'Updated', icon: Pencil, className: 'bg-amber-50 text-amber-600' },
  delete: { label: 'Deleted', icon: Trash2, className: 'bg-rose-50 text-rose-600' },
  assign: { label: 'Assigned', icon: ArrowUpRight, className: 'bg-indigo-50 text-indigo-600' },
  return: { label: 'Returned', icon: ArrowDownLeft, className: 'bg-violet-50 text-violet-600' },
}

const ENTITY_OPTIONS = [
  'asset',
  'assignment',
  'maintenance',
  'user',
  'laboratory',
  'category',
  'profile',
  'password',
]

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')

  const load = useCallback(async () => {
    setFetching(true)
    setError('')
    try {
      setLogs(await api.get('/activity', { limit: 200 }))
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return logs.filter((log) => {
      const matchesQuery =
        !term ||
        [log.user_name, log.detail]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      return (
        matchesQuery &&
        (!action || log.action === action) &&
        (!entityType || log.entity_type === entityType)
      )
    })
  }, [logs, query, action, entityType])

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    return {
      total: logs.length,
      today: logs.filter((log) => new Date(log.created_at).toDateString() === today)
        .length,
      actors: new Set(logs.map((log) => log.user_name)).size,
    }
  }, [logs])

  if (loading) return <LoadingBlock label="Loading activity log…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div>
      <PageHeader
        title="Activity log"
        subtitle="A chronological audit trail of inventory and account changes."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={load}
            disabled={fetching}
          >
            {fetching ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Events loaded
            </p>
            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Today
            </p>
            <p className="text-xl font-bold text-slate-900">{stats.today}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              People involved
            </p>
            <p className="text-xl font-bold text-slate-900">{stats.actors}</p>
          </div>
        </div>
      </div>

      <div className="card mb-4 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-12">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search user or action detail…"
            className="xl:col-span-6"
          />
          <select
            className="select xl:col-span-3"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            className="select xl:col-span-3"
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            <option value="">All record types</option>
            {ENTITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          {fetching && <Spinner className="h-3.5 w-3.5" />}
          <span className="font-semibold text-slate-500">
            {filtered.length} event{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activity matched"
            description="Try changing the search term or filters."
          />
        ) : (
          <ol className="divide-y divide-slate-100">
            {filtered.map((log) => {
              const meta = ACTION_META[log.action] || {
                label: log.action,
                icon: ActivityIcon,
                className: 'bg-slate-100 text-slate-500',
              }
              const Icon = meta.icon
              return (
                <li key={log.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/60">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{log.user_name}</p>
                      <span className="chip bg-slate-100 text-slate-500">{meta.label}</span>
                      <span className="chip bg-slate-50 text-slate-400">
                        {log.entity_type}
                        {log.entity_id ? ` #${log.entity_id}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{log.detail || 'No details'}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDateTime(log.created_at)} · {timeAgo(log.created_at)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
