import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  Pencil,
  Play,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react'
import { api, downloadCsv } from '../lib/api'
import { formatCurrency, formatDate, todayISO } from '../lib/format'
import { MAINTENANCE_STATUS, MAINTENANCE_TYPE } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import MaintenanceForm from '../components/MaintenanceForm'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Pagination,
  SearchInput,
  Spinner,
  StatusBadge,
} from '../components/ui'

export default function Maintenance() {
  const { isAdmin, canWrite } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 0, page: 1, page_size: 15 })
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [preselectedAssetId, setPreselectedAssetId] = useState('')
  const [availableAssets, setAvailableAssets] = useState([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [completeTarget, setCompleteTarget] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null)
      setPreselectedAssetId(searchParams.get('asset') || '')
      setFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    setFetching(true)
    setError('')
    try {
      const data = await api.get('/maintenance', {
        q: debouncedQuery,
        status: statusFilter,
        type: typeFilter,
        page,
        page_size: 15,
      })
      setItems(data.items)
      setMeta(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
      setLoading(false)
    }
  }, [debouncedQuery, statusFilter, typeFilter, page])

  useEffect(() => {
    load()
  }, [load])

  const loadAvailableAssets = useCallback(async () => {
    setLoadingAssets(true)
    try {
      const data = await api.get('/assets', {
        status: 'available',
        page_size: 100,
        sort_by: 'asset_tag',
        order: 'asc',
      })
      setAvailableAssets(data.items)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingAssets(false)
    }
  }, [toast])

  useEffect(() => {
    if (formOpen && !editing) loadAvailableAssets()
  }, [formOpen, editing, loadAvailableAssets])

  const openCreate = () => {
    setEditing(null)
    setPreselectedAssetId('')
    setFormOpen(true)
  }

  const openEdit = (record) => {
    setEditing(record)
    setFormOpen(true)
  }

  const quickUpdate = async (record, status) => {
    setBusyId(record.id)
    try {
      await api.patch(`/maintenance/${record.id}`, { status })
      toast.success(
        status === 'completed'
          ? `Work order completed for ${record.asset_tag}`
          : `Maintenance started for ${record.asset_tag}`,
      )
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleComplete = async () => {
    if (!completeTarget) return
    setCompleting(true)
    try {
      await api.patch(`/maintenance/${completeTarget.id}`, { status: 'completed' })
      toast.success(`Work order completed for ${completeTarget.asset_tag}`)
      setCompleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCompleting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/maintenance/${deleteTarget.id}`)
      toast.success('Maintenance record deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const exportCsv = async () => {
    try {
      await downloadCsv('/reports/maintenance.csv', `labassets-maintenance-${todayISO()}.csv`)
      toast.success('Maintenance records exported')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const emptyCopy = useMemo(() => {
    if (statusFilter || typeFilter || query) {
      return {
        title: 'No matching work orders',
        description: 'Try clearing the filters or searching for a different asset.',
      }
    }
    return {
      title: 'No maintenance records',
      description: 'Log repair, inspection, and preventive maintenance work here.',
    }
  }, [statusFilter, typeFilter, query])

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Plan preventive checks and track repairs from intake to completion."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            {canWrite && (
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Log maintenance
              </button>
            )}
          </>
        }
      />

      <div className="card mb-4 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-12">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search work order, asset, or technician…"
            className="xl:col-span-6"
          />
          <select
            className="select xl:col-span-3"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(MAINTENANCE_STATUS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            className="select xl:col-span-3"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All types</option>
            {Object.entries(MAINTENANCE_TYPE).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          {fetching && <Spinner className="h-3.5 w-3.5" />}
          <span className="font-semibold text-slate-500">
            {meta.total} work order{meta.total === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading maintenance records…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className={`card overflow-hidden transition ${fetching ? 'opacity-70' : ''}`}>
          {items.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                canWrite && !statusFilter && !typeFilter && !query ? (
                  <button type="button" className="btn-primary" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Log maintenance
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="table-th">Asset</th>
                    <th className="table-th">Work order</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Schedule</th>
                    <th className="table-th">Performed by</th>
                    <th className="table-th text-right">Cost</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((record) => (
                    <tr key={record.id} className="transition hover:bg-slate-50/80">
                      <td className="table-td">
                        <p className="font-semibold text-slate-900">
                          {record.asset_name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {record.asset_tag}
                        </p>
                      </td>
                      <td className="table-td max-w-xs">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {record.title}
                        </p>
                        {record.description && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                            {record.description}
                          </p>
                        )}
                      </td>
                      <td className="table-td text-xs font-medium">
                        {MAINTENANCE_TYPE[record.maintenance_type] || record.maintenance_type}
                      </td>
                      <td className="table-td">
                        <StatusBadge kind="maintenance" value={record.status} />
                      </td>
                      <td className="table-td">
                        <p className="text-xs font-medium text-slate-600">
                          {record.scheduled_date
                            ? formatDate(record.scheduled_date)
                            : 'Not scheduled'}
                        </p>
                        {record.completed_date && (
                          <p className="text-[11px] text-emerald-600">
                            Done {formatDate(record.completed_date)}
                          </p>
                        )}
                      </td>
                      <td className="table-td text-xs">
                        {record.performed_by || '—'}
                      </td>
                      <td className="table-td text-right text-xs font-semibold text-slate-700">
                        {formatCurrency(record.cost)}
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          {busyId === record.id ? (
                            <Spinner className="h-4 w-4 text-slate-400" />
                          ) : (
                            <>
                              {canWrite && record.status === 'scheduled' && (
                                <button
                                  type="button"
                                  className="icon-btn hover:bg-amber-50 hover:text-amber-600"
                                  onClick={() => quickUpdate(record, 'in_progress')}
                                  title="Start maintenance"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              {canWrite &&
                                (record.status === 'scheduled' ||
                                  record.status === 'in_progress') && (
                                  <button
                                    type="button"
                                    className="icon-btn hover:bg-emerald-50 hover:text-emerald-600"
                                    onClick={() => setCompleteTarget(record)}
                                    title="Mark completed"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                )}
                              {canWrite && (
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => openEdit(record)}
                                  title="Edit record"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => setDeleteTarget(record)}
                                  title="Delete record"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {items.length > 0 && (
            <Pagination
              page={meta.page}
              pages={meta.pages}
              total={meta.total}
              pageSize={meta.page_size}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      <MaintenanceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        record={editing}
        assets={availableAssets}
        preselectedAssetId={preselectedAssetId}
        onSaved={load}
      />

      {loadingAssets && formOpen && !editing && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Loading available assets…
        </div>
      )}

      <ConfirmDialog
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        loading={completing}
        title="Close this work order?"
        description={
          completeTarget
            ? `${completeTarget.asset_tag} will be marked completed and returned to available inventory.`
            : ''
        }
        confirmLabel="Mark completed"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this maintenance record?"
        description="The work order history will be removed. An open asset will be returned to available inventory."
        confirmLabel="Delete record"
      />
    </div>
  )
}
