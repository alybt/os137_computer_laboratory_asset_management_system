export const SOLID_COLORS = ['#800020','#347969','#4d7399','#b17b35','#79658e','#697586','#b56d7d']
export const STATUS_COLORS = {available:'#347969',assigned:'#4d7399',maintenance:'#b17b35',retired:'#697586',lost:'#aa4545'}
export function validSeries(labels, series) {
  return Array.isArray(labels) && labels.length>0 && Array.isArray(series) && series.length>0 && series.every(item=>Array.isArray(item.values) && item.values.length===labels.length && item.values.every(value=>Number.isFinite(Number(value)) && value!==null && Number(value)>=0))
}
const DARK_COLORS={'#800020':'#e097b0','#347969':'#7ac5ab','#4d7399':'#94bbdf','#b17b35':'#d8b06d','#79658e':'#bda5d2','#697586':'#a4b4c9','#b56d7d':'#dfa0b0','#aa4545':'#e58e98','#a16b3e':'#d5a77e'}
export function chartColor(color,theme='light'){return theme==='dark'?(DARK_COLORS[String(color).toLowerCase()] || color):color}
export function chartConfig(kind, labels, series, theme='light') {
  const doughnut=kind==='doughnut', horizontal=kind==='horizontal', dark=theme==='dark'
  const ink=dark?'#c5d2e3':'#516075', grid=dark?'#3b485a':'#edf0f4'
  const colors=value=>Array.isArray(value)?value.map(color=>chartColor(color,theme)):chartColor(value,theme)
  return {
    type:doughnut?'doughnut':kind==='line'?'line':'bar',
    data:{ labels, datasets:series.map((item,index)=>({
      label:item.label,data:item.values.map(Number),
      backgroundColor:colors(doughnut?labels.map((_,i)=>item.colors?.[i] || SOLID_COLORS[i%SOLID_COLORS.length]):item.colors || SOLID_COLORS[index%SOLID_COLORS.length]),
      borderColor:kind==='line'?chartColor(SOLID_COLORS[index%SOLID_COLORS.length],theme):doughnut?(dark?'#202936':'#ffffff'):chartColor(SOLID_COLORS[index%SOLID_COLORS.length],theme),
      borderWidth:kind==='line'?2:doughnut?3:0,
      borderRadius:doughnut||kind==='line'?0:4,
      maxBarThickness:horizontal?26:30,
      pointRadius:kind==='line'?3:0,pointHoverRadius:kind==='line'?5:0,
      tension:0,fill:false,hoverOffset:0,
    }))},
    options:{responsive:true,maintainAspectRatio:false,animation:false,animations:false,
      transitions:{active:{animation:{duration:0}},resize:{animation:{duration:0}}},
      indexAxis:horizontal?'y':'x',cutout:doughnut?'74%':undefined,
      interaction:{mode:doughnut?'nearest':'index',intersect:doughnut},
      plugins:{legend:{display:false},tooltip:{enabled:true,displayColors:true,backgroundColor:dark?'#303b4b':'#252a35',titleColor:'#fff',bodyColor:'#fff',borderColor:dark?'#64748b':'#252a35',borderWidth:1,padding:11,cornerRadius:8}},
      scales:doughnut?{}:{
        x:{beginAtZero:horizontal,grid:{display:horizontal,color:grid},border:{display:false},ticks:{color:ink,font:{size:11},precision:0,maxRotation:0,autoSkip:!horizontal}},
        y:{beginAtZero:!horizontal,grid:{display:!horizontal,color:grid},border:{display:false},ticks:{color:ink,font:{size:12},precision:0}},
      },
    },
  }
}
