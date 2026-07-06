declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
  interface Document {
    webkitFullscreenElement?: Element
    webkitExitFullscreen?(): void
    webkitFullscreenEnabled?: boolean
  }
  interface HTMLElement {
    webkitRequestFullscreen?(): void
    webkitbeginfullscreen?: unknown
    webkitendfullscreen?: unknown
  }
  interface HTMLVideoElement {
    webkitEnterFullscreen?(): void
    webkitbeginfullscreen?: unknown
    webkitendfullscreen?: unknown
  }
}

export {}
