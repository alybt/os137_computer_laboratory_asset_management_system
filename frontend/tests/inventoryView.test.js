import test from 'node:test'
import assert from 'node:assert/strict'
import { resultRange, pageNumbers, inventoryValue, humanizeActivity } from '../src/lib/inventoryView.js'
import { formatCurrency } from '../src/lib/format.js'

test('Result counts handle empty, single, full and final pages', () => {
  assert.deepEqual(resultRange(1,25,0),[0,0])
  assert.deepEqual(resultRange(1,25,1),[1,1])
  assert.deepEqual(resultRange(1,25,120),[1,25])
  assert.deepEqual(resultRange(5,25,120),[101,120])
})
test('Numbered pagination includes boundaries without invalid or duplicate pages', () => {
  assert.deepEqual(pageNumbers(1,1),[1])
  assert.deepEqual(pageNumbers(1,5),[1,2,5])
  assert.deepEqual(pageNumbers(3,5),[1,2,3,4,5])
  assert.deepEqual(pageNumbers(5,5),[1,4,5])
})
test('Displayed acquisition values never substitute package totals for unknown costs', () => {
  assert.equal(inventoryValue({purchase_cost:null,sticker_amount:50000,sticker_amount_scope:'package'}),null)
  assert.equal(inventoryValue({purchase_cost:0,sticker_amount:50000}),0)
  assert.equal(inventoryValue({purchase_cost:'123.45'}),'123.45')
  assert.match(formatCurrency(0),/0\.00/)
  assert.match(formatCurrency(123.45),/123\.45/)
  assert.equal(formatCurrency(null),'—')
})
test('Readable activity labels preserve supplied audit records', () => {
  const record={action:'first_admin_provisioned',entity_id:1}
  const original=JSON.stringify(record)
  assert.equal(humanizeActivity(record),'Created the first administrator account.')
  assert.equal(JSON.stringify(record),original)
  assert.equal(humanizeActivity({action:'update',detail:'Corrected monitor model'}),'Corrected monitor model')
})
