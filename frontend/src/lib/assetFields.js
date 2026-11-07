import {formatCurrency,formatDate} from './format.js'
// Shared form/table contract. Database/API keys are intentionally preserved.
export const ASSET_FIELDS=[
  {key:'asset_tag',label:'Internal inventory tag'},
  {key:'property_number',label:'Official property number'},
  {key:'name',label:'Item name'},
  {key:'description',label:'Item description'},
  {key:'sticker_date',label:'Property date',kind:'date'},
  {key:'purchase_order_number',label:'P.O. number'},
  {key:'fund_source',label:'Fund'},
  {key:'supplier',label:'Supplier'},
  {key:'sticker_amount',label:'Property amount (₱)',kind:'money'},
  {key:'sticker_amount_scope',label:'Amount covers',kind:'scope',default:'unconfirmed'},
  {key:'sticker_location',label:'Property location'},
  {key:'sticker_end_user',label:'Property end user'},
  {key:'category_id',label:'Category',kind:'reference',readKey:'category_name'},
  {key:'laboratory_id',label:'Current laboratory',kind:'reference',readKey:'laboratory_name'},
  {key:'condition',label:'Condition',kind:'condition',default:'good'},
  {key:'status',label:'Operational status',kind:'status',default:'available'},
  {key:'brand',label:'Brand'},
  {key:'model',label:'Model'},
  {key:'serial_number',label:'Serial number'},
  {key:'warranty_expiry',label:'Warranty expiry',kind:'date'},
  {key:'purchase_date',label:'Acquisition date',kind:'date'},
  {key:'purchase_cost',label:'Individual item cost (₱)',kind:'money'},
  {key:'specifications',label:'Technical specifications'},
  {key:'notes',label:'Internal notes'},
]
export const AMOUNT_SCOPE={unconfirmed:'Not yet confirmed',individual:'This item only',package:'Complete workstation / package'}
export function assetLabel(key){return ASSET_FIELDS.find(field=>field.key===key)?.label || key}
export function assetFormValues(asset){return Object.fromEntries(ASSET_FIELDS.map(field=>[field.key,asset?.[field.key] ?? field.default ?? '']))}
export function assetPayload(form,isNew=false){
  const result={}
  for(const field of ASSET_FIELDS){
    const value=form[field.key]
    if(field.kind==='reference')result[field.key]=value===''||value==null?null:Number(value)
    else if(field.kind==='money')result[field.key]=value===''||value==null?null:String(value)
    else result[field.key]=String(value ?? '').trim() || (['asset_tag','name','status','condition','sticker_amount_scope'].includes(field.key)?'':null)
  }
  if(isNew && !result.asset_tag)delete result.asset_tag
  return result
}
export function assetCell(asset,key){
  const field=ASSET_FIELDS.find(item=>item.key===key)
  const value=asset[field?.readKey || key]
  if(value===null||value===undefined||value==='')return '—'
  if(field?.kind==='date')return formatDate(value)
  if(field?.kind==='money')return formatCurrency(value)
  if(field?.kind==='scope')return AMOUNT_SCOPE[value] || value
  return value
}
export function assetError(message){
  let value=String(message || 'Unable to save asset.')
  const labels=new Map(ASSET_FIELDS.map(field=>[field.key,field.label]))
  value=value.replace(/\b[a-z][a-z_]*\b/g,key=>labels.get(key) || key)
  return value.replace(/stickers?/gi,'property information')
}
