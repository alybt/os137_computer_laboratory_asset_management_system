export const ASSET_STATUS = {
  available: { label: 'Available', className: 'chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  assigned: { label: 'Assigned', className: 'chip bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200', dot: 'bg-indigo-500' },
  maintenance: { label: 'Maintenance', className: 'chip bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  retired: { label: 'Retired', className: 'chip bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
  lost: { label: 'Lost', className: 'chip bg-rose-50 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-500' },
}

export const ASSET_CONDITION = {
  new: { label: 'New', className: 'chip bg-emerald-50 text-emerald-700' },
  good: { label: 'Good', className: 'chip bg-sky-50 text-sky-700' },
  fair: { label: 'Fair', className: 'chip bg-amber-50 text-amber-700' },
  poor: { label: 'Poor', className: 'chip bg-orange-50 text-orange-700' },
  damaged: { label: 'Damaged', className: 'chip bg-rose-50 text-rose-700' },
}

export const ASSIGNMENT_STATUS = {
  active: { label: 'Active', className: 'chip bg-indigo-50 text-indigo-700' },
  overdue: { label: 'Overdue', className: 'chip bg-rose-50 text-rose-700' },
  returned: { label: 'Returned', className: 'chip bg-slate-100 text-slate-600' },
}

export const MAINTENANCE_STATUS = {
  scheduled: { label: 'Scheduled', className: 'chip bg-sky-50 text-sky-700' },
  in_progress: { label: 'In progress', className: 'chip bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', className: 'chip bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', className: 'chip bg-slate-100 text-slate-600' },
}

export const MAINTENANCE_TYPE = {
  preventive: 'Preventive',
  corrective: 'Corrective',
  inspection: 'Inspection',
  upgrade: 'Upgrade',
}

export const ROLE = {
  admin: { label: 'Administrator', className: 'chip bg-violet-50 text-violet-700' },
  technician: { label: 'Technician', className: 'chip bg-sky-50 text-sky-700' },
  viewer: { label: 'Viewer', className: 'chip bg-slate-100 text-slate-600' },
}

export const ACTION_ICONS = {
  login: 'log-in',
  create: 'plus',
  update: 'pencil',
  delete: 'trash',
  assign: 'arrow-up-right',
  return: 'arrow-down-left',
}
