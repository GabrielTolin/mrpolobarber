import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { formatarData, horaCurta, hojeLisboa, partesLisboa } from '../../../lib/datas'
import AvisoAfetadas from './AvisoAfetadas'
import { foraDoHorario, marcacoesFuturas } from './afetadas'

// Horário excecional de uma data (2.2, 2.12): substitui o horário semanal
// nesse dia, incluindo as pausas (3.3 regra 4).
export default function DiasEspeciais() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(null)
  const [afetadas, setAfetadas] = useState(null)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('day_overrides')
      .select('*')
      .gte('date', hojeLisboa())
      .order('date')
    if (error) setErro('Não foi possível carregar os dias especiais.')
    else setLista(data)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  function novo() {
    setErro('')
    setAfetadas(null)
    setForm({ date: hojeLisboa(), fechado: true, abertura: '10:00', fecho: '18:00', note: '' })
  }

  async function gravar(confirmado = false) {
    setErro('')
    if (!form.date) return setErro('Escolha a data.')
    if (!form.fechado && !(form.abertura < form.fecho)) return setErro('O fecho tem de ser depois da abertura.')

    setAGravar(true)
    try {
      if (!confirmado) {
        const horario = { aberto: !form.fechado, abertura: form.abertura, fecho: form.fecho, pausas: [] }
        const fora = (await marcacoesFuturas()).filter(
          (m) => partesLisboa(m.start_at).data === form.date && foraDoHorario(m, horario)
        )
        if (fora.length > 0) return setAfetadas(fora)
      }
      const { error } = await supabase.from('day_overrides').upsert({
        date: form.date,
        is_closed: form.fechado,
        open_time: form.fechado ? null : form.abertura,
        close_time: form.fechado ? null : form.fecho,
        note: form.note.trim() || null,
      })
      if (error) throw error
      setForm(null)
      setAfetadas(null)
      carregar()
    } catch {
      setErro('Não foi possível gravar o dia especial.')
    } finally {
      setAGravar(false)
    }
  }

  async function apagar(dia) {
    if (!window.confirm(`Remover o horário especial de ${formatarData(dia.date)}? Volta a valer o horário semanal.`)) return
    const { error } = await supabase.from('day_overrides').delete().eq('date', dia.date)
    if (error) setErro('Não foi possível remover.')
    carregar()
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="card-title">Dias com horário especial</h2>
        {!form && (
          <button type="button" onClick={novo} className="text-[13px] text-gold-2 hover:underline">
            + Adicionar
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Para abrir mais tarde, fechar mais cedo ou fechar um dia concreto.</p>

      {form && (
        <div className="mt-5 flex flex-col gap-4 rounded-lg border border-line-btn p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm text-muted">Data</span>
              <input type="date" min={hojeLisboa()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="field mt-1.5" />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Nesse dia</span>
              <select
                value={form.fechado ? 'fechado' : 'horario'}
                onChange={(e) => setForm({ ...form, fechado: e.target.value === 'fechado' })}
                className="field mt-1.5"
              >
                <option value="fechado">Fechado</option>
                <option value="horario">Horário especial</option>
              </select>
            </label>
            {!form.fechado && (
              <div className="flex items-center gap-2">
                <input type="time" value={form.abertura} onChange={(e) => setForm({ ...form, abertura: e.target.value })} className="field w-28" />
                <span className="text-muted">às</span>
                <input type="time" value={form.fecho} onChange={(e) => setForm({ ...form, fecho: e.target.value })} className="field w-28" />
              </div>
            )}
          </div>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Nota (opcional)"
            className="field"
          />
          {!form.fechado && <p className="text-xs text-muted-2">Neste dia não há pausas. Se precisar de almoço, crie um bloqueio.</p>}

          {afetadas ? (
            <AvisoAfetadas
              marcacoes={afetadas}
              mensagemWhatsapp={(m) =>
                `Olá ${m.client_name}, no dia da sua marcação o horário da barbearia vai ser diferente. Pode contactar-me para remarcar?`
              }
              onConfirmar={() => gravar(true)}
              onCancelar={() => setAfetadas(null)}
              aGravar={aGravar}
            />
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={() => gravar(false)} disabled={aGravar} className="btn-primary">
                {aGravar ? 'A gravar…' : 'Gravar'}
              </button>
              <button type="button" onClick={() => setForm(null)} className="btn-ghost px-5">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {erro && <p className="mt-4 text-sm text-warn" role="alert">{erro}</p>}

      <ul className="mt-4 flex flex-col">
        {lista.length === 0 && !form && <li className="py-2 text-sm text-muted-2">Nenhum dia especial marcado.</li>}
        {lista.map((d) => (
          <li key={d.date} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 text-sm">
            <span>
              <span className="font-semibold">{formatarData(d.date)}</span>
              <span className="text-muted">
                {' · '}
                {d.is_closed ? 'Fechado' : `${horaCurta(d.open_time)}–${horaCurta(d.close_time)}`}
                {d.note ? ` · ${d.note}` : ''}
              </span>
            </span>
            <button type="button" aria-label="Remover" onClick={() => apagar(d)} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg">
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
