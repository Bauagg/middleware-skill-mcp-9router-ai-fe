/** Minimal typings for the parts of noVNC's RFB client this app uses (the package ships none). */
declare module '@novnc/novnc' {
  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, url: string, options?: { wsProtocols?: string[]; shared?: boolean })
    /** shrink the remote screen to fit the container */
    scaleViewport: boolean
    resizeSession: boolean
    viewOnly: boolean
    focusOnClick: boolean
    background: string
    disconnect(): void
    focus(): void
    /** sends text through the remote clipboard (paste) */
    clipboardPasteFrom(text: string): void
  }
}
