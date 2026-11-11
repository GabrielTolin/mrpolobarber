import { createContext } from 'react'

// Contexto da sessão. O provider está em AuthContext.jsx e o hook em hooks/useAuth.js
// (ficheiros separados para o Fast Refresh do Vite funcionar).
export const AuthContext = createContext(null)
