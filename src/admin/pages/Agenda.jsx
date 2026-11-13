import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react'
import { dataPorExtenso, formatarData, hojeLisboa, instanteLisboa, somarDias } from '../../lib/datas'
import { linkWhatsapp } from '../../lib/telefone'
import { useAgora } from '../../hooks/useAgora'
import Carregando from '../../components/Carregando'
import Modal from '../../components/Modal'
import CabecalhoPagina from '../CabecalhoPagina'
import { carregarPeriodo, inicioSemana } from './agenda/agendaApi'
import DetalheMarcacao from './agenda/DetalheMarcacao'
import MarcacaoForm from './agenda/MarcacaoForm'
import VistaDia from './agenda/VistaDia'
import VistaSemana from './agenda/VistaSemana'

// Agenda (Especificação 2.2, 2.6): vista diária e semanal, nova marcação,
// detalhe com ações. Estado na URL: ?data=AAAA-MM-DD&vista=dia|semana&nova=1
export default function Agenda() {
  const [params, setParams] = useSearchParams()
  const data = params.get('data') ?? hojeLisboa()
  const vista = params.get('vista') === 'semana' ? 'semana' : 'dia'
  const [periodo, setPeriodo] = useState(null)
  const [erro, setErro] = useState('')
  const [detalhe, setDetalhe] = useState(null)
  const [form, setForm] = useState(params.get('nova') ? { inicial: { data, hora: '' } } : null)
  const [avisoWhatsapp, setAvisoWhatsapp] = useState(null)

  const de = vista === 'semana' ? inicioSemana(data) : data
  const ate = somarDias(de, vista === 'semana' ? 7 : 1)

  const agora = useAgora()
  const [versao, setVersao] = useState(0)
  const carregar = () => setVersao((v) => v + 1)

  useEffect(() => {
    const pedido = { ativo: true } // ignora respostas de pedidos antigos
    carregarPeriodo(de, ate)
      .then((p) => {
        if (!pedido.ativo) return
        setPeriodo(p)
        setErro('')
      })
      .catch(() => pedido.ativo && setErro('Não foi possível carregar a agenda.'))
    return () => {
      pedido.ativo = false
    }
  }, [de, ate, versao])

  // Recarrega a cada minuto (marcações novas, estados pela hora).
  useEffect(() => {
    const t = setInterval(() => setVersao((v) => v + 1), 60000)
    return () => clearInterval(t)
  }, [])

  // Mantém o detalhe aberto com os dados atualizados depois de uma ação.
  useEffect(() => {
    if (detalhe && periodo) {
      const atual = periodo.marcacoes.find((m) => m.id === detalhe.id)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (atual && atual !== detalhe) setDetalhe(atual)
    }
  }, [periodo, detalhe])

  function ir(novaData, novaVista = vista) {
    setParams({ data: novaData, vista: novaVista }, { replace: true })
  }

  function guardado({ mudouHora, cliente, data: d, hora }) {
    setForm(null)
    setDetalhe(null)
    carregar()
    if (mudouHora && cliente.phone_e164) {
      const quando = `${formatarData(d, { ano: false })} às ${hora}`
      setAvisoWhatsapp({ telefone: cliente.phone_e164, mensagem: `Olá ${cliente.name}, a sua marcação passou para ${quando}.` })
    }
    if (d !== data && vista === 'dia') ir(d)
  }

  const passo = vista === 'semana' ? 7 : 1
  const titulo =
    vista === 'semana'
      ? `Semana de ${formatarData(de, { ano: false })}`
      : data === hojeLisboa()
        ? 'Hoje'
        : formatarData(data)

  return (
    <>
      <CabecalhoPagina eyebrow={vista === 'dia' ? dataPorExtenso(instanteLisboa(data, '12:00')) : 'Agenda'} titulo={titulo}>
        <button type="button" onClick={() => setForm({ inicial: { data, hora: '' } })} className="btn-primary">
          + Nova marcação
        </button>
      </CabecalhoPagina>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Anterior" onClick={() => ir(somarDias(data, -passo))} className="btn-ghost px-3">
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <button type="button" onClick={() => ir(hojeLisboa())} className="btn-ghost px-4">Hoje</button>
        <button type="button" aria-label="Seguinte" onClick={() => ir(somarDias(data, passo))} className="btn-ghost px-3">
          <ChevronRight size={16} strokeWidth={1.8} aria-hidden />
        </button>
        <input type="date" value={data} onChange={(e) => e.target.value && ir(e.target.value)} className="field w-auto" />
        <div className="ml-auto flex rounded-lg border border-line-btn p-0.5 text-sm">
          {['dia', 'semana'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => ir(data, v)}
              className={`rounded-md px-3 py-1.5 capitalize ${vista === v ? 'bg-gold-2/12 font-semibold text-gold' : 'text-muted'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="mb-4 text-sm text-warn" role="alert">{erro}</p>}

      {!periodo ? (
        !erro && <Carregando />
      ) : vista === 'dia' ? (
        <div className="max-w-3xl">
          <VistaDia data={data} periodo={periodo} agora={agora} onAbrir={setDetalhe} onNova={(inicial) => setForm({ inicial })} />
        </div>
      ) : (
        <VistaSemana segunda={de} periodo={periodo} onEscolherDia={(d) => ir(d, 'dia')} />
      )}

      {detalhe && !form && (
        <Modal titulo="Marcação" onFechar={() => setDetalhe(null)}>
          <DetalheMarcacao
            marcacao={detalhe}
            settings={periodo?.settings}
            agora={agora}
            onEditar={() => setForm({ marcacao: detalhe })}
            onAtualizado={carregar}
          />
        </Modal>
      )}

      {form && (
        <Modal titulo={form.marcacao ? 'Editar marcação' : 'Nova marcação'} onFechar={() => setForm(null)}>
          <MarcacaoForm marcacao={form.marcacao} inicial={form.inicial} onGuardado={guardado} />
        </Modal>
      )}

      {avisoWhatsapp && (
        <Modal titulo="Avisar o cliente?" onFechar={() => setAvisoWhatsapp(null)}>
          <p className="text-sm text-muted">A hora mudou. Quer avisar o cliente por WhatsApp?</p>
          <p className="mt-3 rounded-lg bg-hover p-3 text-sm">“{avisoWhatsapp.mensagem}”</p>
          <div className="mt-4 flex gap-3">
            <a
              href={linkWhatsapp(avisoWhatsapp.telefone, avisoWhatsapp.mensagem)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setAvisoWhatsapp(null)}
              className="btn-gold flex items-center gap-2 px-4"
            >
              <MessageCircle size={16} strokeWidth={1.8} aria-hidden /> Avisar por WhatsApp
            </a>
            <button type="button" onClick={() => setAvisoWhatsapp(null)} className="btn-ghost px-4">Agora não</button>
          </div>
        </Modal>
      )}
    </>
  )
}
