import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Wrench,
} from 'lucide-react'
import { api, downloadCsv } from '../lib/api'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  todayISO,
} from '../lib/format'
import { ASSET_STATUS } from '../lib/constants'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AssetForm from '../components/AssetForm'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Spinner,
  StatusBadge,
} from '../components/ui'

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || '—'}
      </p>
    </div>
  )
}

export default function Assets() {
  const { isAdmin, canWrite } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 0, page: 1, page_size: 15 })
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [laboratories, setLaboratories] = useState([])

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [status, setStatus] = useState('')
  const [condition, setCondition] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [laboratoryId, setLaboratoryId] = useState('')
  const [sort, setSort] = useState('created_at:desc')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [returning, setReturning] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 350)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/laboratories')])
      .then(([categoryData, labData]) => {
        setCategories(categoryData)
        setLaboratories(labData)
      })
      .catch(() => {
        // Filters still work without the option lists.
      })
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null)
      setFormOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const load = useCallback(async () => {
    setFetching(true)
    setError('')
    const [sortBy, order] = sort.split(':')
    try {
      const data = await api.get('/assets', {
        q: debouncedQuery,
        status,
        condition,
        category_id: categoryId,
        laboratory_id: laboratoryId,
        sort_by: sortBy,
        order,
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
  }, [debouncedQuery, status, condition, categoryId, laboratoryId, sort, page])

  useEffect(() => {
    load()
  }, [load])

  const resetFilters = () => {
    setQuery('')
    setDebouncedQuery('')
    setStatus('')
    setCondition('')
    setCategoryId('')
    setLaboratoryId('')
    setSort('created_at:desc')
    setPage(1)
  }

  const hasFilters = Boolean(
    query || status || condition || categoryId || laboratoryId,
  )

  const resultLabel = useMemo(() => {
    if (meta.total === 0) return 'No assets matched'
    return `${meta.total} asset${meta.total === 1 ? '' : 's'}`
  }, [meta.total])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (asset) => {
    setEditing(asset)
    setFormOpen(true)
    setSelected(null)
  }

  const handleSaved = () => {
    load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/assets/${deleteTarget.id}`)
      toast.success(`Asset ${deleteTarget.asset_tag} deleted`)
      setDeleteTarget(null)
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleReturn = async (assignment) => {
    setReturning(true)
    try {
      await api.post(`/assignments/${assignment.id}/return`)
      toast.success(`Asset returned by ${assignment.borrower_name}`)
      const refreshed = await api.get(`/assets/${assignment.asset_id}`)
      setSelected(refreshed)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setReturning(false)
    }
  }

  const exportCsv = async () => {
    try {
      await downloadCsv('/reports/assets.csv', `labassets-inventory-${todayISO()}.csv`)
      toast.success('Inventory exported')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Asset inventory"
        subtitle="Search, filter, and manage every piece of laboratory equipment."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            {canWrite && (
              <button type="button" className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add asset
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
            placeholder="Search tag, name, brand, model, or serial…"
            className="xl:col-span-4"
          />
          <select
            className="select xl:col-span-2"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(ASSET_STATUS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select
            className="select xl:col-span-2"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="select xl:col-span-2"
            value={laboratoryId}
            onChange={(event) => {
              setLaboratoryId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All laboratories</option>
            {laboratories.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
          </select>
          <select
            className="select xl:col-span-2"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
          >
            <option value="created_at:desc">Newest first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="asset_tag:asc">Asset tag A–Z</option>
            <option value="purchase_cost:desc">Highest value</option>
            <option value="warranty_expiry:asc">Warranty expiry</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">{resultLabel}</span>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <RotateCcw className="h-3 w-3" />
              Reset filters
            </button>
          )}
          {fetching && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Spinner className="h-3.5 w-3.5" /> Updating…
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <select
              className="select !w-auto !py-1.5 text-xs"
              value={condition}
              onChange={(event) => {
                setCondition(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Any condition</option>
              {['new', 'good', 'fair', 'poor', 'damaged'].map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading inventory…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className={`card overflow-hidden transition ${fetching ? 'opacity-70' : ''}`}>
          {items.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={hasFilters ? 'No matching assets' : 'No assets yet'}
              description={
                hasFilters
                  ? 'Try a different search term or clear the filters.'
                  : 'Register your first laboratory asset to get started.'
              }
              action={
                hasFilters ? (
                  <button type="button" className="btn-secondary" onClick={resetFilters}>
                    Clear filters
                  </button>
                ) : canWrite ? (
                  <button type="button" className="btn-primary" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add asset
                  </button>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr>
                    <th className="table-th">Asset</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Laboratory</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Condition</th>
                    <th className="table-th">Assigned to</th>
                    <th className="table-th text-right">Value</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((asset) => (
                    <tr
                      key={asset.id}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                      onClick={() => setSelected(asset)}
                    >
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                            style={{
                              backgroundColor: asset.category_color || '#64748b',
                            }}
                          >
                            <Boxes className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {asset.name}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {asset.asset_tag}
                              {asset.brand ? ` · ${asset.brand}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className="inline-flex items-center gap-2 text-xs font-medium">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: asset.category_color || '#94a3b8',
                            }}
                          />
                          {asset.category_name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="table-td text-xs">
                        {asset.laboratory_name || '—'}
                      </td>
                      <td className="table-td">
                        <StatusBadge kind="asset" value={asset.status} />
                      </td>
                      <td className="table-td">
                        <StatusBadge kind="condition" value={asset.condition} />
                      </td>
                      <td className="table-td">
                        {asset.active_assignment ? (
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {asset.active_assignment.borrower_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Due {formatDate(asset.active_assignment.due_date)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="table-td text-right text-xs font-semibold text-slate-700">
                        {formatCurrency(asset.purchase_cost)}
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canWrite && (
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={(event) => {
                                event.stopPropagation()
                                openEdit(asset)
                              }}
                              title="Edit asset"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              className="icon-btn hover:bg-rose-50 hover:text-rose-600"
                              onClick={(event) => {
                                event.stopPropagation()
                                setDeleteTarget(asset)
                              }}
                              title="Delete asset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-300" />
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

      <AssetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        asset={editing}
        categories={categories}
        laboratories={laboratories}
        onSaved={handleSaved}
      />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || 'Asset details'}
        description={
          selected
            ? `${selected.asset_tag} · ${selected.category_name || 'Uncategorized'}`
            : ''
        }
        icon={Boxes}
        size="lg"
        footer={
          selected ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              {canWrite && selected.status === 'available' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelected(null)
                    navigate(`/assignments?new=1&asset=${selected.id}`)
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Issue asset
                </button>
              )}
              {canWrite && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelected(null)
                    navigate(`/maintenance?new=1&asset=${selected.id}`)
                  }}
                >
                  <Wrench className="h-4 w-4" />
                  Log maintenance
                </button>
              )}
              {canWrite && (
                <button type="button" className="btn-primary" onClick={() => openEdit(selected)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge kind="asset" value={selected.status} />
              <StatusBadge kind="condition" value={selected.condition} />
              {selected.open_maintenance_count > 0 && (
                <span className="chip bg-amber-50 text-amber-700">
                  <Wrench className="h-3 w-3" />
                  {selected.open_maintenance_count} open maintenance
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-5 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
              <DetailRow label="Category" value={selected.category_name} />
              <DetailRow label="Laboratory" value={selected.laboratory_name} />
              <DetailRow label="Condition" value={selected.condition} />
              <DetailRow label="Brand" value={selected.brand} />
              <DetailRow label="Model" value={selected.model} />
              <DetailRow label="Serial number" value={selected.serial_number} />
              <DetailRow label="Supplier" value={selected.supplier} />
              <DetailRow label="Purchase date" value={formatDate(selected.purchase_date)} />
              <DetailRow label="Purchase cost" value={formatCurrency(selected.purchase_cost)} />
              <DetailRow label="Warranty expiry" value={formatDate(selected.warranty_expiry)} />
              <DetailRow label="Added" value={formatDateTime(selected.created_at)} />
              <DetailRow label="Updated" value={formatDateTime(selected.updated_at)} />
            </div>

            {selected.active_assignment && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                      Currently assigned
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {selected.active_assignment.borrower_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selected.active_assignment.department || 'No department'} ·{' '}
                      {selected.active_assignment.borrower_email || 'No email'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Issued {formatDate(selected.active_assignment.assigned_at)} · Due{' '}
                      {formatDate(selected.active_assignment.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      kind="assignment"
                      value={selected.active_assignment.status}
                    />
                    {canWrite && (
                      <button
                        type="button"
                        className="btn-secondary !px-3 !py-1.5 text-xs"
                        onClick={() => handleReturn(selected.active_assignment)}
                        disabled={returning}
                      >
                        {returning ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Return
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(selected.description || selected.notes) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {selected.description && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {selected.description}
                    </p>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Internal notes
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="btn-ghost !text-rose-600 hover:!bg-rose-50"
                  onClick={() => setDeleteTarget(selected)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete asset
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.asset_tag || 'asset'}?`}
        description="This removes the asset and its assignment/maintenance history."
        confirmLabel="Delete asset"
      />
    </div>
  )
}
