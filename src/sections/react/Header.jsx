import React, { useState, useRef, useCallback, useEffect } from 'react'

const SECTIONS = [
  { id: 'dictionary', label: 'Data Dictionary' },
  { id: 'allfields',  label: 'Todos los Campos' },
  { id: 'functions',  label: 'Funciones' },
  { id: 'blueprints', label: 'Blueprints' },
  { id: 'workflows',  label: 'Workflows' },
  { id: 'processes',  label: 'Procesos' },
]

export default function Header({ crm, setCrm, section, setSection }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const inputRef = useRef(null)

  const doSearch = useCallback(val => {
    if (section === 'detail') {
      window._filterDetail?.(val)
    } else {
      window._doSearch?.(val)
    }
  }, [section])

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchVal('')
      setSearchOpen(false)
      doSearch('')
    } else {
      setSearchOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = e => {
    if (e.key === 'Escape') {
      setSearchVal('')
      setSearchOpen(false)
      doSearch('')
    }
  }

  // Reset search on section change
  useEffect(() => {
    setSearchVal('')
    setSearchOpen(false)
    doSearch('')
  }, [section]) // eslint-disable-line

  return (
    <header id="main-header">
      <div id="header-top">
        <div id="header-brand">
          <h1>Documentación CRM — UNIVERSAE</h1>
          <p>Zoho CRM · Referencia Funcional y Técnica</p>
        </div>
        {section !== 'processes' && (
          <div id="header-search" style={{ display: 'flex' }}>
            <button className="search-icon-btn" onClick={toggleSearch} title="Buscar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <input
              ref={inputRef}
              className={`detail-search${searchOpen ? ' open' : ''}`}
              type="text"
              placeholder="Buscar…"
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); doSearch(e.target.value.toLowerCase()) }}
              onKeyDown={handleKey}
            />
          </div>
        )}
      </div>
      <div id="crm-tabs">
        <button className={crm === 'ventas' ? 'active' : ''} onClick={() => setCrm('ventas')}>CRM Ventas</button>
        <button className={crm === 'tutores' ? 'active' : ''} onClick={() => setCrm('tutores')}>CRM Tutores / FCT</button>
      </div>
      <nav id="section-tabs">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={section === s.id || (section === 'detail' && s.id === 'dictionary') ? 'active' : ''}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
