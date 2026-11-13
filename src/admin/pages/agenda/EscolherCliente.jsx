import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { formatarTelefone, normalizarTelefone } from '../../../lib/telefone'
import { donoDoTelefone } from '../clientes/clientesApi'

// Escolher um cliente existente ou criar um novo na hora (2.2 passo 2: só o nome é obrigatório).
export default function EscolherCliente({ onEscolher }) {
  const [clientes, setClientes] = useState([])
  const [pesquisa, setPesquisa] = useState('')
  const [novo, setNovo] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name, phone_e164, is_regular, is_blocked')
      .order('name')
      .then(({ data }) => setClientes(data ?? []))
  }, [])

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    if (!termo) return clientes.slice(0, 8)
    const digitos = termo.replace(/\D/g, '')
    return clientes
      .filter((c) => c.name.toLowerCase().includes(termo) || (digitos.length >= 3 && c.phone_e164?.includes(digitos)))
      .slice(0, 8)
  }, [clientes, pesquisa])

  async function criar(e) {
    e.preventDefault()
    setErro('')
    if (!novo.nome.trim()) return setErro('Indique o nome.')
    const e164 = novo.telefone.trim() ? normalizarTelefone(novo.telefone) : null
    if (novo.telefone.trim() && !e164) return setErro('Telemóvel inválido (ex.: 912 345 678).')
    if (e164) {
      const dono = await donoDoTelefone(e164)
      if (dono) return setErro(`Este número já pertence a ${dono.name}.`)
    }
    const { data, error } = await supabase
      .from('clients')
      .insert({ name: novo.nome.trim(), phone_e164: e164, is_regular: novo.habitual, created_via: 'walk_in' })
      .select('id, name, phone_e164, is_regular, is_blocked')
      .single()
    if (error) return setErro('Não foi possível criar o cliente.')
    onEscolher(data)
  }

  if (novo)
    return (
      <form onSubmit={criar} className="flex flex-col gap-3 rounded-lg border border-line-btn p-4">
        <p className="text-sm font-semibold">Novo cliente</p>
        <input autoFocus value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome" className="field" />
        <input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} inputMode="tel" placeholder="Telemóvel (opcional)" className="field" />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={novo.habitual} onChange={(e) => setNovo({ ...novo, habitual: e.target.checked })} className="h-4 w-4 accent-[var(--color-gold)]" />
          Habitual / local
        </label>
        {erro && <p className="text-sm text-warn">{erro}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn-gold px-4">Criar e escolher</button>
          <button type="button" onClick={() => setNovo(null)} className="btn-ghost px-4">Voltar</button>
        </div>
      </form>
    )

  return (
    <div className="flex flex-col gap-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-2" size={16} strokeWidth={1.8} aria-hidden />
        <input autoFocus type="search" value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Pesquisar cliente" className="field pl-9" />
      </label>
      <ul className="flex flex-col">
        {filtrados.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onEscolher(c)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-hover">
              <span className="text-sm font-semibold">{c.name}</span>
              <span className="text-xs text-muted">
                {c.phone_e164 ? formatarTelefone(c.phone_e164) : ''}
                {c.is_regular ? ' · Habitual' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setNovo({ nome: pesquisa.replace(/\d/g, '').trim(), telefone: /\d{3,}/.test(pesquisa) ? pesquisa : '', habitual: false })}
        className="flex w-fit items-center gap-2 text-[13px] text-gold-2 hover:underline"
      >
        <UserPlus size={14} strokeWidth={1.8} aria-hidden /> Novo cliente
      </button>
    </div>
  )
}
