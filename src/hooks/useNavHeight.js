import { useState, useEffect } from 'react'

/**
 * Returns the current offsetHeight of #main-header,
 * updating via ResizeObserver whenever it changes.
 */
export function useNavHeight() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const el = document.getElementById('main-header')
    if (!el) return
    setHeight(el.offsetHeight)
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return height
}
