import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import axios from 'axios'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Shield, Cpu, Server, Zap, Clock, Database,
  CheckCircle, Circle, ArrowUpRight, Search,
  FileText, Mail, RefreshCw, Check, Plus,
  MessageSquare, Mic
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── Animation Variants ───────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

const slideLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const fadeIn = (delay = 0) => ({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, delay } }
})

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1, scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  }
}

// ─── Animated Counter Hook ────────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (target <= 0) return

    // If we've already reached target, do nothing
    let startValue = value
    if (startValue === target) return

    const timeout = setTimeout(() => {
      const start = performance.now()
      const animate = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        // animate from startValue to target
        const current = startValue + (target - startValue) * eased
        setValue(Math.round(current))
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }, delay)

    return () => clearTimeout(timeout)
  }, [target, duration, delay]) // remove value from deps so it doesn't interrupt

  return value
}

// ─── Progress Bar Component ───────────────────────────────────────
function AnimatedBar({ percent, color, delay = 0.3 }) {
  return (
    <div className="w-full bg-[#e3ecd1] dark:bg-[#2e3726] h-1.5 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
    </div>
  )
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────
function Shimmer({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-xl ${className}`}
      style={{
        background: 'linear-gradient(90deg, #e8f0d8 25%, #d6e8c6 50%, #e8f0d8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════
// 1. GREETING HEADER
// ═══════════════════════════════════════════════════════════════════
function GreetingHeader({ userName }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const hour = time.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <motion.h2
          variants={slideLeft}
          className="text-2xl font-semibold tracking-tight text-[#2a3122] dark:text-[#f2f9e2]"
        >
          {greeting}, {userName || 'User'}! 👋
        </motion.h2>
        <motion.p
          variants={fadeIn(0.2)}
          className="text-[#575e4c] dark:text-[#a9b09b] font-medium mt-1"
        >
          {dateStr} · {timeStr}
        </motion.p>
      </div>
      <motion.div
        variants={scaleIn}
        className="flex items-center gap-2 bg-[#e3ecd1] dark:bg-[#2a3122] px-4 py-2 rounded-xl"
      >
        <Shield className="w-4 h-4 text-[#446500] dark:text-[#bbf165]" fill="currentColor" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#446500] dark:text-[#bbf165]">100% Private</span>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 2. AMD RUNTIME MONITOR CARD
// ═══════════════════════════════════════════════════════════════════
function AmdMonitorCard() {
  const [status, setStatus] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await axios.get(`${API}/amd/status`)
        setStatus(data)
        setMetrics(data.metrics)
        setError(false)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await axios.get(`${API}/amd/metrics`)
        setMetrics(data)
      } catch { /* ignore */ }
    }
    intervalRef.current = setInterval(fetchMetrics, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const cpuVal = useCountUp(metrics?.cpu_percent || 0, 1200, 300)
  const ramVal = useCountUp(metrics?.ram_percent || 0, 1200, 500)

  if (loading) {
    return (
      <motion.div variants={cardVariants} className="md:col-span-8 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6">
        <Shimmer className="h-5 w-32 mb-4" />
        <Shimmer className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-3 gap-8">
          <Shimmer className="h-20" />
          <Shimmer className="h-20" />
          <Shimmer className="h-20" />
        </div>
      </motion.div>
    )
  }

  const ollamaStatus = error ? 'Offline' : (status?.status === 'ACTIVE' ? 'Active' : status?.status || 'Unknown')
  const ollamaVersion = status?.inference_engine?.match(/[\d.]+/)?.[0] || 'v0.1.32'

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(68,101,0,0.12)' }}
      transition={{ duration: 0.2 }}
      className="md:col-span-8 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#575e4c] dark:text-[#a9b09b] uppercase tracking-widest">System Status</span>
          <h3 className="text-xl font-bold text-[#446500] dark:text-[#bbf165] flex items-center gap-2">
            AMD RUNTIME MONITOR
            <span className="bg-[#bbf165] text-[#3b5900] text-[10px] px-2 py-0.5 rounded-md font-bold">LOCAL</span>
          </h3>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <div className="text-xs font-medium text-[#575e4c] dark:text-[#a9b09b]">Ollama {ollamaStatus}</div>
            {/* Pulsing status dot */}
            <motion.div
              className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-[#446500] dark:bg-[#bbf165]'}`}
              animate={!error ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </div>
          <div className="text-sm font-bold text-[#2a3122] dark:text-[#f2f9e2]">{ollamaVersion}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 mt-6">
        {/* CPU */}
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-3xl font-bold tracking-tighter text-[#2a3122] dark:text-[#f2f9e2]"
            >
              {cpuVal}%
            </motion.span>
            <span className="text-xs font-semibold text-[#575e4c] dark:text-[#a9b09b] mb-1">CPU</span>
          </div>
          <AnimatedBar percent={metrics?.cpu_percent || 0} color="bg-[#446500] dark:bg-[#bbf165]" delay={0.3} />
        </div>

        {/* RAM */}
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-3xl font-bold tracking-tighter text-[#2a3122] dark:text-[#f2f9e2]"
            >
              {ramVal}%
            </motion.span>
            <span className="text-xs font-semibold text-[#575e4c] dark:text-[#a9b09b] mb-1">RAM</span>
          </div>
          <AnimatedBar percent={metrics?.ram_percent || 0} color="bg-[#ffc960] dark:bg-[#ffd173]" delay={0.5} />
        </div>

        {/* Cloud API */}
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <motion.span
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-3xl font-bold tracking-tighter text-[#b02500] dark:text-[#ff7a59]"
            >
              {status?.cloud_calls ?? 0}
            </motion.span>
            <span className="text-xs font-semibold text-[#575e4c] dark:text-[#a9b09b] mb-1 uppercase">Cloud API</span>
          </div>
          <AnimatedBar percent={2} color="bg-[#b02500] dark:bg-[#ff7a59]" delay={0.7} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#a9b09b]/15 pt-4 text-xs font-medium text-[#575e4c] dark:text-[#a9b09b]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#446500] dark:bg-[#bbf165]" /> {status?.active_model || 'Mistral 7B'}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#5d5295] dark:bg-[#beb2fd]" /> {status?.embedding_model || 'Embed-v2'}</span>
        <span
          className="inline-flex items-center gap-2 rounded-full border border-[#dce6ca] bg-[#f4f8ed] px-3 py-1 font-semibold text-[#446500] dark:border-[#3b452f] dark:bg-[#242b1f] dark:text-[#d8f3a6]"
          title={status?.hardware?.gpu || 'Unknown GPU'}
        >
          <Cpu className="h-3.5 w-3.5" />
          GPU: {status?.hardware?.gpu || 'Unknown'}
        </span>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 3. WORK HOURS CARD (Static)
// ═══════════════════════════════════════════════════════════════════
function WorkHoursCard() {
  const hours = useCountUp(8, 1000)
  const minutes = useCountUp(27, 1000, 200)

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(68,101,0,0.12)' }}
      className="md:col-span-4 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6 space-y-4"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-[#2a3122] dark:text-[#f2f9e2]">TODAY'S WORK</h3>
        <Clock className="w-5 h-5 text-[#575e4c] dark:text-[#a9b09b]" />
      </div>
      <div className="py-2">
        <span className="text-5xl font-bold tracking-tighter text-[#2a3122] dark:text-[#f2f9e2]">
          {hours}h {minutes}m
        </span>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-[#575e4c] dark:text-[#a9b09b]">
            <span>DEEP WORK</span><span>5.2h</span>
          </div>
          <AnimatedBar percent={65} color="bg-[#446500] dark:bg-[#bbf165]" delay={0.4} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-[#575e4c] dark:text-[#a9b09b]">
            <span>MEETINGS</span><span>3.1h</span>
          </div>
          <AnimatedBar percent={35} color="bg-[#beb2fd] dark:bg-[#9785ff]" delay={0.6} />
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 4. TASKS CARD
// ═══════════════════════════════════════════════════════════════════
function TasksCard() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Technical English Session', done: true },
    { id: 2, text: 'UI Components Workshop', done: false },
    { id: 3, text: 'API Documentation Review', done: false },
  ])
  const [isAdding, setIsAdding] = useState(false)
  const [newTask, setNewTask] = useState('')

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const addTask = (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    setTasks(prev => [{ id: Date.now(), text: newTask.trim(), done: false }, ...prev])
    setNewTask('')
    setIsAdding(false)
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(68,101,0,0.12)' }}
      className="md:col-span-4 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6 h-full flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-[#2a3122] dark:text-[#f2f9e2]">TODAY'S TASKS</h3>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAdding(!isAdding)}
          className="text-[#446500] dark:text-[#bbf165] hover:bg-[#bbf165]/20 p-1 rounded-lg transition-colors"
        >
          <Plus className={`w-5 h-5 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0, overflow: 'hidden', marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            onSubmit={addTask}
          >
            <input
              autoFocus
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-[#ecf4db] dark:bg-[#2a3122] text-[#2a3122] dark:text-[#f2f9e2] placeholder:text-[#575e4c]/50 dark:placeholder:text-[#a9b09b]/50 text-sm font-medium rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#446500] dark:focus:ring-[#bbf165] transition-all"
            />
          </motion.form>
        )}
      </AnimatePresence>

      <ul className="space-y-3 flex-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {tasks.map((task, i) => (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.01, backgroundColor: 'var(--tw-hover-bg)' }}
              onClick={() => toggleTask(task.id)}
              className={`flex items-center gap-3 p-3 bg-[#ecf4db] dark:bg-[#2a3122] hover:bg-[#e1ebd0] dark:hover:bg-[#343e2b] rounded-xl cursor-pointer transition-colors ${!task.done && i >= 2 && !isAdding ? 'opacity-80' : ''}`}
              style={{ '--tw-hover-bg': 'transparent' }}
            >
              <AnimatePresence mode="wait">
                {task.done ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <CheckCircle className="w-5 h-5 text-[#446500] dark:text-[#bbf165]" fill="currentColor" stroke="var(--check-stroke, white)" style={{ '--check-stroke': 'var(--tw-color-opacity, currentColor)' }} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="undone"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Circle className="w-5 h-5 text-[#727966] dark:text-[#575e4c]" />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className={`text-sm font-medium ${task.done ? 'text-[#446500] dark:text-[#bbf165] line-through opacity-70' : 'text-[#2a3122] dark:text-[#f2f9e2]'}`}>{task.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 5. LIVE DATABASE CARD
// ═══════════════════════════════════════════════════════════════════
function LiveDatabaseCard() {
  const [stats, setStats] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/stats`)
      setStats(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, 30000)
    return () => clearInterval(id)
  }, [fetchStats])

  const handleSync = async () => {
    setSyncing(true)
    setSyncDone(false)
    try {
      await axios.get(`${API}/stats`)
      await fetchStats()
      setSyncDone(true)
      setTimeout(() => setSyncDone(false), 2000)
    } catch { /* ignore */ }
    setSyncing(false)
  }

  const totalMemories = stats?.total_memories || 0
  const memTypes = stats?.memories_by_type || {}
  const total = Object.values(memTypes).reduce((a, b) => a + b, 0) || 1

  const segments = [
    { key: 'document', color: 'bg-[#446500] dark:bg-[#bbf165]', label: 'Documents' },
    { key: 'email', color: 'bg-[#5d5295] dark:bg-[#beb2fd]', label: 'Emails' },
    { key: 'decision', color: 'bg-[#785600] dark:bg-[#f6c233]', label: 'Decisions' },
    { key: 'meeting', color: 'bg-[#bbf165] dark:bg-[#575e4c]', label: 'Meetings' },
  ]

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(68,101,0,0.12)' }}
      className="md:col-span-4 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6 flex flex-col justify-between"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[#2a3122] dark:text-[#f2f9e2]">LIVE DATABASE</h3>
          <motion.span
            variants={scaleIn}
            className="bg-[#beb2fd]/30 dark:bg-[#beb2fd]/10 text-[#5d5295] dark:text-[#beb2fd] px-2 py-0.5 rounded-md text-[10px] font-bold"
          >
            {totalMemories} MEMORIES
          </motion.span>
        </div>

        {/* Segmented bar */}
        <div className="flex h-12 gap-1 rounded-lg overflow-hidden bg-[#e3ecd1] dark:bg-[#2e3726]">
          {segments.map((seg, i) => {
            const count = memTypes[seg.key] || 0
            const pct = Math.max((count / total) * 100, 5)
            return (
              <motion.div
                key={seg.key}
                className={`${seg.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: 0.1 * i, ease: 'easeOut' }}
                title={seg.label}
              />
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-[10px] font-bold text-[#575e4c] dark:text-[#a9b09b] uppercase">
          {segments.map(seg => (
            <div key={seg.key} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${seg.color}`} />
              {seg.label}
            </div>
          ))}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSync}
        disabled={syncing}
        className="w-full mt-4 text-[#446500] dark:text-[#bbf165] text-xs font-bold py-2 border border-[#446500]/20 dark:border-[#bbf165]/20 rounded-lg hover:bg-[#bbf165]/20 dark:hover:bg-[#bbf165]/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {syncing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          >
            <RefreshCw className="w-4 h-4" />
          </motion.div>
        ) : syncDone ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Check className="w-4 h-4 text-[#446500] dark:text-[#bbf165]" />
          </motion.div>
        ) : null}
        {syncing ? 'SYNCING...' : syncDone ? 'SYNCED!' : 'SYNC DATABASE'}
      </motion.button>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 6. RECENT ACTIVITY CARD
// ═══════════════════════════════════════════════════════════════════
function RecentActivityCard() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API}/history`)
        setHistory((data.history || []).slice(0, 3))
      } catch { /* ignore */ }
    }
    fetch()
    const id = setInterval(fetch, 10000)
    return () => clearInterval(id)
  }, [])

  const formatTime = (isoStr) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    return isToday ? `Today, ${timeStr}` : `Yesterday, ${timeStr}`
  }

  const icons = [
    { icon: <FileText className="w-3.5 h-3.5 text-[#446500]" />, border: 'border-[#446500]' },
    { icon: <Mail className="w-3.5 h-3.5 text-[#5d5295]" />, border: 'border-[#5d5295]' },
    { icon: <Mic className="w-3.5 h-3.5 text-[#785600]" />, border: 'border-[#785600]' },
  ]

  const staticItems = [
    { query: 'Summarize Q1 report', timestamp: null },
    { query: 'Draft reply to CTO', timestamp: null },
    { query: 'Meeting Recording: Sync', timestamp: null },
  ]

  const displayItems = history.length > 0 ? history : staticItems

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(68,101,0,0.12)' }}
      className="md:col-span-4 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6 flex flex-col h-full"
    >
      <h3 className="font-bold text-[#2a3122] dark:text-[#f2f9e2] mb-4">RECENT ACTIVITY</h3>

      <div className="space-y-4 relative">
        {/* Timeline line */}
        <motion.div
          className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-[#e3ecd1] dark:bg-[#2e3726]"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6 }}
          style={{ transformOrigin: 'top' }}
        />

        <AnimatePresence>
          {displayItems.map((item, i) => {
            const iconSet = icons[i % icons.length]
            const queryText = (item.query || '').length > 30
              ? item.query.substring(0, 30) + '...'
              : item.query
            const timeText = item.timestamp
              ? formatTime(item.timestamp)
              : ['Today, 08:30 AM', 'Today, 07:15 AM', 'Yesterday, 05:45 PM'][i]

            let borderColor = iconSet.border
            // Optional: You can make borders brighter in dark mode if needed
            if (borderColor === 'border-[#446500]') borderColor = 'border-[#446500] dark:border-[#bbf165]'
            if (borderColor === 'border-[#5d5295]') borderColor = 'border-[#5d5295] dark:border-[#beb2fd]'
            if (borderColor === 'border-[#785600]') borderColor = 'border-[#785600] dark:border-[#f6c233]'

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12, duration: 0.3 }}
                className="relative pl-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: i * 0.15 }}
                  className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-white dark:bg-[#1a1f18] border-2 ${borderColor} flex items-center justify-center`}
                >
                  {/* For dark mode we might need to alter icon colors if they are too dark */}
                  <div className="scale-75 brightness-100 dark:brightness-150">
                    {iconSet.icon}
                  </div>
                </motion.div>
                <div className="text-xs font-bold text-[#2a3122] dark:text-[#f2f9e2]">{queryText}</div>
                <div className="text-[10px] text-[#575e4c] dark:text-[#a9b09b]">{timeText}</div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 7. ACTIVITY CHART CARD
// ═══════════════════════════════════════════════════════════════════
function ActivityChartCard() {
  const [period, setPeriod] = useState('WEEKLY')
  const totalHours = useCountUp(322, 1200, 200) // 32.2 * 10

  const barData = [
    { day: 'MON', height: 40, value: '4.2h' },
    { day: 'TUE', height: 65, value: '5.8h' },
    { day: 'WED', height: 85, value: '7.2h' },
    { day: 'THU', height: 55, value: '4.9h' },
    { day: 'FRI', height: 95, active: true, value: '8.5h' },
    { day: 'SAT', height: 30, value: '2.1h' },
    { day: 'SUN', height: 20, value: '1.4h' },
  ]

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(68,101,0,0.12)' }}
      className="md:col-span-12 bg-white dark:bg-[#1a1f18] rounded-xl shadow-[0px_12px_32px_rgba(42,49,34,0.06)] dark:shadow-none p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-[#2a3122] dark:text-[#f2f9e2]">ACTIVITY</h3>
          <p className="text-2xl font-bold tracking-tight text-[#446500] dark:text-[#bbf165]">
            {(totalHours / 10).toFixed(1)}h{' '}
            <span className="text-xs font-medium text-[#575e4c] dark:text-[#a9b09b] ml-1">THIS WEEK</span>
          </p>
        </div>
        <div className="flex gap-2">
          {['DAILY', 'WEEKLY'].map(p => (
            <motion.button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                period === p
                  ? 'bg-[#446500] dark:bg-[#bbf165] text-white dark:text-[#1a1f18]'
                  : 'bg-[#ecf4db] dark:bg-[#2a3122] text-[#575e4c] dark:text-[#a9b09b]'
              }`}
              whileTap={{ scale: 0.95 }}
              layout
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between h-32 gap-4">
        {barData.map((bar, i) => (
          <div key={bar.day} className="flex-1 h-full relative group flex items-end">
            <motion.div
              className={`w-full rounded-t-lg ${bar.active ? 'bg-[#446500] dark:bg-[#bbf165]' : 'bg-[#c8d9a8] dark:bg-[#3b452e] hover:bg-[#bbf165] dark:hover:bg-[#8eb84a]'} transition-colors relative`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
              style={{
                height: `${bar.height}%`,
                transformOrigin: 'bottom',
              }}
            >
              <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#2a3122] dark:bg-white text-white dark:text-[#1a1f18] text-[10px] px-2 py-1 rounded whitespace-nowrap ${
                bar.active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              } transition-opacity z-10`}>
                {bar.day}: {bar.value}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-4 text-[10px] font-bold text-[#575e4c] dark:text-[#a9b09b]">
        {barData.map(bar => <span key={bar.day}>{bar.day}</span>)}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 8. ONBOARDING BANNER
// ═══════════════════════════════════════════════════════════════════
function OnboardingBanner({ onSetupOnboarding, onboardingRunning }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative bg-[#2a3122] text-[#f2f9e2] rounded-xl p-8 overflow-hidden group"
    >
      {/* Floating blobs */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-[#bbf165] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-64 h-64 bg-[#5d5295] rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"
          animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Master your workspace with AI context</h3>
          <p className="text-[#cdd9ba]/70 max-w-xl">
            ContextOS bridges the gap between your local tools and intelligent workflows. Run your first setup to unlock full enterprise capabilities.
          </p>
        </div>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSetupOnboarding}
            disabled={onboardingRunning}
            className="bg-[#446500] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-[#446500]/10 hover:bg-[#3b5800] transition-colors disabled:opacity-60"
          >
            {onboardingRunning ? (
              <span className="flex items-center gap-2">
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
                Setting up...
              </span>
            ) : 'Run Onboarding Setup'}
          </motion.button>
          <motion.a
            href="https://github.com/Cyansiiii/ContextOS/blob/main/DEPLOYMENT.md"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white/10 text-white backdrop-blur px-8 py-3 rounded-full font-bold border border-white/20 hover:bg-white/20 transition-all flex items-center justify-center"
          >
            Read Docs
          </motion.a>
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════
export default function DashboardPage({ currentUser, setupOnboarding, onboardingRunning }) {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Greeting */}
        <GreetingHeader userName={currentUser?.name} />

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]"
        >
          <AmdMonitorCard />
          <WorkHoursCard />
          <TasksCard />
          <LiveDatabaseCard />
          <RecentActivityCard />
          <ActivityChartCard />
        </motion.div>

        {/* Bottom Banner */}
        <OnboardingBanner
          onSetupOnboarding={setupOnboarding}
          onboardingRunning={onboardingRunning}
        />
      </motion.div>
    </div>
  )
}
