import { Link } from 'react-router-dom'

export default function NaoEncontrado() {
  return (
    <section className="card mx-auto max-w-xl text-center">
      <h1 className="font-serif text-[34px] leading-tight font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted">O endereço que abriu não existe.</p>
      <Link to="/" className="btn-primary mt-6 inline-block">
        Ir para o início
      </Link>
    </section>
  )
}
