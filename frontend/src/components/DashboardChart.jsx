import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'
import { chartConfig, validSeries, SOLID_COLORS, chartColor } from '../lib/chartConfig'

import {useTheme} from '../context/ThemeContext'
import ChartMessage from './ChartMessage'

export default function DashboardChart({kind='bar',labels,series,title,emptyLabel='No recorded activity in this period.',totalLabel='Registered assets'}) {
  const canvas=useRef(null)
  const {theme}=useTheme()
  const valid=validSeries(labels,series)
  const total=valid?series.reduce((sum,item)=>sum+item.values.reduce((n,value)=>n+Number(value),0),0):0
  const hasValues=valid && total>0
  useEffect(()=>{
    if(!hasValues || !canvas.current)return undefined
    const chart=new Chart(canvas.current,chartConfig(kind,labels,series,theme))
    return ()=>chart.destroy()
  },[kind,labels,series,hasValues,theme])
  if(!valid)return <ChartMessage error>Chart data is unavailable.</ChartMessage>
  if(!hasValues)return <ChartMessage>{emptyLabel}</ChartMessage>
  const donut=kind==='doughnut'
  return <div className="chart-body">
    {!donut && series.length>1 && <ul className="chart-legend" aria-label={`${title} legend`}>{series.map((item,i)=><li key={item.label}><span className="chart-key" style={{backgroundColor:chartColor(SOLID_COLORS[i%SOLID_COLORS.length],theme)}}/>{item.label}</li>)}</ul>}
    <div className={donut?'status-chart':''}>
      <div className={donut?'doughnut-wrap':'chart-canvas'}>
        <canvas ref={canvas} role="img" aria-label={`${title}. Exact values are available in the data table below.`}/>
        {donut && <div className="doughnut-total"><strong>{total}</strong><span>{totalLabel}</span></div>}
      </div>
      {donut && <ul className="status-legend" aria-label="Status legend">{labels.map((label,i)=><li key={label}><span><span className="chart-key" style={{backgroundColor:chartColor(series[0].colors?.[i] || SOLID_COLORS[i%SOLID_COLORS.length],theme)}}/>{label}</span><strong>{series[0].values[i]}</strong></li>)}</ul>}
    </div>
    <details className="chart-data"><summary>View chart data</summary><div className="overflow-x-auto"><table><caption className="sr-only">{title}</caption><thead><tr><th scope="col">{donut?'Status':'Label'}</th>{series.map(item=><th scope="col" key={item.label}>{item.label}</th>)}</tr></thead><tbody>{labels.map((label,i)=><tr key={`${label}-${i}`}><th scope="row">{label}</th>{series.map(item=><td key={item.label}>{item.values[i]}</td>)}</tr>)}</tbody></table></div></details>
  </div>
}
