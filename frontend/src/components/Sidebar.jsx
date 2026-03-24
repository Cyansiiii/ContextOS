import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar({ activeNav = 'Analytics', onNavigateName }) {
  const navItems = [
    { name: 'Chat', icon: 'chat_bubble' },
    { name: 'Analytics', icon: 'analytics' },
    { name: 'Memory Hub', icon: 'database' },
  ];

  return (
    <motion.aside
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed left-0 top-0 h-screen w-[240px] border-r border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col p-4 gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.05)] z-50 text-[#181d1a]"
      style={{
        background: 'rgba(255,255,255,0.6)',
      }}
    >
      <div className="flex items-center gap-3 px-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-[#286c00] flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-lg">database</span>
        </div>
        <div>
          <h1 className="font-['Baskervville'] italic text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">ContextOS</h1>
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">AI Memory Engine</p>
        </div>
      </div>

      <button className="w-full py-3 px-4 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg text-white hover:opacity-90 active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg, #6DBE45, #3a7d44)' }}
        onClick={() => onNavigateName && onNavigateName('Chat')}
      >
        <span className="material-symbols-outlined text-sm">chat_bubble</span>
        New Chat
      </button>

      <nav className="flex-1 flex flex-col gap-1 mt-2 relative">
        <AnimatePresence>
          {navItems.map((item, index) => {
            const isActive = item.name === activeNav;
            return (
              <motion.a
                key={item.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigateName) onNavigateName(item.name);
                }}
                href="#"
                className={`relative flex items-center gap-3 px-4 py-2 rounded-full font-label text-sm transition-all ${
                  isActive 
                    ? 'text-[#286c00] font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40 font-medium'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-[#6dbe45]/10 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="material-symbols-outlined relative z-10" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span className="relative z-10">{item.name}</span>
              </motion.a>
            )
          })}
        </AnimatePresence>
      </nav>

      <div className="pt-4 mt-auto border-t border-[#c0cab5]/30 flex flex-col gap-1">
        <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all rounded-full">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label text-sm font-medium">Settings</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all rounded-full">
          <span className="material-symbols-outlined">help_outline</span>
          <span className="font-label text-sm font-medium">Help</span>
        </a>
      </div>
    </motion.aside>
  );
}
