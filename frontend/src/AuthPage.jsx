import { useState } from 'react'
import axios from 'axios'
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
}

export default function AuthPage({ onAuthenticate }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (mode === 'signup' && !form.name.trim()) {
      setError('Name is required.')
      return
    }

    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login'
      const payload = mode === 'signup'
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : {
            email: form.email.trim(),
            password: form.password,
          }

      const response = await axios.post(`${apiBaseUrl}${endpoint}`, payload)
      onAuthenticate(response.data.user)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Authentication failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fefefe_0%,#e6f0ec_40%,#d9ebe4_100%)] px-6 py-10 text-slate-900 dark:bg-[radial-gradient(circle_at_top,#111827_0%,#0f172a_45%,#020617_100%)] dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-64 w-64 rounded-full bg-white/60 blur-3xl" />
        <div className="absolute bottom-[5%] right-[10%] h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute right-[20%] top-[20%] h-52 w-52 rounded-full bg-purple-200/40 blur-3xl dark:bg-purple-500/10" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-between gap-10">
        <div className="hidden max-w-xl lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-purple-700 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-purple-300">
            ContextOS Access
          </div>
          <h1 className="text-5xl font-semibold leading-tight tracking-[-0.05em] text-slate-900 dark:text-white">
            Secure sign in and manage
            <span className="block bg-gradient-to-r from-purple-700 to-emerald-600 bg-clip-text text-transparent">
              AI knowledge workspace
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
            Access your search hub, analytics workspace, and knowledge base from one protected desktop and mobile-ready entry point with editable profile details.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              'Local-first memory ingestion',
              'Integrated search and analytics',
              'Checkout-ready pricing workspace',
              'Fast login with persistent session',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/70 bg-white/60 px-4 py-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="absolute right-0 top-0">
            <AnimatedThemeToggler className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/70 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20" />
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_20px_80px_rgba(2,6,23,0.45)]">
            <div className="mb-8">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-700 dark:text-purple-300">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">
                {mode === 'login' ? 'Sign in to ContextOS' : 'Join ContextOS'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {mode === 'login'
                  ? 'Use your email to continue into the workspace.'
                  : 'Set up your user profile to start using the workspace.'}
              </p>
            </div>

            <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900/70">
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError('') }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sign up
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <UserRound className="h-4 w-4" />
                    Full name
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    placeholder="Anant Anandam"
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4" />
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  placeholder="anant.anandam@gmail.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <LockKeyhole className="h-4 w-4" />
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:translate-y-[-1px] hover:shadow-xl"
              >
                {submitting ? 'Please wait...' : mode === 'login' ? 'Enter workspace' : 'Create account'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-6 text-slate-500 dark:text-slate-400">
              Session is stored locally after successful backend authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
