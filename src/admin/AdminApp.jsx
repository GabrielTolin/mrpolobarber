import { Route, Routes } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import RotaAdmin from './RotaAdmin'
import Login from './Login'
import NaoEncontrado from '../public/NaoEncontrado'
import {
  Agenda,
  Notificacoes,
} from './pages/Paginas'
import Inicio from './pages/Inicio'
import Configuracoes from './pages/Configuracoes'
import Servicos from './pages/Servicos'
import Horarios from './pages/Horarios'
import Clientes from './pages/Clientes'
import ClienteFicha from './pages/ClienteFicha'

// Carregado à parte (React.lazy no App.jsx): quem só marca não descarrega o painel.
export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<RotaAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Inicio />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteFicha />} />
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
