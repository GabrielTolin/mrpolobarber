import { Construction } from 'lucide-react'

// Conteúdo provisório: marca o sítio onde a funcionalidade vai nascer.
export default function EmConstrucao({ titulo, descricao }) {
  return (
    <section className="card mx-auto max-w-xl text-center">
      <Construction className="mx-auto mb-3 text-muted-2" size={32} strokeWidth={1.8} aria-hidden />
      {titulo && <h2 className="card-title">{titulo}</h2>}
      <p className="mt-2 text-sm text-muted">{descricao ?? 'Em construção.'}</p>
    </section>
  )
}
