import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatarTelefone } from '../../lib/telefone'
import Carregando from '../../components/Carregando'
import CabecalhoPagina from '../CabecalhoPagina'
import ClienteForm from './clientes/ClienteForm'
import { resumoCliente } from './clientes/clientesApi'

// Lista de clientes (Especificação 2.2, 2.10): pesquisa por nome ou telemóvel.
export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [limite, setLimite] = useState(2)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')
  const [pesquisa, setPesquisa] = useState('')
  const [novo, setNovo] = useState(false)

  const carregar = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase.from('clients').select('*, appointments(status, start_at, cancelled_late)').order('name'),
      supabase.from('settings').select('no_show_flag_threshold').eq('id', 1).single(),
    ])
    if (c.error) setErro('Não foi possível carregar os clientes.')
    else setClientes(c.data)
    if (s.data) setLimite(s.data.no_show_flag_threshold)
    setACarregar(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase()
    if (!termo) return clientes
    const digitos = termo.replace(/\D/g, '')
    return clientes.filter(
      (c) => c.name.toLowerCase().includes(termo) || (digitos.length >= 3 && c.phone_e164?.includes(digitos))
    )
  }, [clientes, pesquisa])

  async function criar(campos) {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...campos, created_via: 'walk_in' })
      .select('id')
      .single()
    if (error) return { erro: 'Não foi possível criar o cliente.' }
    navigate(`/admin/clientes/${data.id}`)
  }

  return (
    <>
      <CabecalhoPagina titulo="Clientes">
        {!novo && (
          <button type="button" onClick={() => setNovo(true)} className="btn-primary">
            + Novo cliente
          </button>
        )}
      </CabecalhoPagina>

      <div className="flex max-w-3xl flex-col gap-7">
        {novo && <ClienteForm onGravar={criar} onCancelar={() => setNovo(false)} />}

        <section className="card">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-2" size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por nome ou telemóvel"
              className="field pl-9"
            />
          </label>

          {erro && <p className="mt-4 text-sm text-warn" role="alert">{erro}</p>}

          {aCarregar ? (
            <Carregando />
          ) : erro ? null : filtrados.length === 0 ? (
            <p className="py-6 text-sm text-muted">{pesquisa ? 'Nenhum cliente encontrado.' : 'Ainda não há clientes.'}</p>
          ) : (
            <ul className="mt-4 flex flex-col">
              {filtrados.map((c) => {
                const r = resumoCliente(c.appointments)
                return (
                  <li key={c.id} className="border-t border-line-soft first:border-t-0">
                    <Link to={`/admin/clientes/${c.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-hover">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold">
                          {c.name}
                          {r.faltas >= limite && <span className="ml-2" title={`${r.faltas} faltas`}>⚠️</span>}
                        </p>
                        <p className="text-[13px] text-muted">
                          {c.phone_e164 ? formatarTelefone(c.phone_e164) : 'Sem telemóvel'}
                          {` · ${r.realizadas} ${r.realizadas === 1 ? 'visita' : 'visitas'}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2 text-xs">
                        {c.is_regular && <span className="rounded-md bg-gold-2/12 px-2 py-1 text-gold">Habitual</span>}
                        {c.is_blocked && <span className="rounded-md bg-warn/10 px-2 py-1 text-warn">Bloqueado</span>}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
