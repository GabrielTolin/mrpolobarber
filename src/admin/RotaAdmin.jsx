import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Carregando from '../components/Carregando'
import SemAcesso from './SemAcesso'

// Proteção das rotas /admin/* (Arquitetura 3.9):
// sem sessão → login · sessão sem ser administrador → "Sem acesso" · admin → painel.
export default function RotaAdmin() {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Carregando />
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <SemAcesso />
  return <Outlet />
}
