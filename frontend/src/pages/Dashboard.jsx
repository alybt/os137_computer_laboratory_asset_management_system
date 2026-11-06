import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  ArrowLeftRight,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FlaskConical,
  Plus,
  ShieldAlert,
  Wrench,
} from 'lucide-react'
import { api } from '../lib/api'
import { formatCurrency, formatDate, formatNumber, timeAgo } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '../components/ui'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatusDonut({ items, total }) {
  const positive = items.filter((item) => item.value > 0)
  const gradient = positive.length
    ? (() => {
        let cursor = 0
        const parts = positive.map((item) => {
          const start = cursor
          cursor += (item.value / Math.max(total, 1)) * 360
          return `${item.color} ${start}deg ${cursor}deg`
        })
        return `conic-gradient(${parts.join(', ')})`
      })()
    : 'conic-gradient(#e2e8f0 0deg 360deg)'

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <div
          className="h-full w-full rounded-full"
          style={{ background: gradient }}
        />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Assets
          </span>
        </div>
      </div>
      <div className="w-full space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="flex-1 text-xs font-medium capitalize text-slate-600">
              {item.label}
            </span>
            <span className="text-xs font-bold text-slate-900">{item.value}</span>
            <span className="w-10 text-right text-[10px] text-slate-400">
              {total ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarList({ items, emptyLabel = 'No data yet' }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  if (!items.length) {
    return <p className="px-5 py-10 text-center text-sm text-slate-400">{emptyLabel}</p>
  }
  return (
    <div className="space-y-4 px-5 py-5">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="truncate text-xs font-semibold text-slate-600">
              {item.label}
            </span>
            <span className="shrink-0 text-xs font-bold text-slate-900">
              {formatNumber(item.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max((item.value / max) * 100, 3)}%`,
                backgroundColor: item.color || '#6366f1',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const ACTIVITY_STYLES = {
  login: 'bg-sky-50 text-sky-600',
  create: 'bg-emerald-50 text-emerald-600',
  update: 'bg-amber-50 text-amber-600',
  delete: 'bg-rose-50 text-rose-600',
  assign: 'bg-indigo-50 text-indigo-600',
  return: 'bg-violet-50 text-violet-600',
}

function ActivityRow({ item }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          ACTIVITY_STYLES[item.action] || 'bg-slate-100 text-slate-500'
        }`}
      >
        <ActivityIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-slate-700">
          <span className="font-semibold text-slate-900">{item.user_name}</span>{' '}
          {item.detail || item.action}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {timeAgo(item.created_at)} · {item.entity_type}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, canWrite } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.get('/dashboard'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <LoadingBlock label="Building your dashboard…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const { totals } = data
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="Here is what is happening across the computer laboratories today."
        actions={
          canWrite ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/maintenance?new=1')}
              >
                <Wrench className="h-4 w-4" />
                Log maintenance
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/assignments?new=1')}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Issue asset
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/assets?new=1')}
              >
                <Plus className="h-4 w-4" />
                Add asset
              </button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={formatNumber(totals.assets)}
          hint={`${formatCurrency(totals.total_value, true)} inventory value`}
          icon={Boxes}
          accent="brand"
        />
        <StatCard
          label="Available"
          value={formatNumber(totals.available)}
          hint="Ready to issue"
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          label="Assigned"
          value={formatNumber(totals.assigned)}
          hint={`${totals.active_assignments} active check-outs`}
          icon={ArrowLeftRight}
          accent="sky"
        />
        <StatCard
          label="Open maintenance"
          value={formatNumber(totals.open_maintenance)}
          hint={`${totals.maintenance} assets in service`}
          icon={Wrench}
          accent="amber"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Inventory by category"
          subtitle="Asset count per category"
          icon={Boxes}
          className="xl:col-span-2"
        >
          <BarList items={data.assets_by_category} />
        </SectionCard>

        <SectionCard
          title="Status overview"
          subtitle="Current asset lifecycle"
          icon={ShieldAlert}
        >
          <div className="p-5">
            <StatusDonut items={data.assets_by_status} total={totals.assets} />
          </div>
        </SectionCard>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Recent activity"
          subtitle="Latest inventory and account events"
          icon={ActivityIcon}
          className="xl:col-span-2"
          actions={
            <Link
              to="/activity"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.recent_activity.length ? (
            <div className="divide-y divide-slate-100">
              {data.recent_activity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="New inventory changes will appear here."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Maintenance schedule"
          subtitle="Open work orders in the next 30 days"
          icon={CalendarClock}
          actions={
            <Link
              to="/maintenance"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {data.upcoming_maintenance.length ? (
            <div className="divide-y divide-slate-100">
              {data.upcoming_maintenance.map((record) => (
                <div key={record.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                      {record.title}
                    </p>
                    <StatusBadge kind="maintenance" value={record.status} />
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    {record.asset_tag} · {record.asset_name}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {record.scheduled_date
                      ? `Scheduled ${formatDate(record.scheduled_date)}`
                      : 'No schedule set'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Wrench}
              title="All clear"
              description="No open maintenance work orders."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Laboratory distribution"
          subtitle="Where assets are located"
          icon={FlaskConical}
          className="xl:col-span-2"
        >
          <BarList items={data.assets_by_laboratory} />
        </SectionCard>

        <SectionCard
          title="Warranty watch"
          subtitle="Coverage ending within 90 days"
          icon={ShieldAlert}
        >
          {data.warranty_expiring.length ? (
            <div className="divide-y divide-slate-100">
              {data.warranty_expiring.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {asset.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {asset.asset_tag} · {asset.laboratory_name || 'Unassigned'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-slate-700">
                      {formatDate(asset.warranty_expiry)}
                    </p>
                    <StatusBadge kind="asset" value={asset.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No upcoming expirations"
              description="Warranty coverage is healthy for the next 90 days."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/assets"
          className="card group flex items-center gap-4 p-5 transition hover:border-brand-200 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Browse inventory</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Search and filter all assets
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </Link>
        <Link
          to="/reports"
          className="card group flex items-center gap-4 p-5 transition hover:border-brand-200 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Inventory reports</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Valuation and CSV exports
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </Link>
        <Link
          to="/maintenance"
          className="card group flex items-center gap-4 p-5 transition hover:border-brand-200 hover:shadow-md"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Maintenance queue</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totals.open_maintenance} open work orders
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </Link>
      </div>
    </div>
  )
}
