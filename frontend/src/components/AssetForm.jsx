import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import { api } from '../lib/api'
import { ASSET_CONDITION, ASSET_STATUS } from '../lib/constants'
import { Modal, Spinner } from './ui'
import { useToast } from '../context/ToastContext'

const EMPTY = {
  asset_tag: '',
  name: '',
  description: '',
  category_id: '',
  laboratory_id: '',
  status: 'available',
  condition: 'good',
  brand: '',
  model: '',
  serial_number: '',
  supplier: '',
  purchase_date: '',
  purchase_cost: '',
  warranty_expiry: '',
  notes: '',
}

export default function AssetForm({
  open,
  onClose,
  asset = null,
  categories = [],
  laboratories = [],
  onSaved,
}) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (asset) {
      setForm({
        asset_tag: asset.asset_tag || '',
        name: asset.name || '',
        description: asset.description || '',
        category_id: asset.category_id ?? '',
        laboratory_id: asset.laboratory_id ?? '',
        status: asset.status || 'available',
        condition: asset.condition || 'good',
        brand: asset.brand || '',
        model: asset.model || '',
        serial_number: asset.serial_number || '',
        supplier: asset.supplier || '',
        purchase_date: asset.purchase_date || '',
        purchase_cost: asset.purchase_cost ?? '',
        warranty_expiry: asset.warranty_expiry || '',
        notes: asset.notes || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, asset])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      asset_tag: form.asset_tag.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      laboratory_id: form.laboratory_id ? Number(form.laboratory_id) : null,
      status: form.status,
      condition: form.condition,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      serial_number: form.serial_number.trim() || null,
      supplier: form.supplier.trim() || null,
      purchase_date: form.purchase_date || null,
      purchase_cost: form.purchase_cost === '' ? null : Number(form.purchase_cost),
      warranty_expiry: form.warranty_expiry || null,
      notes: form.notes.trim() || null,
    }
    try {
      const saved = asset
        ? await api.patch(`/assets/${asset.id}`, payload)
        : await api.post('/assets', payload)
      toast.success(asset ? 'Asset updated' : `Asset ${saved.asset_tag} added`)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const statuses = asset
    ? Object.keys(ASSET_STATUS)
    : Object.keys(ASSET_STATUS).filter((status) => status !== 'assigned')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={asset ? 'Edit asset' : 'Add a new asset'}
      description={
        asset
          ? `Update the details for ${asset.asset_tag}.`
          : 'Register a new piece of laboratory equipment.'
      }
      icon={Boxes}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="asset-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : asset ? 'Save changes' : 'Add asset'}
          </button>
        </>
      }
    >
      <form id="asset-form" onSubmit={submit} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <fieldset>
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Identification
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="asset_tag">
                Asset tag *
              </label>
              <input
                id="asset_tag"
                required
                value={form.asset_tag}
                onChange={(event) => update('asset_tag', event.target.value)}
                className="input font-mono uppercase"
                placeholder="CL1-PC-07"
              />
            </div>
            <div>
              <label className="label" htmlFor="name">
                Asset name *
              </label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                className="input"
                placeholder="Dell OptiPlex 7090 Workstation"
              />
            </div>
            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                className="select"
                value={form.category_id}
                onChange={(event) => update('category_id', event.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="laboratory">
                Laboratory
              </label>
              <select
                id="laboratory"
                className="select"
                value={form.laboratory_id}
                onChange={(event) => update('laboratory_id', event.target.value)}
              >
                <option value="">Unassigned</option>
                {laboratories.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name} ({lab.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="select"
                value={form.status}
                onChange={(event) => update('status', event.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {ASSET_STATUS[status].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="condition">
                Condition
              </label>
              <select
                id="condition"
                className="select"
                value={form.condition}
                onChange={(event) => update('condition', event.target.value)}
              >
                {Object.entries(ASSET_CONDITION).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Specifications
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="brand">
                Brand
              </label>
              <input
                id="brand"
                className="input"
                value={form.brand}
                onChange={(event) => update('brand', event.target.value)}
                placeholder="Dell"
              />
            </div>
            <div>
              <label className="label" htmlFor="model">
                Model
              </label>
              <input
                id="model"
                className="input"
                value={form.model}
                onChange={(event) => update('model', event.target.value)}
                placeholder="OptiPlex 7090"
              />
            </div>
            <div>
              <label className="label" htmlFor="serial">
                Serial number
              </label>
              <input
                id="serial"
                className="input font-mono"
                value={form.serial_number}
                onChange={(event) => update('serial_number', event.target.value)}
                placeholder="DL7090-CL1-07"
              />
            </div>
            <div>
              <label className="label" htmlFor="supplier">
                Supplier
              </label>
              <input
                id="supplier"
                className="input"
                value={form.supplier}
                onChange={(event) => update('supplier', event.target.value)}
                placeholder="PC Express"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Acquisition
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="purchase_date">
                Purchase date
              </label>
              <input
                id="purchase_date"
                type="date"
                className="input"
                value={form.purchase_date}
                onChange={(event) => update('purchase_date', event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="purchase_cost">
                Purchase cost (₱)
              </label>
              <input
                id="purchase_cost"
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.purchase_cost}
                onChange={(event) => update('purchase_cost', event.target.value)}
                placeholder="48990"
              />
            </div>
            <div>
              <label className="label" htmlFor="warranty">
                Warranty expiry
              </label>
              <input
                id="warranty"
                type="date"
                className="input"
                value={form.warranty_expiry}
                onChange={(event) => update('warranty_expiry', event.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="input resize-none"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Where the asset is used, special notes…"
            />
          </div>
          <div>
            <label className="label" htmlFor="notes">
              Internal notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="input resize-none"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Repair history, custodian notes…"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
