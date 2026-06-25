import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import loginPhoto from '../assets/login-pets.jpg'
import loginLogo from '../assets/brand/login-logo.png'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) { setError('Username is required'); return }
    if (!password) { setError('Password is required'); return }
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      const user = useAuthStore.getState().user
      const home = user?.role === 'manager' ? '/manager/dashboard' : '/staff/sales'
      navigate(home, { replace: true })
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex bg-sidebar">
      {/* Left brand + form panel */}
      <div className="w-[36%] min-w-[360px] bg-sidebar flex flex-col justify-center px-12">
        {/* Gradient logo (cream → blue) via CSS mask of the logo asset */}
        <span
          aria-label="Bubbles 'n Frens"
          className="block w-full max-w-[280px] mb-12 mx-auto drop-shadow-[-4px_5px_4px_rgba(0,0,0,0.3)]"
          style={{
            aspectRatio: '846 / 366',
            backgroundImage: 'linear-gradient(170deg, #fdf5aa 25%, #58a0c8 90%)',
            WebkitMaskImage: `url(${loginLogo})`,
            maskImage: `url(${loginLogo})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskPosition: 'left center',
            maskPosition: 'left center',
          }}
        />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-white text-sm font-semibold">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Input"
              className="bg-[#e3eaf6] rounded-lg h-[52px] px-4 text-login-text placeholder:text-[#99a0a8] outline-none focus:ring-2 focus:ring-accent transition-shadow"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white text-sm font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Input"
              className="bg-[#e3eaf6] rounded-lg h-[52px] px-4 text-login-text placeholder:text-[#99a0a8] outline-none focus:ring-2 focus:ring-accent transition-shadow"
            />
          </div>

          {error && <p className="text-red-300 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 self-center bg-[#bcd2ee] text-login-text font-bold rounded-lg px-8 py-3 flex items-center gap-2 hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in…' : <>Log In <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>

      {/* Right photo panel with light-blue bars */}
      <div className="flex-1 bg-[#7ba3c8] flex flex-col">
        <div className="h-20 shrink-0" />
        <img
          src={loginPhoto}
          alt="Bubbles 'n Frens — pets at home"
          className="w-full flex-1 object-cover min-h-0"
          draggable={false}
        />
        <div className="h-20 shrink-0" />
      </div>
    </div>
  )
}
