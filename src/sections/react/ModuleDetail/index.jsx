import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react'
import { useNavHeight } from '../../../hooks/useNavHeight.js'
import { usePending } from '../../../PendingContext.jsx'
import { requirePAT, saveFieldValue } from '../../../github.js'

const BASE = '/crm-data-dictionary/'

const LEVEL_BG    = { core: '#E6F1FB', custom: '#FFF3E0', integration: '#F3E5F5' }
const LEVEL_COLOR = { core: '#0C447C', custom: '#8B4500', integration: '#4A148C' }
const LEVEL_LABEL = { core: 'Core CRM', custom: 'Custom', integration: 'Integración' }

// ── PicklistPopup ────────────────────────────────────────────────────────────
function PicklistPopup({ values, anchorRect, onClose }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    const handler = e => {
      const el = document.getElementById('md-picklist-popup')
      if (el && !el.contains(e.target)) onClose()
    }
    document.addEventListener('click', handler)
    return () => { clearTimeout(t); document.removeEventListener('click', handler) }
  }, [onClose])

  const filtered = values.filter(v => (v.label ?? v.value ?? v).toString().toLowerCase().includes(search.toLowerCase()))

  return (
    <div id="md-picklist-popup" style={{
      position: 'fixed',
      top: anchorRect ? anchorRect.bottom + 4 : 100,
      left: anchorRect ? anchorRect.left : 100,
      zIndex: 9999, background: '#fff', border: '0.5px solid #ddd',
      borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      minWidth: 180, maxWidth: 280, maxHeight: 260, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', fontSize: 12,
    }}>
      <div style={{ padding: '6px 10px', borderBottom: '0.5px solid #eee', display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input ref={inputRef} type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: 12, width: '100%', color: '#333' }} />
      </div>
      <div style={{ overflowY: 'auto' }}>
        {filtered.length === 0
          ? <div style={{ padding: '8px 12px', color: '#aaa', fontStyle: 'italic' }}>Sin opciones</div>
          : filtered.map((v, i) => (
            <div key={i} style={{ padding: '5px 12px', borderBottom: '0.5px solid #f5f5f5', color: '#333' }}>{v.label ?? v.value ?? v}</div>
          ))
        }
      </div>
    </div>
  )
}

// ── BigQueryToggle ───────────────────────────────────────────────────────────
function BigQueryToggle({ field, moduleApi, onSave, changed, originalValue }) {
  const val = field.bigdata
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: changed ? '#fef3c7' : 'transparent', borderRadius: 4, padding: changed ? '1px 4px' : 0 }}>
      {val
        ? <span style={{ color: changed ? '#b45309' : '#4472C4', fontWeight: 600 }}>Sí</span>
        : <span style={{ color: changed ? '#b45309' : '#ccc', fontWeight: changed ? 600 : 400 }}>No</span>
      }
      <span className="edit-pencil" title={val ? 'Cambiar a No' : 'Cambiar a Sí'}
        style={{ opacity: .4, fontSize: 11, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
        onClick={e => { e.stopPropagation(); onSave(moduleApi, field.api_name, !val, originalValue) }}>✏️</span>
    </div>
  )
}

// ── UsageDescription ─────────────────────────────────────────────────────────
function UsageDescription({ field, moduleApi, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(field.uso || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setVal(field.uso || '') }, [field.uso])

  const save = async () => {
    setSaving(true)
    try { await onSave(moduleApi, field.api_name, val); setEditing(false) }
    catch (e) { alert('Error al guardar: ' + e.message) }
    finally { setSaving(false) }
  }

  if (editing) return (
    <div>
      <input className="edit-input" value={val} onChange={e => setVal(e.target.value)} autoFocus style={{ width: '100%', marginBottom: 4 }} />
      <div className="edit-actions">
        <button className="edit-save" onClick={save} disabled={saving}>{saving ? '...' : 'Guardar'}</button>
        <button className="edit-cancel" onClick={() => { setVal(field.uso || ''); setEditing(false) }}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
      {field.uso
        ? <span style={{ fontSize: 12, color: '#555' }}>{field.uso}</span>
        : <span style={{ color: '#ccc', fontStyle: 'italic' }}>pendiente</span>
      }
      <span className="desc-pencil edit-pencil" title="Editar descripción del campo"
        style={{ opacity: .4, fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
        onClick={e => { e.stopPropagation(); startTransition(() => setEditing(true)) }}>✏️</span>
    </div>
  )
}

// ── FieldModal ───────────────────────────────────────────────────────────────
function FieldModal({ field, fieldStats, onClose }) {
  if (!field) return null
  const pct = fieldStats?.modules?.[field._module]?.pct?.[field.api_name] ?? null
  const hasPicklist = (field.data_type === 'picklist' || field.data_type === 'multiselectpicklist') && field.pick_list_values?.length

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 520, width: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#1a1a1a' }}>{field.display_label || field.label || field.api_name}</h3>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#185FA5' }}>{field.api_name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 14 }}>
          <tbody>
            {[
              ['Tipo', field.data_type || '—'],
              ['Big Query', field.bigdata ? <span style={{ color: '#4472C4', fontWeight: 600 }}>Sí</span> : 'No'],
              ['Obligatorio', field.mandatory ? 'Sí' : 'No'],
              ['Custom', field.custom ? 'Sí' : 'No'],
              field.section && ['Sección', field.section],
              ['Creado', field.created_time ? field.created_time.slice(0, 10) : '—'],
              pct != null && ['% Uso', `${pct}%`],
            ].filter(Boolean).map(([label, val]) => (
              <tr key={label}>
                <td style={{ padding: '5px 0', color: '#888', width: '38%' }}>{label}</td>
                <td>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {field.uso && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4 }}>USO / DESCRIPCIÓN</div>
            <p style={{ margin: 0, color: '#333', fontSize: 13 }}>{field.uso}</p>
          </div>
        )}
        {field.description && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 4 }}>DESCRIPCIÓN ZOHO</div>
            <p style={{ margin: 0, color: '#555', fontSize: 12 }}>{field.description}</p>
          </div>
        )}
        {hasPicklist && (
          <div>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 6 }}>OPCIONES ({field.pick_list_values.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {field.pick_list_values.map((v, i) => (
                <span key={i} style={{ background: '#f0f4f8', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v.label ?? v.value ?? v}</span>
              ))}
            </div>
          </div>
        )}
        {field.profiles?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, marginBottom: 6 }}>PERMISOS POR PERFIL</div>
            {field.profiles.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                <span>{p.name}</span>
                <span style={{ color: p.permission === 'read_write' ? '#2e7d32' : '#888' }}>{p.permission}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ModuleDetail ─────────────────────────────────────────────────────────────
export default function ModuleDetail({ mod, onBack }) {
  const navH = useNavHeight()
  const [moduleInfo, setModuleInfo] = useState(null)
  const [fields, setFields] = useState([])
  const [fieldStats, setFieldStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bqFilter, setBqFilter] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [modalField, setModalField] = useState(null)
  const [picklist, setPicklist] = useState(null) // { values, rect }
  const [localFields, setLocalFields] = useState({}) // api_name -> overrides
  const [pendingBq, setPendingBq] = useState({}) // api_name -> value
  const { set: setPending } = usePending()
  const headerRef = useRef(null)
  const [theadTop, setTheadTop] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [modRes, fieldsRes] = await Promise.all([
          fetch(`${BASE}docs/modules/${mod}/module.json`).then(r => r.ok ? r.json() : null),
          fetch(`${BASE}docs/modules/${mod}/fields.json`).then(r => r.json()),
        ])
        if (!cancelled) {
          setModuleInfo(modRes)
          setFields(fieldsRes)
        }
        const statsRes = await fetch(`${BASE}docs/field_stats.json`)
        if (statsRes.ok) {
          const s = await statsRes.json()
          if (!cancelled) setFieldStats(s)
        }
      } catch (e) {
        console.error('Error cargando módulo:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [mod])

  useEffect(() => {
    window._filterDetail = val => setSearch(val.toLowerCase())
    return () => { delete window._filterDetail }
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    const ro = new ResizeObserver(() => {
      if (headerRef.current) {
        setTheadTop(headerRef.current.offsetHeight + (document.getElementById('main-header')?.offsetHeight ?? 0))
      }
    })
    ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [])

  const levelBg    = LEVEL_BG[moduleInfo?.level]    || '#eee'
  const levelColor = LEVEL_COLOR[moduleInfo?.level] || '#333'
  const levelLabel = LEVEL_LABEL[moduleInfo?.level] || moduleInfo?.level || ''

  const mergedFields = useMemo(() => fields.map(f => ({ ...f, ...(localFields[f.api_name] || {}) })), [fields, localFields])

  const visible = useMemo(() => mergedFields.filter(f => {
    if (bqFilter && !f.bigdata) return false
    if (dateFilter && (!f.created_time || f.created_time.slice(0, 7) !== dateFilter)) return false
    if (search && !`${f.api_name} ${f.display_label || ''} ${f.label || ''} ${f.data_type || ''} ${f.uso || ''}`.toLowerCase().includes(search)) return false
    return true
  }), [mergedFields, bqFilter, dateFilter, search])

  const months = useMemo(() => [...new Set(fields.map(f => f.created_time?.slice(0, 7)).filter(Boolean))].sort().reverse(), [fields])

  const handleBqSave = (moduleApi, apiName, newVal, originalVal) => {
    requirePAT(async () => {
      setLocalFields(prev => ({ ...prev, [apiName]: { ...prev[apiName], bigdata: newVal } }))
      setPending(moduleApi, apiName, 'bigdata', newVal, originalVal)
      try {
        await saveFieldValue(moduleApi, apiName, 'bigdata', newVal)
      } catch (e) {
        setLocalFields(prev => ({ ...prev, [apiName]: { ...prev[apiName], bigdata: originalVal } }))
        alert('Error al guardar: ' + e.message)
      }
    })
  }

  const handleUsoSave = async (moduleApi, apiName, newVal) => {
    setLocalFields(prev => ({ ...prev, [apiName]: { ...prev[apiName], uso: newVal } }))
    await saveFieldValue(moduleApi, apiName, 'uso', newVal)
  }

  function pctClass(pct) {
    if (pct == null) return 'grey'
    if (pct >= 70) return 'green'
    if (pct >= 30) return 'orange'
    return 'red'
  }

  const TH = { padding: '8px 12px', fontWeight: 600, fontSize: 12, color: '#fff', textAlign: 'left', position: 'sticky', top: theadTop, background: '#1B3A6B', zIndex: 8 }

  if (loading) return <div style={{ color: '#aaa', textAlign: 'center', padding: 60 }}>Cargando…</div>

  return (
    <div className="container mod-detail" style={{ paddingTop: 0, paddingBottom: 28 }}>
      {/* Module header */}
      <div ref={headerRef} className="mod-header" style={{ position: 'sticky', top: navH, zIndex: 10 }}>
        <div className="mod-header-body">
          <div className="mod-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2e75b6', fontSize: 12, padding: 0 }}>← Volver</button>
              {moduleInfo?.level && (
                <span style={{ background: levelBg, color: levelColor, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{levelLabel}</span>
              )}
            </div>
            <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: 18, fontWeight: 600 }}>{moduleInfo?.label || mod}</h2>
            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{mod}</div>
          </div>
          <div className="mod-header-controls">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {months.length > 0 && (
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', border: '0.5px solid #ddd', borderRadius: 6, background: '#fff' }}>
                  <option value="">Todas las fechas</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              <label className="bq-switch" title="Mostrar solo campos Big Query" onClick={() => setBqFilter(v => !v)}>
                <div className={`bq-switch-track${bqFilter ? ' on' : ''}`}><div className="bq-switch-thumb" /></div>
                Sólo Big Query
              </label>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{visible.length} campo(s)</div>
          </div>
        </div>
      </div>

      <table>
        <colgroup>
          <col /><col /><col /><col /><col /><col /><col /><col />
        </colgroup>
        <thead>
          <tr>
            <th style={TH}>Nombre</th>
            <th style={TH}>API Name</th>
            <th style={TH}>Tipo</th>
            <th style={TH}>Big Query</th>
            <th style={TH}>Req.</th>
            <th style={TH}>Custom</th>
            <th style={TH}>Uso / Descripción</th>
            <th style={TH}>% Uso</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((f, i) => {
            const pct = fieldStats?.modules?.[mod]?.pct?.[f.api_name] ?? null
            const isPicklist = (f.data_type === 'picklist' || f.data_type === 'multiselectpicklist') && f.pick_list_values?.length
            const originalBq = fields.find(x => x.api_name === f.api_name)?.bigdata ?? f.bigdata
            const bqChanged = f.bigdata !== originalBq

            return (
              <tr key={f.api_name} style={{ borderBottom: '0.5px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                onClick={() => setModalField({ ...f, _module: mod })}>
                <td style={{ padding: '8px 12px' }}>{f.display_label || f.label}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#185FA5' }}>{f.api_name}</td>
                <td style={{ padding: '8px 12px', fontSize: 12 }}>
                  {isPicklist
                    ? <span className="picklist-badge"
                        style={{ background: '#e8f0fb', color: '#1B3A6B', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); setPicklist({ values: f.pick_list_values, rect: e.currentTarget.getBoundingClientRect() }) }}>
                        {f.data_type} ▾
                      </span>
                    : <span style={{ fontSize: 12 }}>{f.data_type}</span>
                  }
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <BigQueryToggle field={f} moduleApi={mod} onSave={handleBqSave} changed={bqChanged} originalValue={originalBq} />
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12 }}>{f.mandatory ? 'Sí' : '—'}</td>
                <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12 }}>{f.custom ? 'Sí' : '—'}</td>
                <td style={{ padding: '8px 12px' }} onClick={e => e.stopPropagation()}>
                  <UsageDescription field={f} moduleApi={mod} onSave={handleUsoSave} />
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  {pct != null
                    ? <span className={`pct-circle ${pctClass(pct)}`}>{pct}%</span>
                    : <span style={{ color: '#ddd' }}>—</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {picklist && <PicklistPopup values={picklist.values} anchorRect={picklist.rect} onClose={() => setPicklist(null)} />}
      {modalField && <FieldModal field={modalField} fieldStats={fieldStats} onClose={() => setModalField(null)} />}
    </div>
  )
}
