import { useState } from 'react'
import { Bell, BellOff, Share, SquarePlus } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { MENSAGENS_PUSH, usePush } from '../../push'
import Mensagem from './Mensagem'

const ICONE = { size: 16, strokeWidth: 1.8, 'aria-hidden': true }

// Ativar as notificações NESTE telemóvel/computador (7.3, 2.9 parte 2, 3.10).
export default function SeccaoDispositivo() {
  const { user } = useAuth()
  const push = usePush(user?.id)
  const [aTrabalhar, setATrabalhar] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState('')

  async function correr(acao, mensagemOk) {
    setATrabalhar(true)
    setErro('')
    setOk('')
    try {
      await acao()
      if (mensagemOk) setOk(mensagemOk)
    } catch (e) {
      setErro(MENSAGENS_PUSH[e.codigo] ?? 'Não foi possível concluir. Tente de novo.')
    }
    setATrabalhar(false)
  }

  return (
    <section id="notificacoes-dispositivo" className="card flex scroll-mt-6 flex-col gap-4">
      <h2 className="card-title">Notificações neste dispositivo</h2>

      {push.estado === 'a-ver' && <p className="text-sm text-muted">A verificar…</p>}

      {push.estado === 'instalar' && (
        <>
          <p className="text-sm text-muted">
            No iPhone, as notificações só funcionam com a app <b className="text-fg">instalada no ecrã principal</b>:
          </p>
          <ol className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-gold">1.</span> No Safari, toque em <Share {...ICONE} className="text-gold" /> <b>Partilhar</b>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold">2.</span> Escolha <SquarePlus {...ICONE} className="text-gold" /> <b>Adicionar ao ecrã principal</b>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold">3.</span> Abra a app pelo ícone novo, entre e volte aqui
            </li>
          </ol>
        </>
      )}

      {push.estado === 'sem-chave' && (
        <p className="text-sm text-warn">
          As notificações ainda não estão configuradas neste site: falta a chave pública (VITE_VAPID_PUBLIC_KEY) na Vercel. Depois de a
          acrescentar, é preciso publicar de novo.
        </p>
      )}

      {push.estado === 'sem-suporte' && (
        <p className="text-sm text-muted">
          Este navegador não permite notificações. No telemóvel, use a app instalada no ecrã principal.
        </p>
      )}

      {push.estado === 'bloqueadas' && (
        <p className="text-sm text-warn">
          As notificações estão bloqueadas para esta app. No iPhone: Definições → Notificações → Mr. Polo → Permitir notificações.
          Depois volte aqui.
        </p>
      )}

      {push.estado === 'desativadas' && (
        <>
          <p className="text-sm text-muted">
            Ative para receber no telemóvel as novas marcações online, os cancelamentos, o resumo do dia e o aviso antes de cada cliente — mesmo
            com a app fechada.
          </p>
          <button
            type="button"
            disabled={aTrabalhar}
            onClick={() => correr(push.ativar, 'Notificações ativadas neste dispositivo.')}
            className="btn-primary flex w-fit items-center gap-2"
          >
            <Bell {...ICONE} /> {aTrabalhar ? 'A ativar…' : 'Ativar notificações'}
          </button>
        </>
      )}

      {push.estado === 'ativas' && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-ok">
            <Bell {...ICONE} /> Ativas neste dispositivo
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={aTrabalhar}
              onClick={() => correr(push.enviarTeste, 'Notificação de teste enviada. Deve chegar dentro de segundos.')}
              className="btn-gold"
            >
              Enviar notificação de teste
            </button>
            <button
              type="button"
              disabled={aTrabalhar}
              onClick={() => correr(push.desativar, 'Notificações desativadas neste dispositivo.')}
              className="btn-ghost flex items-center gap-2"
            >
              <BellOff {...ICONE} /> Desativar neste dispositivo
            </button>
          </div>
        </>
      )}

      {push.aparelhos != null && push.estado !== 'a-ver' && (
        <p className="text-xs text-muted-2">
          {push.aparelhos === 0
            ? 'Ainda nenhum dispositivo com notificações ativas.'
            : `${push.aparelhos} ${push.aparelhos === 1 ? 'dispositivo recebe' : 'dispositivos recebem'} notificações.`}
        </p>
      )}

      <Mensagem erro={erro} ok={ok} />
    </section>
  )
}
