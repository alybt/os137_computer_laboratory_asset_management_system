// Solid semantic indicators. Values and compatibility aliases remain unchanged.
const badge = tone => `status-badge badge-${tone}`
export const ASSET_STATUS = {
  available: { label:'Available', className:badge('green'), dot:'bg-emerald-600' },
  assigned: { label:'Assigned', className:badge('blue'), dot:'bg-sky-700' },
  maintenance: { label:'Maintenance', className:badge('amber'), dot:'bg-amber-700' },
  retired: { label:'Retired', className:badge('neutral'), dot:'bg-slate-500' },
  lost: { label:'Lost', className:badge('red'), dot:'bg-rose-700' },
}
export const ASSET_CONDITION = {
  new:{label:'New',className:badge('green')},
  good:{label:'Good',className:badge('blue')},
  fair:{label:'Fair',className:badge('amber')},
  poor:{label:'Poor',className:badge('orange')},
  damaged:{label:'Damaged',className:badge('red')},
}
export const ASSIGNMENT_STATUS = {
  active:{label:'Active',className:badge('blue')},
  overdue:{label:'Overdue',className:badge('red')},
  returned:{label:'Returned',className:badge('neutral')},
}
export const MAINTENANCE_STATUS = {
  scheduled:{label:'Scheduled',className:badge('blue')},
  in_progress:{label:'In progress',className:badge('amber')},
  completed:{label:'Completed',className:badge('green')},
  cancelled:{label:'Cancelled',className:badge('neutral')},
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

// Canonical database names; retain existing badge styling.
for (const [canonical, legacy] of Object.entries({'Available':'available','Assigned':'assigned','Under Maintenance':'maintenance','Disposed':'retired','Missing':'lost'})) ASSET_STATUS[canonical] = ASSET_STATUS[legacy]
for (const name of ['Excellent','Good','Fair','Poor','Damaged','Unusable']) ASSET_CONDITION[name] = ASSET_CONDITION[name.toLowerCase()] || {label:name,className:badge(name==='Excellent'?'green':name==='Unusable'?'red':'neutral')}
for (const name of ['Super Administrator','Property Administrator','Laboratory Administrator','IT Personnel','Faculty','Student']) ROLE[name] = {label:name,className:'chip bg-slate-100 text-slate-700'}

for (const [code,label] of Object.entries({super_admin:'Super Administrator',property_admin:'Property Administrator',lab_admin:'Laboratory Administrator',it_personnel:'IT Personnel',faculty:'Faculty',student:'Student'})) ROLE[code] = {label,className:'chip bg-slate-100 text-slate-700'}
