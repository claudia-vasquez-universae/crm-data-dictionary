import React, { useState, useEffect, lazy, Suspense } from 'react'
import { PendingProvider } from './PendingContext.jsx'
import Header from './sections/react/Header.jsx'
import ModuleList from './sections/react/ModuleList.jsx'
import AllFields from './sections/react/AllFields.jsx'
import Functions from './sections/react/Functions.jsx'
import Workflows from './sections/react/Workflows.jsx'
import Processes from './sections/react/Processes.jsx'
import { savePAT, closePATModal } from './github.js'

const ModuleDetail = lazy(() => import('./sections/react/ModuleDetail/index.jsx'))
const Blueprints = lazy(() => import('./sections/react/Blueprints.jsx'))

export default function App() {
  const [section, setSection] = useState('dictionary')
  const [crm, setCrm] = useState('ventas')
  const [openModule, setOpenModule] = useState(null)

  useEffect(() => {
    const btnSave = document.getElementById('btn-save-pat')
    const btnClose = document.getElementById('btn-close-pat')
    btnSave?.addEventListener('click', savePAT)
    btnClose?.addEventListener('click', closePATModal)
    return () => {
      btnSave?.removeEventListener('click', savePAT)
      btnClose?.removeEventListener('click', closePATModal)
    }
  }, [])

  return (
    <PendingProvider>
      <div id="app-root">
        <Header crm={crm} setCrm={setCrm} section={section} setSection={setSection} />
        <main>
          {crm === 'tutores' ? (
            <div className="coming-soon">
              <h2>Próximamente</h2>
              <p>La documentación del CRM Tutores / FCT estará disponible próximamente.</p>
            </div>
          ) : (
            <>
              {section === 'dictionary' && (
                <ModuleList crm={crm} onOpenModule={mod => { setOpenModule(mod); setSection('detail') }} />
              )}
              {section === 'detail' && openModule && (
                <Suspense fallback={null}>
                  <ModuleDetail mod={openModule} onBack={() => setSection('dictionary')} />
                </Suspense>
              )}
              {section === 'allfields' && <AllFields />}
              {section === 'functions' && <Functions />}
              {section === 'blueprints' && (
                <Suspense fallback={null}>
                  <Blueprints />
                </Suspense>
              )}
              {section === 'workflows' && <Workflows />}
              {section === 'processes' && <Processes />}
            </>
          )}
        </main>
      </div>
    </PendingProvider>
  )
}
