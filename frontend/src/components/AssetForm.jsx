import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import { api } from '../lib/api'
import { ASSET_CONDITION, ASSET_STATUS } from '../lib/constants'
import { Modal, Spinner } from './ui'
import {assetFormValues,assetPayload,assetLabel,assetError} from '../lib/assetFields'
import { useToast } from '../context/ToastContext'

const EMPTY = assetFormValues(null)

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
    setForm(assetFormValues(asset))
  }, [open, asset])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = assetPayload(form,!asset)
    try {
      const saved = asset
        ? await api.patch(`/assets/${asset.id}`, payload)
        : await api.post('/assets', payload)
      toast.success(asset ? 'Asset updated' : `Asset ${saved.asset_tag} added`)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(assetError(err.message))
    } finally {
      setSaving(false)
    }
  }

  const statuses = ['available', 'assigned', 'maintenance', 'retired', 'lost']
  const field = (key, label, { type = 'text', maxLength, required = false, help } = {}) => (
    <div key={key}>
      <label className="label" htmlFor={key}>{assetLabel(key) || label}{required ? ' *' : ''}</label>
      <input id={key} type={type} required={required} maxLength={maxLength}
        min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined}
        className="input" value={form[key]} onChange={(event) => update(key, event.target.value)} />
      {help && <p className="mt-1 text-xs text-slate-500">{help}</p>}
    </div>
  )
  return (
    <Modal open={open} onClose={onClose} title={asset ? 'Edit asset' : 'Register an asset'}
      description="Record one individually tagged item using its official university property information."
      icon={Boxes} size="lg" footer={<>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="asset-form" className="btn-primary" disabled={saving}>
          {saving && <Spinner className="h-4 w-4" />}{saving ? 'Saving…' : asset ? 'Save changes' : 'Add asset'}
        </button>
      </>}>
      <form id="asset-form" onSubmit={submit} className="space-y-6">
        {error && <div role="alert" className="rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <fieldset>
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Property information</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('property_number', 'Official property number', {maxLength: 150, help: 'Copy exactly. Leave blank if it still needs verification.'})}
            {field('name', 'Item name', {maxLength: 160, required: true})}
            <div className="sm:col-span-2"><label className="label" htmlFor="description">Item description</label>
              <textarea id="description" rows={2} maxLength={20000} className="input" value={form.description} onChange={(event) => update('description', event.target.value)} />
            </div>
            {field('sticker_date', assetLabel('sticker_date'), {type: 'date'})}
            {field('purchase_order_number', 'P.O. number', {maxLength: 150})}
            {field('fund_source', 'Fund', {maxLength: 150})}
            {field('supplier', 'Supplier', {maxLength: 160})}
            {field('sticker_amount', assetLabel('sticker_amount'), {type: 'number'})}
            <div><label className="label" htmlFor="sticker_amount_scope">{assetLabel('sticker_amount_scope')}</label>
              <select id="sticker_amount_scope" className="select" value={form.sticker_amount_scope} onChange={(event) => update('sticker_amount_scope', event.target.value)}>
                <option value="unconfirmed">Not yet confirmed</option><option value="individual">This item only</option><option value="package">Complete workstation / package</option>
              </select>
            </div>
            {field('sticker_location', assetLabel('sticker_location'), {maxLength: 255})}
            {field('sticker_end_user', assetLabel('sticker_end_user'), {maxLength: 255})}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Inventory placement</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="category_id">Category</label>
              <select id="category_id" className="select" value={form.category_id} onChange={(event) => update('category_id', event.target.value)}>
                <option value="">Uncategorized</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="laboratory_id">Current laboratory</label>
              <select id="laboratory_id" className="select" value={form.laboratory_id} onChange={(event) => update('laboratory_id', event.target.value)}>
                <option value="">Unassigned</option>{laboratories.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
              </select>
            </div>
            <div><label className="label" htmlFor="condition">Condition</label>
              <select id="condition" className="select" value={form.condition} onChange={(event) => update('condition', event.target.value)}>
                {[...new Set(['new','good','fair','poor','damaged','Excellent','Unusable',form.condition])].map((value) => <option key={value} value={value}>{ASSET_CONDITION[value]?.label || value}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
        <details className="rounded-[10px] border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600">Optional technical and internal details</summary>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('asset_tag', 'Internal inventory tag', {maxLength: 40, required: Boolean(asset), help: asset ? 'Existing internal tag is retained.' : 'Leave blank to generate an internal tag. This never replaces the official property number.'})}
            <div><label className="label" htmlFor="status">Operational status</label>
              <select id="status" className="select" value={form.status} onChange={(event) => update('status', event.target.value)}>
                {statuses.filter((value) => value !== 'assigned' || form.status === 'assigned').map((value) => <option key={value} value={value}>{ASSET_STATUS[value].label}</option>)}
              </select>
            </div>
            {field('brand', 'Brand', {maxLength: 100})}{field('model', 'Model', {maxLength: 120})}
            {field('serial_number', 'Serial number', {maxLength: 120})}{field('warranty_expiry', 'Warranty expiry', {type: 'date'})}
            {field('purchase_date', 'Acquisition date', {type: 'date'})}
            {field('purchase_cost', 'Individual item cost (₱)', {type: 'number', help: 'Leave unknown costs blank. A package amount is not automatically assigned to this item.'})}
            <div className="sm:col-span-2"><label className="label" htmlFor="specifications">Technical specifications</label>
              <textarea id="specifications" rows={2} maxLength={20000} className="input" value={form.specifications} onChange={(event) => update('specifications', event.target.value)} />
            </div>
            <div className="sm:col-span-2"><label className="label" htmlFor="notes">Internal notes</label>
              <textarea id="notes" rows={2} maxLength={20000} className="input" value={form.notes} onChange={(event) => update('notes', event.target.value)} />
            </div>
          </div>
        </details>
      </form>
    </Modal>
  )
}
