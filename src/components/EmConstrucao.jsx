import { Construction } from 'lucide-react'

// Página provisória da Etapa 4: marca o sítio onde a funcionalidade vai nascer.
export default function EmConstrucao({ titulo, descricao }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-12 text-center">
      <Construction className="mx-auto mb-4 h-10 w-10 text-ink-muted" aria-hidden />
      <h1 className="text-2xl font-semibold text-ink">{titulo}</h1>
      <p className="mt-2 text-ink-muted">{descricao ?? 'Em construção.'}</p>
    </section>
  )
}
