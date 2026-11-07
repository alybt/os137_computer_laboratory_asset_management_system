import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { api } from '../lib/api'
import { MAINTENANCE_STATUS, MAINTENANCE_TYPE } from '../lib/constants'
import { todayISO } from '../lib/format'
import { Modal, Spinner } from './ui'
import { useToast } from '../context/ToastContext'

const EMPTY = {
  asset_id: '',
  title: '',
  description: '',
  maintenance_type: 'corrective',
  status: 'scheduled',
  scheduled_date: '',
  completed_date: '',
  cost: '',
  performed_by: '',
  notes: '',
}

export default function MaintenanceForm({
  open,
  onClose,
  record = null,
  assets = [],
  preselectedAssetId = '',
  onSaved,
}) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (record) {
      setForm({
        asset_id: String(record.asset_id),
        title: record.title || '',
        description: record.description || '',
        maintenance_type: record.maintenance_type || 'corrective',
        status: record.status || 'scheduled',
        scheduled_date: record.scheduled_date || '',
        completed_date: record.completed_date || '',
        cost: record.cost ?? '',
        performed_by: record.performed_by || '',
        notes: record.notes || '',
      })
    } else {
      setForm({
        ...EMPTY,
        asset_id: preselectedAssetId ? String(preselectedAssetId) : '',
        scheduled_date: todayISO(),
      })
    }
  }, [open, record, preselectedAssetId])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      maintenance_type: form.maintenance_type,
      status: form.status,
      scheduled_date: form.scheduled_date || null,
      completed_date: form.completed_date || null,
      cost: form.cost === '' ? null : Number(form.cost),
      performed_by: form.performed_by.trim() || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (record) {
        await api.patch(`/maintenance/${record.id}`, payload)
        toast.success('Maintenance record updated')
      } else {
        await api.post('/maintenance', {
          ...payload,
          asset_id: Number(form.asset_id),
        })
        toast.success('Maintenance work order logged')
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedAsset = record
    ? { asset_tag: record.asset_tag, name: record.asset_name }
    : assets.find((asset) => String(asset.id) === String(form.asset_id))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={record ? 'Edit maintenance record' : 'Log maintenance'}
      description={
        record
          ? `Update the work order for ${record.asset_tag}.`
          : 'Create a work order for an asset that needs service.'
      }
      icon={Wrench}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="maintenance-form"
            className="btn-primary"
            disabled={saving}
          >
            {saving && <Spinner className="h-4 w-4" />}
            {saving ? 'Saving…' : record ? 'Save changes' : 'Log maintenance'}
          </button>
        </>
      }
    >
      <form id="maintenance-form" onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {record ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Asset
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {selectedAsset?.asset_tag} · {selectedAsset?.name}
            </p>
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="maintenance_asset">
              Asset *
            </label>
            <select
              id="maintenance_asset"
              required
              className="select"
              value={form.asset_id}
              onChange={(event) => update('asset_id', event.target.value)}
            >
              <option value="">Select an asset…</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} — {asset.name}
                  {asset.laboratory_name ? ` (${asset.laboratory_name})` : ''}
                </option>
              ))}
            </select>
            {assets.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No available assets right now. Return an asset before logging maintenance.
              </p>
            )}
            {selectedAsset && (
              <p className="mt-1.5 text-xs text-slate-400">
                {selectedAsset.category_name || 'Uncategorized'} ·{' '}
                {selectedAsset.laboratory_name || 'Unassigned'}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor="maintenance_title">
            Work order title *
          </label>
          <input
            id="maintenance_title"
            required
            className="input"
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Battery replacement and thermal repaste"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="maintenance_type">
              Type
            </label>
            <select
              id="maintenance_type"
              className="select"
              value={form.maintenance_type}
              onChange={(event) => update('maintenance_type', event.target.value)}
            >
              {Object.entries(MAINTENANCE_TYPE).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="maintenance_status">
              Status
            </label>
            <select
              id="maintenance_status"
              className="select"
              value={form.status}
              onChange={(event) => update('status', event.target.value)}
            >
              {Object.entries(MAINTENANCE_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="scheduled_date">
              Scheduled date
            </label>
            <input
              id="scheduled_date"
              type="date"
              className="input"
              value={form.scheduled_date}
              onChange={(event) => update('scheduled_date', event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="completed_date">
              Completed date
            </label>
            <input
              id="completed_date"
              type="date"
              className="input"
              value={form.completed_date}
              onChange={(event) => update('completed_date', event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="maintenance_cost">
              Cost (₱)
            </label>
            <input
              id="maintenance_cost"
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.cost}
              onChange={(event) => update('cost', event.target.value)}
              placeholder="3500"
            />
          </div>
          <div>
            <label className="label" htmlFor="performed_by">
              Performed by
            </label>
            <input
              id="performed_by"
              className="input"
              value={form.performed_by}
              onChange={(event) => update('performed_by', event.target.value)}
              placeholder="Dataworld Service Center"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="maintenance_description">
              Description
            </label>
            <textarea
              id="maintenance_description"
              rows={3}
              className="input resize-none"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="What needs to be repaired or inspected?"
            />
          </div>
          <div>
            <label className="label" htmlFor="maintenance_notes">
              Notes
            </label>
            <textarea
              id="maintenance_notes"
              rows={3}
              className="input resize-none"
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Parts ordered, service reference number…"
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
