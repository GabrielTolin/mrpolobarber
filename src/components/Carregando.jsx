export default function Carregando({ texto = 'A carregar…' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-btn border-t-gold" />
        <span className="text-sm">{texto}</span>
      </div>
    </div>
  )
}
