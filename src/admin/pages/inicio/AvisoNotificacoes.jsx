import { Link } from 'react-router-dom'
import { BellRing } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { usePush } from '../../push'

// Aviso no Início enquanto as notificações não estão ativas NESTE dispositivo (2.9 parte 2).
export default function AvisoNotificacoes() {
  const { user } = useAuth()
  const { estado } = usePush(user?.id)

  const textos = {
    instalar: 'Para receber notificações no iPhone, instale primeiro a app no ecrã principal.',
    desativadas: 'Ative as notificações neste telemóvel para saber das novas marcações e do próximo cliente.',
    bloqueadas: 'As notificações estão bloqueadas neste telemóvel.',
  }
  if (!textos[estado]) return null

  return (
    <Link
      to="/admin/configuracoes#notificacoes-dispositivo"
      className="card card-gold mb-6 flex items-center gap-3 transition-colors hover:bg-hover"
    >
      <BellRing size={20} strokeWidth={1.8} className="shrink-0 text-gold" aria-hidden />
      <span className="flex-1 text-sm">{textos[estado]}</span>
      <span className="shrink-0 text-[13px] font-semibold text-gold-2">{estado === 'desativadas' ? 'Ativar →' : 'Ver como →'}</span>
    </Link>
  )
}
