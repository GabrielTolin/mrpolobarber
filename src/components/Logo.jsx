// Logótipo do cliente (recortado de design/logo-original.jpg, fundo preto).
export default function Logo({ className = '' }) {
  return (
    <img
      src="/brand-logo.webp"
      alt="Mr. Polo Barber Shop"
      width="180"
      height="159"
      className={`h-auto ${className}`}
    />
  )
}
