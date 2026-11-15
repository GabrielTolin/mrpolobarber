// Web Push sem bibliotecas (Arquitetura 3.10, "plano B" adotado logo à partida):
// - cifra do conteúdo: RFC 8291 (aes128gcm), com ECDH P-256 + HKDF + AES-128-GCM;
// - autorização VAPID: RFC 8292 (JWT ES256).
// Só usa a Web Crypto, que existe no Deno (Supabase) e no Node — por isso é
// testada no PC contra a implementação de referência antes de ir para o servidor.

const enc = new TextEncoder()

export function b64urlParaBytes(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texto.length % 4)) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

export function bytesParaB64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function juntar(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let i = 0
  for (const p of partes) {
    out.set(p, i)
    i += p.length
  }
  return out
}

// HKDF (extract + expand) com SHA-256
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, chave, bytes * 8)
  return new Uint8Array(bits)
}

export interface Subscricao {
  endpoint: string
  p256dh: string // chave pública do navegador (65 bytes, base64url)
  auth: string // segredo de autenticação (16 bytes, base64url)
}

// RFC 8291 §3–4: devolve o corpo cifrado (cabeçalho aes128gcm + texto cifrado).
// `salt` e `chavesServidor` só são passados nos testes (para resultados reprodutíveis).
export async function cifrar(
  sub: Subscricao,
  conteudo: Uint8Array,
  opcoes: { salt?: Uint8Array; chavesServidor?: CryptoKeyPair } = {},
): Promise<Uint8Array> {
  const uaPublica = b64urlParaBytes(sub.p256dh)
  const authSecret = b64urlParaBytes(sub.auth)
  const salt = opcoes.salt ?? crypto.getRandomValues(new Uint8Array(16))

  const servidor = opcoes.chavesServidor ?? ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const asPublica = new Uint8Array(await crypto.subtle.exportKey('raw', servidor.publicKey))

  const uaChave = await crypto.subtle.importKey('raw', uaPublica, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const partilhado = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaChave }, servidor.privateKey, 256))

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
  const keyInfo = juntar(enc.encode('WebPush: info\0'), uaPublica, asPublica)
  const ikm = await hkdf(authSecret, partilhado, keyInfo, 32)
  // CEK e NONCE
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  // Um só registo: conteúdo || 0x02 (delimitador do último registo), sem enchimento
  const claro = juntar(conteudo, new Uint8Array([2]))
  const chaveAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, chaveAes, claro))

  // Cabeçalho: salt(16) || rs(4, = 4096) || idlen(1) || keyid(= as_public, 65)
  const rs = new Uint8Array([0, 0, 0x10, 0])
  return juntar(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado)
}

// RFC 8292: cabeçalho Authorization "vapid t=<JWT>, k=<chave pública>"
export async function cabecalhoVapid(
  endpoint: string,
  vapid: { publica: string; privada: string; contacto: string },
  agoraSeg = Math.floor(Date.now() / 1000),
): Promise<string> {
  const pub = b64urlParaBytes(vapid.publica)
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: vapid.privada,
    x: bytesParaB64url(pub.slice(1, 33)),
    y: bytesParaB64url(pub.slice(33, 65)),
    ext: true,
  }
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const cab = bytesParaB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const corpo = bytesParaB64url(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: agoraSeg + 12 * 3600, sub: vapid.contacto })),
  )
  const assinatura = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, enc.encode(`${cab}.${corpo}`)),
  ) // ES256 = r || s (64 bytes), que é o formato que a Web Crypto devolve
  return `vapid t=${cab}.${corpo}.${bytesParaB64url(assinatura)}, k=${vapid.publica}`
}

// Envia um push. Devolve o código HTTP do serviço de push (201 = entregue;
// 404/410 = subscrição expirada, apagar).
export async function enviarPush(
  sub: Subscricao,
  dados: unknown,
  vapid: { publica: string; privada: string; contacto: string },
): Promise<number> {
  const corpo = await cifrar(sub, enc.encode(JSON.stringify(dados)))
  const resposta = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await cabecalhoVapid(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body: corpo,
  })
  await resposta.body?.cancel()
  return resposta.status
}
