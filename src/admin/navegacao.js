import { Bell, CalendarDays, Clock, House, Scissors, Settings, Users } from 'lucide-react'

// Navegação do painel (Especificação 2.8).
// "principal" = barra inferior no telemóvel; os restantes vão para o menu "Mais".
export const NAV_ITENS = [
  { to: '/admin', label: 'Início', icon: House, principal: true, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarDays, principal: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, principal: true },
  { to: '/admin/notificacoes', label: 'Notificações', icon: Bell, principal: true },
  { to: '/admin/servicos', label: 'Serviços e preços', icon: Scissors },
  { to: '/admin/horarios', label: 'Horários e bloqueios', icon: Clock },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]
