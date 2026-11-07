import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await api.get('/auth/me')
      setUser(me)
      return me
    } catch {
      setToken(null)
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('labassets:unauthorized', onUnauthorized)
    return () =>
      window.removeEventListener('labassets:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout', {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      logout,
      refresh,
      isAdmin: user?.role === 'super_admin',
      canManageLoans: user?.role === 'super_admin',
      canManageMaintenance: user?.role === 'super_admin',
      canManageLabs: user?.role === 'super_admin',
      canWrite: user?.role === 'super_admin' || user?.role === 'property_admin',
    }),
    [user, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
