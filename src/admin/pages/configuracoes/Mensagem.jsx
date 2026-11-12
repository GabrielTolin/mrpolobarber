// Mensagem de erro ou de sucesso por baixo de um formulário.
export default function Mensagem({ erro, ok }) {
  if (erro)
    return (
      <p className="text-sm text-warn" role="alert">
        {erro}
      </p>
    )
  if (ok)
    return (
      <p className="text-sm text-ok" role="status">
        {ok}
      </p>
    )
  return null
}
