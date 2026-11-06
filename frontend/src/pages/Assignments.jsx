import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeftRight,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { api, downloadCsv } from '../lib/api'
import { formatDate, todayISO } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AssignmentForm from '../components/AssignmentForm'
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

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'all', label: 'All' },
]

export default function Assignments() {
  const { isAdmin, canWrite } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 0, page: 1, page_size: 15 })
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [preselectedAssetId, setPreselectedAssetId] = useState('')
  const [availableAssets, setAvailableAssets] = useState([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [returnTarget, setReturnTarget] = useState(null)
  const [returning, setReturning] = useState(false)
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
      const data = await api.get('/assignments', {
        q: debouncedQuery,
        status: tab === 'all' ? '' : tab,
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
  }, [debouncedQuery, tab, page])

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

  const openEdit = (assignment) => {
    setEditing(assignment)
    setFormOpen(true)
  }

  const handleReturn = async () => {
    if (!returnTarget) return
    setReturning(true)
    try {
      await api.post(`/assignments/${returnTarget.id}/return`)
      toast.success(`${returnTarget.asset_tag} returned by ${returnTarget.borrower_name}`)
      setReturnTarget(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setReturning(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/assignments/${deleteTarget.id}`)
      toast.success('Assignment deleted')
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
      await downloadCsv('/reports/assignments.csv', `labassets-assignments-${todayISO()}.csv`)
      toast.success('Assignments exported')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const emptyCopy = useMemo(() => {
    if (tab === 'overdue') {
      return {
        title: 'No overdue assets',
        description: 'Everything issued has been returned or is still within its due date.',
      }
    }
    if (tab === 'returned') {
      return {
        title: 'No returned assignments',
        description: 'Completed check-outs will appear here.',
      }
    }
    return {
      title: 'No assignments recorded',
      description: 'Issue an asset to a faculty member or student to get started.',
    }
  }, [tab])

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Track assets issued to faculty, staff, and students."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            {canWrite && (
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New assignment
              </button>
            )}
          </>
        }
      />

      <div className="card mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setTab(item.value)
                  setPage(1)
                }}
                className={`flex-1 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:flex-none ${
                  tab === item.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search borrower, department, asset tag…"
            className="flex-1"
          />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {fetching && <Spinner className="h-3.5 w-3.5" />}
            <span className="whitespace-nowrap font-semibold text-slate-500">
              {meta.total} record{meta.total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading assignments…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className={`card overflow-hidden transition ${fetching ? 'opacity-70' : ''}`}>
          {items.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                canWrite && tab !== 'returned' ? (
                  <button type="button" className="btn-primary" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> New assignment
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="table-th">Asset</th>
                    <th className="table-th">Borrower</th>
                    <th className="table-th">Department</th>
                    <th className="table-th">Issued</th>
                    <th className="table-th">Due date</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((assignment) => (
                    <tr key={assignment.id} className="transition hover:bg-slate-50/80">
                      <td className="table-td">
                        <p className="font-semibold text-slate-900">
                          {assignment.asset_name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {assignment.asset_tag}
                        </p>
                      </td>
                      <td className="table-td">
                        <p className="text-sm font-semibold text-slate-700">
                          {assignment.borrower_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {assignment.borrower_email || 'No email'}
                        </p>
                      </td>
                      <td className="table-td text-xs">
                        {assignment.department || '—'}
                      </td>
                      <td className="table-td">
                        <p className="text-xs font-medium text-slate-600">
                          {formatDate(assignment.assigned_at)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          by {assignment.assigned_by_name || 'System'}
                        </p>
                      </td>
                      <td className="table-td text-xs font-medium text-slate-600">
                        {formatDate(assignment.due_date)}
                      </td>
                      <td className="table-td">
                        <StatusBadge kind="assignment" value={assignment.status} />
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canWrite && assignment.status !== 'returned' && (
                            <button
                              type="button"
                              className="btn-secondary !px-2.5 !py-1.5 text-[11px]"
                              onClick={() => setReturnTarget(assignment)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Return
                            </button>
                          )}
                          {canWrite && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => openEdit(assignment)}
                              title="Edit assignment"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleteTarget(assignment)}
                              title="Delete assignment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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

      <AssignmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        assignment={editing}
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
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleReturn}
        loading={returning}
        title="Mark this asset as returned?"
        description={
          returnTarget
            ? `${returnTarget.borrower_name} will be recorded as having returned ${returnTarget.asset_tag}.`
            : ''
        }
        confirmLabel="Confirm return"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this assignment?"
        description="The check-out history will be removed. The asset will be marked available if it is still out."
        confirmLabel="Delete assignment"
      />
    </div>
  )
}
