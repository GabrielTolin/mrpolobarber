import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MessageCircle, UserCheck, UserPlus, X } from 'lucide-react'
import { MENSAGENS, verificarHabitual } from '../publicApi'
import { lerCliente } from '../lembrar'
import { formatarTelefone, normalizarTelefone } from '../../lib/telefone'

// Janela ao carregar em "Marcar horário" (P-01, decisão do Gabriel 2026-11-15):
//   "Visitante / 1.ª vez" → fluxo normal
//   "Tenho cadastro"      → escreve o telemóvel registado pelo barbeiro; se for de um
//                           cliente habitual, segue com o número já preenchido;
//                           se não for, aviso + continuar como visitante.
// O preço é sempre decidido pelo servidor a partir do telemóvel.

const paraCampo = (e164) => (e164?.startsWith('+351') ? formatarTelefone(e164).replace('+351 ', '') : (e164 ?? ''))

export default function EscolhaCliente({ whatsapp, onFechar }) {
  const navigate = useNavigate()
  const [passo, setPasso] = useState('escolha') // escolha · telefone · nao-encontrado
  const [telefone, setTelefone] = useState(() => paraCampo(lerCliente()?.telefone))
  const [erro, setErro] = useState('')
  const [aVerificar, setAVerificar] = useState(false)

  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [onFechar])

  // Do aviso "não encontrado", leva o número já escrito (pode ser mudado no passo dos dados).
  const comoVisitante = (sugerido = null) => navigate('/marcar', { state: { cadastro: false, telefone: sugerido } })

  async function verificar(e) {
    e.preventDefault()
    setErro('')
    const e164 = normalizarTelefone(telefone)
    if (!e164) return setErro(MENSAGENS.INVALID_PHONE)
    setAVerificar(true)
    const r = await verificarHabitual(e164)
    setAVerificar(false)
    if (!r.ok) return setErro(MENSAGENS[r.error] ?? MENSAGENS.NETWORK)
    if (r.regular) navigate('/marcar', { state: { cadastro: true, telefone: e164 } })
    else setPasso('nao-encontrado')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="escolha-titulo">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative w-full max-w-[440px] rounded-t-2xl border border-line-gold bg-bg px-5 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="escolha-titulo" className="font-serif text-[26px] leading-tight font-semibold">
            {passo === 'escolha' ? 'Como quer marcar?' : passo === 'telefone' ? 'O seu cadastro' : 'Número não encontrado'}
          </h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-fg">
            <X size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        {passo === 'escolha' && (
          <div className="flex flex-col gap-2.5">
            <Opcao Icone={UserPlus} titulo="Visitante / 1.ª vez" texto="Ainda não tenho cadastro na barbearia." onClick={() => comoVisitante()} />
            <Opcao Icone={UserCheck} titulo="Tenho cadastro" texto="Já sou cliente e o barbeiro registou o meu número." onClick={() => setPasso('telefone')} />
          </div>
        )}

        {passo === 'telefone' && (
          <form onSubmit={verificar} noValidate className="flex flex-col gap-3">
            <label className="block">
              <span className="text-sm font-medium text-muted">Telemóvel registado</span>
              <div className="mt-1.5 flex gap-2">
                <span className="field w-[74px] shrink-0 text-center text-muted">+351</span>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="912 345 678"
                  autoFocus
                  className="field"
                />
              </div>
            </label>
            {erro && <p role="alert" className="text-sm text-warn">{erro}</p>}
            <button type="submit" disabled={aVerificar} className="btn-primary mt-1 w-full py-3.5">
              {aVerificar ? 'A verificar…' : 'Continuar'}
            </button>
            <button type="button" onClick={() => setPasso('escolha')} className="text-center text-sm text-muted underline hover:text-fg">
              Voltar
            </button>
          </form>
        )}

        {passo === 'nao-encontrado' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Este número não está registado como cliente habitual. Pode marcar como visitante, ou falar com o barbeiro para ele o
              registar.
            </p>
            <button type="button" onClick={() => comoVisitante(normalizarTelefone(telefone))} className="btn-primary w-full py-3.5">
              Continuar como visitante
            </button>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2">
                <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
              </a>
            )}
            <button type="button" onClick={() => setPasso('telefone')} className="text-center text-sm text-muted underline hover:text-fg">
              Corrigir o número
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Opcao({ Icone, titulo, texto, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-line bg-black/40 px-4 py-4 text-left transition-colors hover:border-line-gold"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-gold text-gold">
        <Icone size={18} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{titulo}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{texto}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.8} className="text-muted-2" aria-hidden />
    </button>
  )
}
