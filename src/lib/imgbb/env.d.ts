declare namespace NodeJS {
  interface ProcessEnv {
    /** Clé API imgbb (secret serveur, jamais exposée côté client). */
    IMGBB_APIKEY?: string
  }
}
