/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    /** Clé service role Supabase (secret serveur, jamais exposée côté client). */
    SUPABASE_SERVICE_ROLE_KEY?: string
  }
}
