/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_MARKET_MINT?: string;
  readonly VITE_USER_USDC_ATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
