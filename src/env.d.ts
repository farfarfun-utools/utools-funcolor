/// <reference types="vite/client" />

export interface FunColorImageFile {
  name: string
  mime: string
  size: number
  dataUrl: string
}

export interface FunColorEnterAction {
  code: string
  type: string
  payload: unknown
}

export interface FunColorBridge {
  openImageFile: () => FunColorImageFile | null
  readEntryImageFiles: (entries: Array<string | { path?: string }>) => FunColorImageFile[]
  saveTextFile: (defaultName: string, content: string) => boolean
  pickScreenColor: () => Promise<string | null>
  onEnter: (callback: (action: FunColorEnterAction) => void) => () => void
}

declare global {
  interface Window {
    funcolor?: FunColorBridge
    utools?: {
      isDarkColors?: () => boolean
      copyText?: (text: string) => boolean
      screenColorPick?: (cb: (result: string | { hex?: string } | null) => void) => void
      registerTool?: (name: string, handler: (params: unknown) => unknown) => void
    }
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

export {}
