import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { eurosParaCampo, formatarEuros, lerEuros } from '../../../lib/dinheiro'
import { formatarInstante, partesLisboa } from '../../../lib/datas'
import { ORIGENS } from '../../../lib/estados'
import { estadoEfetivo } from '../../../lib/estados'
import EscolherCliente from './EscolherCliente'

const ORIGENS_MANUAIS = ['whatsapp', 'phone', 'walk_in']

// Nova marcação ou edição (Especificação 2.2 passos 1–8, 2.6).
// Grava pela função admin_save_booking: verificar → avisar → confirmar.
export default function MarcacaoForm({ marcacao, inicial, onGuardado }) {
  const emCurso = marcacao && estadoEfetivo(marcacao) === 'in_progress'
  const inicio = marcacao ? partesLisboa(marcacao.start_at) : null
  const servicoAtual = marcacao?.appointment_services?.[0]

  const [servicos, setServicos] = useState([])
  const [cliente, setCliente] = useState(
    marcacao ? { id: marcacao.client_id, name: marcacao.clients?.name ?? marcacao.client_name, is_regular: marcacao.clients?.is_regular, phone_e164: marcacao.clients?.phone_e164 } : null
  )
  const [servicoId, setServicoId] = useState(servicoAtual?.service_id ?? '')
  const [data, setData] = useState(inicio?.data ?? inicial?.data ?? '')
  const [hora, setHora] = useState(inicio?.hora ?? inicial?.hora ?? '')
  const [origem, setOrigem] = useState(marcacao?.source ?? 'whatsapp')
  const [preco, setPreco] = useState(marcacao ? eurosParaCampo(marcacao.total_price_cents) : '')
  const [precoManual, setPrecoManual] = useState(Boolean(marcacao))
  const [notas, setNotas] = useState(marcacao?.client_notes ?? '')
  const [livres, setLivres] = useState([])
  const [avisos, setAvisos] = useState(null)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  useEffect(() => {
    supabase
      .from('services')
      .select('*')
      .order('sort_order')
      .then(({ data: lista }) =>
        setServicos((lista ?? []).filter((s) => s.is_active || s.id === servicoAtual?.service_id))
      )
  }, [servicoAtual?.service_id])

  const servico = servicos.find((s) => s.id === servicoId)

  // Preço sugerido pela categoria do cliente (2.7), enquanto não for escrito à mão.
  useEffect(() => {
    if (precoManual || !servico || !cliente) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreco(eurosParaCampo(cliente.is_regular ? servico.price_regular_cents : servico.price_visitor_cents))
  }, [servico, cliente, precoManual])

  // Horários livres como sugestão (o barbeiro pode escrever qualquer hora).
  useEffect(() => {
    if (!servicoId || !data || emCurso) return
    supabase
      .rpc('available_slots', { p_service_id: servicoId, p_date: data, p_exclude: marcacao?.id ?? null })
      .then(({ data: slots }) => setLivres((slots ?? []).map((t) => partesLisboa(t).hora)))
  }, [servicoId, data, emCurso, marcacao?.id])

  function limparAvisos() {
    setAvisos(null)
    setErro('')
  }

  async function gravar(confirmar) {
    setErro('')
    if (!cliente) return setErro('Escolha o cliente.')
    if (!servicoId) return setErro('Escolha o serviço.')
    if (!data || !hora) return setErro('Indique o dia e a hora.')
    const centimos = lerEuros(preco)
    if (centimos == null) return setErro('Preço inválido (ex.: 17 ou 17,50).')

    setAGravar(true)
    const { data: r, error } = await supabase.rpc('admin_save_booking', {
      p_id: marcacao?.id ?? null,
      p_client_id: cliente.id,
      p_service_id: servicoId,
      p_start_local: `${data} ${hora}`,
      p_source: origem,
      p_price_cents: centimos,
      p_client_notes: notas,
      p_confirm: confirmar,
    })
    setAGravar(false)
    if (error) return setErro(error.message || 'Não foi possível gravar a marcação.')
    if (!r.saved) return setAvisos(r)
    const mudouHora = marcacao && (inicio.data !== data || inicio.hora !== hora)
    onGuardado({ id: r.id, mudouHora, cliente, data, hora })
  }

  if (!cliente)
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">Para quem é a marcação?</p>
        <EscolherCliente onEscolher={setCliente} />
      </div>
    )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        gravar(false)
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line-btn px-4 py-3">
        <div>
          <p className="text-[15px] font-semibold">{cliente.name}</p>
          <p className="text-xs text-muted">
            {cliente.is_regular ? 'Habitual / local' : 'Visitante'}
            {cliente.is_blocked ? ' · bloqueado online' : ''}
          </p>
        </div>
        {!marcacao && (
          <button type="button" onClick={() => setCliente(null)} className="text-[13px] text-gold-2 hover:underline">
            Trocar
          </button>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-muted">Serviço</span>
        <select
          value={servicoId}
          onChange={(e) => {
            limparAvisos()
            setServicoId(e.target.value)
            setPrecoManual(false)
          }}
          className="field mt-1.5"
        >
          <option value="">Escolher…</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration_minutes} min{!s.is_active ? ' (desativado)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted">Dia</span>
          <input type="date" value={data} disabled={emCurso} onChange={(e) => { limparAvisos(); setData(e.target.value) }} className="field mt-1.5 disabled:opacity-50" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">Hora</span>
          <input type="time" step="300" value={hora} disabled={emCurso} onChange={(e) => { limparAvisos(); setHora(e.target.value) }} className="field mt-1.5 disabled:opacity-50" />
        </label>
      </div>

      {!emCurso && livres.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted-2">Horários livres (pode escrever outra hora):</p>
          <div className="flex flex-wrap gap-1.5">
            {livres.slice(0, 24).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => { limparAvisos(); setHora(h) }}
                className={`rounded-md px-2.5 py-1 text-xs tabular-nums ${h === hora ? 'bg-gold text-on-gold' : 'bg-hover text-fg hover:bg-gold-2/12'}`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted">Preço (€)</span>
          <input inputMode="decimal" value={preco} onChange={(e) => { setPrecoManual(true); setPreco(e.target.value) }} className="field mt-1.5" />
          {servico && (
            <span className="mt-1 block text-xs text-muted-2">
              Tabela: {formatarEuros(servico.price_regular_cents)} habitual · {formatarEuros(servico.price_visitor_cents)} visitante
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">Origem</span>
          <select value={origem} disabled={emCurso || origem === 'online'} onChange={(e) => setOrigem(e.target.value)} className="field mt-1.5 disabled:opacity-50">
            {(origem === 'online' ? ['online'] : ORIGENS_MANUAIS).map((o) => (
              <option key={o} value={o}>{ORIGENS[o]}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-muted">Observações (opcional)</span>
        <input value={notas} maxLength={200} onChange={(e) => setNotas(e.target.value)} className="field mt-1.5" />
      </label>

      {avisos && (
        <div className="rounded-lg border border-warn/40 bg-warn/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-warn">
            <AlertTriangle size={16} strokeWidth={1.8} aria-hidden /> Antes de gravar
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {avisos.outside_hours && <li>Fora do horário de funcionamento.</li>}
            {avisos.conflicts.map((c) => (
              <li key={c.id}>
                Conflito com: <span className="font-semibold">{formatarInstante(c.start_at)}</span> · {c.label}
              </li>
            ))}
          </ul>
          {avisos.conflicts.length > 0 && (
            <p className="mt-2 text-xs text-muted">Se gravar, fica como sobreposição intencional e aparece destacada na agenda.</p>
          )}
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => gravar(true)} disabled={aGravar} className="btn-gold px-4">
              {aGravar ? 'A gravar…' : 'Guardar mesmo assim'}
            </button>
            <button type="button" onClick={limparAvisos} className="btn-ghost px-4">Voltar</button>
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-warn" role="alert">{erro}</p>}

      {!avisos && (
        <button type="submit" disabled={aGravar} className="btn-primary">
          {aGravar ? 'A gravar…' : marcacao ? 'Guardar alterações' : 'Marcar'}
        </button>
      )}
    </form>
  )
}
