import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Cpu, HardDrive, Shield, Server, Zap, MonitorSpeaker
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ArcGauge({ percent = 0, label, sublabel, size = 150 }) {
  const radius = 44
  const stroke = 7
  const circumference = Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  const color =
    percent >= 90 ? '#ef4444' :
    percent >= 70 ? '#f59e0b' :
      '#10b981'

  const glowColor =
    percent >= 90 ? 'rgba(239,68,68,0.28)' :
    percent >= 70 ? 'rgba(245,158,11,0.24)' :
      'rgba(16,185,129,0.24)'

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="flex flex-col items-center">
        <svg width={size} height={size * 0.62} viewBox="0 0 100 62" className="overflow-visible">
          <path
            d="M 6 56 A 44 44 0 0 1 94 56"
            fill="none"
            stroke="rgba(148,163,184,0.26)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d="M 6 56 A 44 44 0 0 1 94 56"
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${glowColor})`,
            }}
          />
          <text
            x="50"
            y="48"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-white"
            style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'DM Sans', sans-serif" }}
          >
            {percent.toFixed(0)}%
          </text>
        </svg>
        <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {sublabel && (
          <span className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">{sublabel}</span>
        )}
      </div>
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    ACTIVE: 'bg-emerald-500',
    DEGRADED: 'bg-amber-400',
    OFFLINE: 'bg-rose-500',
  }
  const glows = {
    ACTIVE: 'shadow-[0_0_10px_rgba(16,185,129,0.45)]',
    DEGRADED: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
    OFFLINE: 'shadow-[0_0_10px_rgba(244,63,94,0.45)]',
  }
  return (
    <div className="relative flex h-3.5 w-3.5 items-center justify-center">
      <div className={`absolute h-3.5 w-3.5 rounded-full ${colors[status]} ${glows[status]} ${status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
      <div className={`relative z-10 h-2.5 w-2.5 rounded-full ${colors[status]}`} />
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-52 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-900" />
          <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, badge, badgeTone = 'emerald', valueColor }) {
  const badgeClass =
    badgeTone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
      : badgeTone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'

  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</div>
          <div className={`mt-1 truncate text-sm font-semibold ${valueColor || 'text-slate-900 dark:text-white'}`}>
            {value}
          </div>
        </div>
      </div>
      {badge ? (
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${badgeClass}`}>
          {badge}
        </span>
      ) : null}
    </div>
  )
}

export default function AmdStatusCard() {
  const [status, setStatus] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [benchmarks, setBenchmarks] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(fetchMetrics, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const { data } = await axios.get(`${API}/amd/status`)
      setStatus(data)
      setMetrics(data.metrics)
    } catch {
      setStatus({
        status: 'OFFLINE',
        inference_engine: 'Unavailable',
        active_model: 'N/A',
        embedding_model: 'N/A',
        hardware: { cpu: 'Unknown', gpu: 'Unknown', inference_backend: 'Unknown', amd_gpu_detected: false },
        cloud_calls: 0,
        amd_optimised: false,
        privacy_score: '100%',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const { data } = await axios.get(`${API}/amd/metrics`)
      setMetrics(data)
    } catch {
      // ignore
    }
    try {
      const { data } = await axios.get(`${API}/benchmarks`)
      setBenchmarks(data)
    } catch {
      // ignore
    }
  }

  if (loading || !status) return <Skeleton />

  const hw = status.hardware || {}
  const isAmd = hw.amd_gpu_detected || false
  const statusLabels = {
    ACTIVE: 'Inference System Active',
    DEGRADED: 'System Degraded',
    OFFLINE: 'Ollama Offline',
  }

  const statusTone =
    status.status === 'OFFLINE'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
      : status.status === 'DEGRADED'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,rgba(240,253,250,0.95))] shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#081019,#0f172a)] dark:shadow-none">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-emerald-400" />
      <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-500/10" />
      <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-rose-200/30 blur-3xl dark:bg-rose-500/10" />

      <div className="relative p-6 lg:p-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <StatusDot status={status.status} />
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Runtime Monitor
              </div>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-white">
              {statusLabels[status.status] || 'Unknown State'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Live visibility into inference runtime, local models, privacy posture, and hardware health.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] ${statusTone}`}>
              <Shield className="h-3.5 w-3.5" />
              {status.privacy_score || '100%'} private
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <Cpu className="h-3.5 w-3.5 text-rose-500" />
              {isAmd ? 'AMD accelerated' : (hw.inference_backend || 'CPU backend')}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <InfoRow icon={<Server className="h-4 w-4" />} label="Inference engine" value={status.inference_engine} />
              <InfoRow icon={<Zap className="h-4 w-4" />} label="Active model" value={status.active_model} badge="Local" />
              <InfoRow icon={<HardDrive className="h-4 w-4" />} label="Embedding model" value={status.embedding_model} badge="Local" />
              <InfoRow
                icon={<MonitorSpeaker className="h-4 w-4" />}
                label="GPU"
                value={hw.gpu || 'Unknown'}
                valueColor={isAmd ? 'text-rose-600 dark:text-rose-300' : 'text-slate-900 dark:text-white'}
              />
              <InfoRow
                icon={<Cpu className="h-4 w-4" />}
                label="Backend"
                value={hw.inference_backend || 'CPU'}
                badge={isAmd ? 'AMD' : 'Local'}
                badgeTone={isAmd ? 'rose' : 'emerald'}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Cloud API calls
                </div>
                <div className="mt-3 text-6xl font-black leading-none tracking-[-0.05em] text-rose-600 dark:text-rose-400">
                  {status.cloud_calls}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  External inference requests made
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Performance snapshot
                </div>
                {benchmarks ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Avg response</div>
                      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {benchmarks.avg_query_ms ? (benchmarks.avg_query_ms / 1000).toFixed(1) : '0.0'}s
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Fastest</div>
                      <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {benchmarks.fastest_query_ms ? (benchmarks.fastest_query_ms / 1000).toFixed(1) : '0.0'}s
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Grade</div>
                      <div className={`mt-1 text-lg font-bold ${benchmarks.performance_grade === 'A' ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                        {benchmarks.performance_grade || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">Benchmark data not available yet.</div>
                )}
              </div>
            </div>

            <div className={`rounded-[24px] border px-5 py-4 text-sm leading-relaxed ${
              status.amd_optimised
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}>
              {status.amd_optimised ? (
                <>AMD Ryzen AI active. Hardware-accelerated inference path is available on this machine.</>
              ) : (
                <>
                  <span className="font-semibold">Running on {hw.gpu || hw.inference_backend || 'CPU'}.</span> AMD Ryzen AI deployment targets faster local inference when dedicated NPU/GPU acceleration is available.
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {metrics ? (
              <>
                <ArcGauge percent={metrics.cpu_percent || 0} label="CPU load" size={145} />
                <ArcGauge
                  percent={metrics.ram_percent || 0}
                  label="Memory"
                  sublabel={`${metrics.ram_used_gb} GB / ${metrics.ram_total_gb} GB`}
                  size={145}
                />
              </>
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                Loading metrics...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
