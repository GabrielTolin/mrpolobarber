import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { DIAS_SEMANA, horaCurta, partesLisboa } from '../../../lib/datas'
import Carregando from '../../../components/Carregando'
import AvisoAfetadas from './AvisoAfetadas'
import { foraDoHorario, marcacoesFuturas } from './afetadas'

// Horário semanal + pausas (1.3, 2.12). Grava tudo de uma vez.
export default function HorarioSemanal() {
  const [dias, setDias] = useState(null)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [afetadas, setAfetadas] = useState(null)
  const [aGravar, setAGravar] = useState(false)

  const carregar = useCallback(async () => {
    const [h, p] = await Promise.all([
      supabase.from('weekly_hours').select('*').order('weekday'),
      supabase.from('weekly_breaks').select('*').order('start_time'),
    ])
    if (h.error || p.error) return setErro('Não foi possível carregar o horário.')
    setDias(
      h.data.map((d) => ({
        weekday: d.weekday,
        aberto: d.is_open,
        abertura: horaCurta(d.open_time) || '09:00',
        fecho: horaCurta(d.close_time) || '19:00',
        pausas: p.data
          .filter((b) => b.weekday === d.weekday)
          .map((b) => ({ inicio: horaCurta(b.start_time), fim: horaCurta(b.end_time), label: b.label })),
      }))
    )
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  function alterar(weekday, mudancas) {
    setOk(false)
    setAfetadas(null)
    setDias((ds) => ds.map((d) => (d.weekday === weekday ? { ...d, ...mudancas } : d)))
  }

  function validar() {
    for (const d of dias.filter((x) => x.aberto)) {
      const nome = DIAS_SEMANA[d.weekday - 1]
      if (!(d.abertura < d.fecho)) return `${nome}: o fecho tem de ser depois da abertura.`
      for (const p of d.pausas) {
        if (!(p.inicio < p.fim)) return `${nome}: uma pausa tem o fim antes do início.`
        if (p.inicio < d.abertura || p.fim > d.fecho) return `${nome}: as pausas têm de estar dentro do horário.`
      }
    }
    return ''
  }

  async function gravar(confirmado = false) {
    setErro('')
    setOk(false)
    const problema = validar()
    if (problema) return setErro(problema)

    setAGravar(true)
    try {
      if (!confirmado) {
        // Avisa das marcações futuras que ficam fora do novo horário (dias sem horário excecional).
        const { data: excecoes } = await supabase.from('day_overrides').select('date')
        const comExcecao = new Set((excecoes ?? []).map((e) => e.date))
        const fora = (await marcacoesFuturas()).filter((m) => {
          const { data, diaSemana } = partesLisboa(m.start_at)
          return !comExcecao.has(data) && foraDoHorario(m, dias[diaSemana - 1])
        })
        if (fora.length > 0) {
          setAfetadas(fora)
          return
        }
      }

      const { error: e1 } = await supabase.from('weekly_hours').upsert(
        dias.map((d) => ({
          weekday: d.weekday,
          is_open: d.aberto,
          open_time: d.aberto ? d.abertura : null,
          close_time: d.aberto ? d.fecho : null,
        }))
      )
      if (e1) throw e1
      const { error: e2 } = await supabase.from('weekly_breaks').delete().gte('weekday', 1)
      if (e2) throw e2
      const pausas = dias
        .filter((d) => d.aberto)
        .flatMap((d) =>
          d.pausas.map((p) => ({ weekday: d.weekday, start_time: p.inicio, end_time: p.fim, label: p.label || null }))
        )
      if (pausas.length) {
        const { error: e3 } = await supabase.from('weekly_breaks').insert(pausas)
        if (e3) throw e3
      }
      setAfetadas(null)
      setOk(true)
      carregar()
    } catch {
      setErro('Não foi possível gravar o horário. Tente novamente.')
    } finally {
      setAGravar(false)
    }
  }

  if (!dias) return <section className="card">{erro ? <p className="text-sm text-warn">{erro}</p> : <Carregando />}</section>

  return (
    <section className="card">
      <h2 className="card-title">Horário semanal</h2>
      <p className="mt-1 text-sm text-muted">Os horários na página de marcações seguem este horário.</p>

      <ul className="mt-5 flex flex-col">
        {dias.map((d) => (
          <li key={d.weekday} className="flex flex-col gap-3 border-t border-line-soft py-4 sm:flex-row sm:items-start">
            <label className="flex w-36 shrink-0 items-center gap-3 pt-2">
              <input
                type="checkbox"
                checked={d.aberto}
                onChange={(e) => alterar(d.weekday, { aberto: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-gold)]"
              />
              <span className={`text-[15px] font-semibold ${d.aberto ? '' : 'text-muted-2'}`}>
                {DIAS_SEMANA[d.weekday - 1]}
              </span>
            </label>

            {d.aberto ? (
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <input type="time" value={d.abertura} onChange={(e) => alterar(d.weekday, { abertura: e.target.value })} className="field w-28" />
                  <span className="text-muted">às</span>
                  <input type="time" value={d.fecho} onChange={(e) => alterar(d.weekday, { fecho: e.target.value })} className="field w-28" />
                </div>
                {d.pausas.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-14 text-xs text-muted-2">Pausa</span>
                    <input
                      type="time"
                      value={p.inicio}
                      onChange={(e) => alterar(d.weekday, { pausas: d.pausas.map((x, j) => (j === i ? { ...x, inicio: e.target.value } : x)) })}
                      className="field w-28"
                    />
                    <span className="text-muted">às</span>
                    <input
                      type="time"
                      value={p.fim}
                      onChange={(e) => alterar(d.weekday, { pausas: d.pausas.map((x, j) => (j === i ? { ...x, fim: e.target.value } : x)) })}
                      className="field w-28"
                    />
                    <button
                      type="button"
                      aria-label="Remover pausa"
                      onClick={() => alterar(d.weekday, { pausas: d.pausas.filter((_, j) => j !== i) })}
                      className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg"
                    >
                      <X size={16} strokeWidth={1.8} aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => alterar(d.weekday, { pausas: [...d.pausas, { inicio: '13:00', fim: '14:00', label: 'Almoço' }] })}
                  className="flex w-fit items-center gap-1 text-[13px] text-gold-2 hover:underline"
                >
                  <Plus size={14} strokeWidth={1.8} aria-hidden /> Adicionar pausa
                </button>
              </div>
            ) : (
              <p className="pt-2 text-sm text-muted-2">Fechado</p>
            )}
          </li>
        ))}
      </ul>

      {afetadas && (
        <div className="mt-4">
          <AvisoAfetadas
            marcacoes={afetadas}
            mensagemWhatsapp={(m) =>
              `Olá ${m.client_name}, o horário da barbearia mudou e a sua marcação pode ser afetada. Pode contactar-me para remarcar?`
            }
            onConfirmar={() => gravar(true)}
            onCancelar={() => setAfetadas(null)}
            aGravar={aGravar}
          />
        </div>
      )}

      {erro && <p className="mt-4 text-sm text-warn" role="alert">{erro}</p>}
      {ok && <p className="mt-4 text-sm text-ok" role="status">Horário gravado.</p>}

      {!afetadas && (
        <button type="button" onClick={() => gravar(false)} disabled={aGravar} className="btn-primary mt-5">
          {aGravar ? 'A gravar…' : 'Gravar horário'}
        </button>
      )}
    </section>
  )
}
