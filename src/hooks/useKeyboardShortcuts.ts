import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { HOTKEY_CONFIGS, type HotkeyAction } from '../types'
import { eventToBinding, isTextInput } from '../utils/keyBinding'

interface Options {
  onFocusSearch?: () => void
  onProcessPayment?: () => void
  onClearCart?: () => void
  onRemoveLast?: () => void
  isModalOpen?: boolean
}

export function useKeyboardShortcuts(options: Options = {}) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const getHotkeyBinding = useSettingsStore((s) => s.getHotkeyBinding)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const binding = eventToBinding(e)
      const inInput = isTextInput(e.target)
      const isManager = user?.role === 'manager'

      const map = new Map<string, HotkeyAction>()
      for (const cfg of HOTKEY_CONFIGS) {
        map.set(getHotkeyBinding(cfg.action), cfg.action)
      }

      const action = map.get(binding)
      if (!action) return

      switch (action) {
        case 'nav_dashboard':
          if (inInput) return
          e.preventDefault()
          navigate(isManager ? '/manager/dashboard' : '/staff/sales')
          break
        case 'nav_inventory':
          if (inInput) return
          e.preventDefault()
          navigate(isManager ? '/manager/inventory' : '/staff/inventory')
          break
        case 'nav_reports':
          if (inInput) return
          e.preventDefault()
          navigate(isManager ? '/manager/reports' : '/staff/recent-sales')
          break
        case 'nav_accounts':
          if (inInput || !isManager) return
          e.preventDefault()
          navigate('/manager/accounts')
          break
        case 'sales_focus_search':
          if (inInput || !options.onFocusSearch) return
          e.preventDefault()
          options.onFocusSearch()
          break
        case 'sales_process_payment':
          if (!options.onProcessPayment) return
          e.preventDefault()
          options.onProcessPayment()
          break
        case 'sales_clear_cart':
          if (options.isModalOpen || !options.onClearCart) return
          e.preventDefault()
          options.onClearCart()
          break
        case 'sales_remove_last':
          if (inInput || options.isModalOpen || !options.onRemoveLast) return
          e.preventDefault()
          options.onRemoveLast()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    navigate,
    user,
    getHotkeyBinding,
    options.onFocusSearch,
    options.onProcessPayment,
    options.onClearCart,
    options.onRemoveLast,
    options.isModalOpen,
  ])
}
