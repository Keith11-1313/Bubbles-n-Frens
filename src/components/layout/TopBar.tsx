import { useLiveTime } from '../../hooks/useLiveTime'
import { useAuthStore } from '../../store/authStore'

export function TopBar() {
  const { date, time } = useLiveTime()
  const user = useAuthStore((s) => s.user)
  const roleLabel = user?.role === 'manager' ? 'Manager' : 'Staff'

  return (
    <header className="h-topbar bg-topbar flex items-center justify-between px-8">
      <div className="flex flex-col text-accent/75">
        <span className="text-sm font-medium">{date}</span>
        <span className="text-2xl font-semibold tracking-tight">{time}</span>
      </div>
      <div className="text-cream font-bold text-3xl tracking-wide">
        {roleLabel}
      </div>
    </header>
  )
}
