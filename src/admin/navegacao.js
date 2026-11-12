import { Bell, Calendar, Clock, House, Scissors, SlidersHorizontal, Users } from 'lucide-react'

// Navegação do painel (Especificação 2.8; ícones do handoff do design).
// "principal" = barra inferior no telemóvel; os restantes vão para o menu "Mais".
export const NAV_ITENS = [
  { to: '/admin', label: 'Início', icon: House, principal: true, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: Calendar, principal: true },
  { to: '/admin/clientes', label: 'Clientes', icon: Users, principal: true },
  { to: '/admin/notificacoes', label: 'Notificações', icon: Bell, principal: true },
  { to: '/admin/servicos', label: 'Serviços e preços', icon: Scissors },
  { to: '/admin/horarios', label: 'Horários e bloqueios', icon: Clock },
  { to: '/admin/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
]

// Ícones do painel: 18px com traço 1.8 (handoff).
export const ICON_PROPS = { size: 18, strokeWidth: 1.8, 'aria-hidden': true }
