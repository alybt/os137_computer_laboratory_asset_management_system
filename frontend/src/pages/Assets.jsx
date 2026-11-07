import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  Eye,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Wrench,
} from 'lucide-react'
import { api, downloadCsv } from '../lib/api'
import {
  formatDate,
  formatDateTime,
  todayISO,
} from '../lib/format'
import {assetCell,assetLabel} from '../lib/assetFields'
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
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line break-words text-sm font-medium text-slate-700">
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
    </div>
  )
}

const COLUMNS = ['asset_tag','property_number','name','category_id','laboratory_id','status','condition'].map(key=>[key,assetLabel(key)]).concat([['actions','Actions']])
const DETAIL_GROUPS = [
  ['Identification and placement',['asset_tag','property_number','name','category_id','laboratory_id']],
  ['Property information',['description','sticker_date','purchase_order_number','fund_source','supplier','sticker_amount','sticker_amount_scope','sticker_location','sticker_end_user']],
  ['Technical and acquisition details',['brand','model','serial_number','specifications','purchase_date','purchase_cost','warranty_expiry','notes']],
]

export default function Assets() {
  const { isAdmin, canWrite, canManageLoans, canManageMaintenance } = useAuth()
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
  const [pageSize, setPageSize] = useState(25)
  const requestSequence = useRef(0)
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('clam.inventory.columns') || '[]'); return Array.isArray(value) ? value.filter(key => COLUMNS.some(([name]) => name === key) && !['asset_tag','actions'].includes(key)) : [] } catch { return [] }
  })
  const toggleColumn = key => setHiddenColumns(previous => {
    const next = previous.includes(key) ? previous.filter(value => value !== key) : [...previous, key]
    try { localStorage.setItem('clam.inventory.columns', JSON.stringify(next)) } catch { /* Preferences are optional. */ }
    return next
  })

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
    const sequence = ++requestSequence.current
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
        page_size: pageSize,
      })
      if (sequence !== requestSequence.current) return
      if (data.total > 0 && page > data.pages) { setPage(data.pages); return }
      setItems(data.items)
      setMeta(data)
    } catch (err) {
      if (sequence === requestSequence.current) setError(err.message)
    } finally {
      if (sequence === requestSequence.current) { setFetching(false); setLoading(false) }
    }
  }, [debouncedQuery, status, condition, categoryId, laboratoryId, sort, page, pageSize])

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
    if(!editing) resetFilters()
    load()
  }

  const openDelete = (asset) => {
    setSelected(null)
    setDeleteTarget(asset)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/assets/${deleteTarget.id}`)
      toast.success(`Asset ${deleteTarget.asset_tag} removed from active inventory; history retained`)
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
      <PageHeader title="Asset inventory" subtitle="University equipment and official property records" />
      <section className="inventory-panel" aria-label="Asset inventory">
        <div className="inventory-toolbar">
          <SearchInput value={query} onChange={value => { setQuery(value); setPage(1) }} placeholder="Search tag, property number, name or serial" className="min-w-52 flex-1" />
          <details className="columns-menu"><summary className="btn-secondary">Columns</summary><div>
            {COLUMNS.filter(([key]) => !['asset_tag','actions'].includes(key)).map(([key,label]) => <label className="flex items-center gap-2 py-1.5 text-xs" key={key}>
              <input type="checkbox" checked={!hiddenColumns.includes(key)} onChange={() => toggleColumn(key)}/>{label}
            </label>)}
          </div></details>
          <button type="button" className="btn-secondary" onClick={exportCsv} title="Exports the complete authorized inventory, not only these filters"><Download size={16}/>Export all CSV</button>
          {canWrite && <button type="button" className="btn-primary" onClick={openCreate}><Plus size={16}/>Add asset</button>}
        </div>
        <div className="inventory-filters">
          <select aria-label="Filter status" className="select" value={status} onChange={event => {setStatus(event.target.value);setPage(1)}}>
            <option value="">All statuses</option>{['available','assigned','maintenance','retired','lost'].map(key => <option key={key} value={key}>{ASSET_STATUS[key].label}</option>)}
          </select>
          <select aria-label="Filter category" className="select" value={categoryId} onChange={event => {setCategoryId(event.target.value);setPage(1)}}>
            <option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Filter laboratory" className="select" value={laboratoryId} onChange={event => {setLaboratoryId(event.target.value);setPage(1)}}>
            <option value="">All laboratories</option>{laboratories.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select aria-label="Filter condition" className="select" value={condition} onChange={event => {setCondition(event.target.value);setPage(1)}}>
            <option value="">All conditions</option>{['new','good','fair','poor','damaged','Excellent','Unusable'].map(key => <option key={key} value={key}>{key.charAt(0).toUpperCase()+key.slice(1)}</option>)}
          </select>
          <select aria-label="Sort inventory" className="select" value={sort} onChange={event => {setSort(event.target.value);setPage(1)}}>
            <option value="created_at:desc">Newest first</option><option value="name:asc">Name A–Z</option><option value="asset_tag:asc">Asset tag A–Z</option><option value="purchase_cost:desc">Highest individual cost</option><option value="purchase_date:asc">Acquisition date</option>
          </select>
          {hasFilters && <button className="btn-ghost" onClick={resetFilters}><RotateCcw size={14}/>Reset</button>}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-3 py-2 text-xs text-slate-600" aria-live="polite">
          <span>{resultLabel}</span>{fetching && <span className="inline-flex items-center gap-1"><Spinner className="h-3 w-3"/>Updating…</span>}
          <label className="ml-auto flex items-center gap-2">Rows per page
            <select className="select !w-auto !py-1" value={pageSize} onChange={event => {setPageSize(Number(event.target.value));setPage(1)}}>{[15,25,50,100].map(size => <option key={size}>{size}</option>)}</select>
          </label>
        </div>
        {loading ? <LoadingBlock label="Loading inventory…"/> : error ? <ErrorState message={error} onRetry={load}/> : items.length === 0 ?
          <EmptyState icon={Boxes} title={hasFilters ? 'No matching assets' : 'No assets yet'} description={hasFilters ? 'Adjust or clear the filters.' : 'Register one record for each individually tagged item.'}
            action={hasFilters ? <button className="btn-secondary" onClick={resetFilters}>Clear filters</button> : canWrite ? <button className="btn-primary" onClick={openCreate}>Add asset</button> : null}/>
          : <div className="inventory-scroll" tabIndex={0} role="region" aria-label="Scrollable asset records">
            <table className="inventory-table"><caption className="sr-only">Asset inventory. Individual item cost excludes unallocated package property amounts.</caption>
              <thead><tr>{COLUMNS.filter(([key]) => !hiddenColumns.includes(key)).map(([key,label]) => <th scope="col" key={key} className={`table-th ${key === 'asset_tag' ? 'identity-column' : key === 'actions' ? 'actions-column' : ''}`}>{label}</th>)}</tr></thead>
              <tbody>{items.map(asset => <tr key={asset.id}>{COLUMNS.filter(([key]) => !hiddenColumns.includes(key)).map(([key]) => {
                let content = assetCell(asset,key)
                if (key === 'asset_tag' || key === 'name') content = <button className="inventory-link font-medium" onClick={() => setSelected(asset)}>{asset[key] || '—'}</button>
                if (key === 'status') content = <StatusBadge kind="asset" value={asset.status}/>
                if (key === 'condition') content = <StatusBadge kind="condition" value={asset.condition}/>
                if (key === 'assigned_user') content = asset.active_assignment?.borrower_name || '—'
                if (key === 'actions') content = <div className="flex gap-1">
                  <button className="icon-btn" aria-label={`View ${asset.name}`} title="View asset" onClick={() => setSelected(asset)}><Eye size={16}/></button>
                  {canWrite && <button className="icon-btn" aria-label={`Edit ${asset.name}`} title="Edit asset" onClick={() => openEdit(asset)}><Pencil size={16}/></button>}
                  {isAdmin && <button type="button" className="btn-ghost !gap-1.5 !px-2 !py-1.5 !text-rose-700 hover:!bg-rose-50" aria-label={`Delete ${asset.name} from active inventory`} title="Delete from active inventory; retain history" onClick={() => openDelete(asset)}><Trash2 size={16}/>Delete</button>}
                </div>
                return <td key={key} className={`table-td ${['description','specifications','notes'].includes(key)?'asset-long-text':''} ${key === 'asset_tag' ? 'identity-column' : key === 'actions' ? 'actions-column' : ''}`} title={['description','specifications','notes'].includes(key)?String(asset[key] ?? ''):undefined}>{content}</td>
              })}</tr>)}</tbody>
            </table>
          </div>}
        {!loading && !error && meta.total > 0 && <Pagination page={meta.page} pages={meta.pages} total={meta.total} pageSize={meta.page_size} onPageChange={setPage}/>}
      </section>

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
              {canManageLoans && selected.status === 'available' && (
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
              {canManageMaintenance && (
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

            {DETAIL_GROUPS.map(([title,keys]) => (
              <section key={title} className="rounded-[10px] border border-slate-200 p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {keys.map(key => <DetailRow key={key} label={assetLabel(key)} value={assetCell(selected,key)}/>)}
                </div>
              </section>
            ))}
            <div className="grid grid-cols-1 gap-5 rounded-[10px] bg-slate-50 p-4 sm:grid-cols-2">
              <DetailRow label="Custodian (linked account)" value={selected.custodian_name}/>
              <DetailRow label="Assigned borrower" value={selected.active_assignment?.borrower_name}/>
              <DetailRow label="Added" value={formatDateTime(selected.created_at)}/>
              <DetailRow label="Updated" value={formatDateTime(selected.updated_at)}/>
            </div>

            {selected.active_assignment && (
              <div className="rounded-[10px] border border-indigo-100 bg-indigo-50/60 p-4">
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

            {isAdmin && (
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="btn-ghost !text-rose-600 hover:!bg-rose-50"
                  onClick={() => openDelete(selected)}
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
        description="Remove this asset from active inventory? Its record and history will be retained. Equipment with unresolved assignments, repairs, or reservations cannot be deleted."
        confirmLabel="Delete asset"
      />
    </div>
  )
}
