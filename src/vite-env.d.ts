/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL for the CareAtlas API. Defaults to "/api" (Vite dev proxy → FastAPI).
  // Set to the deployed API origin for production static builds.
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
