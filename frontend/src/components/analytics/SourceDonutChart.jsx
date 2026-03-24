import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SOURCE_COLORS = {
  document: '#286c00',        // Primary
  email: '#406900',           // Secondary
  meeting_notes: '#baf474',   // Secondary container
  decision: '#6dbe45',        // Primary container 
  slack: '#717a68',           // Outline
};

const SOURCE_LABELS = {
  document: 'Documents',
  email: 'Emails',
  meeting_notes: 'Meeting Notes',
  decision: 'Decisions',
  slack: 'Slack',
};

export default function SourceDonutChart({ memoriesByType, loading, error, onRetry }) {
  const chartData = useMemo(() => {
    if (!memoriesByType || Object.keys(memoriesByType).length === 0) return [];
    
    let total = 0;
    const entries = [];
    
    for (const [key, val] of Object.entries(memoriesByType)) {
      total += val;
      entries.push({ 
        id: key, 
        label: SOURCE_LABELS[key] || key, 
        value: val,
        color: SOURCE_COLORS[key] || '#c0cab5' 
      });
    }

    if (total === 0) return [];

    let currentOffset = 0;
    const circumference = 2 * Math.PI * 40; // R = 40 (viewbox 100x100 -> cx,cy 50,50)

    const processed = entries.map(entry => {
      const percentage = entry.value / total;
      const strokeDasharray = `${percentage * circumference} ${circumference}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += percentage * circumference;

      return {
        ...entry,
        percentage: Math.round(percentage * 100),
        strokeDasharray,
        strokeDashoffset,
        circumference,
      };
    }).filter(e => e.value > 0);

    return { total, segments: processed };
  }, [memoriesByType]);

  if (error) {
    return (
      <div className="lg:col-span-4 bg-white/60 backdrop-blur-[20px] p-8 rounded-[2rem] shadow-sm border border-white/75 flex flex-col items-center justify-center">
        <p className="font-['Baskervville'] italic text-2xl mb-2">No breakdown data</p>
        <button className="px-4 py-2 bg-[#6dbe45] text-white rounded-full font-bold shadow hover:bg-[#286c00]" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="lg:col-span-4 bg-white/60 backdrop-blur-[20px] p-8 rounded-[2rem] shadow-sm border border-white/75 flex flex-col items-center justify-between overflow-hidden">
      <div className="text-center w-full mb-8">
        <h4 className="text-2xl font-bold font-['Baskervville'] italic text-[#181d1a] mb-2">Memory Sources Breakdown</h4>
        <p className="text-sm text-[#40493a] font-['Inter']">Content distribution by source</p>
      </div>

      <div className="flex-grow flex items-center justify-center relative w-full h-48">
        {loading ? (
          <div className="w-48 h-48 rounded-full border-[24px] border-[#ebefea] animate-shimmer" 
            style={{ 
              background: 'linear-gradient(90deg, #ebefea 25%, #dfe4df 50%, #ebefea 75%)', 
              backgroundSize: '200% 100%' 
            }} 
          />
        ) : chartData.segments?.length > 0 ? (
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 origin-center drop-shadow-md">
              {chartData.segments.map((seg, i) => (
                <motion.circle
                  key={seg.id}
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="20"
                  strokeDasharray={seg.strokeDasharray}
                  initial={{ strokeDashoffset: seg.circumference }}
                  animate={{ strokeDashoffset: seg.strokeDashoffset }}
                  transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <span className="block text-2xl font-bold font-['Baskervville'] text-[#181d1a] italic">
                {chartData.total >= 1000 ? (chartData.total / 1000).toFixed(1) + 'k' : chartData.total}
              </span>
              <span className="block text-[10px] text-[#717a68] font-bold uppercase tracking-widest mt-1">Total Items</span>
            </div>
          </div>
        ) : (
          <p className="font-['Inter'] text-[#40493a] opacity-50 font-bold">No Data Available</p>
        )}
      </div>

      {!loading && chartData.segments && (
        <div className="mt-8 grid grid-cols-2 gap-y-3 gap-x-4 w-full px-4">
          <AnimatePresence>
            {chartData.segments.map((seg, i) => (
              <motion.div
                key={seg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: seg.color }} />
                <span className="text-xs font-medium text-[#181d1a] truncate">
                  {seg.label} ({seg.percentage}%)
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
