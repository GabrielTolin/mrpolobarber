import { Link } from 'react-router-dom'

export default function NaoEncontrado() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-ink">Página não encontrada</h1>
      <p className="mt-2 text-ink-muted">O endereço que abriu não existe.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white"
      >
        Ir para o início
      </Link>
    </section>
  )
}
