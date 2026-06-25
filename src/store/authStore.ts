import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDb, hashPassword } from '../db/database'
import type { User, UserSession } from '../types'

interface AuthStore {
  user: UserSession | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const db = await getDb()
        const hash = await hashPassword(password)
        const rows = await db.select<User[]>(
          'SELECT * FROM users WHERE username = $1 AND password_hash = $2',
          [username, hash]
        )
        if (rows.length === 0) {
          throw new Error('Invalid username or password')
        }
        const u = rows[0]
        set({
          user: { id: u.id, username: u.username, role: u.role },
          isAuthenticated: true,
        })
      },

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth' }
  )
)
