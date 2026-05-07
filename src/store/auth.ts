import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { AuthTokens, UserDTO } from '../types'

// SecureStore values are encrypted at rest (Keychain on iOS, EncryptedSharedPreferences
// on Android). The whole auth slice is serialized to a single key, well under iOS's
// ~4 KB Keychain item limit even with a long-lived session.
const secureStoreStorage: StateStorage = {
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value)
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name)
  },
}

interface AuthState {
  user: UserDTO | null
  accessToken: string | null
  refreshToken: string | null
  hydrated: boolean
  setAuth: (user: UserDTO, tokens: AuthTokens) => void
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: UserDTO) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setAuth: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'sandeshak-auth',
      storage: createJSONStorage(() => secureStoreStorage),
      // `hydrated` is set true after rehydration so the navigator can
      // delay rendering until tokens are loaded (avoids a flash of /login).
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
)

export const selectIsAuthenticated = (s: AuthState): boolean => Boolean(s.user && s.accessToken)
