import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Power, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { formatarEuros } from '../../lib/dinheiro'
import Carregando from '../../components/Carregando'
import CabecalhoPagina from '../CabecalhoPagina'
import ServicoForm from './servicos/ServicoForm'

const ICONE = { size: 16, strokeWidth: 1.8, 'aria-hidden': true }

// Serviços e preços (Especificação 2.11).
export default function Servicos() {
  const [servicos, setServicos] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(null) // null | 'novo' | serviço
  const [aGravar, setAGravar] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('is_active', { ascending: false })
      .order('sort_order')
      .order('name')
    if (error) setErro('Não foi possível carregar os serviços.')
    else setServicos(data)
    setACarregar(false)
  }, [])

  useEffect(() => {
    // Carregamento inicial a partir do Supabase (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  const ativos = servicos.filter((s) => s.is_active)

  async function gravar(campos) {
    setAGravar(true)
    setErroForm('')
    const pedido =
      editando === 'novo'
        ? supabase.from('services').insert({
            ...campos,
            sort_order: Math.max(0, ...servicos.map((s) => s.sort_order)) + 1,
          })
        : supabase.from('services').update(campos).eq('id', editando.id)
    const { error } = await pedido
    setAGravar(false)
    if (error) return setErroForm('Não foi possível gravar. Tente novamente.')
    setEditando(null)
    carregar()
  }

  async function alternarAtivo(servico) {
    setErro('')
    const { error } = await supabase
      .from('services')
      .update({ is_active: !servico.is_active })
      .eq('id', servico.id)
    if (error) setErro('Não foi possível mudar o estado do serviço.')
    carregar()
  }

  // Troca a posição com o vizinho na lista de ativos (ordem da página pública).
  async function mover(servico, direcao) {
    const i = ativos.findIndex((s) => s.id === servico.id)
    const vizinho = ativos[i + direcao]
    if (!vizinho) return
    setErro('')
    const [a, b] = await Promise.all([
      supabase.from('services').update({ sort_order: vizinho.sort_order }).eq('id', servico.id),
      supabase.from('services').update({ sort_order: servico.sort_order }).eq('id', vizinho.id),
    ])
    if (a.error || b.error) setErro('Não foi possível mudar a ordem.')
    carregar()
  }

  async function apagar(servico) {
    if (!window.confirm(`Apagar o serviço "${servico.name}"? Esta ação não pode ser desfeita.`)) return
    setErro('')
    const { error } = await supabase.from('services').delete().eq('id', servico.id)
    // 23503 = chave estrangeira: o serviço já foi usado em marcações (3.3).
    if (error?.code === '23503')
      setErro(`"${servico.name}" já foi usado em marcações, por isso não pode ser apagado. Desative-o.`)
    else if (error) setErro('Não foi possível apagar o serviço.')
    carregar()
  }

  return (
    <>
      <CabecalhoPagina titulo="Serviços e preços">
        {!editando && (
          <button type="button" onClick={() => setEditando('novo')} className="btn-primary">
            + Novo serviço
          </button>
        )}
      </CabecalhoPagina>

      <div className="flex max-w-3xl flex-col gap-7">
        {editando && (
          <ServicoForm
            key={editando === 'novo' ? 'novo' : editando.id}
            servico={editando === 'novo' ? null : editando}
            onGravar={gravar}
            onCancelar={() => {
              setEditando(null)
              setErroForm('')
            }}
            aGravar={aGravar}
            erroServidor={erroForm}
          />
        )}

        {erro && (
          <p className="text-sm text-warn" role="alert">
            {erro}
          </p>
        )}

        <section className="card">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="card-title">Serviços</h2>
            <span className="text-[13px] text-muted">{ativos.length} ativos</span>
          </div>

          {aCarregar ? (
            <Carregando />
          ) : servicos.length === 0 ? (
            <p className="py-6 text-sm text-muted">Ainda não há serviços.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {servicos.map((s) => {
                const posAtivo = ativos.findIndex((a) => a.id === s.id)
                return (
                  <li
                    key={s.id}
                    className={`flex flex-col gap-3 rounded-lg px-3 py-3 sm:flex-row sm:items-center sm:gap-4 ${
                      s.is_active ? '' : 'opacity-55'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">
                        {s.name}
                        {!s.is_active && <span className="ml-2 text-xs font-normal text-muted-2">Inativo</span>}
                      </p>
                      <p className="text-[13px] text-muted">
                        {s.duration_minutes} min
                        {s.description ? ` · ${s.description}` : ''}
                      </p>
                    </div>

                    <div className="flex gap-5 text-sm">
                      <div className="text-right">
                        <p className="text-price">{formatarEuros(s.price_regular_cents)}</p>
                        <p className="text-xs text-muted-2">habitual</p>
                      </div>
                      <div className="text-right">
                        <p className="text-price">{formatarEuros(s.price_visitor_cents)}</p>
                        <p className="text-xs text-muted-2">visitante</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-muted">
                      {s.is_active && (
                        <>
                          <BotaoIcone titulo="Subir" onClick={() => mover(s, -1)} disabled={posAtivo <= 0}>
                            <ArrowUp {...ICONE} />
                          </BotaoIcone>
                          <BotaoIcone
                            titulo="Descer"
                            onClick={() => mover(s, 1)}
                            disabled={posAtivo === ativos.length - 1}
                          >
                            <ArrowDown {...ICONE} />
                          </BotaoIcone>
                        </>
                      )}
                      <BotaoIcone titulo="Editar" onClick={() => setEditando(s)}>
                        <Pencil {...ICONE} />
                      </BotaoIcone>
                      <BotaoIcone titulo={s.is_active ? 'Desativar' : 'Reativar'} onClick={() => alternarAtivo(s)}>
                        <Power {...ICONE} />
                      </BotaoIcone>
                      <BotaoIcone titulo="Apagar" onClick={() => apagar(s)}>
                        <Trash2 {...ICONE} />
                      </BotaoIcone>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted-2">
          Os serviços ativos aparecem na página de marcações por esta ordem, sem preço. Um serviço já usado em
          marcações não se apaga: desativa-se, para manter o histórico.
        </p>
      </div>
    </>
  )
}

function BotaoIcone({ titulo, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg p-2 transition-colors hover:bg-hover hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
