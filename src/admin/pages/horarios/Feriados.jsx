import { useCallback, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { formatarData, hojeLisboa } from '../../../lib/datas'

const TIPOS = { national: 'Nacional', municipal: 'Municipal', custom: 'Personalizado' }

// Feriados (1.3, 2.12): ligar/desligar, acrescentar dias próprios.
// Os nacionais e o municipal vêm carregados (3.8 §5) e não se apagam, só se desligam.
export default function Feriados() {
  const anoAtual = Number(hojeLisboa().slice(0, 4))
  const [ano, setAno] = useState(anoAtual)
  const [lista, setLista] = useState([])
  const [novo, setNovo] = useState(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', `${ano}-01-01`)
      .lte('date', `${ano}-12-31`)
      .order('date')
    if (error) setErro('Não foi possível carregar os feriados.')
    else setLista(data)
  }, [ano])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  async function alternar(f) {
    setErro('')
    const { error } = await supabase.from('holidays').update({ is_active: !f.is_active }).eq('date', f.date)
    if (error) setErro('Não foi possível alterar o feriado.')
    carregar()
  }

  async function acrescentar(e) {
    e.preventDefault()
    setErro('')
    if (!novo.date || !novo.name.trim()) return setErro('Indique a data e o nome.')
    const { error } = await supabase
      .from('holidays')
      .insert({ date: novo.date, name: novo.name.trim(), kind: 'custom', is_active: true })
    if (error?.code === '23505') return setErro('Já existe um feriado nesse dia.')
    if (error) return setErro('Não foi possível acrescentar o dia.')
    setNovo(null)
    carregar()
  }

  async function apagar(f) {
    if (!window.confirm(`Remover "${f.name}"?`)) return
    const { error } = await supabase.from('holidays').delete().eq('date', f.date)
    if (error) setErro('Não foi possível remover.')
    carregar()
  }

  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="card-title">Feriados</h2>
        <div className="flex gap-1 text-sm">
          {[anoAtual, anoAtual + 1].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAno(a)}
              className={`rounded-lg px-3 py-1.5 ${a === ano ? 'bg-gold-2/12 font-semibold text-gold' : 'text-muted hover:bg-hover'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Nos feriados ligados não se pode marcar. Desligue os dias em que quiser abrir.</p>

      <ul className="mt-4 flex flex-col">
        {lista.map((f) => (
          <li key={f.date} className="flex items-center justify-between gap-3 border-t border-line-soft py-3 text-sm">
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={f.is_active}
                onChange={() => alternar(f)}
                className="h-4 w-4 accent-[var(--color-gold)]"
              />
              <span className={f.is_active ? '' : 'text-muted-2'}>
                <span className="font-semibold">{formatarData(f.date, { ano: false })}</span>
                {' · '}
                {f.name}
                <span className="text-xs text-muted-2"> · {TIPOS[f.kind]}</span>
              </span>
            </label>
            {f.kind === 'custom' && (
              <button type="button" aria-label="Remover" onClick={() => apagar(f)} className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg">
                <Trash2 size={16} strokeWidth={1.8} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {novo ? (
        <form onSubmit={acrescentar} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-line-btn p-4">
          <label className="block">
            <span className="text-sm text-muted">Data</span>
            <input type="date" value={novo.date} onChange={(e) => setNovo({ ...novo, date: e.target.value })} className="field mt-1.5" />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-muted">Nome</span>
            <input value={novo.name} onChange={(e) => setNovo({ ...novo, name: e.target.value })} className="field mt-1.5" />
          </label>
          <button type="submit" className="btn-primary">Acrescentar</button>
          <button type="button" onClick={() => setNovo(null)} className="btn-ghost px-5">Cancelar</button>
        </form>
      ) : (
        <button type="button" onClick={() => setNovo({ date: hojeLisboa(), name: '' })} className="mt-4 text-[13px] text-gold-2 hover:underline">
          + Acrescentar dia fechado
        </button>
      )}

      {erro && <p className="mt-4 text-sm text-warn" role="alert">{erro}</p>}
    </section>
  )
}
