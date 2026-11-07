export const THEME_KEY='clam.theme'
export function themePreference(value){return ['light','dark'].includes(value)?value:'system'}
export function resolveTheme(preference,systemDark){return preference==='dark'||preference==='system'&&systemDark?'dark':'light'}
