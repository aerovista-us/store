/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPERATOR_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
