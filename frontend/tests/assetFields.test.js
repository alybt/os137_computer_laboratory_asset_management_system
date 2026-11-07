import test from 'node:test'
import assert from 'node:assert/strict'
import {ASSET_FIELDS,assetFormValues,assetPayload,assetCell,assetError} from '../src/lib/assetFields.js'
test('Every form field has a separate table label without legacy visible wording',()=>{
  assert.equal(new Set(ASSET_FIELDS.map(field=>field.key)).size,ASSET_FIELDS.length)
  for(const field of ASSET_FIELDS)assert.doesNotMatch(field.label,/stickers?/i)
  assert.ok(ASSET_FIELDS.some(field=>field.key==='brand'))
  assert.ok(ASSET_FIELDS.some(field=>field.key==='model'))
})
test('Create/edit payload retains all fields, zeros and exact property amount strings',()=>{
  const values=assetFormValues({asset_tag:'TAG-1',property_number:'PROPERTY-1',name:'Monitor',brand:'Acer',model:'V22',purchase_cost:0,sticker_amount:'50000.50',sticker_amount_scope:'package',category_id:2,laboratory_id:3,notes:'Keep notes',specifications:'HDMI',sticker_date:'2021-11-19'})
  const saved=assetPayload(values)
  assert.equal(Object.keys(saved).length,ASSET_FIELDS.length)
  assert.equal(saved.purchase_cost,'0');assert.equal(saved.sticker_amount,'50000.50')
  assert.equal(saved.asset_tag,'TAG-1');assert.equal(saved.property_number,'PROPERTY-1')
  assert.equal(saved.notes,'Keep notes');assert.equal(saved.specifications,'HDMI')
  assert.equal(saved.category_id,2);assert.equal(saved.laboratory_id,3)
  assert.equal(assetPayload(assetFormValues(null),true).asset_tag,undefined)
})
test('Table cells resolve references, preserve separate values and format missing/zero amounts',()=>{
  const asset={category_id:2,category_name:'Monitors',laboratory_id:3,laboratory_name:'Lab A',brand:'Acer',model:'V22',purchase_cost:0,sticker_amount:'50000.50',sticker_amount_scope:'package'}
  assert.equal(assetCell(asset,'category_id'),'Monitors');assert.equal(assetCell(asset,'laboratory_id'),'Lab A')
  assert.equal(assetCell(asset,'brand'),'Acer');assert.equal(assetCell(asset,'model'),'V22')
  assert.match(assetCell(asset,'purchase_cost'),/0\.00/);assert.match(assetCell(asset,'sticker_amount'),/50,000\.50/)
  assert.equal(assetCell(asset,'sticker_amount_scope'),'Complete workstation / package')
  assert.equal(assetCell({category_id:2},'category_id'),'—')
  assert.equal(assetCell({purchase_cost:null},'purchase_cost'),'—')
})
test('Validation messages use public property labels while API keys stay unchanged',()=>{
  assert.doesNotMatch(assetError('Invalid sticker_amount. Choose what the sticker amount covers.'),/sticker/i)
  assert.match(assetError('Duplicate property_number.'),/Official property number/)
  assert.equal(assetError('Invalid sticker_amount_scope.'),'Invalid Amount covers.')
  assert.equal(ASSET_FIELDS.find(field=>field.kind==='scope').key,'sticker_amount_scope')
})
