/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the CampusFind API. Leave empty to use same-origin `/api`. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
