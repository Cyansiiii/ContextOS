import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import KpiCard from '../components/analytics/KpiCard'
import QueryLineChart from '../components/analytics/QueryLineChart'
import SourceDonutChart from '../components/analytics/SourceDonutChart'
import QueryLogTable from '../components/analytics/QueryLogTable'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── Orb animation configs ───────────────────────
const ORB_A = {
  x: [0, 30, -20, 15, 0],
  y: [0, -25, 15, -10, 0],
  scale: [1, 1.2, 0.9, 1.1, 1],
}
const ORB_B = {
  x: [0, -25, 30, -15, 0],
  y: [0, 20, -30, 10, 0],
  scale: [1, 0.9, 1.15, 0.95, 1],
}

export default function AnalyticsPage({ onNavigateToChat }) {
  // ─── State ────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState(null)
  const [benchmarks, setBenchmarks] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [historyError, setHistoryError] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const statsTimer = useRef(null)
  const historyTimer = useRef(null)

  // ─── Data Fetching ────────────────────────────────
  const fetchOverview = useCallback(async () => {
    const res = await fetch(`${API}/analytics/overview`)
    if (!res.ok) throw new Error('Failed to fetch analytics overview')
    return res.json()
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      setStatsError(false)
      const res = await fetch(`${API}/stats`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
      setLastRefresh(new Date())
    } catch (e) {
      try {
        const overview = await fetchOverview()
        setStats({
          total_memories: overview.summary?.total_memories || 0,
          memories_by_type: overview.memory_distribution || {},
        })
        setHistory((prev) => (prev?.length ? prev : (Array.isArray(overview.recent_queries) ? overview.recent_queries : [])))
        setLastRefresh(new Date())
        setStatsError(false)
      } catch (fallbackError) {
        console.error('Stats fetch error:', e, fallbackError)
        setStatsError(true)
      }
    } finally {
      setStatsLoading(false)
    }
  }, [fetchOverview])

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryError(false)
      const res = await fetch(`${API}/history`)
      if (!res.ok) throw new Error('Failed to fetch history')
      const data = await res.json()
      setHistory(Array.isArray(data.history) ? data.history : (Array.isArray(data) ? data : []))
    } catch (e) {
      try {
        const overview = await fetchOverview()
        setHistory(Array.isArray(overview.recent_queries) ? overview.recent_queries : [])
        setLastRefresh((prev) => prev || new Date())
        setHistoryError(false)
      } catch (fallbackError) {
        console.error('History fetch error:', e, fallbackError)
        setHistoryError(true)
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [fetchOverview])

  const fetchBenchmarks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/benchmarks`)
      if (!res.ok) return
      const data = await res.json()
      setBenchmarks(data)
    } catch {
      // silently fail for benchmarks
    }
  }, [])

  // ─── Initial Load + Polling ───────────────────────
  useEffect(() => {
    fetchStats()
    fetchHistory()
    fetchBenchmarks()

    statsTimer.current = setInterval(fetchStats, 30000)
    historyTimer.current = setInterval(fetchHistory, 10000)

    return () => {
      clearInterval(statsTimer.current)
      clearInterval(historyTimer.current)
    }
  }, [fetchStats, fetchHistory, fetchBenchmarks])

  // ─── Derived Data ─────────────────────────────────
  const totalMemories = stats?.total_memories || 0
  const memoriesByType = stats?.memories_by_type || {}
  const totalQueries = useMemo(() => (history ? history.length : 0), [history])

  const { highConf, medConf, lowConf, avgConfidence } = useMemo(() => {
    if (!history || history.length === 0)
      return { highConf: 0, medConf: 0, lowConf: 0, avgConfidence: 0 }

    let h = 0, m = 0, l = 0
    let totalScore = 0;
    history.forEach((item) => {
      if (item.confidence === 'High') { h++; totalScore += 90; }
      else if (item.confidence === 'Medium') { m++; totalScore += 70; }
      else { l++; totalScore += 45; }
    })

    const avg = totalScore / history.length

    return { highConf: h, medConf: m, lowConf: l, avgConfidence: avg }
  }, [history])

  const avgResponseTime = useMemo(() => {
    if (!benchmarks) return 0
    return benchmarks.avg_query_ms ? benchmarks.avg_query_ms / 1000 : 0
  }, [benchmarks])

  const memoryTypes = useMemo(
    () => Object.keys(memoriesByType).length,
    [memoriesByType]
  )

  return (
    <div className="relative min-h-screen text-[#181d1a]" 
         style={{
           fontFamily: "'Inter', sans-serif",
           background: "radial-gradient(circle at 50% 50%, #f6faf5 0%, #ebefea 100%)",
           animation: "bgShift 15s ease-in-out infinite alternate"
         }}
    >
      <style>{`
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
      
      {/* Background Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ top: '10%', left: '20%', background: 'radial-gradient(circle, #6dbe4520 0%, transparent 70%)' }}
          animate={ORB_A}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ bottom: '15%', right: '10%', background: 'radial-gradient(circle, #baf47420 0%, transparent 70%)' }}
          animate={ORB_B}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ═══ CONTENT ═══ */}
      <main className="relative z-10 min-h-screen px-4 pt-10 pb-20 sm:px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto overflow-x-hidden">
          {/* ── Page Header ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-[#c0cab5]/50 pb-6"
          >
            <div>
              <h1 className="text-5xl font-bold font-['Baskervville'] italic text-[#181d1a] tracking-tight mb-2">
                Memory Dashboard
              </h1>
              <p className="text-[#40493a] text-sm font-medium">Real-time intelligence from your private data securely indexed.</p>
            </div>

            <div className="flex items-center gap-4 mt-4 md:mt-0">
              {/* Last updated */}
              {lastRefresh && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] text-[#717a68] uppercase tracking-widest font-bold"
                >
                  Last Sync: {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </motion.p>
              )}
              {/* Refresh button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ rotate: 180, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  setStatsLoading(true); setHistoryLoading(true);
                  fetchStats(); fetchHistory(); fetchBenchmarks();
                }}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#c0cab5] flex items-center justify-center hover:bg-[#6dbe45] hover:text-white transition-colors"
                title="Refresh Data"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </motion.button>
            </div>
          </motion.div>

          {/* ── KPI Cards Row ───────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            <KpiCard
              index={0}
              icon="database"
              iconBg="bg-[#286c00] text-white shadow-sm"
              label="Total Memories Indexed"
              value={totalMemories}
              loading={statsLoading}
              error={statsError}
              badge="Active"
              sub="Secure Local Index"
            />
            <KpiCard
              index={1}
              icon="search"
              iconBg="bg-[#3a7d44] text-white shadow-sm"
              label="Queries Processed"
              value={totalQueries}
              loading={historyLoading}
              error={historyError}
              badge="Local DB"
              sub="Zero Cloud Calls"
            />
            <KpiCard
              index={2}
              icon="bolt"
              iconBg="bg-[#6dbe45] text-white shadow-sm"
              label="Avg Response Time"
              value={avgResponseTime}
              suffix="s"
              loading={statsLoading}
              error={statsError}
              badge="AMD NPU"
              sub="On-Device Inference"
            />
            <KpiCard
              index={3}
              icon="verified_user"
              iconBg="bg-[#a3f877] text-[#286c00] shadow-sm"
              label="Avg Confidence"
              value={avgConfidence}
              suffix="%"
              loading={historyLoading}
              error={historyError}
              badge="DPDP OK"
              progressBar={avgConfidence}
            />
          </div>

          {/* ── Charts Row ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-10">
            <QueryLineChart
              history={history || []}
              loading={historyLoading}
              error={historyError}
              onRetry={fetchHistory}
            />
            <SourceDonutChart
              memoriesByType={memoriesByType}
              loading={statsLoading}
              error={statsError}
              onRetry={fetchStats}
            />
          </div>

          {/* ── Query Log Table ─────────────────────── */}
          <QueryLogTable
            history={history || []}
            loading={historyLoading}
            error={historyError}
            onRetry={fetchHistory}
            onNavigateToChat={onNavigateToChat}
          />
        </div>
      </main>
    </div>
  )
}
