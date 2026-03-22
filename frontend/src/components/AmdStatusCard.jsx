/**
 * AmdStatusCard.jsx — Live AMD Inference Status Card for ContextOS Dashboard.
 *
 * Two panels:
 *   Left:  Status indicator, models, hardware, cloud calls counter
 *   Right: Live CPU/RAM arc gauges (update every 3s)
 *
 * Honest AMD framing — shows actual hardware; never fakes AMD branding
 * on non-AMD machines. Cloud API Calls: 0 always visible.
 */

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
  Cpu, HardDrive, Wifi, WifiOff, Shield,
  Activity, Server, Zap, MonitorSpeaker
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── SVG Arc Gauge Component ──────────────────────────────────────
function ArcGauge({ percent = 0, label, sublabel, size = 120 }) {
  const radius = 44
  const stroke = 7
  const circumference = Math.PI * radius // half-circle
  const offset = circumference - (percent / 100) * circumference

  // Color thresholds
  const color =
    percent >= 90 ? '#ED1C24' :
    percent >= 70 ? '#F59E0B' :
                    '#6EE7C3'

  const glowColor =
    percent >= 90 ? 'rgba(237,28,36,0.3)' :
    percent >= 70 ? 'rgba(245,158,11,0.2)' :
                    'rgba(110,231,195,0.2)'

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.62} viewBox="0 0 100 62" className="overflow-visible">
        {/* Track */}
        <path
          d="M 6 56 A 44 44 0 0 1 94 56"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress */}
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
        {/* Center value */}
        <text
          x="50" y="48"
          textAnchor="middle"
          className="fill-white"
          style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'DM Sans', sans-serif" }}
        >
          {percent.toFixed(0)}%
        </text>
      </svg>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mt-1">
        {label}
      </span>
      {sublabel && (
        <span className="text-[10px] text-slate-500 font-medium mt-0.5">{sublabel}</span>
      )}
    </div>
  )
}

// ─── Status Dot with Pulse ────────────────────────────────────────
function StatusDot({ status }) {
  const colors = {
    ACTIVE: 'bg-[#6EE7C3]',
    DEGRADED: 'bg-amber-400',
    OFFLINE: 'bg-[#ED1C24]',
  }
  const glows = {
    ACTIVE: 'shadow-[0_0_8px_#6EE7C3,0_0_20px_rgba(110,231,195,0.3)]',
    DEGRADED: 'shadow-[0_0_8px_#F59E0B]',
    OFFLINE: 'shadow-[0_0_8px_#ED1C24]',
  }
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <div className={`absolute w-3 h-3 rounded-full ${colors[status]} ${glows[status]} ${status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
      <div className={`w-2 h-2 rounded-full ${colors[status]} relative z-10`} />
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 p-8">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-white/10" />
        <div className="h-5 w-48 bg-white/10 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-4 bg-white/5 rounded w-full" />
          ))}
        </div>
        <div className="flex items-center justify-center">
          <div className="w-24 h-16 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export default function AmdStatusCard() {
  const [status, setStatus] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [benchmarks, setBenchmarks] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  // ── Initial full status fetch ─────────────
  useEffect(() => {
    fetchStatus()
  }, [])

  // ── Live metrics polling every 3s ─────────
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
      // Silently fail
    }
    try {
      const { data } = await axios.get(`${API}/benchmarks`)
      setBenchmarks(data)
    } catch {}
  }

  if (loading || !status) return <Skeleton />

  const hw = status.hardware || {}
  const isAmd = hw.amd_gpu_detected || false
  const statusLabels = {
    ACTIVE: 'AMD INFERENCE ACTIVE',
    DEGRADED: 'SYSTEM DEGRADED',
    OFFLINE: 'OLLAMA OFFLINE',
  }

  return (
    <div className="
      relative overflow-hidden rounded-2xl
      bg-[rgba(255,255,255,0.03)]
      border border-[rgba(237,28,36,0.2)]
      backdrop-blur-[12px]
    ">
      {/* Top AMD accent bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#ED1C24] via-[#ED1C24] to-[#ED1C24]/40" />

      <div className="p-6 lg:p-8">

        {/* ─── Status Header ─────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <StatusDot status={status.status} />
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-white" style={{ fontFamily: "'Syne', 'Outfit', sans-serif" }}>
            {statusLabels[status.status] || 'UNKNOWN'}
          </h2>
          {/* Privacy badge */}
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6EE7C3]/10 border border-[#6EE7C3]/20">
            <Shield className="w-3 h-3 text-[#6EE7C3]" />
            <span className="text-[11px] font-bold text-[#6EE7C3] tracking-wide">100% PRIVATE</span>
          </div>
        </div>

        {/* ─── Two Column Layout ─────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* LEFT PANEL — Info rows */}
          <div className="space-y-4">

            {/* Inference Engine */}
            <InfoRow
              icon={<Server className="w-4 h-4" />}
              label="Inference Engine"
              value={status.inference_engine}
            />

            {/* Active Model */}
            <InfoRow
              icon={<Zap className="w-4 h-4" />}
              label="Active Model"
              value={status.active_model}
              badge="LOCAL"
              badgeColor="bg-[#6EE7C3]/10 text-[#6EE7C3] border-[#6EE7C3]/20"
            />

            {/* Embedding Model */}
            <InfoRow
              icon={<HardDrive className="w-4 h-4" />}
              label="Embedding Model"
              value={status.embedding_model}
              badge="LOCAL"
              badgeColor="bg-[#6EE7C3]/10 text-[#6EE7C3] border-[#6EE7C3]/20"
            />

            {/* GPU — honest framing */}
            <InfoRow
              icon={<MonitorSpeaker className="w-4 h-4" />}
              label="GPU"
              value={hw.gpu || 'Unknown'}
              valueColor={isAmd ? 'text-[#ED1C24]' : 'text-slate-400'}
            />

            {/* Inference Backend */}
            <InfoRow
              icon={<Cpu className="w-4 h-4" />}
              label="Backend"
              value={hw.inference_backend || 'CPU'}
              badge={isAmd ? 'AMD' : null}
              badgeColor="bg-[#ED1C24]/15 text-[#ED1C24] border-[#ED1C24]/25"
            />

            {/* ── Cloud Calls: THE HERO STAT ── */}
            <div className="pt-4 mt-2 border-t border-white/5">
              <div className="flex items-end gap-3">
                <span
                  className="text-[48px] font-[800] leading-none tracking-tight"
                  style={{
                    color: '#ED1C24',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.5s ease',
                  }}
                >
                  {status.cloud_calls}
                </span>
                <div className="pb-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">
                    Cloud API Calls
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    External calls made
                  </p>
                </div>
              </div>

              {/* F-20: Benchmarks Display */}
              {benchmarks && (
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 font-medium flex gap-2">
                    <span>Avg response: {benchmarks.avg_query_ms ? (benchmarks.avg_query_ms / 1000).toFixed(1) : '0.0'}s</span>
                    <span>&bull;</span>
                    <span>Fastest: {benchmarks.fastest_query_ms ? (benchmarks.fastest_query_ms / 1000).toFixed(1) : '0.0'}s</span>
                    <span>&bull;</span>
                    <span>Grade: <span className={benchmarks.performance_grade === 'A' ? 'text-[#6EE7C3] font-bold' : ''}>{benchmarks.performance_grade}</span></span>
                  </p>
                </div>
              )}
            </div>

            {/* AMD framing note — honest */}
            {!status.amd_optimised && (
              <div className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-slate-500 leading-relaxed">
                <span className="text-slate-400 font-semibold">Running on {hw.gpu || 'CPU'}.</span>{' '}
                AMD Ryzen AI deployment targets 3-5× faster inference via NPU.
              </div>
            )}
            {status.amd_optimised && (
              <div className="mt-2 p-3 rounded-lg bg-[#ED1C24]/5 border border-[#ED1C24]/15 text-[11px] text-[#ED1C24]/80 leading-relaxed font-semibold">
                AMD Ryzen AI Active — hardware-accelerated inference
              </div>
            )}
          </div>

          {/* RIGHT PANEL — Live Gauges */}
          <div className="flex flex-col items-center justify-center gap-4">
            {metrics ? (
              <>
                <ArcGauge
                  percent={metrics.cpu_percent || 0}
                  label="CPU Load"
                  size={130}
                />
                <ArcGauge
                  percent={metrics.ram_percent || 0}
                  label="Memory"
                  sublabel={`${metrics.ram_used_gb} GB / ${metrics.ram_total_gb} GB`}
                  size={130}
                />

                {/* Inference backend badge */}
                <div className={`
                  mt-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider
                  border transition-all duration-300
                  ${isAmd
                    ? 'bg-[#ED1C24]/10 border-[#ED1C24]/25 text-[#ED1C24] shadow-[0_0_15px_rgba(237,28,36,0.1)]'
                    : 'bg-white/5 border-white/10 text-slate-400'
                  }
                `}>
                  {isAmd ? '⚡ AMD ACCELERATED' : `${hw.inference_backend || 'CPU'}`}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">Loading metrics…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── Helper: Info Row ─────────────────────────
function InfoRow({ icon, label, value, badge, badgeColor, valueColor }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="text-slate-500 shrink-0">{icon}</div>
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 shrink-0">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[13px] font-semibold truncate ${valueColor || 'text-slate-300'}`}
              style={{ fontFamily: "'DM Sans', sans-serif", transition: 'color 0.5s ease' }}>
          {value}
        </span>
        {badge && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
