import { create } from 'zustand'

type Severity = 'success' | 'error' | 'info' | 'warning'

interface Notice {
  id: number
  message: string
  severity: Severity
}

interface NotifyState {
  notice: Notice | null
  show: (message: string, severity: Severity) => void
  clear: () => void
}

let nextId = 1

export const useNotifyStore = create<NotifyState>()((set) => ({
  notice: null,
  show: (message, severity) => set({ notice: { id: nextId++, message, severity } }),
  clear: () => set({ notice: null }),
}))

/** Toast helpers usable outside React (mutation callbacks, query cache). */
export const notify = {
  success: (message: string) => useNotifyStore.getState().show(message, 'success'),
  error: (message: string) => useNotifyStore.getState().show(message, 'error'),
  info: (message: string) => useNotifyStore.getState().show(message, 'info'),
}
