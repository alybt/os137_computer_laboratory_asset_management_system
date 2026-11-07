import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {themePreference,resolveTheme} from '../src/lib/theme.js'
import {chartConfig,chartColor} from '../src/lib/chartConfig.js'
test('OS preference is the default; explicit light/dark choices override it',()=>{
  assert.equal(themePreference(null),'system');assert.equal(themePreference('invalid'),'system')
  assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light')
  assert.equal(resolveTheme('light',true),'light');assert.equal(resolveTheme('dark',false),'dark')
})
test('Early theme script applies saved theme before app rendering, including storage failure',()=>{
  const script=readFileSync(new URL('../public/theme-init.js',import.meta.url),'utf8')
  for(const [saved,osDark,expected] of [[null,true,'dark'],[null,false,'light'],['light',true,'light'],['dark',false,'dark']]){
    const document={documentElement:{dataset:{},style:{}}}
    vm.runInNewContext(script,{document,localStorage:{getItem:()=>saved},window:{matchMedia:()=>({matches:osDark})}})
    assert.equal(document.documentElement.dataset.theme,expected)
    assert.equal(document.documentElement.style.colorScheme,expected)
  }
  const document={documentElement:{dataset:{},style:{}}}
  vm.runInNewContext(script,{document,localStorage:{getItem:()=>{throw new Error('blocked')}},window:{matchMedia:()=>({matches:true})}})
  assert.equal(document.documentElement.dataset.theme,'dark')
})
test('Dark charts adapt fills, labels, grid and tooltips without enabling animation',()=>{
  const data=[{label:'Assets',values:[1]}]
  const light=chartConfig('bar',['Monitor'],data,'light'),dark=chartConfig('bar',['Monitor'],data,'dark')
  assert.notEqual(dark.data.datasets[0].backgroundColor,light.data.datasets[0].backgroundColor)
  assert.notEqual(dark.options.scales.y.ticks.color,light.options.scales.y.ticks.color)
  assert.notEqual(dark.options.scales.y.grid.color,light.options.scales.y.grid.color)
  assert.notEqual(dark.options.plugins.tooltip.backgroundColor,light.options.plugins.tooltip.backgroundColor)
  assert.equal(dark.options.animation,false);assert.equal(dark.options.animations,false)
  assert.equal(chartColor('#800020','light'),'#800020')
})
