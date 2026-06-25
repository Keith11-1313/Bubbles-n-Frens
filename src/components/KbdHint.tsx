import { HOTKEY_CONFIGS, type HotkeyAction } from '../types'
import { useSettingsStore } from '../store/settingsStore'

interface KbdHintProps {
  action: HotkeyAction
  /** Pass 'light' when the badge sits on a dark bg, 'dark' when on a light/accent bg */
  variant?: 'light' | 'dark'
}

export function KbdHint({ action, variant = 'light' }: KbdHintProps) {
  const binding = useSettingsStore(
    (s) =>
      s.settings[`hotkey_${action}`] ||
      HOTKEY_CONFIGS.find((c) => c.action === action)?.defaultBinding ||
      ''
  )
  if (!binding) return null

  const cls =
    variant === 'dark'
      ? 'bg-sidebar/20 text-sidebar/70 border-sidebar/25'
      : 'bg-white/10 text-white/50 border-white/20'

  return (
    <kbd className={`text-[10px] font-mono border rounded px-1 py-0.5 leading-none shrink-0 ${cls}`}>
      {binding}
    </kbd>
  )
}
