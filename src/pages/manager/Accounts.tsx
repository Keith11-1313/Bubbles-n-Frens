import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Save, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { save, open } from '@tauri-apps/plugin-dialog'
import { copyFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import clsx from 'clsx'
import { Modal } from '../../components/Modal'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { getDb, hashPassword } from '../../db/database'
import type { User, HotkeyConfig, HotkeyAction } from '../../types'
import { HOTKEY_CONFIGS } from '../../types'
import { eventToBinding } from '../../utils/keyBinding'

function HotkeyRow({
  cfg,
  currentBinding,
  isCapturing,
  rowIndex,
  onStartCapture,
  onCaptured,
  onCancelCapture,
}: {
  cfg: HotkeyConfig
  currentBinding: string
  isCapturing: boolean
  rowIndex: number
  onStartCapture: () => void
  onCaptured: (binding: string) => void
  onCancelCapture: () => void
}) {
  useEffect(() => {
    if (!isCapturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { onCancelCapture(); return }
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
      onCaptured(eventToBinding(e))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCapturing])

  const bg = rowIndex % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt'
  return (
    <tr>
      <td className={`px-4 py-3 text-sm font-medium text-white border-y-[3px] border-l-[3px] border-card rounded-l-app ${bg}`}>
        {cfg.label}
      </td>
      <td className={`px-4 py-3 text-sm text-white/70 border-y-[3px] border-card ${bg}`}>
        {cfg.description}
      </td>
      <td className={`px-4 py-3 border-y-[3px] border-r-[3px] border-card rounded-r-app text-right ${bg}`}>
        <button
          onClick={onStartCapture}
          className={clsx(
            'font-mono text-sm px-3 py-1 rounded border transition-colors cursor-pointer',
            isCapturing
              ? 'bg-accent/20 border-accent text-accent animate-pulse'
              : 'bg-sidebar border-white/20 text-white/70 hover:border-accent hover:text-accent'
          )}
        >
          {isCapturing ? 'Press keys...' : currentBinding}
        </button>
      </td>
    </tr>
  )
}

export default function ManagerAccounts() {
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<User[]>([])
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' as 'manager' | 'staff' })
  const [editForm, setEditForm] = useState({ newUsername: '', password: '', confirmPassword: '' })
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})
  const [capturingAction, setCapturingAction] = useState<HotkeyAction | null>(null)

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
      await db.execute('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [
        newUser.username,
        hash,
        newUser.role,
      ])
      toast.success('Account created')
      setShowAddUser(false)
      setNewUser({ username: '', password: '', role: 'staff' })
      loadUsers()
    } catch (e) {
      toast.error(String(e))
    }
  }

  const openEdit = (u: User) => {
    setEditUser(u)
    setEditForm({ newUsername: '', password: '', confirmPassword: '' })
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    try {
      const db = await getDb()
      if (editForm.newUsername.trim()) {
        await db.execute('UPDATE users SET username = $1 WHERE id = $2', [editForm.newUsername.trim(), editUser.id])
      }
      if (editForm.password.trim()) {
        const hash = await hashPassword(editForm.password)
        await db.execute('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, editUser.id])
      }
      toast.success('Account updated')
      setEditUser(null)
      loadUsers()
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleDeleteUser = async () => {
    if (!confirmDelete) return
    try {
      const db = await getDb()
      // Referential safety: keep sales history — block deleting an account
      // that has recorded sales (BLOCK on delete rather than orphan rows).
      const [{ c }] = await db.select<[{ c: number }]>(
        'SELECT COUNT(*) as c FROM sales WHERE user_id = $1',
        [confirmDelete.id]
      )
      if (c > 0) {
        toast.error(`Can't delete — this account has ${c} recorded sale${c > 1 ? 's' : ''}. History must be kept.`)
        setConfirmDelete(null)
        return
      }
      await db.execute('DELETE FROM users WHERE id = $1', [confirmDelete.id])
      toast.success('Account deleted')
      setConfirmDelete(null)
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

  const handleResetHotkeys = async () => {
    const updates: Record<string, string> = {}
    for (const cfg of HOTKEY_CONFIGS) {
      const key = `hotkey_${cfg.action}`
      await updateSetting(key, cfg.defaultBinding)
      updates[key] = cfg.defaultBinding
    }
    setLocalSettings((prev) => ({ ...prev, ...updates }))
    toast.success('Keyboard shortcuts restored to defaults')
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
    { key: 'currency', label: 'Currency', suffix: '' },
    { key: 'low_stock_threshold', label: 'Low Stock Threshold', suffix: '' },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-sidebar font-bold text-2xl">Accounts Management</h2>
        <button
          onClick={() => setShowAddUser(true)}
          className="bg-accent text-sidebar px-4 py-2 rounded-app text-sm font-bold flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Accounts table */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-white rounded-l-app">User</th>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-white">Role</th>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-white">Password</th>
              <th className="text-right px-4 py-3 text-sm font-semibold bg-sidebar text-white rounded-r-app">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}>
                <td
                  className={clsx(
                    'px-4 py-3 text-sm font-medium text-white border-y-[3px] border-l-[3px] border-card rounded-l-app',
                    i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt'
                  )}
                >
                  {u.username}
                </td>
                <td className={clsx('px-4 py-3 text-sm text-white border-y-[3px] border-card capitalize', i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt')}>
                  {u.role}
                </td>
                <td className={clsx('px-4 py-3 border-y-[3px] border-card', i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt')}>
                  <div className="bg-[#e3eaf6] rounded-md px-3 py-1.5 w-[200px]">
                    <span className="text-login-text tracking-widest text-sm">••••••••••</span>
                  </div>
                </td>
                <td className={clsx('px-4 py-3 border-y-[3px] border-r-[3px] border-card rounded-r-app', i % 2 === 0 ? 'bg-table-row' : 'bg-table-row-alt')}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="bg-accent text-sidebar rounded-md w-8 h-8 flex items-center justify-center hover:brightness-105 cursor-pointer"
                      aria-label="Edit account"
                    >
                      <Pencil size={15} />
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="bg-red-500 text-white rounded-md w-8 h-8 flex items-center justify-center hover:bg-red-600 cursor-pointer"
                        aria-label="Delete account"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Settings (folded into Accounts per V2) */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <h3 className="text-navy font-bold text-lg mb-4">System Settings</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {settingsFields.map(({ key, label, suffix }) => (
            <div key={key} className="bg-table-row rounded-app px-4 py-3 flex items-center gap-3">
              <span className="text-accent text-sm font-medium w-[140px] shrink-0">{label}</span>
              <input
                value={localSettings[key] || ''}
                onChange={(e) => setLocalSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 min-w-0 bg-sidebar border border-white/10 rounded px-2 py-1 text-sm text-accent outline-none focus:border-accent"
              />
              {suffix && <span className="text-accent/50 text-sm">{suffix}</span>}
              <button
                onClick={() => handleSaveSetting(key)}
                className="bg-accent text-sidebar px-2.5 py-1 rounded text-xs font-bold hover:brightness-105 cursor-pointer flex items-center gap-1"
              >
                <Save size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
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

      {/* Keyboard Shortcuts */}
      <div className="bg-card border-2 border-navy rounded-app shadow-card-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-navy font-bold text-lg">Keyboard Shortcuts</h3>
          <button
            onClick={handleResetHotkeys}
            className="text-xs text-white/50 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1 rounded-app transition-colors cursor-pointer"
          >
            Restore Defaults
          </button>
        </div>
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-white rounded-l-app w-[200px]">Action</th>
              <th className="text-left px-4 py-3 text-sm font-semibold bg-sidebar text-white">Description</th>
              <th className="text-right px-4 py-3 text-sm font-semibold bg-sidebar text-white rounded-r-app w-[160px]">Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {HOTKEY_CONFIGS.map((cfg, i) => (
              <HotkeyRow
                key={cfg.action}
                cfg={cfg}
                currentBinding={localSettings[`hotkey_${cfg.action}`] || cfg.defaultBinding}
                isCapturing={capturingAction === cfg.action}
                rowIndex={i}
                onStartCapture={() => setCapturingAction(cfg.action)}
                onCaptured={async (binding) => {
                  const key = `hotkey_${cfg.action}`
                  setLocalSettings((prev) => ({ ...prev, [key]: binding }))
                  await updateSetting(key, binding)
                  setCapturingAction(null)
                  toast.success(`${cfg.label} set to ${binding}`)
                }}
                onCancelCapture={() => setCapturingAction(null)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add account modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)}>
        <Modal.Header title="Add Account" onClose={() => setShowAddUser(false)} />
        <form onSubmit={handleAddUser}>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Username</label>
                <input
                  value={newUser.username}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as 'manager' | 'staff' }))}
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent outline-none focus:border-accent"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 text-white/60 hover:text-white text-sm cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="bg-accent text-sidebar px-4 py-2 rounded-app text-sm font-bold hover:brightness-105 transition-all cursor-pointer">
              Create Account
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Account Information (edit) modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)}>
        <div className="bg-sidebar rounded-t-app px-5 py-3 text-center">
          <h2 className="text-accent font-bold text-lg">Account Information</h2>
        </div>
        <form onSubmit={handleEditUser}>
          <Modal.Body>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Username</label>
                <div className="bg-sidebar border border-white/10 rounded-app px-3 py-2 text-accent text-sm">
                  {editUser?.username}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">New Username</label>
                <input
                  value={editForm.newUsername}
                  onChange={(e) => setEditForm((p) => ({ ...p, newUsername: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent text-sm placeholder:text-white/30 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Password</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent text-sm placeholder:text-white/30 outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full bg-table-row border border-card rounded-app px-3 py-2 text-accent text-sm outline-none focus:border-accent"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              onClick={() => setEditForm({ newUsername: '', password: '', confirmPassword: '' })}
              className="px-4 py-2 bg-[#b3c1e6] text-sidebar rounded-app text-sm font-bold hover:brightness-105 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              className="bg-accent text-sidebar px-4 py-2 rounded-app text-sm font-bold hover:brightness-105 transition-all cursor-pointer"
            >
              Save
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <Modal.Header title="Delete Account" onClose={() => setConfirmDelete(null)} />
        <Modal.Body>
          <p className="text-white/80 text-sm">
            Delete account <strong className="text-accent">{confirmDelete?.username}</strong>? This cannot be undone.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-white/60 hover:text-white text-sm cursor-pointer">
            Cancel
          </button>
          <button onClick={handleDeleteUser} className="bg-red-500 text-white px-4 py-2 rounded-app text-sm font-bold hover:bg-red-600 transition-colors cursor-pointer">
            Delete
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
