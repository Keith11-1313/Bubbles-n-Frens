import { create } from 'zustand'
import { getDb } from '../db/database'
import { HOTKEY_CONFIGS, type HotkeyAction } from '../types'

interface SettingsStore {
  settings: Record<string, string>
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  getTaxRate: () => number
  getCurrency: () => string
  getThreshold: () => number
  getBusinessName: () => string
  getHotkeyBinding: (action: HotkeyAction) => string
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  settings: {},
  loading: true,

  fetchSettings: async () => {
    const db = await getDb()
    const rows = await db.select<{ key: string; value: string }[]>(
      'SELECT * FROM settings'
    )
    const map: Record<string, string> = {}
    for (const row of rows) {
      map[row.key] = row.value
    }
    set({ settings: map, loading: false })
  },

  updateSetting: async (key: string, value: string) => {
    const db = await getDb()
    await db.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)',
      [key, value]
    )
    set((s) => ({ settings: { ...s.settings, [key]: value } }))
  },

  getTaxRate: () => parseFloat(get().settings.tax_rate || '0'),
  getCurrency: () => get().settings.currency || '₱',
  getThreshold: () => parseInt(get().settings.low_stock_threshold || '10', 10),
  getBusinessName: () => get().settings.business_name || "Bubbles 'n Frens",
  getHotkeyBinding: (action) =>
    get().settings[`hotkey_${action}`] ||
    HOTKEY_CONFIGS.find((c) => c.action === action)?.defaultBinding ||
    '',
}))
