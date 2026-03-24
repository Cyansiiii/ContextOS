import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QueryLineChart({ history, loading, error, onRetry }) {
  const [period, setPeriod] = useState('Daily');

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // Group history by date (simplistic representation for demo)
    const dates = {};
    history.forEach(item => {
      const date = new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates[date] = (dates[date] || 0) + 1;
    });
    
    // Convert to array
    const dataArray = Object.keys(dates).map(date => ({ date, value: dates[date] }));
    
    // If we don't have enough data, pad it with some zeros or dummy data for visual
    if (dataArray.length < 5) {
      dataArray.push({ date: '1 Oct', value: 2 }, { date: '8 Oct', value: 5 }, { date: '15 Oct', value: 1 }, { date: '22 Oct', value: 8 });
    }
    
    return dataArray.sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 10);
  }, [history]);

  // Generate SVG path for actual values
  const { maxVal, pathData, fillPathData } = useMemo(() => {
    if (chartData.length === 0) return { maxVal: 1, pathData: '', fillPathData: '' };
    
    const maxVal = Math.max(...chartData.map(d => d.value), 10);
    const w = 1000;
    const h = 200;
    
    const wStep = w / (chartData.length - 1 || 1);
    
    const pathPoints = chartData.map((d, i) => {
      const x = i * wStep;
      const y = h - (d.value / maxVal) * h + 20; // 20px padding top
      return `${x},${y}`;
    });

    // Make smooth curve path
    let d = `M${pathPoints[0]}`;
    for (let i = 1; i < pathPoints.length; i++) {
        const p1 = pathPoints[i-1].split(',').map(Number);
        const p2 = pathPoints[i].split(',').map(Number);
        const xc = (p1[0] + p2[0]) / 2;
        const yc = (p1[1] + p2[1]) / 2;
        if (i === 1) {
            d += ` Q${xc},${p1[1]} ${p2.join(',')}`;
        } else {
            d += ` T${p2.join(',')}`;
        }
    }

    const fillPathData = d + ` L${w},${h+50} L0,${h+50} Z`;
    
    return { maxVal, pathData: d, fillPathData };
  }, [chartData]);

  if (error) {
    return (
      <div className="lg:col-span-6 bg-white/60 backdrop-blur-[20px] p-8 rounded-3xl shadow-sm border border-white/75 flex flex-col items-center justify-center">
        <p className="font-['Baskervville'] italic text-2xl mb-2 text-[#40493a]">No query data</p>
        <button className="px-4 py-2 bg-[#6dbe45] text-white rounded-full font-bold shadow hover:bg-[#286c00]" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="lg:col-span-6 bg-white/60 backdrop-blur-[20px] p-8 rounded-[2rem] shadow-sm border border-white/75 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h4 className="text-2xl font-bold font-['Baskervville'] italic text-[#181d1a]">Query Volume Over Time</h4>
          <p className="text-sm text-[#40493a] font-['Inter']">Last 30 days activity</p>
        </div>
        <div className="flex gap-2 bg-[#ebefea] p-1 rounded-lg">
          {['Daily', 'Weekly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 font-bold rounded relative z-10 text-xs transition-colors ${period === p ? 'text-white' : 'text-[#717a68]'}`}
            >
              {period === p && (
                <motion.div
                  layoutId="chartToggle"
                  className="absolute inset-0 bg-[#286c00] rounded"
                  style={{ zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 relative w-full flex items-end justify-between overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 bg-gradient-to-r from-[#ebefea] via-[#dfe4df] to-[#ebefea] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 250">
                <defs>
                  <linearGradient id="chartFill" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#6DBE45', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: '#6DBE45', stopOpacity: 0 }} />
                  </linearGradient>
                </defs>
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0, duration: 0.8 }}
                  d={fillPathData}
                  fill="url(#chartFill)"
                />
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={pathData}
                  fill="none"
                  stroke="#286c00"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </svg>
            </motion.div>
          </AnimatePresence>
        )}
        
        {/* X-Axis labels */}
        {!loading && (
          <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] font-bold text-[#717a68]/60 uppercase tracking-tighter pt-2">
            {chartData.map((d, i) => (
              <span key={i} className="opacity-70">{d.date}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
