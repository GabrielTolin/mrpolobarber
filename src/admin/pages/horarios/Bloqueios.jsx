import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { formatarData, formatarInstante, hojeLisboa, partesLisboa, somarDias } from '../../../lib/datas'
import AvisoAfetadas from './AvisoAfetadas'

const TIPOS = {
  slot: 'Bloqueio de horas',
  day_off: 'Folga',
  vacation: 'Férias',
}

// Bloqueios, folgas e férias (1.8, 2.12). Gravados pela função admin_save_block
// (fila da agenda + aviso das marcações afetadas, 3.6).
export default function Bloqueios() {
  const [lista, setLista] = useState([])
  const [form, setForm] = useState(null)
  const [afetadas, setAfetadas] = useState(null)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .gte('end_at', new Date().toISOString())
      .order('start_at')
    if (error) setErro('Não foi possível carregar os bloqueios.')
    else setLista(data)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  function novo(kind) {
    const hoje = hojeLisboa()
    setErro('')
    setAfetadas(null)
    setForm({ kind, data: hoje, inicio: '12:00', fim: '13:00', ate: hoje, reason: '' })
  }

  // Período em hora de Lisboa ('AAAA-MM-DD HH:MM'); a função converte para UTC.
  function periodo() {
    if (form.kind === 'slot') return [`${form.data} ${form.inicio}`, `${form.data} ${form.fim}`]
    const ate = form.kind === 'vacation' ? form.ate : form.data
    return [`${form.data} 00:00`, `${somarDias(ate, 1)} 00:00`]
  }

  async function gravar(confirmado = false) {
    setErro('')
    if (form.kind === 'slot' && !(form.inicio < form.fim)) return setErro('O fim tem de ser depois do início.')
    if (form.kind === 'vacation' && form.ate < form.data) return setErro('A data final tem de ser depois da inicial.')

    const [inicio, fim] = periodo()
    setAGravar(true)
    const { data, error } = await supabase.rpc('admin_save_block', {
      p_id: null,
      p_kind: form.kind,
      p_start_local: inicio,
      p_end_local: fim,
      p_reason: form.reason,
      p_confirm: confirmado,
    })
    setAGravar(false)
    if (error) return setErro('Não foi possível gravar o bloqueio.')
    if (!data.saved) return setAfetadas(data.affected)
    setForm(null)
    setAfetadas(null)
    carregar()
  }

  async function apagar(b) {
    if (!window.confirm('Remover este bloqueio? Esses horários voltam a ficar disponíveis.')) return
    const { error } = await supabase.rpc('admin_delete_block', { p_id: b.id })
    if (error) setErro('Não foi possível remover o bloqueio.')
    carregar()
  }

  function descrever(b) {
    if (b.kind === 'slot') return `${formatarInstante(b.start_at)}–${partesLisboa(b.end_at).hora}`
    const primeiro = partesLisboa(b.start_at).data
    const ultimo = somarDias(partesLisboa(b.end_at).data, -1)
    return primeiro === ultimo ? formatarData(primeiro) : `${formatarData(primeiro)} a ${formatarData(ultimo)}`
  }

  return (
    <section className="card">
      <h2 className="card-title">Bloqueios, folgas e férias</h2>
      <p className="mt-1 text-sm text-muted">Os períodos bloqueados deixam de aparecer na página de marcações.</p>

      {!form && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(TIPOS).map(([kind, nome]) => (
            <button key={kind} type="button" onClick={() => novo(kind)} className="btn-ghost px-4">
              + {nome}
            </button>
          ))}
        </div>
      )}

      {form && (
        <div className="mt-5 flex flex-col gap-4 rounded-lg border border-line-btn p-4">
          <p className="text-[15px] font-semibold">{TIPOS[form.kind]}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm text-muted">{form.kind === 'vacation' ? 'De' : 'Data'}</span>
              <input type="date" min={hojeLisboa()} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="field mt-1.5" />
            </label>
            {form.kind === 'vacation' && (
              <label className="block">
                <span className="text-sm text-muted">Até (inclusive)</span>
                <input type="date" min={form.data} value={form.ate} onChange={(e) => setForm({ ...form, ate: e.target.value })} className="field mt-1.5" />
              </label>
            )}
            {form.kind === 'slot' && (
              <div className="flex items-center gap-2">
                <input type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="field w-28" />
                <span className="text-muted">às</span>
                <input type="time" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="field w-28" />
              </div>
            )}
          </div>
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Motivo (opcional, ex.: consulta médica)"
            className="field"
          />

          {afetadas ? (
            <AvisoAfetadas
              marcacoes={afetadas}
              mensagemWhatsapp={(m) =>
                `Olá ${m.client_name}, tive um imprevisto e não vou conseguir atender na hora da sua marcação (${formatarInstante(m.start_at)}). Podemos remarcar?`
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
        {lista.length === 0 && !form && <li className="py-2 text-sm text-muted-2">Nenhum bloqueio marcado.</li>}
        {lista.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 text-sm">
            <span>
              <span className="font-semibold">{TIPOS[b.kind]}</span>
              <span className="text-muted">
                {' · '}
                {descrever(b)}
                {b.reason ? ` · ${b.reason}` : ''}
              </span>
            </span>
            <button type="button" aria-label="Remover" onClick={() => apagar(b)} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg">
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
