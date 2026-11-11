export default function Carregando({ texto = 'A carregar…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-ink-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink" />
        <span className="text-sm">{texto}</span>
      </div>
    </div>
  )
}
