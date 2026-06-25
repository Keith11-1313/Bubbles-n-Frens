import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export function Layout() {
  useKeyboardShortcuts()

  return (
    <div className="flex h-screen bg-app-gradient overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
