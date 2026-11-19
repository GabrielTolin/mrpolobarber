import { useCallback, useEffect, useState } from 'react'
import { Repeat } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatarData, hojeLisboa, somarDias } from '../../lib/datas'
import { ESTADOS_SERIE, criarSerie, decidirSerie, pararSerie, resumoGeracao, seriesDoCliente, textoSerie } from './semanalApi'

// Marcação semanal na ficha do cliente (S.3): ver, aprovar pedido, criar (D4) e parar (D3).
export default function SeccaoSemanal({ cliente, onMudou }) {
  const [series, setSeries] = useState(null)
  const [servicos, setServicos] = useState([])
  const [criar, setCriar] = useState(false)
  const [form, setForm] = useState({ servico: '', data: somarDias(hojeLisboa(), 7), hora: '10:00' })
  const [aGravar, setAGravar] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  const carregar = useCallback(async () => {
    try {
      setSeries(await seriesDoCliente(cliente.id))
    } catch {
      setSeries([])
    }
  }, [cliente.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!criar || servicos.length) return
    supabase
      .from('services')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setServicos(data ?? [])
        if (data?.[0]) setForm((f) => ({ ...f, servico: f.servico || data[0].id }))
      })
  }, [criar, servicos.length])

  async function acao(fn, sucesso) {
    setAGravar(true)
    setMensagem(null)
    try {
      const r = await fn()
      setMensagem({ ok: true, texto: sucesso(r) })
      onMudou?.()
    } catch (e) {
      setMensagem({ ok: false, texto: e.message })
    }
    setAGravar(false)
    carregar()
  }

  const parar = (s) =>
    window.confirm(`Parar a marcação semanal (${textoSerie(s)})? As marcações futuras dela são canceladas; as passadas ficam.`) &&
    acao(
      () => pararSerie(s.id),
      (r) => `Marcação semanal parada. ${r.cancelled} ${r.cancelled === 1 ? 'marcação futura cancelada' : 'marcações futuras canceladas'}.`
    )

  const decidir = (s, aprovar) =>
    acao(
      () => decidirSerie(s.id, aprovar),
      (r) => (aprovar ? `Aprovada. ${resumoGeracao(r)}.` : 'Pedido recusado.')
    )

  function gravarNova(e) {
    e.preventDefault()
    acao(
      () => criarSerie(cliente.id, form.servico, `${form.data}T${form.hora}:00`),
      (r) => {
        setCriar(false)
        return `Marcação semanal criada. ${resumoGeracao(r)}.`
      }
    )
  }

  const abertas = (series ?? []).filter((s) => s.status === 'pending' || s.status === 'active')
  const antigas = (series ?? []).filter((s) => s.status === 'rejected' || s.status === 'stopped')
  const podeCriar = cliente.is_regular && !cliente.is_blocked

  return (
    <section className="card flex flex-col gap-3">
      <h2 className="card-title flex items-center gap-2">
        <Repeat size={18} strokeWidth={1.8} className="text-gold" aria-hidden /> Marcação semanal
      </h2>

      {series === null ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : abertas.length === 0 ? (
        <p className="text-sm text-muted">
          {podeCriar ? 'Sem marcação semanal.' : 'Só clientes habituais (e não bloqueados) podem ter marcação semanal.'}
        </p>
      ) : (
        abertas.map((s) => (
          <div key={s.id} className="flex flex-col gap-2.5 rounded-lg border border-line-soft p-3">
            <div className="flex items-baseline justify-between gap-3">
              <b className="text-[15px] font-semibold">{textoSerie(s).replace(/^./, (c) => c.toUpperCase())}</b>
              <span className={`text-xs ${ESTADOS_SERIE[s.status].cor}`}>{ESTADOS_SERIE[s.status].label}</span>
            </div>
            <p className="text-[13px] text-muted">
              {s.services?.name} · {s.requested_by === 'client' ? 'pedida pelo cliente' : 'criada no painel'}
              {s.decided_at ? ` · desde ${formatarData(s.decided_at.slice(0, 10))}` : ''}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {s.status === 'pending' && (
                <>
                  <button type="button" disabled={aGravar} onClick={() => decidir(s, true)} className="btn-gold px-4">Aprovar</button>
                  <button type="button" disabled={aGravar} onClick={() => decidir(s, false)} className="btn-ghost px-4">Recusar</button>
                </>
              )}
              {s.status === 'active' && (
                <button type="button" disabled={aGravar} onClick={() => parar(s)} className="btn-ghost px-4 text-warn">
                  Parar marcação semanal
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {mensagem && (
        <p role="status" className={`text-sm ${mensagem.ok ? 'text-ok' : 'text-warn'}`}>
          {mensagem.texto}
        </p>
      )}

      {podeCriar && !criar && (
        <button type="button" onClick={() => { setMensagem(null); setCriar(true) }} className="btn-ghost w-fit px-5">
          + Nova marcação semanal
        </button>
      )}

      {criar && (
        <form onSubmit={gravarNova} className="flex flex-col gap-3 border-t border-line-soft pt-3">
          <label className="block text-sm">
            <span className="text-muted">Serviço</span>
            <select value={form.servico} onChange={(e) => setForm({ ...form, servico: e.target.value })} className="field mt-1.5">
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-muted">1.ª semana</span>
              <input type="date" required value={form.data} min={hojeLisboa()} onChange={(e) => setForm({ ...form, data: e.target.value })} className="field mt-1.5" />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Hora</span>
              <input type="time" required step="300" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className="field mt-1.5" />
            </label>
          </div>
          <p className="text-xs text-muted-2">
            Repete todas as semanas nesse dia e hora. Ficam sempre marcadas as próximas 4 semanas; as que não puderem ser (feriado, férias,
            hora ocupada) saltam e recebe um aviso.
          </p>
          <div className="flex gap-2.5">
            <button type="submit" disabled={aGravar || !form.servico} className="btn-primary">
              {aGravar ? 'A criar…' : 'Criar marcação semanal'}
            </button>
            <button type="button" onClick={() => setCriar(false)} className="btn-ghost px-4">Cancelar</button>
          </div>
        </form>
      )}

      {antigas.length > 0 && (
        <details className="text-[13px] text-muted">
          <summary className="cursor-pointer">Anteriores ({antigas.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {antigas.map((s) => (
              <li key={s.id}>
                {textoSerie(s)} · {s.services?.name} · {ESTADOS_SERIE[s.status].label.toLowerCase()}
                {s.stop_reason ? ` (${s.stop_reason})` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
