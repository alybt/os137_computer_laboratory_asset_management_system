import {Moon,Sun} from 'lucide-react'
import {useTheme} from '../context/ThemeContext'
export default function ThemeToggle(){
  const {theme,preference,setPreference}=useTheme()
  return <div className="theme-controls">
    <button type="button" role="switch" aria-checked={theme==='dark'} aria-label="Dark mode" className="btn-secondary !gap-2 !px-3 !py-2" onClick={()=>setPreference(theme==='dark'?'light':'dark')}>
      {theme==='dark'?<Moon size={16}/>:<Sun size={16}/>}<span>Dark mode</span>
    </button>
    <button type="button" className="theme-auto" aria-label="Follow operating system theme" aria-pressed={preference==='system'} title="Follow operating system theme" onClick={()=>setPreference('system')}>Auto</button>
  </div>
}
