import React, { useState, useEffect, useRef } from 'react'
import { useNavHeight } from '../../hooks/useNavHeight.js'

const BASE = '/crm-data-dictionary/'

export default function Blueprints() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const navH = useNavHeight()

  useEffect(() => {
    fetch(BASE + 'docs/blueprints/index.json')
      .then(r => r.ok ? r.json() : { blueprints: [] })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setData({ blueprints: [] }); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: '#aaa', textAlign: 'center', padding: 60 }}>Cargando blueprints…</div>

  if (!data?.blueprints?.length) return (
    <div className="coming-soon">
      <h2>Blueprints</h2>
      <p>No hay blueprints sincronizados aún.</p>
    </div>
  )

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: 28 }}>
      <div className="mod-header" style={{ position: 'sticky', top: navH, zIndex: 10, background: '#fff', borderBottom: '0.5px solid #e0e0e0', padding: '12px 96px', marginBottom: 0 }}>
        <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: 18, fontWeight: 600 }}>Blueprints</h2>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 12 }}>{data.blueprints.length} blueprint(s)</p>
      </div>
      <div style={{ padding: '20px 96px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {data.blueprints.map((bp, i) => (
          <div key={i} style={{ border: '0.5px solid #e0e0e0', borderRadius: 10, padding: '12px 16px', background: '#fff', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            onClick={() => setSelected(bp)}>
            <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, color: '#1B3A6B' }}>{bp.name}</div>
            <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>{bp.module}</div>
            {bp.transitions && <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{bp.transitions} transición(es)</div>}
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 560, width: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#1a1a1a' }}>{selected.name}</h3>
                <div style={{ fontSize: 12, color: '#888' }}>{selected.module}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa' }}>×</button>
            </div>
            <pre style={{ fontSize: 12, background: '#f8fafc', borderRadius: 6, padding: 16, overflowX: 'auto', color: '#333' }}>
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
