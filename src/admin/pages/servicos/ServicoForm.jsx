import { useState } from 'react'
import { eurosParaCampo, lerEuros } from '../../../lib/dinheiro'

const DURACAO_MIN = 5
const DURACAO_MAX = 480

// Formulário de criar/editar um serviço (2.11). Devolve os campos já validados
// e convertidos (preços em cêntimos) a `onGravar`.
export default function ServicoForm({ servico, onGravar, onCancelar, aGravar, erroServidor }) {
  const [nome, setNome] = useState(servico?.name ?? '')
  const [descricao, setDescricao] = useState(servico?.description ?? '')
  const [duracao, setDuracao] = useState(servico?.duration_minutes?.toString() ?? '')
  const [precoHabitual, setPrecoHabitual] = useState(eurosParaCampo(servico?.price_regular_cents))
  const [precoVisitante, setPrecoVisitante] = useState(eurosParaCampo(servico?.price_visitor_cents))
  const [erro, setErro] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    const minutos = Number(duracao)
    const habitual = lerEuros(precoHabitual)
    // Visitante vazio num serviço novo: começa igual ao habitual (2.11).
    const visitante = precoVisitante.trim() === '' ? habitual : lerEuros(precoVisitante)

    if (nome.trim() === '') return setErro('Indique o nome do serviço.')
    if (!Number.isInteger(minutos) || minutos < DURACAO_MIN || minutos > DURACAO_MAX)
      return setErro(`A duração tem de ser um número inteiro de minutos, entre ${DURACAO_MIN} e ${DURACAO_MAX}.`)
    if (habitual == null) return setErro('Preço habitual inválido (ex.: 17 ou 17,50).')
    if (visitante == null) return setErro('Preço de visitante inválido (ex.: 17 ou 17,50).')

    onGravar({
      name: nome.trim(),
      description: descricao.trim() || null,
      duration_minutes: minutos,
      price_regular_cents: habitual,
      price_visitor_cents: visitante,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="card card-gold flex flex-col gap-4">
      <h2 className="card-title">{servico ? 'Editar serviço' : 'Novo serviço'}</h2>

      <label className="block">
        <span className="text-sm font-medium text-muted">Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} required className="field mt-1.5" />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-muted">Descrição (opcional)</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Aparece por baixo do nome na página de marcações"
          className="field mt-1.5"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-muted">Duração (min)</span>
          <input
            type="number"
            inputMode="numeric"
            min={DURACAO_MIN}
            max={DURACAO_MAX}
            step="1"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            required
            className="field mt-1.5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">Preço habitual (€)</span>
          <input
            inputMode="decimal"
            value={precoHabitual}
            onChange={(e) => setPrecoHabitual(e.target.value)}
            required
            className="field mt-1.5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">Preço visitante (€)</span>
          <input
            inputMode="decimal"
            value={precoVisitante}
            onChange={(e) => setPrecoVisitante(e.target.value)}
            placeholder={servico ? '' : 'Igual ao habitual'}
            className="field mt-1.5"
          />
        </label>
      </div>

      <p className="text-xs text-muted-2">
        Mudar preços ou duração só vale para marcações novas. As já feitas mantêm o que foi combinado.
      </p>

      {(erro || erroServidor) && (
        <p className="text-sm text-warn" role="alert">
          {erro || erroServidor}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={aGravar} className="btn-primary">
          {aGravar ? 'A gravar…' : 'Gravar'}
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost px-5">
          Cancelar
        </button>
      </div>
    </form>
  )
}
