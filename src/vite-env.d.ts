/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SNOW_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
