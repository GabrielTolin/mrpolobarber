import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Copy, MessageCircle } from 'lucide-react'
import Carregando from '../components/Carregando'
import Passo from './ui/Passo'
import ListaServicos from './ui/ListaServicos'
import Calendario from './ui/Calendario'
import GrelhaHoras from './ui/GrelhaHoras'
import ResumoMarcacao from './ui/ResumoMarcacao'
import { MENSAGENS, cotarPreco, criarMarcacao, diasDisponiveis, horasDisponiveis, obterInfo, obterServicos } from './publicApi'
import { dataPorExtenso, formatarData, hojeLisboa, instanteLisboa, somarDias } from '../lib/datas'
import { formatarTelefone, linkWhatsapp, normalizarTelefone } from '../lib/telefone'

// Fluxo de marcação (6.2, Especificação 2.1): serviço → dia → hora → dados → revisão.
// O passo vai no endereço (?passo=N) para o "voltar" do telemóvel funcionar;
// os dados ficam em memória enquanto a página está aberta.

const ultimoDiaDoMes = (mes) => somarDias(`${somarDias(`${mes}-01`, 32).slice(0, 7)}-01`, -1)
const porExtenso = (dia) => dataPorExtenso(instanteLisboa(dia, '12:00'))

export default function Marcar() {
  const [params, setParams] = useSearchParams()
  const pedido = Number(params.get('passo') ?? 1)

  const [info, setInfo] = useState(null)
  const [servicos, setServicos] = useState(null)
  const [erroCarregar, setErroCarregar] = useState(null)

  const [servico, setServico] = useState(null)
  const [dia, setDia] = useState(null)
  const [hora, setHora] = useState(null) // { start_at, time_local }
  const [dados, setDados] = useState({ nome: '', telefone: '', observacoes: '', lembrar: true, armadilha: '' })
  const [preco, setPreco] = useState(null)
  const [chave, setChave] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [aviso, setAviso] = useState(null) // mensagem no topo do passo (ex.: horário ocupado entretanto)

  // Nunca mostrar um passo cujos dados anteriores faltam (ex.: abrir ?passo=4 diretamente).
  const passo = resultado ? 6 : !servico ? 1 : !dia ? Math.min(pedido, 2) : !hora ? Math.min(pedido, 3) : preco == null ? Math.min(pedido, 4) : Math.min(pedido, 5)

  const ir = (n, { substituir = false } = {}) => {
    setParams({ passo: String(n) }, { replace: substituir })
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const vivo = { atual: true }
    Promise.all([obterInfo(), obterServicos()])
      .then(([i, s]) => {
        if (!vivo.atual) return
        setInfo(i)
        setServicos(s)
      })
      .catch((e) => vivo.atual && setErroCarregar(MENSAGENS[e.codigo] ?? MENSAGENS.NETWORK))
    return () => {
      vivo.atual = false
    }
  }, [])

  const whatsapp = info?.whatsapp_phone ? linkWhatsapp(info.whatsapp_phone, 'Olá! Queria marcar um horário.') : null

  if (erroCarregar) return <ErroComContacto mensagem={erroCarregar} whatsapp={whatsapp} onTentar={() => window.location.reload()} />
  if (!servicos) return <Carregando />

  const voltar = () => window.history.back()

  return (
    <>
      {aviso && passo < 6 && (
        <div role="alert" className="mb-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {aviso}
        </div>
      )}

      {passo === 1 && (
        <>
          <Passo numero={1} titulo="Escolha o serviço" subtitulo="O preço aparece no fim, antes de confirmar." />
          <ListaServicos
            servicos={servicos}
            selecionado={servico?.id}
            onEscolher={(s) => {
              if (s.id !== servico?.id) {
                setDia(null)
                setHora(null)
                setPreco(null)
              }
              setServico(s)
              setAviso(null)
              ir(2)
            }}
          />
          {servicos.length === 0 && <p className="text-sm text-muted">De momento não há serviços disponíveis para marcar online.</p>}
        </>
      )}

      {passo === 2 && (
        <PassoDia
          servico={servico}
          limite={somarDias(hojeLisboa(), info?.max_days_ahead ?? 30)}
          selecionado={dia}
          whatsapp={whatsapp}
          onVoltar={voltar}
          onEscolher={(d) => {
            if (d !== dia) {
              setHora(null)
              setPreco(null)
            }
            setDia(d)
            setAviso(null)
            ir(3)
          }}
        />
      )}

      {passo === 3 && (
        <PassoHora
          servico={servico}
          dia={dia}
          selecionada={hora?.time_local}
          onVoltar={voltar}
          onEscolher={(h) => {
            setHora(h)
            setAviso(null)
            ir(4)
          }}
        />
      )}

      {passo === 4 && (
        <PassoDados
          servico={servico}
          dia={dia}
          hora={hora}
          dados={dados}
          onMudar={setDados}
          onVoltar={voltar}
          onContinuar={async () => {
            const resposta = await cotarPreco(servico.id, normalizarTelefone(dados.telefone))
            if (!resposta.ok) return resposta.error
            setPreco(resposta.price_cents)
            setChave(crypto.randomUUID())
            setAviso(null)
            ir(5)
            return null
          }}
        />
      )}

      {passo === 5 && (
        <PassoRevisao
          servico={servico}
          dia={dia}
          hora={hora}
          dados={dados}
          preco={preco}
          whatsapp={whatsapp}
          onVoltar={voltar}
          onConfirmar={async () => {
            const resposta = await criarMarcacao({
              serviceId: servico.id,
              inicio: hora.start_at,
              nome: dados.nome,
              telefone: normalizarTelefone(dados.telefone),
              observacoes: dados.observacoes.trim(),
              chave,
              armadilha: dados.armadilha,
            })
            if (resposta.ok) {
              setResultado(resposta)
              ir(6, { substituir: true })
              return null
            }
            // Horário perdido entretanto → volta à hora, sem perder os dados (2.1, 2.5).
            if (resposta.error === 'SLOT_TAKEN' || resposta.error === 'TOO_LATE') {
              setAviso(MENSAGENS[resposta.error])
              setHora(null)
              setPreco(null)
              ir(3, { substituir: true })
              return null
            }
            if (resposta.error === 'SERVICE_UNAVAILABLE') {
              setAviso(MENSAGENS.SERVICE_UNAVAILABLE)
              setServico(null)
              ir(1, { substituir: true })
              return null
            }
            if (['INVALID_PHONE', 'INVALID_NAME', 'INVALID_NOTES'].includes(resposta.error)) {
              setAviso(MENSAGENS[resposta.error])
              setPreco(null)
              ir(4, { substituir: true })
              return null
            }
            return resposta.error
          }}
        />
      )}

      {passo === 6 && <Confirmada resultado={resultado} />}
    </>
  )
}

// ── Passo 2: dia ─────────────────────────────────────────────────────────────
function PassoDia({ servico, limite, selecionado, whatsapp, onVoltar, onEscolher }) {
  const hoje = hojeLisboa()
  const [mes, setMes] = useState((selecionado ?? hoje).slice(0, 7))
  const [estado, setEstado] = useState({ chave: null, dias: null, erro: null })
  const chave = `${servico.id}|${mes}`

  useEffect(() => {
    const vivo = { atual: true }
    const de = `${mes}-01` < hoje ? hoje : `${mes}-01`
    const ate = ultimoDiaDoMes(mes) > limite ? limite : ultimoDiaDoMes(mes)
    diasDisponiveis(servico.id, de, ate)
      .then((dias) => vivo.atual && setEstado({ chave, dias, erro: null }))
      .catch((e) => vivo.atual && setEstado({ chave, dias: new Set(), erro: MENSAGENS[e.codigo] ?? MENSAGENS.NETWORK }))
    return () => {
      vivo.atual = false
    }
  }, [chave, servico.id, mes, hoje, limite])

  const carregado = estado.chave === chave
  const mudarMes = (n) => setMes(somarDias(`${mes}-15`, n * 30).slice(0, 7))

  return (
    <>
      <Passo numero={2} titulo="Escolha o dia" subtitulo={`${servico.name} · ${servico.duration_minutes} min`} onVoltar={onVoltar} />
      <div className={carregado ? '' : 'pointer-events-none opacity-50'}>
        <Calendario
          mes={mes}
          disponiveis={carregado ? estado.dias : new Set()}
          selecionado={selecionado}
          onEscolher={onEscolher}
          onMudarMes={mudarMes}
          podeAnterior={mes > hoje.slice(0, 7)}
          podeSeguinte={mes < limite.slice(0, 7)}
        />
      </div>
      {carregado && estado.erro && <p className="mt-4 text-sm text-warn">{estado.erro}</p>}
      {carregado && !estado.erro && estado.dias.size === 0 && (
        <div className="mt-4 text-sm text-muted">
          <p>Não há vagas neste mês{mes < limite.slice(0, 7) ? '. Veja o mês seguinte.' : '.'}</p>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-gold-2 underline">
              <MessageCircle size={14} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
            </a>
          )}
        </div>
      )}
    </>
  )
}

// ── Passo 3: hora ────────────────────────────────────────────────────────────
function PassoHora({ servico, dia, selecionada, onVoltar, onEscolher }) {
  const [estado, setEstado] = useState({ chave: null, horas: null, erro: null })
  const chave = `${servico.id}|${dia}`

  useEffect(() => {
    const vivo = { atual: true }
    horasDisponiveis(servico.id, dia)
      .then((horas) => vivo.atual && setEstado({ chave, horas, erro: null }))
      .catch((e) => vivo.atual && setEstado({ chave, horas: [], erro: MENSAGENS[e.codigo] ?? MENSAGENS.NETWORK }))
    return () => {
      vivo.atual = false
    }
  }, [chave, servico.id, dia])

  const carregado = estado.chave === chave

  return (
    <>
      <Passo numero={3} titulo="Escolha a hora" subtitulo={porExtenso(dia)} onVoltar={onVoltar} />
      {!carregado && <Carregando texto="A procurar horários…" />}
      {carregado && estado.erro && <p className="text-sm text-warn">{estado.erro}</p>}
      {carregado && !estado.erro && estado.horas.length === 0 && (
        <p className="text-sm text-muted">Já não há horários livres neste dia. Volte atrás e escolha outro dia.</p>
      )}
      {carregado && estado.horas.length > 0 && (
        <GrelhaHoras
          horas={estado.horas.map((h) => h.time_local)}
          selecionada={selecionada}
          onEscolher={(t) => onEscolher(estado.horas.find((h) => h.time_local === t))}
        />
      )}
    </>
  )
}

// ── Passo 4: dados ───────────────────────────────────────────────────────────
function PassoDados({ servico, dia, hora, dados, onMudar, onVoltar, onContinuar }) {
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [aEnviar, setAEnviar] = useState(false)
  const mudar = (campo) => (e) => onMudar((d) => ({ ...d, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submeter(e) {
    e.preventDefault()
    const novos = {}
    if (dados.nome.trim().length < 2) novos.nome = MENSAGENS.INVALID_NAME
    if (!normalizarTelefone(dados.telefone)) novos.telefone = MENSAGENS.INVALID_PHONE
    if (dados.observacoes.trim().length > 200) novos.observacoes = MENSAGENS.INVALID_NOTES
    setErros(novos)
    setErroGeral(null)
    if (Object.keys(novos).length) return

    setAEnviar(true)
    const erro = await onContinuar()
    setAEnviar(false)
    if (erro === 'INVALID_PHONE') setErros({ telefone: MENSAGENS.INVALID_PHONE })
    else if (erro) setErroGeral(MENSAGENS[erro] ?? MENSAGENS.NETWORK)
  }

  return (
    <>
      <Passo
        numero={4}
        titulo="Os seus dados"
        subtitulo={`${formatarData(dia, { ano: false })} · ${hora.time_local} · ${servico.name}`}
        onVoltar={onVoltar}
      />
      <form onSubmit={submeter} noValidate className="flex flex-col gap-4">
        <label className="block">
          <span className="text-sm font-medium text-muted">Nome</span>
          <input value={dados.nome} onChange={mudar('nome')} autoComplete="name" maxLength={80} className="field mt-1.5 bg-bg/70" />
          {erros.nome && <span className="mt-1 block text-xs text-warn">{erros.nome}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted">Telemóvel</span>
          <div className="mt-1.5 flex gap-2">
            <span className="field w-[74px] shrink-0 bg-bg/70 text-center text-muted">+351</span>
            <input
              value={dados.telefone}
              onChange={mudar('telefone')}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="912 345 678"
              className="field bg-bg/70"
            />
          </div>
          <span className="mt-1 block text-xs text-muted-2">Número estrangeiro? Escreva-o com o indicativo, ex.: +44…</span>
          {erros.telefone && <span className="mt-1 block text-xs text-warn">{erros.telefone}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted">Observações (opcional)</span>
          <input
            value={dados.observacoes}
            onChange={mudar('observacoes')}
            maxLength={200}
            placeholder="Ex.: é para o meu filho"
            className="field mt-1.5 bg-bg/70"
          />
          {erros.observacoes && <span className="mt-1 block text-xs text-warn">{erros.observacoes}</span>}
        </label>

        {/* Campo armadilha (3.7 §4): invisível para pessoas; os bots preenchem-no. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input value={dados.armadilha} onChange={mudar('armadilha')} tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={dados.lembrar} onChange={mudar('lembrar')} className="h-4 w-4 accent-[var(--color-gold)]" />
          Lembrar os meus dados neste dispositivo
        </label>

        <p className="text-xs text-muted-2">
          Os seus dados são usados apenas para gerir a marcação.{' '}
          <Link to="/privacidade" className="text-gold-2 underline">
            Política de privacidade
          </Link>
        </p>

        {erroGeral && <p role="alert" className="text-sm text-warn">{erroGeral}</p>}

        <button type="submit" disabled={aEnviar} className="btn-primary mt-1 w-full">
          {aEnviar ? 'Um momento…' : 'Continuar'}
        </button>
      </form>
    </>
  )
}

// ── Passo 5: revisão com o preço ─────────────────────────────────────────────
function PassoRevisao({ servico, dia, hora, dados, preco, whatsapp, onVoltar, onConfirmar }) {
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState(null)
  const enviado = useRef(false)

  async function confirmar() {
    if (enviado.current) return // duplo clique: o pedido já foi
    enviado.current = true
    setAEnviar(true)
    setErro(null)
    const codigo = await onConfirmar()
    enviado.current = false
    setAEnviar(false)
    if (codigo) setErro(codigo)
  }

  const contacto = erro === 'PHONE_BLOCKED' || erro === 'LIMIT_REACHED' || erro === 'RATE_LIMITED' || erro === 'REJECTED'

  return (
    <>
      <Passo numero={5} titulo="Confirme a marcação" onVoltar={onVoltar} />
      <ResumoMarcacao servico={servico.name} dataTexto={porExtenso(dia)} hora={hora.time_local} duracao={servico.duration_minutes} precoCentimos={preco} destaque>
        <p className="text-sm text-muted">
          {dados.nome.trim()} · {formatarTelefone(normalizarTelefone(dados.telefone))}
        </p>
        {dados.observacoes.trim() && <p className="text-sm text-muted-2">“{dados.observacoes.trim()}”</p>}
      </ResumoMarcacao>

      {erro && (
        <div role="alert" className="mt-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {MENSAGENS[erro] ?? MENSAGENS.NETWORK}
          {contacto && whatsapp && (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 font-semibold text-gold-2 underline">
              <MessageCircle size={14} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
            </a>
          )}
        </div>
      )}

      <button type="button" onClick={confirmar} disabled={aEnviar} className="btn-primary mt-5 w-full">
        {aEnviar ? 'A confirmar…' : 'Confirmar marcação'}
      </button>
      <p className="mt-3 text-center text-xs text-muted-2">Pode cancelar até 2 horas antes.</p>
    </>
  )
}

// ── Passo 6: confirmada (o essencial; o resto do ecrã de sucesso é a 6.3) ────
function Confirmada({ resultado }) {
  const link = `${window.location.origin}/m/${resultado.code}`
  const [copiado, setCopiado] = useState(false)
  const primeiroNome = resultado.client_name?.split(' ')[0]

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sem acesso à área de transferência: o link continua visível para copiar à mão */
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-col items-center text-center">
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-on-gold">
          <Check size={28} strokeWidth={2.2} aria-hidden />
        </span>
        <h1 className="font-serif text-[34px] leading-tight font-semibold">Marcação confirmada</h1>
        {primeiroNome && <p className="mt-1 text-sm text-muted">Até já, {primeiroNome}!</p>}
      </div>
      <ResumoMarcacao
        servico={resultado.service_name}
        dataTexto={porExtenso(resultado.date_local)}
        hora={resultado.time_local}
        duracao={resultado.duration_minutes}
        precoCentimos={resultado.price_cents}
      />
      <div className="card mt-5 flex flex-col gap-3 bg-bg/70">
        <p className="text-sm font-semibold">O seu link pessoal</p>
        <p className="text-xs text-muted">Guarde-o para ver ou cancelar a marcação.</p>
        <div className="flex gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="field truncate bg-bg/70 text-[13px] text-muted" />
          <button type="button" onClick={copiar} className="btn-ghost shrink-0 px-3" aria-label="Copiar link">
            {copiado ? <Check size={16} strokeWidth={2} className="text-ok" /> : <Copy size={16} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
      <Link to="/" className="btn-ghost mt-5 block w-full text-center">
        Voltar ao início
      </Link>
    </>
  )
}

function ErroComContacto({ mensagem, whatsapp, onTentar }) {
  return (
    <section className="card bg-bg/70 text-center">
      <p className="text-sm text-warn">{mensagem}</p>
      <div className="mt-4 flex flex-col gap-2.5">
        <button type="button" onClick={onTentar} className="btn-primary w-full">
          Tentar de novo
        </button>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2">
            <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
          </a>
        )}
      </div>
    </section>
  )
}
