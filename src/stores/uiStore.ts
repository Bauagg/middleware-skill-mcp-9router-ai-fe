import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ColorMode = 'light' | 'dark'

interface UiState {
  colorMode: ColorMode
  toggleColorMode: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      colorMode: 'light',
      toggleColorMode: () =>
        set((s) => ({ colorMode: s.colorMode === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'ui' },
  ),
)
