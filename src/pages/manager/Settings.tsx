import { useEffect, useState } from 'react'
import { Plus, Save, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { save, open } from '@tauri-apps/plugin-dialog'
import { copyFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import clsx from 'clsx'
import { Modal } from '../../components/Modal'
import { DataTable } from '../../components/DataTable'
import { useSettingsStore } from '../../store/settingsStore'
import { getDb, hashPassword } from '../../db/database'
import type { User } from '../../types'

export default function ManagerSettings() {
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const [users, setUsers] = useState<User[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' as 'manager' | 'staff' })
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSettings()
    loadUsers()
  }, [])

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const loadUsers = async () => {
    const db = await getDb()
    const rows = await db.select<User[]>('SELECT * FROM users ORDER BY created_at')
    setUsers(rows)
  }

  const handleSaveSetting = async (key: string) => {
    try {
      await updateSetting(key, localSettings[key])
      toast.success(`${key.replace(/_/g, ' ')} updated`)
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.username.trim() || !newUser.password.trim()) {
      toast.error('Username and password required')
      return
    }
    try {
      const db = await getDb()
      const hash = await hashPassword(newUser.password)
      await db.execute(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        [newUser.username, hash, newUser.role]
      )
      toast.success('User created')
      setShowAddUser(false)
      setNewUser({ username: '', password: '', role: 'staff' })
      loadUsers()
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleBackup = async () => {
    try {
      const filePath = await save({
        defaultPath: `bubbles-backup-${Date.now()}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      })
      if (filePath) {
        await copyFile('bubbles.db', filePath, { fromPathBaseDir: BaseDirectory.AppData })
        toast.success('Backup saved!')
      }
    } catch (e) {
      toast.error(`Backup failed: ${e}`)
    }
  }

  const handleRestore = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        multiple: false,
      })
      if (filePath) {
        await copyFile(filePath as string, 'bubbles.db', { toPathBaseDir: BaseDirectory.AppData })
        toast.success('Database restored! Restart the app to see changes.')
      }
    } catch (e) {
      toast.error(`Restore failed: ${e}`)
    }
  }

  const settingsFields = [
    { key: 'tax_rate', label: 'Tax Rate', suffix: '%' },
    { key: 'business_name', label: 'Business Name', suffix: '' },
    { key: 'currency', label: 'Currency', suffix: '' },
    { key: 'low_stock_threshold', label: 'Low Stock Threshold', suffix: '' },
  ]

  const userColumns = [
    { key: 'username', header: 'Username' },
    { key: 'role', header: 'Role', render: (row: User) => (
      <span className="capitalize">{row.role}</span>
    )},
    {
      key: 'created_at',
      header: 'Created',
      render: (row: User) =>
        new Date(row.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <h2 className="text-sidebar font-bold text-xl">System Settings</h2>

      {/* Settings table */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <h3 className="text-navy font-bold text-lg mb-4">General Settings</h3>
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-accent rounded-l-app">Setting</th>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-accent">Value</th>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-accent rounded-r-app">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settingsFields.map(({ key, label, suffix }, i) => (
              <tr key={key}>
                <td
                  className={clsx(
                    'px-4 py-3 text-sm font-medium text-accent border-y-[3px] border-l-[3px] border-card rounded-l-app',
                    i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt'
                  )}
                >
                  {label}
                </td>
                <td
                  className={clsx(
                    'px-4 py-3 border-y-[3px] border-card',
                    i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt'
                  )}
                >
                  <div className="flex items-center gap-1">
                    <input
                      value={localSettings[key] || ''}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="bg-sidebar border border-white/10 rounded px-2 py-1 text-sm text-accent outline-none focus:border-accent w-[200px]"
                    />
                    {suffix && <span className="text-accent/50 text-sm">{suffix}</span>}
                  </div>
                </td>
                <td
                  className={clsx(
                    'px-4 py-3 border-y-[3px] border-r-[3px] border-card rounded-r-app',
                    i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt'
                  )}
                >
                  <button
                    onClick={() => handleSaveSetting(key)}
                    className="bg-accent text-sidebar px-3 py-1 rounded text-xs font-bold hover:brightness-105 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Save size={12} /> Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User management */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-navy font-bold text-lg">User Management</h3>
          <button
            onClick={() => setShowAddUser(true)}
            className="bg-accent text-sidebar px-3 py-2 rounded-app text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer"
          >
            <Plus size={14} /> Add User
          </button>
        </div>
        <DataTable columns={userColumns} data={users} keyField="id" />
      </div>

      {/* Backup / Restore */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <h3 className="text-navy font-bold text-lg mb-4">Data Management</h3>
        <div className="flex gap-4">
          <button
            onClick={handleBackup}
            className="bg-accent text-sidebar px-4 py-2 rounded-app text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer"
          >
            <Download size={16} /> Backup Database
          </button>
          <button
            onClick={handleRestore}
            className="bg-yellow-600 text-white px-4 py-2 rounded-app text-sm font-bold flex items-center gap-2 hover:bg-yellow-700 transition-colors cursor-pointer"
          >
            <Upload size={16} /> Restore Database
          </button>
        </div>
      </div>

      {/* Add user modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)}>
        <Modal.Header title="Add User" onClose={() => setShowAddUser(false)} />
        <form onSubmit={handleAddUser}>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Username
                </label>
                <input
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      role: e.target.value as 'manager' | 'staff',
                    }))
                  }
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent outline-none focus:border-accent"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setShowAddUser(false)}
              className="px-4 py-2 text-white/60 hover:text-white text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-accent text-sidebar px-4 py-2 rounded-app text-sm font-bold hover:brightness-105 transition-all cursor-pointer"
            >
              Create User
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  )
}
