import React, { useState, useEffect, useMemo } from 'react'
import { useNavHeight } from '../../hooks/useNavHeight.js'

const BASE = '/crm-data-dictionary/'

const TH = { padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#fff', textAlign: 'left', position: 'sticky', background: '#1B3A6B' }

export default function AllFields() {
  const [fields, setFields] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [usageFilter, setUsageFilter] = useState('all')
  const navH = useNavHeight()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        // Load all modules index first, then all fields
        const idxRes = await fetch(BASE + 'docs/modules/index.json')
        const idx = await idxRes.json()
        const allFields = []
        await Promise.all((idx.modules || []).filter(m => m.last_synced).map(async m => {
          try {
            const res = await fetch(`${BASE}docs/modules/${m.api_name}/fields.json`)
            const arr = await res.json()
            arr.forEach(f => allFields.push({ ...f, _module: m.api_name, _module_en_uso: m.en_uso !== false }))
          } catch {}
        }))
        if (!cancelled) setFields(allFields)
        try {
          const statsRes = await fetch(BASE + 'docs/field_stats.json')
          if (statsRes.ok) {
            const s = await statsRes.json()
            if (!cancelled) setStats(s)
          }
        } catch {}
      } catch (e) {
        console.error('Error cargando todos los campos:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    window._doSearch = val => setSearch(val.toLowerCase())
    return () => { delete window._doSearch }
  }, [])

  const modules = useMemo(() => [...new Set(fields.map(f => f._module))].sort(), [fields])
  const bqCount = useMemo(() => fields.filter(f => f.bigdata).length, [fields])

  const visible = useMemo(() => fields.filter(f => {
    if (usageFilter === 'uso' && !f._module_en_uso) return false
    if (usageFilter === 'sin-uso' && f._module_en_uso) return false
    if (moduleFilter && f._module !== moduleFilter) return false
    if (search && !`${f._module}::${f.api_name} ${f.display_label || ''} ${f.data_type || ''}`.toLowerCase().includes(search)) return false
    return true
  }), [fields, usageFilter, moduleFilter, search])

  function pctClass(pct) {
    if (pct == null) return 'grey'
    if (pct >= 70) return 'green'
    if (pct >= 30) return 'orange'
    return 'red'
  }

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: 28 }}>
      <div className="mod-header" style={{ position: 'sticky', top: navH, zIndex: 10, background: '#fff', borderBottom: '0.5px solid #e0e0e0', padding: '12px 96px' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: 18, fontWeight: 600 }}>Todos los Campos</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
              {fields.length} campos · {bqCount} en Big Query
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <option value="">Todos los módulos</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={usageFilter} onChange={e => setUsageFilter(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <option value="all">Todos</option>
              <option value="uso">En Uso</option>
              <option value="sin-uso">Sin Uso</option>
            </select>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{visible.length} resultado(s)</div>
      </div>

      {loading && <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Cargando campos…</div>}

      {!loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Módulo</th>
              <th style={TH}>Nombre</th>
              <th style={TH}>API Name</th>
              <th style={TH}>Tipo</th>
              <th style={TH}>BQ</th>
              <th style={TH}>Req.</th>
              <th style={TH}>Custom</th>
              <th style={TH}>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((f, i) => {
              const pct = stats?.modules?.[f._module]?.pct?.[f.api_name] ?? null
              return (
                <tr key={`${f._module}::${f.api_name}`} style={{ borderBottom: '0.5px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '6px 12px', color: '#888', fontSize: 11, fontFamily: 'monospace' }}>{f._module}</td>
                  <td style={{ padding: '6px 12px', fontWeight: 500 }}>{f.display_label || f.label}</td>
                  <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: 11, color: '#185FA5' }}>{f.api_name}</td>
                  <td style={{ padding: '6px 12px', color: '#555' }}>{f.data_type}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>{f.bigdata ? <span style={{ color: '#4472C4', fontWeight: 600 }}>Sí</span> : '—'}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>{f.mandatory ? 'Sí' : '—'}</td>
                  <td style={{ padding: '6px 12px', textAlign: 'center' }}>{f.custom ? 'Sí' : '—'}</td>
                  <td style={{ padding: '6px 12px', color: '#555' }}>
                    {f.uso || <span style={{ color: '#ccc', fontStyle: 'italic' }}>—</span>}
                    {pct != null && (
                      <span className={`pct-circle ${pctClass(pct)}`} style={{ float: 'right', width: 26, height: 26, fontSize: 9 }}>{pct}%</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
