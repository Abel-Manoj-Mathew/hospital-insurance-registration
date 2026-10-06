/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** 'paddle' reads documents with the PaddleOCR service (images go to the API); unset uses in-browser Tesseract. */
  readonly VITE_OCR_ENGINE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
