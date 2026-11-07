import test from 'node:test'
import assert from 'node:assert/strict'
import { chartConfig, validSeries, SOLID_COLORS } from '../src/lib/chartConfig.js'

test('One asset remains one real chart value for all inventory chart types',()=>{
  for(const type of ['horizontal','bar','doughnut']){
    const c=chartConfig(type,['Monitors'],[{label:'Assets',values:[1]}])
    assert.deepEqual(c.data.datasets[0].data,[1])
    assert.deepEqual(c.data.labels,['Monitors'])
    assert.equal(c.options.animation,false)
    assert.equal(c.options.animations,false)
    assert.equal(c.options.transitions.active.animation.duration,0)
  }
})
test('Zero activity is valid; missing or malformed history is not zero activity',()=>{
  assert.equal(validSeries(['Nov 2026'],[{label:'Assigned',values:[0]}]),true)
  assert.equal(validSeries(['Nov 2026'],[{label:'Assigned',values:undefined}]),false)
  assert.equal(validSeries(['Nov 2026'],[{label:'Assigned',values:[null]}]),false)
  assert.equal(validSeries(['Nov 2026'],[{label:'Assigned',values:[-1]}]),false)
  assert.equal(validSeries(['Nov 2026'],[{label:'Assigned',values:[1,2]}]),false)
})
test('Charts use solid colors, clean unfilled lines and integer axes',()=>{
  assert.ok(SOLID_COLORS.every(color=>/^#[0-9a-f]{6}$/i.test(color)))
  const line=chartConfig('line',['Oct','Nov'],[{label:'Assigned',values:[0,1]},{label:'Returned',values:[0,0]}])
  assert.equal(line.data.datasets[0].fill,false)
  assert.equal(line.data.datasets[0].tension,0)
  assert.equal(line.options.scales.y.ticks.precision,0)
  assert.equal(chartConfig('horizontal',['Monitor'],[{label:'Assets',values:[1]}]).options.indexAxis,'y')
})
