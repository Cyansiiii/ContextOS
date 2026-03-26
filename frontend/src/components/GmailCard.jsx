import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { AlertTriangle, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const GmailIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 6L12 13L2 6V4L12 11L22 4V6Z" fill="#EA4335" />
    <path d="M22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6L12 13L22 6Z" fill="#EA4335" opacity="0.3" />
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="#EA4335" strokeWidth="1.5" fill="none" />
  </svg>
)

const STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED_IDLE: 'connected_idle',
  SYNCING: 'syncing',
}

export default function GmailCard() {
  const [state, setState] = useState(STATES.DISCONNECTED)
  const [lastSync, setLastSync] = useState(null)
  const [emailCount, setEmailCount] = useState(0)
  const [toast, setToast] = useState(null)
  const [syncResult, setSyncResult] = useState(null)
  const toastTimeout = useRef(null)

  const getApiErrorMessage = (error, fallback) => {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (typeof detail === 'object') {
      if (typeof detail.message === 'string' && detail.message.trim()) return detail.message
      if (typeof detail.reason === 'string' && detail.reason.trim()) return detail.reason
    }
    return fallback
  }

  const showToast = (type, message) => {
    setToast({ type, message })
  }

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/gmail/status`)
      if (data.connected) {
        setState(STATES.CONNECTED_IDLE)
        setLastSync(data.last_sync)
        setEmailCount(data.email_count)
      } else {
        setState(STATES.DISCONNECTED)
        setLastSync(data.last_sync || null)
        setEmailCount(data.email_count || 0)
      }
    } catch {
      // Backend can be offline during local setup.
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gmailStatus = params.get('gmail')
    const gmailMessage = params.get('gmail_message')

    if (gmailStatus === 'connected') {
      setState(STATES.CONNECTED_IDLE)
      showToast('success', gmailMessage || 'Gmail connected successfully!')
      checkStatus()
    } else if (gmailStatus === 'error') {
      setState(STATES.DISCONNECTED)
      showToast('error', gmailMessage || 'Failed to connect Gmail.')
    }

    if (gmailStatus) {
      params.delete('gmail')
      params.delete('gmail_message')
      const nextQuery = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`)
    }
  }, [checkStatus])

  useEffect(() => {
    if (!toast) return undefined
    toastTimeout.current = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(toastTimeout.current)
  }, [toast])

  const handleConnect = async () => {
    setState(STATES.CONNECTING)
    try {
      const { data } = await axios.get(`${API}/gmail/connect`)

      if (data.status === 'already_connected') {
        setState(STATES.CONNECTED_IDLE)
        checkStatus()
        showToast('success', 'Gmail is already connected.')
        return
      }

      if (!data?.auth_url) {
        throw new Error('Backend did not return a Gmail authorization URL.')
      }

      window.location.assign(data.auth_url)
    } catch (err) {
      setState(STATES.DISCONNECTED)
      const detail = err.response?.data?.detail
      if (typeof detail === 'object' && detail?.error === 'gmail_oauth_not_configured') {
        showToast('error', 'Gmail OAuth not configured in backend/.env.')
      } else if (typeof detail === 'object' && detail?.error === 'gmail_connector_unavailable') {
        showToast('error', 'Gmail dependencies are missing in the backend environment.')
      } else {
        showToast('error', getApiErrorMessage(err, 'Failed to start Gmail connection.'))
      }
    }
  }

  const handleSync = async () => {
    setState(STATES.SYNCING)
    setSyncResult(null)

    try {
      const { data } = await axios.post(`${API}/gmail/sync`, { max_emails: 75 })

      if (data.error === 'token_expired') {
        setState(STATES.DISCONNECTED)
        showToast('error', 'Session expired. Reconnect Gmail.')
        return
      }

      if (data.error === 'ollama_offline') {
        setState(STATES.CONNECTED_IDLE)
        showToast('error', 'Ollama is not running. Start Ollama and try again.')
        return
      }

      setSyncResult(data)
      setState(STATES.CONNECTED_IDLE)
      setLastSync(new Date().toISOString())
      setEmailCount((prev) => prev + (data.synced || 0))
      showToast('success', data.message || `Synced ${data.synced} emails from Gmail`)
    } catch (err) {
      setState(STATES.CONNECTED_IDLE)
      const detail = err.response?.data?.detail
      if (typeof detail === 'object' && detail?.error === 'ollama_offline') {
        showToast('error', 'Ollama is not running. Start Ollama and try again.')
      } else if (typeof detail === 'object' && detail?.error === 'quota_exceeded') {
        showToast('error', 'Gmail API quota exceeded. Try again later.')
      } else if (typeof detail === 'object' && detail?.error === 'gmail_oauth_not_configured') {
        setState(STATES.DISCONNECTED)
        showToast('error', 'Gmail OAuth not configured in backend/.env.')
      } else if (typeof detail === 'object' && detail?.error === 'gmail_connector_unavailable') {
        showToast('error', 'Gmail dependencies are missing in the backend environment.')
      } else {
        showToast('error', getApiErrorMessage(err, 'Sync failed. Check backend logs.'))
      }
    }
  }

  // ─── Disconnect ─────────────────────────────────────────────────
  const handleDisconnect = async () => {
    try {
      await axios.delete(`${API}/gmail/disconnect`)
      setState(STATES.DISCONNECTED)
      setLastSync(null)
      setEmailCount(0)
      showToast('success', 'Gmail disconnected')
    } catch {
      showToast('error', 'Failed to disconnect Gmail')
    }
  }

  const formatTime = (iso) => {
    if (!iso) return 'Never'
    try {
      const d = new Date(iso)
      return d.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="relative group">
      <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(110,231,195,0.16)] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:border-[rgba(110,231,195,0.3)] hover:shadow-[0_0_30px_rgba(110,231,195,0.08)] dark:border-[rgba(110,231,195,0.18)] dark:bg-slate-950 dark:shadow-none">
        {state === STATES.CONNECTED_IDLE && (
          <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#6EE7C3]/10 blur-3xl" />
        )}

        <div className="relative z-10 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
                state === STATES.CONNECTED_IDLE || state === STATES.SYNCING
                  ? 'bg-[#6EE7C3]/12 shadow-[0_0_12px_rgba(110,231,195,0.15)] dark:bg-[#6EE7C3]/16'
                  : 'bg-slate-100 dark:bg-slate-900'
              }`}
            >
              <GmailIcon className="h-6 w-6" />
            </div>

            <div>
              <h3 className="font-['DM_Sans'] text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                Gmail
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5">
                {state === STATES.CONNECTED_IDLE || state === STATES.SYNCING ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-[#6EE7C3] shadow-[0_0_6px_#6EE7C3]" />
                    <span className="text-xs font-medium text-[#6EE7C3]">Connected</span>
                  </>
                ) : state === STATES.CONNECTING ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                    <span className="text-xs font-medium text-amber-500 dark:text-amber-400">Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Disconnected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {emailCount > 0 && (state === STATES.CONNECTED_IDLE || state === STATES.SYNCING) && (
            <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {emailCount} emails
            </div>
          )}
        </div>

        <div className="relative z-10">
          {state === STATES.DISCONNECTED && (
            <button
              onClick={handleConnect}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EA4335]/80 to-[#EA4335] py-3 text-sm font-bold text-white shadow-lg shadow-[#EA4335]/10 transition-all duration-300 hover:from-[#EA4335] hover:to-[#d33426] hover:shadow-[#EA4335]/20"
            >
              <Mail className="h-4 w-4" />
              Connect Gmail
            </button>
          )}

          {state === STATES.CONNECTING && (
            <div className="flex items-center justify-center gap-3 py-3 text-sm font-medium text-amber-500 dark:text-amber-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Opening Google sign-in...
            </div>
          )}

          {state === STATES.CONNECTED_IDLE && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Last sync: {formatTime(lastSync)}</span>
              </div>
              <button
                onClick={handleSync}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#6EE7C3]/20 bg-gradient-to-r from-[#6EE7C3]/20 to-[#6EE7C3]/12 py-3 text-sm font-bold text-emerald-700 transition-all duration-300 hover:border-[#6EE7C3]/40 hover:from-[#6EE7C3]/30 hover:to-[#6EE7C3]/18 dark:border-[#6EE7C3]/22 dark:from-[#6EE7C3]/18 dark:to-[#6EE7C3]/10 dark:text-[#6EE7C3] dark:hover:from-[#6EE7C3]/24 dark:hover:to-[#6EE7C3]/16"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Now
              </button>
              <button
                onClick={handleDisconnect}
                className="
                  w-full py-1.5 rounded-xl bg-transparent
                  border border-transparent text-slate-400
                  hover:text-[#ef4444] hover:border-[#ef4444]/15 hover:bg-[#ef4444]/5
                  text-xs font-semibold
                  transition-all duration-200
                "
              >
                Disconnect
              </button>
            </div>
          )}

          {state === STATES.SYNCING && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-[#6EE7C3]" />
                Syncing emails... (fetching)
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                <div
                  className="h-full rounded-full animate-gmail-progress"
                  style={{
                    background: 'linear-gradient(90deg, #ED1C24, #6EE7C3)',
                    width: '70%',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {syncResult && state === STATES.CONNECTED_IDLE && (
          <div className="relative z-10 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span className="font-bold text-[#6EE7C3]">{syncResult.synced}</span> synced
            {' · '}<span className="font-bold text-slate-500 dark:text-slate-400">{syncResult.skipped}</span> skipped
            {' · '}<span className="font-bold">{syncResult.total_chunks}</span> chunks
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`absolute -bottom-14 left-0 right-0 z-50 mx-auto flex w-[95%] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-2xl transition-all duration-300 animate-slide-up ${
            toast.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#6EE7C3]/20 dark:bg-[#6EE7C3]/10 dark:text-[#6EE7C3]'
              : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-[#ED1C24]/20 dark:bg-[#ED1C24]/10 dark:text-[#ED1C24]'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span className="truncate">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
