import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Carregando from './components/Carregando'
import PublicLayout from './public/PublicLayout'
import Inicio from './public/Inicio'
import Marcar from './public/Marcar'
import LinkPessoal from './public/LinkPessoal'
import NaoEncontrado from './public/NaoEncontrado'

// O painel é um bundle à parte (Arquitetura 3.1, decisão 1).
const AdminApp = lazy(() => import('./admin/AdminApp'))
// Só em desenvolvimento: pré-visualização do design da área pública (6.0).
const DesignPreview = import.meta.env.DEV ? lazy(() => import('./public/DesignPreview')) : null

export default function App() {
  return (
    <Routes>
      {/* Zona pública + link pessoal */}
      <Route element={<PublicLayout />}>
        <Route index element={<Inicio />} />
        <Route path="marcar" element={<Marcar />} />
        <Route path="m/:token" element={<LinkPessoal />} />
        {DesignPreview && (
          <Route path="design" element={<Suspense fallback={<Carregando />}><DesignPreview /></Suspense>} />
        )}
        <Route path="*" element={<NaoEncontrado />} />
      </Route>

      {/* Painel do barbeiro */}
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<Carregando />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}
