import { useState } from 'react'
import { formatarTelefone, normalizarTelefone } from '../../../lib/telefone'
import { donoDoTelefone } from './clientesApi'

// Criar/editar os dados base de um cliente (1.8, 2.10). Só o nome é obrigatório.
export default function ClienteForm({ cliente, onGravar, onCancelar }) {
  const [nome, setNome] = useState(cliente?.name ?? '')
  const [telefone, setTelefone] = useState(formatarTelefone(cliente?.phone_e164))
  const [habitual, setHabitual] = useState(cliente?.is_regular ?? false)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) return setErro('Indique o nome.')
    const e164 = telefone.trim() ? normalizarTelefone(telefone) : null
    if (telefone.trim() && !e164) return setErro('Telemóvel inválido (ex.: 912 345 678).')

    setAGravar(true)
    if (e164) {
      const dono = await donoDoTelefone(e164, cliente?.id)
      if (dono) {
        setAGravar(false)
        return setErro(`Este número já pertence a ${dono.name}.`)
      }
    }
    const resultado = await onGravar({ name: nome.trim(), phone_e164: e164, is_regular: habitual })
    setAGravar(false)
    if (resultado?.erro) setErro(resultado.erro)
  }

  return (
    <form onSubmit={handleSubmit} className="card card-gold flex flex-col gap-4">
      <h2 className="card-title">{cliente ? 'Editar cliente' : 'Novo cliente'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-muted">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className="field mt-1.5" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-muted">Telemóvel (opcional)</span>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            inputMode="tel"
            placeholder="912 345 678"
            className="field mt-1.5"
          />
        </label>
      </div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={habitual}
          onChange={(e) => setHabitual(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-gold)]"
        />
        <span className="text-sm">
          Habitual / local <span className="text-muted-2">— paga o preço habitual nas marcações online</span>
        </span>
      </label>

      {erro && (
        <p className="text-sm text-warn" role="alert">
          {erro}
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
