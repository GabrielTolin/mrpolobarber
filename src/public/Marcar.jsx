import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CalendarPlus, Check, Copy, MessageCircle, Repeat } from 'lucide-react'
import Carregando from '../components/Carregando'
import Passo from './ui/Passo'
import ListaServicos from './ui/ListaServicos'
import Calendario from './ui/Calendario'
import GrelhaHoras from './ui/GrelhaHoras'
import ResumoMarcacao from './ui/ResumoMarcacao'
import ProximasMarcacoes from './ui/ProximasMarcacoes'
import { esquecerCliente, esquecerTudo, guardarCliente, juntarMarcacao, lerCliente } from './lembrar'
import { criarIcs, descarregarIcs } from './ics'
import { MENSAGENS, mensagemErro, cotarPreco, criarMarcacao, diaSemanaPlural, diasDisponiveis, horasDisponiveis, obterInfo, obterServicos, pedirSemanal } from './publicApi'
import { dataPorExtenso, formatarData, hojeLisboa, instanteLisboa, somarDias } from '../lib/datas'
import { formatarTelefone, linkWhatsapp, normalizarTelefone } from '../lib/telefone'

// Fluxo de marcação (6.2, Especificação 2.1): serviço → dia → hora → dados → revisão.
// O passo vai no endereço (?passo=N) para o "voltar" do telemóvel funcionar;
// os dados ficam em memória enquanto a página está aberta.
// 6.3: "Lembrar neste dispositivo" (nome, telemóvel e links das marcações, 2.10)
// e ecrã de sucesso com link pessoal, calendário (.ics) e WhatsApp.

const porExtenso = (dia) => dataPorExtenso(instanteLisboa(dia, '12:00'))

// Telemóvel guardado (E.164) → como aparece no campo: "912 345 678" para PT, completo para os outros.
const telefoneParaCampo = (e164) => (e164?.startsWith('+351') ? formatarTelefone(e164).replace('+351 ', '') : (e164 ?? ''))

// telefoneCadastro: número já confirmado como habitual na janela "Tenho cadastro" (P-01).
// telefoneSugerido: número escrito na janela que não estava registado (segue como visitante).
function dadosIniciais(telefoneCadastro, telefoneSugerido) {
  const c = lerCliente()
  const numero = telefoneCadastro ?? telefoneSugerido
  const mesmo = c && c.telefone === numero
  return {
    nome: !numero || mesmo ? (c?.nome ?? '') : '',
    telefone: telefoneParaCampo(numero ?? c?.telefone),
    observacoes: '',
    cortes: [],
    semanal: false, // pedido de marcação semanal (só habituais, S.2)
    lembrar: true,
    armadilha: '',
  }
}

export default function Marcar() {
  const [params, setParams] = useSearchParams()
  const pedido = Number(params.get('passo') ?? 1)
  // Vindo da janela da página de entrada: "Tenho cadastro" traz o telemóvel já confirmado.
  // Guarda-se no início, porque o estado da navegação perde-se ao mudar de passo.
  const location = useLocation()
  const [telefoneCadastro] = useState(() => (location.state?.cadastro ? location.state.telefone : null))
  const [telefoneSugerido] = useState(() => (location.state?.cadastro === false ? (location.state.telefone ?? null) : null))

  const [info, setInfo] = useState(null)
  const [servicos, setServicos] = useState(null)
  const [erroCarregar, setErroCarregar] = useState(null)

  const [servico, setServico] = useState(null)
  const [dia, setDia] = useState(null)
  const [hora, setHora] = useState(null) // { start_at, time_local }
  const [dados, setDados] = useState(() => dadosIniciais(telefoneCadastro, telefoneSugerido))
  const [lembrado, setLembrado] = useState(() => lerCliente() != null)
  const [versaoMemoria, setVersaoMemoria] = useState(0) // muda ao esquecer, para o cartão das marcações desaparecer
  const [preco, setPreco] = useState(null)
  const [precoHabitual, setPrecoHabitual] = useState(false)
  const [chave, setChave] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [guardado, setGuardado] = useState(false) // a marcação ficou mesmo guardada no dispositivo?
  const [semanal, setSemanal] = useState(null) // resposta do pedido semanal: null (não pediu) · { ok, weekly_status | error }
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

  // "Não sou eu / esquecer os meus dados" (2.10 regra 9)
  const esquecer = () => {
    esquecerTudo()
    setDados((d) => ({ ...d, nome: '', telefone: telefoneCadastro ? d.telefone : '' }))
    setLembrado(false)
    setVersaoMemoria((v) => v + 1)
  }

  return (
    <>
      {aviso && passo < 6 && (
        <div role="alert" className="mb-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {aviso}
        </div>
      )}

      {passo === 1 && (
        <>
          <ProximasMarcacoes key={versaoMemoria} onEsquecer={esquecer} />
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
          telefoneFixo={Boolean(telefoneCadastro)}
          lembrado={lembrado}
          onEsquecer={esquecer}
          onMudar={setDados}
          onVoltar={voltar}
          onContinuar={async () => {
            const resposta = await cotarPreco(servico.id, normalizarTelefone(dados.telefone))
            if (!resposta.ok) return resposta.error
            setPreco(resposta.price_cents)
            setPrecoHabitual(Boolean(resposta.regular))
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
          onMudar={setDados}
          preco={preco}
          precoHabitual={precoHabitual}
          whatsapp={whatsapp}
          onVoltar={voltar}
          onConfirmar={async () => {
            const resposta = await criarMarcacao({
              serviceId: servico.id,
              inicio: hora.start_at,
              nome: dados.nome,
              telefone: normalizarTelefone(dados.telefone),
              observacoes: notaFinal(dados),
              chave,
              armadilha: dados.armadilha,
            })
            if (resposta.ok) {
              // Lembrar neste dispositivo (2.10 regras 6–8): só com a opção ligada.
              if (dados.lembrar) {
                guardarCliente({ nome: dados.nome.trim(), telefone: normalizarTelefone(dados.telefone) })
                setGuardado(juntarMarcacao({ codigo: resposta.code, inicio: resposta.start_at, fim: resposta.end_at, servico: resposta.service_name }))
              } else {
                esquecerCliente()
                setGuardado(false)
              }
              // Marcação semanal: a marcação já está feita; o pedido segue à parte
              // e fica pendente até o barbeiro aprovar.
              setSemanal(dados.semanal && precoHabitual ? await pedirSemanal(resposta.code) : null)
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
            return resposta
          }}
        />
      )}

      {passo === 6 && <Confirmada resultado={resultado} info={info} guardado={guardado} semanal={semanal} />}
    </>
  )
}

// ── Passo 2: dia ─────────────────────────────────────────────────────────────
function PassoDia({ servico, limite, selecionado, whatsapp, onVoltar, onEscolher }) {
  const hoje = hojeLisboa()
  // Todos os dias com vagas até ao limite (max_days_ahead: 365 desde 2026-11-23), de uma vez: assim sabe-se logo
  // se não há vagas nenhuma (2.1) e o calendário abre no 1.º mês com vagas.
  const [estado, setEstado] = useState({ chave: null, dias: null, erro: null })
  const [mesEscolhido, setMesEscolhido] = useState(selecionado?.slice(0, 7) ?? null)
  const chave = `${servico.id}|${hoje}|${limite}`

  useEffect(() => {
    const vivo = { atual: true }
    // O servidor aceita no máximo 63 dias por pedido: divide em blocos de 60.
    const blocos = []
    for (let de = hoje; de <= limite; de = somarDias(de, 60)) {
      const ate = somarDias(de, 59)
      blocos.push([de, ate > limite ? limite : ate])
    }
    Promise.all(blocos.map(([de, ate]) => diasDisponiveis(servico.id, de, ate)))
      .then((conjuntos) => vivo.atual && setEstado({ chave, dias: new Set(conjuntos.flatMap((c) => [...c])), erro: null }))
      .catch((e) => vivo.atual && setEstado({ chave, dias: new Set(), erro: MENSAGENS[e.codigo] ?? MENSAGENS.NETWORK }))
    return () => {
      vivo.atual = false
    }
  }, [chave, servico.id, hoje, limite])

  const carregado = estado.chave === chave
  const primeiroLivre = carregado && estado.dias.size ? [...estado.dias].sort()[0] : null
  const mes = mesEscolhido ?? (primeiroLivre ?? hoje).slice(0, 7)
  const mudarMes = (n) => setMesEscolhido(somarDias(`${mes}-15`, n * 30).slice(0, 7))
  const semVagas = carregado && !estado.erro && estado.dias.size === 0

  return (
    <>
      <Passo numero={2} titulo="Escolha o dia" subtitulo={`${servico.name} · ${servico.duration_minutes} min`} onVoltar={onVoltar} />

      {semVagas ? (
        // Sem vagas até ao limite (2.1, casos excecionais): mensagem + WhatsApp
        <div className="card bg-bg/70 text-center">
          <p className="font-serif text-[24px] leading-tight font-semibold">Sem vagas nos próximos dias</p>
          <p className="mt-2 text-sm text-muted">
            De momento não há horários livres para {servico.name.toLowerCase()}. Fale com o barbeiro para ver outra
            opção.
          </p>
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-primary mt-5 flex items-center justify-center gap-2">
              <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
            </a>
          ) : (
            <p className="mt-4 text-xs text-muted-2">Pode também escolher outro serviço.</p>
          )}
        </div>
      ) : (
        <>
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
          {carregado && !estado.erro && ![...estado.dias].some((d) => d.startsWith(mes)) && (
            <p className="mt-4 text-sm text-muted">Não há vagas neste mês. Veja o outro mês.</p>
          )}
        </>
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
// Cortes que o cliente pode tocar (pedido do Gabriel, 2026-11-19). Os escolhidos
// juntam-se às observações numa só nota para o barbeiro (máx. 200 caracteres).
const CORTES = [
  'Buzz Cut', 'Low Fade', 'Mid Fade', 'High Fade', 'Skin Fade', 'Taper Fade', 'Low Taper',
  'Mid Taper', 'Burst Fade', 'Drop Fade', 'French Crop', 'Textured Crop', 'Mullet',
  'Burst Mullet', 'Modern Mullet', 'Edgar Cut', 'Fluffy Hair', 'Slick Back', 'Side Part', 'Pompadour',
]
const MAX_CORTES = 3

function notaFinal(dados) {
  const corte = dados.cortes?.length ? `Corte: ${dados.cortes.join(', ')}` : ''
  return [corte, dados.observacoes.trim()].filter(Boolean).join(' · ')
}

function PassoDados({ servico, dia, hora, dados, telefoneFixo, lembrado, onEsquecer, onMudar, onVoltar, onContinuar }) {
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState(null)
  const [aEnviar, setAEnviar] = useState(false)
  const mudar = (campo) => (e) => onMudar((d) => ({ ...d, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submeter(e) {
    e.preventDefault()
    const novos = {}
    if (dados.nome.trim().length < 2) novos.nome = MENSAGENS.INVALID_NAME
    if (!normalizarTelefone(dados.telefone)) novos.telefone = MENSAGENS.INVALID_PHONE
    if (notaFinal(dados).length > 200) novos.observacoes = MENSAGENS.INVALID_NOTES
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
      {lembrado && (
        <p className="mb-4 text-xs text-muted-2">
          Dados lembrados neste dispositivo.{' '}
          <button type="button" onClick={onEsquecer} className="text-gold-2 underline">
            Não sou eu / esquecer
          </button>
        </p>
      )}
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
              readOnly={telefoneFixo}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="912 345 678"
              className={`field bg-bg/70 ${telefoneFixo ? 'text-muted' : ''}`}
            />
          </div>
          {telefoneFixo ? (
            <span className="mt-1 block text-xs text-muted-2">
              Número do seu cadastro. Não é o seu?{' '}
              <Link to="/" className="text-gold-2 underline">
                Voltar ao início
              </Link>
            </span>
          ) : (
            <span className="mt-1 block text-xs text-muted-2">Número estrangeiro? Escreva-o com o indicativo, ex.: +44…</span>
          )}
          {erros.telefone && <span className="mt-1 block text-xs text-warn">{erros.telefone}</span>}
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-muted">Que corte quer? (opcional)</legend>
          <span className="mt-0.5 block text-xs text-muted-2">Toque para escolher, até {MAX_CORTES}. Fica como nota para o barbeiro.</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CORTES.map((corte) => {
              const ativo = dados.cortes.includes(corte)
              const cheio = !ativo && dados.cortes.length >= MAX_CORTES
              return (
                <button
                  key={corte}
                  type="button"
                  aria-pressed={ativo}
                  disabled={cheio}
                  onClick={() => onMudar((d) => ({ ...d, cortes: ativo ? d.cortes.filter((c) => c !== corte) : [...d.cortes, corte] }))}
                  className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                    ativo
                      ? 'border-gold bg-gold/15 font-semibold text-gold-2'
                      : 'border-line bg-bg/70 text-fg/85 hover:border-line-gold disabled:opacity-40 disabled:hover:border-line'
                  }`}
                >
                  {corte}
                </button>
              )
            })}
          </div>
        </fieldset>

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
          <Link to="/privacidade" target="_blank" rel="noreferrer" className="text-gold-2 underline">
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
function PassoRevisao({ servico, dia, hora, dados, onMudar, preco, precoHabitual, whatsapp, onVoltar, onConfirmar }) {
  const [aEnviar, setAEnviar] = useState(false)
  const [erro, setErro] = useState(null)
  const enviado = useRef(false)

  async function confirmar() {
    if (enviado.current) return // duplo clique: o pedido já foi
    enviado.current = true
    setAEnviar(true)
    setErro(null)
    const falha = await onConfirmar() // null = correu bem; senão a resposta com o erro
    enviado.current = false
    setAEnviar(false)
    if (falha) setErro(falha)
  }

  // Casos em que só o barbeiro resolve (2.1): mostra também o botão do WhatsApp.
  const contacto = ['PHONE_BLOCKED', 'LIMIT_REACHED', 'RATE_LIMITED', 'REJECTED'].includes(erro?.error)

  return (
    <>
      <Passo numero={5} titulo="Confirme a marcação" onVoltar={onVoltar} />
      <ResumoMarcacao servico={servico.name} dataTexto={porExtenso(dia)} hora={hora.time_local} duracao={servico.duration_minutes} precoCentimos={preco} destaque>
        <p className={`-mt-2 text-right text-xs ${precoHabitual ? 'text-gold-2' : 'text-muted-2'}`}>
          {precoHabitual ? 'Preço de cliente habitual' : 'Preço de visitante'}
        </p>
        <p className="text-sm text-muted">
          {dados.nome.trim()} · {formatarTelefone(normalizarTelefone(dados.telefone))}
        </p>
        {notaFinal(dados) && <p className="text-sm text-muted-2">“{notaFinal(dados)}”</p>}
      </ResumoMarcacao>

      {/* Marcação semanal (S.2): só para clientes habituais (o servidor confirma outra vez) */}
      {precoHabitual && (
        <label className="card mt-5 flex cursor-pointer items-start gap-3 bg-bg/70">
          <input
            type="checkbox"
            checked={dados.semanal}
            onChange={(e) => onMudar((d) => ({ ...d, semanal: e.target.checked }))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-gold)]"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Repeat size={14} strokeWidth={2} className="text-gold" aria-hidden /> Repetir todas as semanas
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {diaSemanaPlural(dia)[0].toUpperCase() + diaSemanaPlural(dia).slice(1)} às {hora.time_local}. Esta marcação fica já
              confirmada; as próximas semanas ficam marcadas quando o barbeiro aprovar.
            </span>
          </span>
        </label>
      )}

      {erro && (
        <div role="alert" className="mt-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {mensagemErro(erro)}
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

// ── Passo 6: confirmada (6.3) ────────────────────────────────────────────────
function Confirmada({ resultado, info, guardado, semanal }) {
  const link = `${window.location.origin}/m/${resultado.code}`
  const [copiado, setCopiado] = useState(false)
  const primeiroNome = resultado.client_name?.split(' ')[0]
  const negocio = info?.business_name ?? 'Mr. Polo Barber Shop'
  const quando = `${formatarData(resultado.date_local, { ano: false })} às ${resultado.time_local}`
  const whatsapp = info?.whatsapp_phone
    ? linkWhatsapp(info.whatsapp_phone, `Olá! Marquei ${resultado.service_name} para ${quando}.`)
    : null

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      /* sem acesso à área de transferência: o link continua visível para copiar à mão */
    }
  }

  function adicionarAoCalendario() {
    const ics = criarIcs({
      uid: `${resultado.code.slice(0, 16)}@mrpolobarber`,
      inicio: resultado.start_at,
      fim: resultado.end_at,
      titulo: `${resultado.service_name} — ${negocio}`,
      local: info?.address ?? null,
      descricao: `Ver ou cancelar a marcação: ${link}`,
    })
    descarregarIcs(ics, `marcacao-${resultado.date_local}.ics`)
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
      {semanal && <AvisoSemanal semanal={semanal} dataLocal={resultado.date_local} hora={resultado.time_local} />}
      <div className="card mt-5 flex flex-col gap-3 bg-bg/70">
        <p className="text-sm font-semibold">O seu link pessoal</p>
        <p className="text-xs text-muted">
          Guarde-o para ver ou cancelar a marcação{guardado ? '. Também fica guardado neste dispositivo.' : '.'}
        </p>
        <div className="flex gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="field truncate bg-bg/70 text-[13px] text-muted" />
          <button type="button" onClick={copiar} className="btn-ghost shrink-0 px-3" aria-label="Copiar link">
            {copiado ? <Check size={16} strokeWidth={2} className="text-ok" /> : <Copy size={16} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <button type="button" onClick={adicionarAoCalendario} className="btn-gold flex items-center justify-center gap-2">
          <CalendarPlus size={16} strokeWidth={1.8} aria-hidden /> Adicionar ao calendário
        </button>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noreferrer" className="btn-ghost flex items-center justify-center gap-2">
            <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> Falar com o barbeiro
          </a>
        )}
        <Link to="/" className="btn-ghost block w-full text-center">
          Voltar ao início
        </Link>
      </div>
    </>
  )
}

// Resultado do pedido de marcação semanal no ecrã final.
function AvisoSemanal({ semanal, dataLocal, hora }) {
  const dias = diaSemanaPlural(dataLocal)
  if (!semanal.ok) {
    return (
      <div role="alert" className="mt-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
        {MENSAGENS[semanal.error] ?? 'Não foi possível pedir a marcação semanal. Fale com o barbeiro.'} Esta marcação ficou feita na mesma.
      </div>
    )
  }
  return (
    <div className="card mt-5 flex items-start gap-3 border-line-gold bg-bg/70">
      <Repeat size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-gold" aria-hidden />
      <p className="text-sm">
        {semanal.weekly_status === 'active' ? (
          <>Já tem marcação semanal às {dias}, às {hora}.</>
        ) : (
          <>
            <b>Pedido de marcação semanal enviado</b> ({dias} às {hora}). O barbeiro vai confirmar; até lá, só esta marcação está
            feita.
          </>
        )}
      </p>
    </div>
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
