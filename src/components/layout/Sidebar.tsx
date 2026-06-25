import { NavLink, useNavigate } from 'react-router-dom'
import { User, History, type LucideIcon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { MaskIcon } from '../MaskIcon'
import clsx from 'clsx'
import sidebarLogo from '../../assets/brand/sidebar-logo.png'
import homeIcon from '../../assets/nav/home.png'
import cartIcon from '../../assets/nav/cart.png'
import inventoryIcon from '../../assets/nav/inventory.png'
import statisticsIcon from '../../assets/nav/statistics.png'
import logoutIcon from '../../assets/nav/logout.png'

interface NavItem {
  to: string
  label: string
  icon?: string // masked PNG asset
  Lucide?: LucideIcon // lucide fallback when no asset exists
}

const managerLinks: NavItem[] = [
  { to: '/manager/dashboard', icon: homeIcon, label: 'Dashboard' },
  { to: '/manager/inventory', icon: inventoryIcon, label: 'Inventory' },
  { to: '/manager/reports', icon: statisticsIcon, label: 'Reports' },
  { to: '/manager/accounts', Lucide: User, label: 'Accounts' },
]

const staffLinks: NavItem[] = [
  { to: '/staff/sales', icon: cartIcon, label: 'Sales' },
  { to: '/staff/inventory', icon: inventoryIcon, label: 'Inventory' },
  { to: '/staff/recent-sales', Lucide: History, label: 'Recent Sales' },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const links = user?.role === 'manager' ? managerLinks : staffLinks

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-sidebar h-screen bg-sidebar flex flex-col shrink-0">
      <div className="px-4 py-7 flex justify-center">
        <span
          aria-label="Bubbles 'n Frens"
          className="block w-[180px] drop-shadow-[-3px_4px_3px_rgba(0,0,0,0.3)]"
          style={{
            aspectRatio: '1176 / 664',
            backgroundImage: 'linear-gradient(165deg, #fdf5aa 28%, #58a0c8 92%)',
            WebkitMaskImage: `url(${sidebarLogo})`,
            maskImage: `url(${sidebarLogo})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      </div>

      <nav className="flex-1 flex flex-col gap-2 px-4">
        {links.map(({ to, icon, Lucide, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-app text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-sidebar-active text-navy'
                  : 'text-cream/70 hover:bg-sidebar-hover hover:text-cream'
              )
            }
          >
            {icon ? (
              <MaskIcon src={icon} className="w-5 h-5" />
            ) : Lucide ? (
              <Lucide size={20} className="shrink-0" />
            ) : null}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pb-8">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 bg-sidebar-active text-navy rounded-app py-3 text-sm font-bold w-full hover:brightness-110 transition-colors cursor-pointer"
        >
          <MaskIcon src={logoutIcon} className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
