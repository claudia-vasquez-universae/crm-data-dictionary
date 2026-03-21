import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavHeight } from '../../hooks/useNavHeight.js'
import { requirePAT } from '../../github.js'

const BASE = '/crm-data-dictionary/'

const LEVEL_BG    = { core: '#E6F1FB', custom: '#FFF3E0', integration: '#F3E5F5' }
const LEVEL_COLOR = { core: '#0C447C', custom: '#8B4500', integration: '#4A148C' }
const LEVEL_LABEL = { core: 'Core CRM', custom: 'Custom', integration: 'Integración' }

function ModCard({ mod, onOpenModule }) {
  const [descOpen, setDescOpen] = useState(false)
  const isInactivo = mod.en_uso === false
  const notSynced = mod.sync && !mod.last_synced
  const hasDetail = !isInactivo && mod.last_synced

  const levelBg    = LEVEL_BG[mod.level]    || '#eee'
  const levelColor = LEVEL_COLOR[mod.level] || '#333'
  const levelLabel = LEVEL_LABEL[mod.level] || mod.level || ''
  const desc = mod.description_negocio || ''

  const handlePencil = e => {
    e.stopPropagation()
    requirePAT(notSynced
      ? () => activateModule(mod.api_name, !!mod.sync)
      : () => deactivateModule(mod.api_name, isInactivo)
    )
  }

  const cardStyle = {
    cursor: hasDetail ? 'pointer' : 'default',
    border: '0.5px solid #e0e0e0',
    borderRadius: 10,
    padding: '10px 12px',
    background: isInactivo ? '#fafafa' : 'white',
    opacity: isInactivo ? 0.6 : 1,
    transition: 'box-shadow 0.15s',
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={e => { if (hasDetail) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { if (hasDetail) e.currentTarget.style.boxShadow = 'none' }}
      onClick={() => { if (hasDetail) onOpenModule(mod.api_name) }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ background: levelBg, color: levelColor, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
          {levelLabel}
        </span>
        {isInactivo && <span className="sin-uso-badge">Sin Uso</span>}
        {!isInactivo && !mod.last_synced && (
          <span style={{ fontSize: 11, color: '#888', background: '#e8e8e8', padding: '1px 6px', borderRadius: 4 }}>Not Synced</span>
        )}
        {!isInactivo && mod.last_synced && (
          <span style={{ fontSize: 11, color: '#27500A', background: '#EAF3DE', padding: '1px 6px', borderRadius: 4 }}>
            ✓ {mod.total_fields || 0} campos
          </span>
        )}
        {mod.bigdata && (
          <span title="Usado en Big Data" style={{ fontSize: 10, color: '#1a5276', background: '#d6eaf8', padding: '1px 5px', borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            📊 Big Query
          </span>
        )}
        <span className="card-pencil" title="Editar estado del módulo" style={{ display: 'inline-block', cursor: 'pointer' }} onClick={handlePencil}>✏️</span>
      </div>
      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{mod.label || mod.api_name}</div>
      <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', marginBottom: 6 }}>
        <span style={{ color: '#bbb', fontSize: 10 }}>Api Name: </span>{mod.api_name}
      </div>
      {desc && (
        <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          {desc.length > 60
            ? descOpen
              ? <>{desc} <span onClick={e => { e.stopPropagation(); setDescOpen(false) }} style={{ color: '#2e75b6', cursor: 'pointer' }}>menos</span></>
              : <>{desc.slice(0, 60)}… <span onClick={e => { e.stopPropagation(); setDescOpen(true) }} style={{ color: '#2e75b6', cursor: 'pointer' }}>más</span></>
            : desc
          }
        </div>
      )}
    </div>
  )
}

// Placeholder helpers — real implementations would call GitHub API
function activateModule(apiName) { alert(`Activar módulo: ${apiName} (requiere implementación)`) }
function deactivateModule(apiName) { alert(`Desactivar módulo: ${apiName} (requiere implementación)`) }

export default function ModuleList({ crm, onOpenModule }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [bqOnly, setBqOnly] = useState(false)
  const [search, setSearch] = useState('')
  const navH = useNavHeight()
  const headerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(BASE + 'docs/modules/index.json')
        const data = await res.json()
        if (!cancelled) setModules(data.modules || [])
      } catch (e) {
        console.warn('No se pudo cargar index.json', e)
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

  const totalFields = useMemo(() => modules.reduce((s, m) => s + (m.total_fields || 0), 0), [modules])
  const totalBq     = useMemo(() => modules.reduce((s, m) => s + (m.bq_fields || 0), 0), [modules])

  const visible = useMemo(() => {
    const active   = modules.filter(m => m.en_uso !== false)
    const inactive = modules.filter(m => m.en_uso === false)
    return [...active, ...inactive].filter(m => {
      const isInact = m.en_uso === false
      if (filter === 'en-uso' && isInact) return false
      if (filter === 'sin-uso' && !isInact) return false
      if (bqOnly && !m.bigdata) return false
      if (search && !`${m.label || ''} ${m.api_name} ${m.description_negocio || ''}`.toLowerCase().includes(search)) return false
      return true
    })
  }, [modules, filter, bqOnly, search])

  return (
    <div id="section-dictionary">
      <div
        ref={headerRef}
        className="mod-header"
        style={{ position: 'sticky', top: navH, zIndex: 10, background: '#fff', borderBottom: '0.5px solid #e0e0e0', padding: '12px 96px' }}
      >
        <div className="stats">
          <div className="stat"><b>{modules.length}</b><span>Módulos</span></div>
          <div className="stat"><b>{totalFields}</b><span>Campos Totales</span></div>
          <div className="stat"><b>{totalBq}</b><span>Campos en Big Query</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
          <div className="filter-btns" style={{ marginBottom: 0 }}>
            {[{ value: 'all', label: 'Todos' }, { value: 'en-uso', label: 'En Uso' }, { value: 'sin-uso', label: 'Sin Uso' }].map(f => (
              <button key={f.value} className={`filter-btn${filter === f.value ? ' active' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>
            ))}
          </div>
          <label className="bq-switch" title="Mostrar solo módulos Big Query" style={{ cursor: 'pointer' }} onClick={() => setBqOnly(v => !v)}>
            <div className={`bq-switch-track${bqOnly ? ' on' : ''}`}>
              <div className="bq-switch-thumb" />
            </div>
            Sólo Big Query
          </label>
        </div>
      </div>
      {loading
        ? <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>Cargando módulos…</div>
        : (
          <div style={{ padding: '20px 96px 28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {visible.map(m => <ModCard key={m.api_name} mod={m} onOpenModule={onOpenModule} />)}
            </div>
          </div>
        )
      }
    </div>
  )
}
