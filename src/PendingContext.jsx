import React, { createContext, useContext, useState, useCallback } from 'react'

const PendingContext = createContext(null)

export function PendingProvider({ children }) {
  const [pending, setPending] = useState({})

  const set = useCallback((moduleApi, apiName, key, newValue, originalValue) => {
    const k = `${moduleApi}::${apiName}::${key}`
    setPending(prev => {
      if (newValue === originalValue) {
        const next = { ...prev }
        delete next[k]
        return next
      }
      return { ...prev, [k]: { moduleApi, apiName, key, newValue, originalValue } }
    })
  }, [])

  const clear = useCallback(() => setPending({}), [])

  const count = Object.keys(pending).length

  return (
    <PendingContext.Provider value={{ pending, set, count, clear }}>
      {children}
    </PendingContext.Provider>
  )
}

export function usePending() {
  return useContext(PendingContext)
}
