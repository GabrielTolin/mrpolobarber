import { useState } from 'react'

// Telemóvel com seletor de país (pedido do Gabriel, 2026-11-25: muitos clientes
// estrangeiros). O valor devolvido continua a ser UMA string que normalizarTelefone()
// percebe: "912 345 678" para Portugal, "+44 7700 900123" para os outros países.
// Quem escrever o número já com "+" ou "00" à frente também funciona (o país muda sozinho).

export const PAISES = [
  { codigo: '351', bandeira: '🇵🇹', nome: 'Portugal', exemplo: '912 345 678' },
  { codigo: '44', bandeira: '🇬🇧', nome: 'Reino Unido', exemplo: '7700 900123' },
  { codigo: '353', bandeira: '🇮🇪', nome: 'Irlanda', exemplo: '85 123 4567' },
  { codigo: '34', bandeira: '🇪🇸', nome: 'Espanha', exemplo: '612 34 56 78' },
  { codigo: '33', bandeira: '🇫🇷', nome: 'França', exemplo: '6 12 34 56 78' },
  { codigo: '49', bandeira: '🇩🇪', nome: 'Alemanha', exemplo: '1512 3456789' },
  { codigo: '31', bandeira: '🇳🇱', nome: 'Países Baixos', exemplo: '6 12345678' },
  { codigo: '32', bandeira: '🇧🇪', nome: 'Bélgica', exemplo: '470 12 34 56' },
  { codigo: '39', bandeira: '🇮🇹', nome: 'Itália', exemplo: '312 345 6789' },
  { codigo: '41', bandeira: '🇨🇭', nome: 'Suíça', exemplo: '78 123 45 67' },
  { codigo: '55', bandeira: '🇧🇷', nome: 'Brasil', exemplo: '11 98765 4321' },
  { codigo: '1', bandeira: '🇺🇸', nome: 'EUA / Canadá', exemplo: '415 555 0123' },
]
const OUTRO = 'outro'

// País de um número escrito com indicativo (o indicativo mais comprido que bater certo).
function paisDe(valor) {
  const digitos = String(valor ?? '').replace(/^00/, '+').replace(/[^\d+]/g, '')
  if (!digitos.startsWith('+')) return null
  const sem = digitos.slice(1)
  const achado = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length).find((p) => sem.startsWith(p.codigo))
  return achado ? achado.codigo : OUTRO
}

// Parte do número que aparece na caixa (sem o indicativo do país escolhido).
function parteLocal(valor, pais) {
  const v = String(valor ?? '')
  if (pais === OUTRO || pais === '351' && !v.startsWith('+')) return v
  const prefixo = new RegExp(`^(\\+|00)\\s*${pais}\\s*`)
  return prefixo.test(v) ? v.replace(prefixo, '') : v
}

export default function CampoTelefone({ value, onChange, readOnly = false, autoFocus = false, className = '' }) {
  const [pais, setPais] = useState(() => paisDe(value) ?? '351')
  const atual = PAISES.find((p) => p.codigo === pais)

  // Junta o país e o número na string que o resto da app usa.
  const juntar = (codigo, numero) => {
    const n = numero.trim()
    if (!n || codigo === OUTRO || /^(\+|00)/.test(n)) return numero
    return codigo === '351' ? numero : `+${codigo} ${numero}`
  }

  function mudarNumero(e) {
    const numero = e.target.value
    // Escreveu (ou colou) o número já com indicativo: o país acompanha.
    if (/^\s*(\+|00)/.test(numero)) {
      const detetado = paisDe(numero)
      if (detetado) setPais(detetado)
      return onChange(numero)
    }
    onChange(juntar(pais, numero))
  }

  function mudarPais(e) {
    const novo = e.target.value
    const numero = parteLocal(value, pais)
    setPais(novo)
    onChange(juntar(novo, /^(\+|00)/.test(numero.trim()) ? '' : numero))
  }

  return (
    <div className="flex gap-2">
      <select
        value={pais}
        onChange={mudarPais}
        disabled={readOnly}
        aria-label="País do número"
        className={`field w-[108px] shrink-0 px-2 ${className} ${readOnly ? 'text-muted' : ''}`}
      >
        {PAISES.map((p) => (
          <option key={p.codigo} value={p.codigo}>
            {p.bandeira} +{p.codigo}
          </option>
        ))}
        <option value={OUTRO}>🌍 Outro</option>
      </select>
      <input
        value={parteLocal(value, pais)}
        onChange={mudarNumero}
        readOnly={readOnly}
        autoFocus={autoFocus}
        inputMode="tel"
        autoComplete={pais === '351' ? 'tel-national' : 'tel'}
        placeholder={atual ? atual.exemplo : '+48 512 345 678'}
        aria-label="Número de telemóvel"
        className={`field min-w-0 ${className} ${readOnly ? 'text-muted' : ''}`}
      />
    </div>
  )
}
