import {createContext,useContext,useState,useEffect,useCallback,useMemo} from 'react'
import {THEME_KEY,themePreference,resolveTheme} from '../lib/theme'
const ThemeContext=createContext(null)
function savedPreference(){try{return themePreference(localStorage.getItem(THEME_KEY))}catch{return 'system'}}
function apply(theme){document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}
export function ThemeProvider({children}){
  const [preference,setPreferenceState]=useState(savedPreference)
  const [theme,setThemeState]=useState(()=>document.documentElement.dataset.theme||resolveTheme(savedPreference(),matchMedia('(prefers-color-scheme: dark)').matches))
  const setPreference=useCallback(value=>{
    const next=themePreference(value),resolved=resolveTheme(next,matchMedia('(prefers-color-scheme: dark)').matches)
    try{if(next==='system')localStorage.removeItem(THEME_KEY);else localStorage.setItem(THEME_KEY,next)}catch{/* Preference remains active for this visit. */}
    apply(resolved);setPreferenceState(next);setThemeState(resolved)
  },[])
  useEffect(()=>{
    const media=matchMedia('(prefers-color-scheme: dark)')
    const osChanged=()=>{if(preference==='system'){const resolved=resolveTheme('system',media.matches);apply(resolved);setThemeState(resolved)}}
    const storageChanged=event=>{if(event.key===THEME_KEY||event.key===null){const next=savedPreference(),resolved=resolveTheme(next,media.matches);apply(resolved);setPreferenceState(next);setThemeState(resolved)}}
    media.addEventListener('change',osChanged);window.addEventListener('storage',storageChanged)
    return()=>{media.removeEventListener('change',osChanged);window.removeEventListener('storage',storageChanged)}
  },[preference])
  const value=useMemo(()=>({theme,preference,setPreference}),[theme,preference,setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export function useTheme(){const value=useContext(ThemeContext);if(!value)throw new Error('ThemeProvider required');return value}
