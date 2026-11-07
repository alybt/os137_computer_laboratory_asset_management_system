// Runs synchronously before CSS/app rendering; no credentials or application records stored.
(() => {
  let preference='system'
  try { const saved=localStorage.getItem('clam.theme'); if(saved==='light'||saved==='dark')preference=saved } catch { /* OS preference still works. */ }
  const dark=preference==='dark'||preference==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme=dark?'dark':'light'
  document.documentElement.style.colorScheme=dark?'dark':'light'
})()
