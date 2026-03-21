import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavHeight } from '../../hooks/useNavHeight.js'

const BASE = '/crm-data-dictionary/'

const TRIGGER_LABELS = {
  create: 'Creación',
  edit: 'Edición',
  create_or_edit: 'Creación o edición',
  delete: 'Eliminación',
  field_update: 'Actualización de campo',
  date_or_datetime: 'Fecha / Hora',
  anyaction: 'Cualquier acción',
  reschedule: 'Reprogramación',
  scheduled_call_createedit: 'Llamada programada',
  incoming_call_createedit: 'Llamada entrante',
  mail_sent_bounced: 'Email rebotado',
}

const ACTION_LABELS = {
  functions: 'Función',
  email: 'Email',
  webhook: 'Webhook',
  task: 'Tarea',
  field_update: 'Actualizar campo',
}

const ACTION_ICONS = {
  functions: '⚡',
  field_updates: '✏️',
  email: '✉️',
  webhook: '🔗',
  task: '📋',
}

const COMPARATORS = {
  equal: '=', not_equal: '≠', less_than: '<', greater_than: '>',
  less_or_equal: '≤', greater_or_equal: '≥',
  contains: 'contiene', not_contains: 'no contiene',
  starts_with: 'empieza por', is_empty: 'está vacío', is_not_empty: 'no está vacío',
}

function WorkflowModal({ wf, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!wf) return
    setLoading(true)
    fetch(`${BASE}docs/workflows_detail/${wf.id}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDetail(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [wf?.id])

  if (!wf) return null

  const actions = detail?.actions || {}
  const criteria = detail?.criteria

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 600, width: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#1a1a1a' }}>{wf.name}</h3>
            <div style={{ fontSize: 12, color: '#888' }}>{wf.module} · {TRIGGER_LABELS[wf.execute_when] || wf.execute_when}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>

        {loading && <div style={{ color: '#aaa', padding: '20px 0' }}>Cargando detalles…</div>}

        {!loading && criteria && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 6 }}>CONDICIONES</div>
            {criteria.conditions?.map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: '#333', padding: '3px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                <span style={{ color: '#1B3A6B', fontWeight: 500 }}>{c.field?.display_label || c.field?.api_name}</span>
                {' '}<span style={{ color: '#888' }}>{COMPARATORS[c.comparator] || c.comparator}</span>
                {c.value !== undefined && <> <span>"{c.value}"</span></>}
              </div>
            ))}
          </div>
        )}

        {!loading && Object.keys(actions).length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 8 }}>ACCIONES</div>
            {Object.entries(actions).map(([type, list]) =>
              Array.isArray(list) && list.map((a, i) => (
                <div key={`${type}-${i}`} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f0f0f0', alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{ACTION_ICONS[type] || '•'}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{ACTION_LABELS[type] || type}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && !criteria && Object.keys(actions).length === 0 && (
          <div style={{ color: '#aaa', fontSize: 13 }}>No hay detalles disponibles para este workflow.</div>
        )}
      </div>
    </div>
  )
}

export default function Workflows() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const navH = useNavHeight()
  const headerRef = useRef(null)
  const [theadTop, setTheadTop] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(BASE + 'docs/workflows.json')
        const d = await res.json()
        if (!cancelled) setData(d)
      } catch (e) {
        console.error('Error cargando workflows:', e)
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

  const modules = useMemo(() => data ? [...new Set(data.workflows.map(w => w.module))].sort() : [], [data])
  const triggers = useMemo(() => data ? [...new Set(data.workflows.map(w => w.execute_when))].sort() : [], [data])

  const visible = useMemo(() => {
    if (!data) return []
    return data.workflows.filter(w => {
      if (moduleFilter && w.module !== moduleFilter) return false
      if (triggerFilter && w.execute_when !== triggerFilter) return false
      if (search && !`${w.name} ${w.module}`.toLowerCase().includes(search)) return false
      return true
    })
  }, [data, moduleFilter, triggerFilter, search])

  const TH = { padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#fff', textAlign: 'left', position: 'sticky', top: theadTop, background: '#1B3A6B' }

  const syncDate = data?.generated_at
    ? `sincronizado ${new Date(data.generated_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : null

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: 28 }}>
      <div
        ref={headerRef}
        className="mod-header"
        style={{ position: 'sticky', top: navH, zIndex: 10, background: '#fff', borderBottom: '0.5px solid #e0e0e0', padding: '12px 96px' }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: 18, fontWeight: 600 }}>Workflows</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>
              {data ? `${data.active ?? ''} activos · ${data.total ?? ''} total` : 'Cargando…'}
              {syncDate && ` · ${syncDate}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <option value="">Todos los módulos</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
              <option value="">Todos los triggers</option>
              {triggers.map(t => <option key={t} value={t}>{TRIGGER_LABELS[t] || t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{visible.length} resultado(s)</div>
      </div>

      {loading && <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Cargando workflows…</div>}

      {!loading && data && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '20%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th style={TH}>Nombre</th>
              <th style={TH}>Módulo</th>
              <th style={TH}>Trigger</th>
              <th style={TH}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((wf, i) => (
              <tr
                key={wf.id}
                onClick={() => setSelected(wf)}
                style={{ borderBottom: '0.5px solid #eee', cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1B3A6B' }}>{wf.name}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: '#555' }}>{wf.module}</td>
                <td style={{ padding: '8px 12px', fontSize: 12 }}>{TRIGGER_LABELS[wf.execute_when] || wf.execute_when}</td>
                <td style={{ padding: '8px 12px', fontSize: 12, color: '#888' }}>
                  {wf.actions_count ? `${wf.actions_count} acción(es)` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && <WorkflowModal wf={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
