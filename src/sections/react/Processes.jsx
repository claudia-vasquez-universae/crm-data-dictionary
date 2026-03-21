import React, { useState, useEffect } from 'react'
import { useNavHeight } from '../../hooks/useNavHeight.js'

const BASE = '/crm-data-dictionary/'
const SUB_HEADER_H = 49

function parseMarkdown(text) {
  const lines = text.split('\n')
  let html = ''
  let inList = false
  let inTable = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    // Images
    line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
      `<img src="docs/manual-usuario/${src}" alt="${alt}" style="max-width:100%;border:0.5px solid #e0e0e0;border-radius:6px;margin:12px 0;display:block">`)
    // Bold
    line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    if (/^---+$/.test(line.trim())) {
      if (inTable) { html += '</table>'; inTable = false }
      html += '<hr style="border:none;border-top:0.5px solid #e0e0e0;margin:24px 0">'
      continue
    }

    if (line.startsWith('|') && lines[i + 1] && /^\|[-| ]+\|$/.test(lines[i + 1].trim())) {
      if (inList) { html += '</ul>'; inList = false }
      if (!inTable) { html += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0">'; inTable = true }
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      html += '<tr>' + cells.map(c => `<th style="border:0.5px solid #ddd;padding:6px 10px;background:#f0f4f8;color:#1B3A6B;font-weight:600;text-align:left">${c}</th>`).join('') + '</tr>'
      i++ // skip separator
      continue
    }

    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      html += '<tr>' + cells.map(c => `<td style="border:0.5px solid #ddd;padding:6px 10px">${c}</td>`).join('') + '</tr>'
      continue
    }

    if (inTable) { html += '</table>'; inTable = false }

    if (line.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false } html += `<h3 style="color:#1B3A6B;font-size:15px;margin:18px 0 8px">${line.slice(4)}</h3>`; continue }
    if (line.startsWith('## '))  { if (inList) { html += '</ul>'; inList = false } html += `<h2 style="color:#1B3A6B;font-size:17px;margin:24px 0 10px">${line.slice(3)}</h2>`; continue }
    if (line.startsWith('# '))   { if (inList) { html += '</ul>'; inList = false } html += `<h1 style="color:#1B3A6B;font-size:20px;margin:28px 0 12px">${line.slice(2)}</h1>`; continue }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) { html += '<ul style="padding-left:20px;margin:8px 0">'; inList = true }
      html += `<li style="margin:4px 0">${line.slice(2)}</li>`
      continue
    }

    if (inList) { html += '</ul>'; inList = false }

    if (line.trim()) {
      html += `<p style="margin:8px 0">${line}</p>`
    }
  }
  if (inList) html += '</ul>'
  if (inTable) html += '</table>'
  return html
}

export default function Processes() {
  const navH = useNavHeight()
  const stickyTop = navH + SUB_HEADER_H
  const [index, setIndex] = useState(null)
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    fetch(BASE + 'docs/manual-usuario/index.json')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(setIndex)
      .catch(() => setIndex({ items: [] }))
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingContent(true)
    fetch(BASE + 'docs/manual-usuario/' + selected.file)
      .then(r => r.ok ? r.text() : '# Error\nNo se pudo cargar el contenido.')
      .then(text => { setContent(parseMarkdown(text)); setLoadingContent(false) })
      .catch(() => { setContent('<p style="color:#ef4444">Error al cargar el contenido.</p>'); setLoadingContent(false) })
  }, [selected])

  return (
    <div style={{ display: 'flex', height: `calc(100vh - ${navH}px)`, overflow: 'hidden' }}>
      {/* Sub-header */}
      <div style={{ position: 'absolute', top: navH, left: 0, right: 0, zIndex: 10, background: '#fff', borderBottom: '0.5px solid #e0e0e0', padding: '10px 96px', display: 'flex', alignItems: 'center', height: SUB_HEADER_H }}>
        <h2 style={{ margin: 0, color: '#1B3A6B', fontSize: 18, fontWeight: 600 }}>Procesos</h2>
      </div>

      {/* Sidebar */}
      <div style={{ width: 240, borderRight: '0.5px solid #e0e0e0', height: `calc(100vh - ${stickyTop}px)`, overflowY: 'auto', marginTop: SUB_HEADER_H, background: '#fafafa', flexShrink: 0 }}>
        {index?.items?.map((item, i) => (
          <div
            key={i}
            onClick={() => setSelected(item)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: 13,
              borderBottom: '0.5px solid #eee',
              background: selected?.file === item.file ? '#EAF3DE' : 'transparent',
              color: selected?.file === item.file ? '#1B3A6B' : '#333',
              fontWeight: selected?.file === item.file ? 600 : 400,
            }}
          >
            {item.title || item.file}
          </div>
        ))}
        {(!index || index.items?.length === 0) && (
          <div style={{ padding: 16, color: '#aaa', fontSize: 12 }}>Sin procesos disponibles</div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, height: `calc(100vh - ${stickyTop}px)`, overflowY: 'auto', marginTop: SUB_HEADER_H, padding: '24px 48px' }}>
        {selected ? (
          <>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ background: '#E6F1FB', border: '1px solid #b0c4de', color: '#1B3A6B', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 4, letterSpacing: '.04em' }}>
                ℹ️ La información es referencial
              </span>
            </div>
            {loadingContent
              ? <div style={{ color: '#aaa', padding: '20px 0' }}>Cargando…</div>
              : <div className="proc-body" dangerouslySetInnerHTML={{ __html: content }} />
            }
          </>
        ) : (
          <div style={{ color: '#aaa', textAlign: 'center', paddingTop: 80, fontSize: 14 }}>
            Selecciona un proceso del menú lateral
          </div>
        )}
      </div>
    </div>
  )
}
