import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavHeight } from '../../hooks/useNavHeight.js'

const BASE = '/crm-data-dictionary/'

const CATEGORY_COLORS = {
  'Leads': '#6366f1',
  'Contactos': '#0ea5e9',
  'Cuentas': '#10b981',
  'Oportunidades': '#f59e0b',
  'Actividades': '#ef4444',
  'Sync': '#8b5cf6',
  'Utils': '#64748b',
}

function flagBadge(color, label) {
  return { display: 'inline-block', background: color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, marginRight: 3, whiteSpace: 'nowrap' }
}

const TH = { padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#fff', textAlign: 'left' }

export default function Functions() {
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expanded, setExpanded] = useState(null)
  const navH = useNavHeight()
  const headerRef = useRef(null)
  const [theadTop, setTheadTop] = useState(0)

  useEffect(() => {
    fetch(BASE + 'docs/functions_index.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ functions: [], error: true }))
  }, [])

  useEffect(() => {
    window._doSearch = val => setSearch(val.toLowerCase())
    return () => { delete window._doSearch }
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    const ro = new ResizeObserver(() => {
      if (headerRef.current) {
        setTheadTop(headerRef.current.offsetHeight + (document.getElementById('main-header')?.offsetHeight ?? 0) + 12)
      }
    })
    ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [])

  const categories = useMemo(() => data ? [...new Set(data.functions.map(f => f.category))].sort() : [], [data])

  const visible = useMemo(() => {
    if (!data) return []
    return data.functions.filter(f => {
      if (statusFilter === 'active' && f.skip) return false
      if (statusFilter === 'inactive' && (f.skip || !f.inactive)) return false
      if (statusFilter === 'skip' && !f.skip) return false
      if (categoryFilter && f.category !== categoryFilter) return false
      if (search) {
        const flags = [f.associated && 'asociado', f.auth, f.file && 'sync', f.inactive && 'sin uso'].filter(Boolean).join(' ').toLowerCase()
        return (
          f.display_name?.toLowerCase().includes(search) ||
          f.api_name?.toLowerCase().includes(search) ||
          f.description?.toLowerCase().includes(search) ||
          f.category?.toLowerCase().includes(search) ||
          flags.includes(search)
        )
      }
      return true
    })
  }, [data, statusFilter, categoryFilter, search])

  if (!data) return <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Cargando funciones…</div>
  if (data.error) return <div style={{ padding: 40, color: '#ef4444' }}>Error: no se pudo cargar docs/functions_index.json</div>

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: 28 }}>
      <div
        ref={headerRef}
        className="mod-header"
        style={{ position: 'sticky', top: navH, zIndex: 10, background: '#fff', borderBottom: '0.5px solid #e0e0e0', padding: '12px 96px' }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: 18, fontWeight: 600 }}>Funciones Deluge</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
              {data.active} activas · {data.skipped} omitidas · {data.total} total
              {data.generated_at && ` · actualizado ${new Date(data.generated_at).toLocaleDateString('es-ES')}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <option value="active">Activas ({data.active})</option>
              <option value="inactive">Sin ejecuciones 30d</option>
              <option value="skip">Omitidas ({data.skipped})</option>
              <option value="all">Todas ({data.total})</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{visible.length} resultado(s)</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <colgroup>
          <col style={{ width: '25%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '1%' }} />
          <col style={{ width: '1%' }} />
          <col />
        </colgroup>
        <thead style={{ position: 'sticky', top: theadTop, zIndex: 9, background: '#1B3A6B' }}>
          <tr style={{ textAlign: 'left' }}>
            <th style={TH}>Nombre</th>
            <th style={TH}>API Name</th>
            <th style={{ ...TH, whiteSpace: 'nowrap' }}>Categoría</th>
            <th style={{ ...TH, whiteSpace: 'nowrap' }}>Flags</th>
            <th style={TH}>Descripción</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((fn, i) => (
            <React.Fragment key={fn.api_name || i}>
              <tr
                onClick={() => setExpanded(expanded === i ? null : i)}
                style={{ borderBottom: '0.5px solid #eee', cursor: 'pointer', background: fn.skip ? '#fef9f0' : i % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <td style={{ padding: '8px 12px', fontWeight: 500, color: fn.skip ? '#94a3b8' : '#1B3A6B', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {fn.skip && <span style={{ color: '#f59e0b', marginRight: 4 }}>⊘</span>}
                  {fn.display_name}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#555', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {fn.api_name ?? <span style={{ color: '#ccc' }}>pendiente</span>}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{ background: CATEGORY_COLORS[fn.category] ?? '#e2e8f0', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fn.category}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {fn.associated && <span style={flagBadge('#6366f1', 'Asociado')}>Asociado</span>}
                  {fn.auth && <span style={flagBadge('#0ea5e9', fn.auth)}>{fn.auth}</span>}
                  {fn.file && <span style={flagBadge('#10b981', '✓ Sync')}>✓ Sync</span>}
                  {fn.inactive && <span style={flagBadge('#94a3b8', 'Sin uso')}>Sin uso</span>}
                </td>
                <td style={{ padding: '8px 12px', color: '#555', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {fn.description || <span style={{ color: '#ccc' }}>—</span>}
                </td>
              </tr>
              {expanded === i && fn.detail && (
                <tr>
                  <td colSpan={5} style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0' }}>
                    <pre style={{ fontSize: 11, color: '#555', whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0 }}>{fn.detail}</pre>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
