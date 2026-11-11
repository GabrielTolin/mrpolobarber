import { Route, Routes } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import RotaAdmin from './RotaAdmin'
import Login from './Login'
import NaoEncontrado from '../public/NaoEncontrado'
import {
  Agenda,
  Clientes,
  Configuracoes,
  Dashboard,
  Horarios,
  Notificacoes,
  Servicos,
} from './pages/Paginas'

// Carregado à parte (React.lazy no App.jsx): quem só marca não descarrega o painel.
export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RotaAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="notificacoes" element={<Notificacoes />} />
          <Route path="servicos" element={<Servicos />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<NaoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  )
}
