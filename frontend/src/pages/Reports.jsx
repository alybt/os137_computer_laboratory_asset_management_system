import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import {
  Boxes,
  CircleDollarSign,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Printer,
  Wrench,
} from 'lucide-react'
import { api, downloadCsv } from '../lib/api'
import { formatCurrency, formatDate, formatNumber, todayISO } from '../lib/format'
import { ASSET_STATUS, ASSET_CONDITION, MAINTENANCE_STATUS } from '../lib/constants'
import { STATUS_COLORS, SOLID_COLORS } from '../lib/chartConfig'
import ChartMessage from '../components/ChartMessage'
const DashboardChart = lazy(() => import('../components/DashboardChart'))
import { useToast } from '../context/ToastContext'
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatCard,
} from '../components/ui'

const CONDITION_COLORS = {new:'#347969',excellent:'#347969',good:'#4d7399',fair:'#b17b35',poor:'#a16b3e',damaged:'#aa4545',unusable:'#aa4545'}
function ReportChart({items,title,kind='horizontal',type='assets'}) {
  if(!Array.isArray(items)) return <ChartMessage error>Report data is unavailable.</ChartMessage>
  if(items.length===0) return <ChartMessage>No recorded data for this report.</ChartMessage>
  const map=type==='status'?ASSET_STATUS:type==='condition'?ASSET_CONDITION:type==='maintenance'?MAINTENANCE_STATUS:{}
  const labels=items.map(item=>map[item.label]?.label || String(item.label).replaceAll('_',' '))
  const colors=items.map((item,i)=>type==='status'?STATUS_COLORS[String(item.label).toLowerCase()] || '#697586':type==='condition'?CONDITION_COLORS[String(item.label).toLowerCase()] || '#697586':SOLID_COLORS[i%SOLID_COLORS.length])
  return <Suspense fallback={<ChartMessage>Preparing report chart…</ChartMessage>}>
    <DashboardChart title={title} kind={kind} labels={labels} series={[{label:type==='maintenance'?'Work orders':'Assets',values:items.map(item=>Number(item.value)),colors}]}
      totalLabel={type==='maintenance'?'Recorded work orders':'Registered assets'} emptyLabel="No recorded data for this report."/>
  </Suspense>
}

const EXPORTS = [
  {
    key: 'assets',
    title: 'Asset inventory',
    description: 'Full inventory with category, location, status, value, and assignment.',
    filename: 'assets.csv',
    icon: Boxes,
    color: 'bg-brand-50 text-brand-600',
  },
  {
    key: 'assignments',
    title: 'Assignments',
    description: 'Complete check-out and return history for every borrower.',
    filename: 'assignments.csv',
    icon: FileSpreadsheet,
    color: 'bg-sky-50 text-sky-600',
  },
  {
    key: 'maintenance',
    title: 'Maintenance log',
    description: 'Work orders, service providers, schedules, and costs.',
    filename: 'maintenance.csv',
    icon: Wrench,
    color: 'bg-amber-50 text-amber-600',
  },
]

export default function Reports() {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSummary(await api.get('/reports/summary'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const download = async (item) => {
    setDownloading(item.key)
    try {
      await downloadCsv(`/reports/${item.filename}`, `labassets-${item.key}-${todayISO()}.csv`)
      toast.success(`${item.title} exported`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDownloading('')
    }
  }

  if (loading) return <LoadingBlock label="Generating reports…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!summary) return null

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`Inventory and maintenance summary · generated ${formatDate(summary.generated_at)}`}
        actions={
          <button
            type="button"
            className="btn-secondary no-print"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Print summary
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total assets"
          value={formatNumber(summary.totals.assets)}
          hint={`${summary.totals.laboratories} laboratories · ${summary.totals.categories} categories`}
          icon={Boxes}
          accent="brand"
        />
        <StatCard
          label="Inventory value"
          value={formatCurrency(summary.totals.total_value, true)}
          hint="Sum of recorded purchase costs"
          icon={CircleDollarSign}
          accent="emerald"
        />
        <StatCard
          label="Maintenance spend"
          value={formatCurrency(summary.maintenance_cost, true)}
          hint="Completed work orders only"
          icon={Wrench}
          accent="amber"
        />
        <StatCard
          label="Open work orders"
          value={formatNumber(summary.totals.open_maintenance)}
          hint={`${summary.totals.assigned} assets currently assigned`}
          icon={FileBarChart}
          accent="sky"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Assets by status" subtitle="Lifecycle distribution">
          <ReportChart title="Assets by status" kind="doughnut" type="status" items={summary.by_status} />
        </SectionCard>
        <SectionCard title="Assets by condition" subtitle="Physical condition assessment">
          <ReportChart title="Assets by condition" type="condition" items={summary.by_condition} />
        </SectionCard>
        <SectionCard title="Assets by category" subtitle="Inventory mix">
          <ReportChart title="Assets by category" items={summary.by_category} />
        </SectionCard>
        <SectionCard title="Assets by laboratory" subtitle="Physical location">
          <ReportChart title="Assets by laboratory" kind="bar" items={summary.by_laboratory} />
        </SectionCard>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Highest-value assets"
          subtitle="Top five by recorded purchase cost"
          className="xl:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="border-b border-slate-100 bg-slate-50/70">
                <tr>
                  <th className="table-th">Asset</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Laboratory</th>
                  <th className="table-th text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.top_value_assets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="table-td">
                      <p className="font-semibold text-slate-900">{asset.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{asset.asset_tag}</p>
                    </td>
                    <td className="table-td text-xs">{asset.category_name || '—'}</td>
                    <td className="table-td text-xs">{asset.laboratory_name || '—'}</td>
                    <td className="table-td text-right font-semibold text-slate-700">
                      {formatCurrency(asset.purchase_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Maintenance overview" subtitle="Work order status mix">
          <ReportChart title="Maintenance work order status" type="maintenance" items={summary.maintenance_by_status} />
        </SectionCard>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Export data</h2>
          <span className="text-xs text-slate-400">CSV files open in Excel or Sheets</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {EXPORTS.map((item) => (
            <div key={item.key} className="card p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {item.description}
              </p>
              <button
                type="button"
                className="btn-secondary mt-4 w-full no-print"
                onClick={() => download(item)}
                disabled={downloading === item.key}
              >
                {downloading === item.key ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading === item.key ? 'Downloading…' : 'Download CSV'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        CLAM — Computer Laboratory Asset Management
      </p>
    </div>
  )
}
