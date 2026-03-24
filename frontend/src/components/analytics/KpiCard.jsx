import React, { useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export default function KpiCard({
  icon,
  iconBg,
  label,
  value,
  sub,
  suffix = '',
  loading,
  error,
  badge,
  progressBar,
  index = 0,
}) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1000 });
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    if (!loading && !error && typeof value === 'number') {
      motionValue.set(value);
    }
  }, [value, loading, error, motionValue]);

  useEffect(() => {
    return springValue.onChange((latest) => {
      // Determine if dealing with floats or ints based on initial value or step
      if (value % 1 !== 0) {
        setDisplayValue(latest.toFixed(1));
      } else {
        setDisplayValue(Math.round(latest));
      }
    });
  }, [springValue, value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white/60 backdrop-blur-[20px] p-6 rounded-[2rem] shadow-sm border border-white/75 flex flex-col relative"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {badge && (
          <span className="text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-surface-container text-outline">
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[#40493a] text-sm font-['Baskervville'] italic">{label}</p>
        
        {loading ? (
          <div className="w-16 h-8 rounded animate-shimmer" 
               style={{
                 background: 'linear-gradient(90deg, #ebefea 25%, #dfe4df 50%, #ebefea 75%)',
                 backgroundSize: '200% 100%',
               }}></div>
        ) : error ? (
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-bold text-[#181d1a]">—</h3>
            <span className="text-xs font-bold px-2 py-1 bg-[#ffdad6] text-[#ba1a1a] rounded-full">Could not load</span>
          </div>
        ) : (
          <h3 className="text-3xl font-bold text-[#181d1a] font-['Inter']">
            {typeof value === 'number' ? displayValue : value}{suffix}
          </h3>
        )}

        {progressBar !== undefined && !loading && !error && (
          <div className="w-full bg-[#ebefea] h-1 rounded-full mt-4 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressBar}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-[#286c00] h-full rounded-full" 
            />
          </div>
        )}
        
        {sub && !progressBar && (
          <p className="text-[10px] text-[#717a68] uppercase tracking-wider font-bold pt-2">{sub}</p>
        )}
      </div>
    </motion.div>
  );
}
