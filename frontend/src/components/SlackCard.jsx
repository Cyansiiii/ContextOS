import { useState } from 'react'
import axios from 'axios'
import { MessageSquare, CheckCircle, Loader2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SlackCard() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [channels, setChannels] = useState(0)
  
  const handleSync = async () => {
    setLoading(true)
    setSuccess(false)
    
    try {
      // Hit the backend
      const res = await axios.post(`${API}/slack/sync`)
      setChannels(res.data.channels_synced)
      setSuccess(true)
    } catch (err) {
      console.error("Slack sync failed", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card rounded-[2rem] p-6 lg:p-7 relative overflow-hidden group border border-[#4A154B]/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#4A154B]/10 flex items-center justify-center border border-[#4A154B]/20">
          <MessageSquare className="w-5 h-5 text-[#4A154B] dark:text-[#E01E5A]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Slack Connector</h3>
          <p className="text-xs text-slate-500 font-medium">Sync team channels to memory</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Connect your organization's Slack workspace to auto-ingest important announcements, decisions, and tech discussions directly into ContextOS.
        </p>
        
        {success && (
          <div className="animate-pop-in flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Successfully Connected</p>
              <p className="text-xs opacity-80 mt-1">Ingested {channels} channels into the local vector store.</p>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSync}
        disabled={loading || success}
        className="w-full relative overflow-hidden group bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl py-3 px-4 font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={success ? { backgroundColor: '#10b981', color: 'white' } : {}}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Syncing Channels...</>
        ) : success ? (
          <><CheckCircle className="w-4 h-4" /> Slack Connected</>
        ) : (
          <><MessageSquare className="w-4 h-4" /> Connect Slack Workspace</>
        )}
      </button>
    </div>
  )
}
