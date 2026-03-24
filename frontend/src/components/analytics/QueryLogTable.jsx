import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QueryLogTable({ history, loading, error, onRetry, onNavigateToChat }) {
  const handleExportCSV = () => {
    if (!history || history.length === 0) return;
    
    // Columns: Query, Source, Confidence, Timestamp, Status
    const headers = ['Query', 'Source', 'Confidence', 'Timestamp', 'Status'];
    const rows = history.map(item => {
      const source = item.sources?.[0] || 'Unknown';
      const conf = item.confidence || 'Medium';
      const status = conf === 'Low' ? 'Low Confidence' : 'Answered';
      return `"${item.query.replace(/"/g, '""')}","${source}","${conf}","${item.timestamp}","${status}"`;
    });
    
    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contextos_query_log.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const truncate = (str, n = 50) => (str.length > n ? str.slice(0, n - 1) + '...' : str);

  if (error) {
    return (
      <div className="bg-white/60 backdrop-blur-[20px] p-8 rounded-[2rem] shadow-sm border border-white/75 text-center mt-10">
        <h4 className="text-2xl font-bold font-['Baskervville'] italic mb-4">Could not load query history</h4>
        <button className="px-6 py-2 bg-[#6dbe45] text-white rounded-full font-bold shadow hover:bg-[#286c00]" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-[20px] rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.05)] border border-white/75 overflow-hidden mt-10">
      <div className="p-8 flex justify-between items-center border-b border-white/50">
        <div>
          <h4 className="text-2xl font-bold font-['Baskervville'] italic text-[#181d1a]">Recent Query Log</h4>
          <p className="text-sm text-[#40493a]">Real-time retrieval monitoring</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 border border-[#c0cab5] rounded-full text-xs font-bold hover:bg-white/80 transition-all shadow-sm text-[#181d1a]"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Export CSV
        </motion.button>
      </div>

      <div className="overflow-x-auto w-full max-w-full">
        {loading ? (
          <div className="w-full flex flex-col gap-2 p-8">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="h-12 w-full rounded-xl bg-gradient-to-r from-[#ebefea] via-[#dfe4df] to-[#ebefea] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            ))}
          </div>
        ) : history?.length === 0 ? (
          <div className="text-center p-12 flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl text-[#717a68] opacity-50 mb-4">history</span>
            <p className="font-['Baskervville'] italic text-2xl text-[#181d1a] mb-2">No queries yet</p>
            <p className="text-[#40493a] text-sm mb-6">Ask something to see your query log</p>
            <button 
              onClick={() => onNavigateToChat && onNavigateToChat()}
              className="px-6 py-3 bg-gradient-to-r from-[#6dbe45] to-[#406900] text-white rounded-full font-bold shadow-lg hover:opacity-90"
            >
              Ask something
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-separate border-spacing-y-2 px-8 pb-8 mt-2">
            <thead>
              <tr className="text-[11px] font-bold text-[#717a68] uppercase tracking-[0.15em]">
                <th className="px-4 py-3">Query</th>
                <th className="px-4 py-3">Source Match</th>
                <th className="px-4 py-3">Confidence Score</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <motion.tbody 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-sm border-spacing-y-2"
            >
              <AnimatePresence>
                {history.map((row, idx) => {
                  const source = row.sources?.[0] || 'Unknown';
                  const sourceType = source.includes('pdf') || source.includes('doc') ? 'description' : source.includes('@') ? 'mail' : 'forum';
                  const confVal = row.confidence === 'High' ? 90 : row.confidence === 'Medium' ? 70 : 45;
                  
                  return (
                    <motion.tr 
                      key={row.timestamp + row.query + idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: Math.min(idx, 20) * 0.04 }}
                      whileHover={{ backgroundColor: "rgba(40,108,0,0.04)" }}
                      className={`${idx % 2 === 0 ? 'bg-white/40' : 'bg-[#f1f5f0]/50'} transition-colors group rounded-xl overflow-hidden`}
                    >
                      <td className="px-4 py-4 rounded-l-xl font-medium text-[#181d1a]">{truncate(row.query, 50)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-xs ${sourceType==='mail' ? 'text-[#a13669]' : 'text-[#406900]'}`}>
                            {sourceType}
                          </span>
                          <span className="text-[#181d1a]">{truncate(source, 20)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-[#ebefea] h-1.5 w-16 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${confVal}%` }}
                              transition={{ duration: 0.6, delay: 0.2 + (Math.min(idx, 20) * 0.04) }}
                              className={`h-full ${row.confidence === 'Low' ? 'bg-[#ff81b7]' : 'bg-[#286c00]'}`} 
                            />
                          </div>
                          <span className={`font-bold ${row.confidence === 'Low' ? 'text-[#a13669]' : 'text-[#181d1a]'}`}>
                            {confVal}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#717a68]">
                        {new Date(row.timestamp).toLocaleDateString() + ' ' + new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                      </td>
                      <td className="px-4 py-4 rounded-r-xl">
                        {row.confidence === 'Low' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ffdad6] text-[#93000a] rounded-full text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            Low Confidence
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#286c00]/10 text-[#286c00] rounded-full text-[11px] font-bold">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Answered
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </motion.tbody>
          </table>
        )}
      </div>
    </div>
  );
}
