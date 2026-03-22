import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import Lenis from 'lenis'
import Integrations from './Integrations'
import Pricing from './Pricing'
import CurvedLoop from './components/core/CurvedLoop'
import { LineShadowText } from './components/core/line-shadow-text'
import { AnimatedListDemo } from './components/core/AnimatedListDemo'
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { BorderBeam } from "@/components/ui/border-beam"
import { ScrollMarkerReveal } from "./components/ui/scroll-marker-reveal"
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  Search, Database, MessageSquare, BrainCircuit,
  Activity, UploadCloud, Zap, Menu, X, Shield,
  CheckCircle2, ShieldCheck, Sparkles, Files, Briefcase,
  Bell, Clock, ArrowUpRight, Plus, MoreHorizontal, Video, FileText, CheckCircle, Github
} from 'lucide-react'
import GmailCard from './components/GmailCard'
import AmdStatusCard from './components/AmdStatusCard'
import ErrorCard from './components/ErrorCard'
import DPDPPage from './pages/DPDPPage'
import SlackCard from './components/SlackCard'

// MOCK DATA for floating bubbles to simulate Guru homepage
const FLOATING_CHATS = [
  { text: "What's our current security review process?", type: "q", user: "dev", delay: "delay-0", pos: "top-20 -left-12 lg:-left-32" },
  { text: "Standard timeframe is 3-5 business days requiring Approval.", type: "a", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, delay: "delay-[2000ms]", pos: "top-36 left-0 lg:-left-12" },
  { text: "Did we update the Stripe payment API?", type: "q", user: "pm", delay: "delay-1000", pos: "bottom-40 -left-8 lg:-left-24" },
  { text: "Yes—Stripe integration was just updated to support passkey.", type: "a", icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, delay: "delay-[3000ms]", pos: "bottom-20 left-4 lg:-left-8" },
  { text: "Who leads the Acme Corp renewal?", type: "q", user: "sales", delay: "delay-500", pos: "top-16 -right-12 lg:-right-32" },
  { text: "Priya is the lead for Acme Corp.", type: "a", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, delay: "delay-[2500ms]", pos: "top-32 right-0 lg:-right-12" },
]

function App() {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [confidence, setConfidence] = useState('')
  const [chunksSearched, setChunksSearched] = useState(0)
  const [responseTime, setResponseTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('search')
  const [activityPeriod, setActivityPeriod] = useState('Week')
  const [statKey, setStatKey] = useState(0)
  useEffect(() => { setStatKey(k => k + 1) }, [activityPeriod, activeTab])

  // Initialize smooth scrolling with Lenis
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => { lenis.destroy() };
  }, []);

  // Upload state
  const [uploadContent, setUploadContent] = useState('')
  const [uploadSource, setUploadSource] = useState('document')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  // F-07: Expert Finder mode
  const [searchMode, setSearchMode] = useState('ask') // 'ask' or 'expert'
  const [expertResult, setExpertResult] = useState(null)

  // F-06: Decision DNA form fields
  const [decisionTitle, setDecisionTitle] = useState('')
  const [decisionWhat, setDecisionWhat] = useState('')
  const [decisionWhy, setDecisionWhy] = useState('')
  const [decisionRejected, setDecisionRejected] = useState('')
  const [decisionWho, setDecisionWho] = useState('')
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().split('T')[0])
  const [decisionTags, setDecisionTags] = useState('')
  const [decisionMsg, setDecisionMsg] = useState('')

  // F-08: Demo scenarios
  const [demoScenariosOpen, setDemoScenariosOpen] = useState(false)

  // F-15: Global error state
  const [errorData, setErrorData] = useState(null)

  // F-17: Thinking state
  const [isThinking, setIsThinking] = useState(false)
  const inputRef = useRef(null)

  // F-14: Live stats
  const [liveStats, setLiveStats] = useState(null)
  const [displayCount, setDisplayCount] = useState(0)

  // F-13: Query history
  const [queryHistory, setQueryHistory] = useState([])

  // F-20: Benchmarks
  const [benchmarks, setBenchmarks] = useState(null)

  // F-16: Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // F-14: Poll /stats every 30s
  useEffect(() => {
    const fetchStats = () => {
      axios.get(`${API}/stats`).then(({ data }) => setLiveStats(data)).catch(() => {})
    }
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [API])

  // F-14: Count-up animation
  useEffect(() => {
    if (!liveStats?.total_memories) return
    const target = liveStats.total_memories
    const start = performance.now()
    const duration = 800
    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [liveStats?.total_memories])

  // F-13: Poll /history every 10s
  useEffect(() => {
    const fetchHistory = () => {
      axios.get(`${API}/history`).then(({ data }) => setQueryHistory(data.history || [])).catch(() => {})
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 10000)
    return () => clearInterval(interval)
  }, [API])

  // F-20: Fetch benchmarks helper
  const fetchBenchmarks = useCallback(() => {
    axios.get(`${API}/benchmarks`).then(({ data }) => setBenchmarks(data)).catch(() => {})
  }, [API])

  useEffect(() => {
    fetchBenchmarks()
  }, [fetchBenchmarks])

  // F-13: Relative time helper
  const relativeTime = useCallback((isoStr) => {
    if (!isoStr) return ''
    const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`
  }, [])


  // ── F-09: Enhanced Ask with source chips + confidence ──
  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true)
    setIsThinking(true)
    setAnswer('')
    setSources([])
    setConfidence('')
    setChunksSearched(0)
    setResponseTime(null)
    setExpertResult(null)
    setErrorData(null)

    const t0 = performance.now()

    try {
      const response = await axios.post(`${API}/ask`, { question })
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1)

      // F-15: Check for structured error in response
      if (response.data.error) {
        setErrorData(response.data)
        setAnswer('')
      } else {
        setAnswer(response.data.answer)
      }
      setSources(response.data.sources || [])
      setConfidence(response.data.confidence || '')
      setChunksSearched(response.data.chunks_searched || 0)
      setResponseTime(response.data.response_time)
      
      // Update benchmarks after a query
      fetchBenchmarks()
    } catch (error) {
      console.error(error)
      setErrorData({
        error: true,
        error_code: 'OLLAMA_OFFLINE',
        user_message: 'Cannot reach ContextOS backend. Is it running?',
        recovery_action: 'start_ollama'
      })
    }
    setIsThinking(false)
    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }


  const handleExpertSearch = async () => {
    if (!question.trim()) return;
    setLoading(true)
    setIsThinking(true)
    setExpertResult(null)
    setAnswer('')
    setSources([])
    setErrorData(null)

    try {
      const { data } = await axios.get(`${API}/memory/expert`, {
        params: { topic: question }
      })
      setExpertResult(data)
    } catch (error) {
      console.error(error)
      setErrorData({ error: true, error_code: 'OLLAMA_OFFLINE', user_message: 'Cannot reach ContextOS backend.', recovery_action: 'start_ollama' })
    }
    setIsThinking(false)
    setLoading(false)
  }


  // ── F-10: Enhanced Upload with content_type ──
  const handleUpload = async () => {
    if (!uploadContent.trim()) return;
    setUploading(true);
    setUploadMessage('');
    try {
      await axios.post(`${API}/upload`, {
        content: uploadContent,
        source: uploadSource,
        date: new Date().toISOString(),
        content_type: uploadSource,
        author: 'team',
      });
      setUploadMessage('Memory stored successfully!');
      setUploadContent('');
    } catch (error) {
      console.error(error);
      setUploadMessage('Failed to upload memory.');
    }
    setUploading(false);
  }


  // ── F-06: Decision DNA submit ──
  const handleDecisionSubmit = async () => {
    if (!decisionTitle.trim() || !decisionWhat.trim()) return;
    setUploading(true);
    setDecisionMsg('');
    try {
      await axios.post(`${API}/memory/decision`, {
        title: decisionTitle,
        what_decided: decisionWhat,
        why_decided: decisionWhy,
        what_rejected: decisionRejected,
        who_decided: decisionWho || 'Unknown',
        date: decisionDate,
        tags: decisionTags ? decisionTags.split(',').map(t => t.trim()) : [],
      });
      setDecisionMsg('Decision DNA stored. This decision is now permanent company memory — searchable forever, even after you leave.');
      setDecisionTitle('');
      setDecisionWhat('');
      setDecisionWhy('');
      setDecisionRejected('');
      setDecisionWho('');
      setDecisionTags('');
    } catch (error) {
      console.error(error);
      setDecisionMsg('Failed to store decision.');
    }
    setUploading(false);
  }


  // ── F-08: Demo scenario click handler ──
  const handleDemoScenario = (text, mode = 'ask') => {
    setSearchMode(mode)
    setQuestion(text)
    setExpertResult(null)
    setAnswer('')
    setSources([])
    // Auto-submit after 500ms delay for dramatic effect
    setTimeout(() => {
      if (mode === 'expert') {
        // We need to call expert search with the text directly
        setLoading(true)
        axios.get(`${API}/memory/expert`, { params: { topic: text } })
          .then(({ data }) => { setExpertResult(data); setLoading(false) })
          .catch(() => { setExpertResult({ experts: [], answer: 'Error.' }); setLoading(false) })
      } else {
        // Trigger ask
        setLoading(true)
        const t0 = performance.now()
        axios.post(`${API}/ask`, { question: text })
          .then(({ data }) => {
            const elapsed = ((performance.now() - t0) / 1000).toFixed(1)
            setAnswer(data.answer)
            setSources(data.sources || [])
            setConfidence(data.confidence || '')
            setChunksSearched(data.chunks_searched || 0)
            setResponseTime(elapsed)
            setLoading(false)
          })
          .catch(() => { setAnswer('Error reaching API.'); setLoading(false) })
      }
    }, 500)
  }

  // F-08: Onboarding setup
  const setupOnboarding = async () => {
    try {
      await axios.post(`${API}/demo/setup-onboarding`)
      setErrorData(null)
      // Show success briefly
      setUploadMessage('✅ Onboarding Co-pilot ready — 3 memories added')
      setTimeout(() => setUploadMessage(''), 4000)
    } catch {
      setErrorData({ error: true, error_code: 'OLLAMA_OFFLINE', user_message: 'Failed to set up onboarding data. Is Ollama running?', recovery_action: 'start_ollama' })
    }
  }


  const chartData = activityPeriod === 'Week' ? [
    { d: 'Mon', h: 60 }, { d: 'Tue', h: 75 }, { d: 'Wed', h: 95, active: true, val: '8.2h' }, { d: 'Thu', h: 50 }, { d: 'Fri', h: 85 }, { d: 'Sat', h: 40 }, { d: 'Sun', h: 65 }
  ] : activityPeriod === 'Month' ? [
    { d: 'Wk1', h: 45 }, { d: 'Wk2', h: 80 }, { d: 'Wk3', h: 65 }, { d: 'Wk4', h: 90, active: true, val: '32.2h' }
  ] : [
    { d: 'Q1', h: 30 }, { d: 'Q2', h: 50 }, { d: 'Q3', h: 70 }, { d: 'Q4', h: 85, active: true, val: '380h' }
  ];

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 selection:bg-purple-200 overflow-x-hidden relative hero-gradient">

      {/* FIXED NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300 h-14 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between w-full h-full">
          <div className="flex justify-start items-center">
            {/* F-16: Hamburger for mobile */}
            <button className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 mr-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('search'); setMobileMenuOpen(false) }}>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-['Outfit']">ContextOS</span>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-center gap-1">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('search')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'search' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Tasks & Search</button>
            <button onClick={() => setActiveTab('upload')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'upload' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Analytics</button>
            <button onClick={() => setActiveTab('dpdp')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'dpdp' ? 'bg-slate-900 dark:bg-slate-800 text-[#6EE7C3] font-medium' : 'text-[#6EE7C3] hover:text-[#6EE7C3]/80'}`}>DPDP Act ✓</button>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
              <Search className="w-4 h-4" />
            </button>
            <button className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 relative">
              <Bell className="w-4 h-4" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
            </button>
            <a href="https://github.com/Cyansiiii/ContexOS" target="_blank" rel="noopener noreferrer" className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
              <Github className="w-4 h-4" />
            </a>
            <AnimatedThemeToggler className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 focus:outline-none" />
            <div className="h-8 pl-2 flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 ml-1 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-600 overflow-hidden text-white flex items-center justify-center font-bold text-xs shrink-0">C</div>
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">Anant Anandam</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">anant.anandam@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
        {/* F-16: Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 shadow-xl animate-slide-up">
            <div className="flex flex-col p-4 gap-2">
              {['dashboard', 'search', 'upload', 'dpdp'].map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setMobileMenuOpen(false) }}
                  className={`w-full text-left px-5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${activeTab === tab ? 'bg-[#212121] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {tab === 'dashboard' ? 'Dashboard' : tab === 'search' ? 'Tasks & Search' : tab === 'dpdp' ? 'DPDP Act ✓' : 'Analytics'}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="pt-32 pb-24 relative z-10 min-h-screen">

        {/* --- SEARCH / HOME VIEW --- */}
        {activeTab === 'search' && (
          <div className="animate-slide-up w-full flex flex-col items-center">
            {/* HERO CONTAINER */}
            <div className="w-full max-w-7xl mx-auto relative min-h-[75vh] pb-32 px-6 lg:px-12">

              {/* HERO TYPOGRAPHY */}
              <div className="absolute top-1/4 left-0 w-full z-0 flex items-center justify-center pointer-events-none overflow-visible pt-10">
                <CurvedLoop
                  marqueeText="CONTEXT OS ✦ INTELLIGENT ✦ FAST ✦ PRIVATE ✦"
                  speed={2}
                  curveAmount={250}
                  interactive={false}
                />
              </div>

              <div className="text-center max-w-4xl mx-auto mb-16 relative z-10 pt-10 mt-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm mb-6">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Powered by AMD Ryzen AI</span>
                </div>
                <h1 className="text-[3.5rem] md:text-[5rem] font-bold leading-[1.05] tracking-tight text-slate-900 dark:text-white mb-6">
                  Ready to try AI built on <br className="hidden md:block" />
                  <LineShadowText className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400" shadowColor="rgba(124, 58, 237, 0.4)">
                    your knowledge?
                  </LineShadowText>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-300 font-normal mb-8 max-w-2xl mx-auto leading-loose flex flex-wrap justify-center gap-x-2 gap-y-2">
                  <ScrollMarkerReveal delay={0} markerColor="bg-amber-200 dark:bg-amber-600/40">
                    <span className="font-semibold text-slate-800 dark:text-white">Ask, chat, and research</span>
                  </ScrollMarkerReveal>
                  <ScrollMarkerReveal delay={0.2} markerColor="bg-purple-200 dark:bg-purple-600/40">
                    using verified company knowledge.
                  </ScrollMarkerReveal>
                  <ScrollMarkerReveal delay={0.4} markerColor="bg-emerald-200 dark:bg-emerald-600/40">
                    Always cited. Always secure.
                  </ScrollMarkerReveal>
                </p>

                {/* SECURITY BADGES (Mocking Guru) */}
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-12">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> SOC 2</span> |
                  <span>GDPR</span> |
                  <span>SSO</span> |
                  <span>Encryption</span> |
                  <span>Zero data retention</span>
                </div>
              </div>

              {/* HUGE SEARCH BAR */}
              <div className="max-w-3xl mx-auto relative z-20 mb-4">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-500/20 rounded-full blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative bg-white dark:bg-[#1a1c22] border border-slate-200 dark:border-slate-800 flex items-center p-3 rounded-full shadow-2xl hover:shadow-xl transition-all h-20 pl-8">
                    <Search className="w-7 h-7 text-[#8250f2]" />
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (searchMode === 'expert' ? handleExpertSearch() : askQuestion())}
                      placeholder={searchMode === 'expert' ? "Who knows about... (e.g. payment API)" : "Ask anything about your company's knowledge..."}
                      className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-base sm:text-xl px-3 sm:px-4 py-2 font-medium placeholder-slate-400 dark:placeholder-slate-500"
                      ref={inputRef}
                      disabled={isThinking}
                    />
                    <button
                      onClick={searchMode === 'expert' ? handleExpertSearch : askQuestion}
                      disabled={loading}
                      className="bg-[#8250f2] hover:bg-[#7245d6] text-white px-8 h-full rounded-full font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : searchMode === 'expert' ? 'Find Expert 🔍' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* F-07: Ask / Expert mode toggle */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => { setSearchMode('ask'); setExpertResult(null) }}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border ${searchMode === 'ask'
                      ? 'bg-[#8250f2] text-white border-[#8250f2] shadow-md'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#8250f2]'
                    }`}
                  >Ask a Question</button>
                  <button
                    onClick={() => { setSearchMode('expert'); setAnswer(''); setSources([]) }}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border ${searchMode === 'expert'
                      ? 'bg-[#6EE7C3] text-slate-900 border-[#6EE7C3] shadow-md'
                      : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-[#6EE7C3]'
                    }`}
                  >Find an Expert</button>
                </div>

                {/* F-20: Benchmark Display */}
                {benchmarks && (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 opacity-80">
                      ⚡ Avg Response: <span className="text-[#6EE7C3] tabular-nums">{benchmarks.avg_query_ms ? (benchmarks.avg_query_ms / 1000).toFixed(1) : '0.0'}s</span>
                    </span>
                    <span className="hidden sm:block w-px h-3 bg-slate-300 dark:bg-slate-700"></span>
                    <span className="flex items-center gap-1.5 opacity-80">
                      🏆 Fastest: <span className="text-[#6EE7C3] tabular-nums">{benchmarks.fastest_query_ms ? (benchmarks.fastest_query_ms / 1000).toFixed(1) : '0.0'}s</span>
                    </span>
                    <span className="hidden sm:block w-px h-3 bg-slate-300 dark:bg-slate-700"></span>
                    <span className="flex items-center gap-1.5 opacity-80">
                      🔒 Cloud Calls: <span className="text-[#ED1C24] tabular-nums">0</span>
                    </span>
                  </div>
                )}
              </div>

              {/* F-08: DEMO SCENARIOS (collapsible) */}
              <div className="max-w-3xl mx-auto relative z-20 mb-8">
                <button
                  onClick={() => setDemoScenariosOpen(!demoScenariosOpen)}
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-2 mx-auto transition-colors"
                >
                  <span>{demoScenariosOpen ? '▾' : '▸'}</span> Demo Scenarios
                </button>
                {demoScenariosOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 animate-slide-up">
                    <button
                      onClick={() => handleDemoScenario('Who do I talk to about the payment system?', 'ask')}
                      className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-dashed border-[#6EE7C3]/20 hover:border-[#6EE7C3] hover:border-solid transition-all text-left group"
                    >
                      <span className="text-lg mb-1 block">🧑‍💼</span>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#6EE7C3] transition-colors">New Joiner</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Click to ask as a new joiner</p>
                    </button>
                    <button
                      onClick={() => handleDemoScenario('Why did we switch from AWS to Railway?', 'ask')}
                      className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-dashed border-[#6EE7C3]/20 hover:border-[#6EE7C3] hover:border-solid transition-all text-left group"
                    >
                      <span className="text-lg mb-1 block">🔍</span>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#6EE7C3] transition-colors">Decision Lookup</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Click to look up a past decision</p>
                    </button>
                    <button
                      onClick={() => handleDemoScenario('payment integration', 'expert')}
                      className="p-4 rounded-xl bg-white/[0.03] dark:bg-white/[0.03] border border-dashed border-[#6EE7C3]/20 hover:border-[#6EE7C3] hover:border-solid transition-all text-left group"
                    >
                      <span className="text-lg mb-1 block">🧠</span>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#6EE7C3] transition-colors">Expert Find</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Click to find a team expert</p>
                    </button>
                  </div>
                )}
              </div>

              {/* F-17: THINKING CARD */}
              {isThinking && (
                <div className="max-w-3xl mx-auto mb-8 animate-slide-up">
                  <div className="glass-card rounded-2xl p-6 text-left relative overflow-hidden border border-[#ED1C24]/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#ED1C24]/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#ED1C24] animate-pulse" />
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">ContextOS is thinking...</span>
                    </div>
                    {/* Animated progress bar */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ED1C24] to-[#6EE7C3] animate-thinking-bar" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-fade-in" style={{animationDelay: '0ms'}}>
                        {searchMode === 'expert' ? 'Scanning documents for expertise patterns...' : `Searching ${liveStats?.total_chunks || 'your knowledge base'} chunks locally`}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-fade-in" style={{animationDelay: '200ms'}}>
                        {searchMode === 'expert' ? 'Identifying knowledge owners...' : 'Mistral 7B generating answer...'}
                      </p>
                      <p className="text-xs font-bold text-[#ED1C24] animate-fade-in" style={{animationDelay: '400ms'}}>⚡ 0 external API calls</p>
                    </div>
                  </div>
                </div>
              )}

              {/* F-15: Error display */}
              {errorData && !isThinking && (
                <div className="max-w-3xl mx-auto mb-4">
                  <ErrorCard
                    error_code={errorData.error_code}
                    user_message={errorData.user_message}
                    recovery_action={errorData.recovery_action}
                    onRetry={() => { setErrorData(null); searchMode === 'expert' ? handleExpertSearch() : askQuestion() }}
                    onDismiss={() => setErrorData(null)}
                    onNavigate={(tab) => { setErrorData(null); setActiveTab(tab) }}
                  />
                </div>
              )}

              {/* F-07: EXPERT FINDER RESULTS */}
              {expertResult && (
                <div className="max-w-3xl mx-auto mb-20 animate-slide-up">
                  <div className="glass-card rounded-[2rem] p-8 text-left relative overflow-hidden border border-[#6EE7C3]/20">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-10 h-10 rounded-full bg-[#6EE7C3]/10 text-[#6EE7C3] flex items-center justify-center shrink-0 shadow-lg">
                        <BrainCircuit className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Expert Finder</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Topic: {expertResult.topic}</p>
                      </div>
                    </div>

                    {expertResult.experts && expertResult.experts.length > 0 ? (
                      <div className="space-y-3 pl-14">
                        {expertResult.experts.map((expert, i) => (
                          <div key={i} className="p-4 rounded-xl bg-white/5 border border-[#6EE7C3]/15 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full bg-[#6EE7C3]/20 flex items-center justify-center text-sm font-bold text-[#6EE7C3]">
                                {expert.name[0]}
                              </div>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">{expert.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                expert.confidence === 'High' ? 'bg-[#6EE7C3]/10 text-[#6EE7C3] border-[#6EE7C3]/25' :
                                expert.confidence === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                                'bg-red-500/10 text-red-500 border-red-500/25'
                              }`}>{expert.confidence}</span>
                              <span className="text-xs text-slate-500">{expert.evidence_count} documents</span>
                            </div>
                            {expert.sources && expert.sources.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {expert.sources.map((src, j) => (
                                  <span key={j} className="text-[11px] px-2 py-1 rounded-full bg-[#6EE7C3]/5 border border-[#6EE7C3]/15 text-slate-400 font-medium">{src}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 pl-14">{expertResult.answer}</p>
                    )}

                    {expertResult.answer && expertResult.experts?.length > 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 pl-14 font-medium">{expertResult.answer}</p>
                    )}
                  </div>
                </div>
              )}

              {/* F-09: AI ANSWER REGION — Enhanced with Source Chips */}
              {answer && (
                <div className="max-w-3xl mx-auto mb-20 animate-slide-up">
                  <div className="glass-card rounded-[2rem] p-8 text-left relative overflow-hidden group">
                    <BorderBeam duration={8} size={300} reverse className="from-transparent via-purple-500 to-transparent" />
                    <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full"></div>

                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6 relative z-10">
                      <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-lg">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">ContextOS Answer</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Mistral 7B (local)</p>
                      </div>
                    </div>

                    {/* Answer text */}
                    <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium pl-14 relative z-10">
                      {answer}
                    </p>

                    {/* Source Chips */}
                    {sources.length > 0 && (
                      <div className="pl-14 mt-6 relative z-10">
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 mb-2">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {sources.map((s, i) => {
                            const typeIcon = {
                              'meeting_notes': '📋', 'document': '📄', 'email': '📧',
                              'decision': '⚡', 'slack': '💬',
                            }[s.source_type] || '📄'
                            const name = (s.source_name || 'unknown').length > 30
                              ? (s.source_name || 'unknown').slice(0, 30) + '…'
                              : (s.source_name || 'unknown')
                            return (
                              <div
                                key={i}
                                className="group/chip relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6EE7C3]/10 border border-[#6EE7C3]/30 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#6EE7C3]/20 cursor-pointer transition-all"
                                title={s.excerpt || ''}
                              >
                                <span className="text-sm">{typeIcon}</span>
                                <span>{name}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Confidence + Meta */}
                    <div className="pl-14 mt-5 flex flex-wrap items-center gap-3 relative z-10 text-sm">
                      {confidence && (
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          confidence === 'High' ? 'bg-[#6EE7C3]/10 text-[#6EE7C3] border-[#6EE7C3]/25' :
                          confidence === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                          'bg-red-500/10 text-red-500 border-red-500/25'
                        }`}>
                          <CheckCircle className="w-3 h-3" /> Confidence: {confidence}
                        </span>
                      )}
                      {chunksSearched > 0 && (
                        <span className="text-xs text-slate-500 font-medium">{chunksSearched} chunks searched</span>
                      )}
                      {responseTime && (
                        <span className="text-xs text-slate-500 font-medium">Answered in {responseTime}s — locally on this device</span>
                      )}
                      <span className="text-xs text-[#ED1C24] font-bold">⚡ 0 external API calls</span>
                    </div>
                  </div>
                </div>
              )}

              {/* FLOATING BUBBLES BACKGROUND (Visible on Desktop) */}
              {!answer && !expertResult && (
                <div className="hidden lg:block absolute top-[10%] left-0 right-0 bottom-0 pointer-events-none z-0">
                  <div className="relative w-full h-full max-w-7xl mx-auto">
                    {FLOATING_CHATS.map((chat, idx) => (
                      <div
                        key={idx}
                        className={`absolute ${chat.pos} animate-float ${chat.delay} bg-white dark:bg-[#1a1c22] px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none border border-slate-100 dark:border-slate-800 max-w-xs flex gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 float-bubble`}
                      >
                        {chat.type === "q" ? (
                          <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0 text-xs">
                            {chat.user[0].toUpperCase()}
                          </div>
                        ) : (
                          <div className="mt-0.5 shrink-0">{chat.icon}</div>
                        )}
                        <span>{chat.text}</span>
                      </div>
                    ))}

                    <div className="absolute right-0 bottom-32 animate-float bg-white dark:bg-[#1a1c22] rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-none border border-slate-100 dark:border-white/10 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">Verified!</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-semibold">By Engine</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Integrations Section */}
            <div className="w-full bg-slate-50 relative z-20 border-y border-slate-200 overflow-hidden">
              <Integrations />
            </div>

            {/* Pricing Section */}
            <div className="w-full">
              <Pricing />
            </div>
          </div>
        )}

        {/* --- UPLOAD VIEW --- */}
        {activeTab === 'upload' && (
          <div className="animate-slide-up max-w-3xl mx-auto mt-8 px-6">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">Add to your Knowledge Base</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">Connect your tools or paste directly to train the AI instantly.</p>
            </div>

            {/* ── Connected Sources ────────────────────────── */}
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#6EE7C3] shadow-[0_0_6px_#6EE7C3]" />
                Connected Sources
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GmailCard />
                <SlackCard />
              </div>
            </div>

            <div className="glass-card rounded-[2rem] p-8 md:p-12 relative overflow-hidden group">
              <BorderBeam duration={8} size={300} reverse className="from-transparent via-blue-500 to-transparent" />

              {/* F-10: Content Type Selector — 5 types */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 border-b border-slate-100 dark:border-slate-800 pb-8 mb-8 relative z-10">
                {[
                  { id: 'document', icon: '📄', label: "Document" },
                  { id: 'email', icon: '📧', label: "Email" },
                  { id: 'meeting_notes', icon: '📋', label: "Meeting" },
                  { id: 'decision', icon: '⚡', label: "Decision" },
                  { id: 'slack', icon: '💬', label: "Slack" },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setUploadSource(t.id); setDecisionMsg(''); setUploadMessage(''); }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all border-2 ${uploadSource === t.id
                      ? t.id === 'decision'
                        ? 'border-[#ED1C24] bg-red-50 dark:bg-red-900/10 text-[#ED1C24]'
                        : 'border-[#8250f2] bg-purple-50 dark:bg-purple-900/20 text-[#8250f2] dark:text-purple-400'
                      : 'border-transparent bg-slate-50 dark:bg-[#1a1c22]/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252830]'
                      }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* F-06: Decision DNA form — shown when ⚡ Decision is selected */}
              {uploadSource === 'decision' ? (
                <div className="space-y-5 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚡</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Decision DNA</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 -mt-3 mb-4">Permanent, structured decision record — searchable forever.</p>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Decision Title *</label>
                    <input type="text" value={decisionTitle} onChange={e => setDecisionTitle(e.target.value)}
                      placeholder="e.g. Switch from AWS to Railway"
                      className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 font-medium placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">What was decided *</label>
                    <textarea value={decisionWhat} onChange={e => setDecisionWhat(e.target.value)} rows={3}
                      placeholder="What outcome was decided..."
                      className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 resize-none font-medium placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Why this decision was made</label>
                    <textarea value={decisionWhy} onChange={e => setDecisionWhy(e.target.value)} rows={3}
                      placeholder="Reasoning, context, data points..."
                      className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 resize-none font-medium placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">What was rejected / alternatives considered</label>
                    <textarea value={decisionRejected} onChange={e => setDecisionRejected(e.target.value)} rows={2}
                      placeholder="Options that were considered but not chosen..."
                      className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 resize-none font-medium placeholder-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Who decided</label>
                      <input type="text" value={decisionWho} onChange={e => setDecisionWho(e.target.value)}
                        placeholder="Name(s)"
                        className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 font-medium placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Date</label>
                      <input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)}
                        className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1">Tags (comma-separated)</label>
                    <input type="text" value={decisionTags} onChange={e => setDecisionTags(e.target.value)}
                      placeholder="e.g. infrastructure, cost, tech"
                      className="w-full bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#ED1C24] focus:ring-4 focus:ring-red-500/10 font-medium placeholder-slate-400"
                    />
                  </div>

                  <button
                    onClick={handleDecisionSubmit}
                    disabled={uploading || !decisionTitle.trim() || !decisionWhat.trim()}
                    className="w-full bg-[#ED1C24] hover:bg-[#d41920] text-white font-bold text-lg py-4 rounded-xl shadow-xl shadow-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Storing Decision...</>
                    ) : (
                      <>Commit Decision to Memory ⚡</>
                    )}
                  </button>

                  {decisionMsg && (
                    <div className={`animate-pop-in mt-4 flex items-center gap-3 p-4 rounded-xl ${decisionMsg.includes('Failed') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <p className="font-semibold text-sm">{decisionMsg}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Generic text upload for other types */
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Paste Content</label>
                    <textarea
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      placeholder="Paste the raw text of the document or notes here. ContextOS will automatically index and verify it for future searches..."
                      className="w-full h-56 bg-white dark:bg-[#1a1c22]/50 border-2 border-slate-200 dark:border-white/10 rounded-2xl p-5 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#8250f2] focus:ring-4 focus:ring-purple-500/10 resize-none font-medium text-lg placeholder-slate-400 dark:placeholder-slate-500 shadow-inner dark:shadow-none"
                    ></textarea>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !uploadContent}
                      className="w-full bg-[#8250f2] hover:bg-[#7245d6] text-white font-bold text-lg py-4 rounded-xl shadow-xl shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Vectorizing...</>
                      ) : (
                        <><UploadCloud className="w-5 h-5" /> Commit to Memory</>
                      )}
                    </button>
                  </div>

                  {uploadMessage && (
                    <div className="animate-pop-in mt-4 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <p className="font-semibold">{uploadMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- DASHBOARD VIEW --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-slide-up max-w-[1400px] mx-auto mt-4 pb-12 px-6">
            {/* AMD Status Card — full width, first element */}
            <div className="mb-6 flex flex-col sm:flex-row items-start gap-4">
              <div className="flex-1 w-full">
                <AmdStatusCard />
              </div>
              <button
                onClick={setupOnboarding}
                className="shrink-0 px-5 py-3 rounded-xl bg-[#6EE7C3]/10 border border-[#6EE7C3]/25 text-[#6EE7C3] text-sm font-bold hover:bg-[#6EE7C3]/20 transition-all flex items-center gap-2 mt-2 sm:mt-0"
              >
                <Zap className="w-4 h-4" /> Run Onboarding Setup
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* LEFT COLUMN */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Working Hours */}
                <div className="glass-card rounded-[2rem] p-6 lg:p-7 relative overflow-hidden group">
                  <BorderBeam duration={8} size={200} className="from-transparent via-amber-500 to-transparent" />
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">Today&apos;s working hours</h3>
                  <div className="flex items-baseline gap-2 mb-6 border-b border-dashed border-slate-200 dark:border-slate-700 pb-5">
                    <Clock className="w-5 h-5 text-amber-700 dark:text-amber-500" />
                    <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">8 h 27m</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Active time</p>
                      <p className="text-xs text-slate-500 font-medium mb-3">6h 17m</p>
                      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-[70%] stripe-green animate-progress origin-left transition-all duration-1000"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Pause time</p>
                      <p className="text-xs text-slate-500 font-medium mb-3">2h 10m</p>
                      <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-[30%] stripe-pink animate-progress origin-left transition-all duration-1000 delay-150"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meeting Card */}
                <div className="glass-card rounded-[2rem] p-6 lg:p-7 relative overflow-hidden group">
                  <BorderBeam duration={8} size={200} className="from-transparent via-blue-500 to-transparent" />
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                    In 30 minutes
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Meeting with Product team</h3>

                  {/* Timeline block */}
                  <div className="relative h-12 mb-2">
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                    <div className="absolute top-1/2 -translate-y-1/2 left-[10%] w-[40%] h-8 bg-blue-500/10 border border-blue-500/20 rounded-md"></div>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-slate-400 mb-6">
                    <span>10:15<span className="ml-4 text-slate-800 dark:text-slate-200">10:30</span></span>
                    <span><span className="mr-3 text-slate-800 dark:text-slate-200">12:00</span>12:15</span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between group cursor-pointer">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Join on Google Meet</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><Video className="w-3 h-3" /> meet.google.com/nux-wq-tu</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Video className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* MIDDLE COLUMN - LARGE GRAPHS & TASKS */}
              <div className="lg:col-span-2 flex flex-col gap-6">

                {/* Activity Graph Card */}
                <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group">
                  <BorderBeam duration={8} size={350} reverse className="from-transparent via-emerald-500 to-transparent" />
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Activity</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs font-medium leading-relaxed">You logged <span className="font-bold text-slate-700 dark:text-slate-300">32.2 hours</span> this week — up <span className="font-bold text-slate-700 dark:text-slate-300">4.3 hours</span> from last month.</p>
                    </div>
                    <div className="flex bg-slate-100/80 p-1 rounded-xl">
                      {['Week', 'Month', 'Year'].map(p => (
                        <button key={p} onClick={() => setActivityPeriod(p)} className={`px-4 py-1.5 rounded-lg text-sm transition-all ${activityPeriod === p ? 'bg-white shadow-sm font-bold text-slate-800' : 'font-semibold text-slate-500 hover:text-slate-800'}`}>{p}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-16 justify-between mt-auto h-48 relative">
                    {/* Y-axis absolute stat mock */}
                    <div className="absolute bottom-4 left-0">
                      <p className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">32.2h</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> 15%</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">vs last month</span>
                      </div>
                    </div>

                    {/* Bar Graph Recharts */}
                    <div className="flex items-end h-full ml-auto w-[65%] sm:w-[50%] md:w-3/5 lg:w-[65%] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                          <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                          <Tooltip cursor={{ fill: 'transparent', opacity: 0.1 }} content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#212121] dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl -translate-y-4">
                                  {payload[0].payload.val || `${(payload[0].value / 10).toFixed(1)}h`}
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Bar dataKey="h" radius={[6, 6, 6, 6]} animationDuration={1000}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.active ? '#2563eb' : '#3b82f6'} style={{ opacity: entry.active ? 1 : 0.6 }} className="hover:opacity-100 transition-opacity cursor-pointer shadow-lg" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Today's Tasks Blocks */}
                <div className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden group">
                  <BorderBeam duration={10} size={300} className="from-transparent via-indigo-500 to-transparent" />
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Today&apos;s tasks</h2>
                    <a href="#" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">View all</a>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                    {/* Active Blue Task Card */}
                    <div className="min-w-[280px] bg-gradient-to-br from-blue-500 to-blue-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                      <div className="flex justify-between items-start mb-8 relative z-10">
                        <span className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">10:30 - 12:00 AM</span>
                        <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mb-8 relative z-10">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 mb-2 bg-white/10 px-2 py-0.5 rounded-md"><Database className="w-3 h-3" /> English</span>
                        <h3 className="text-lg font-bold leading-tight mb-2">Technical English<br />Session</h3>
                        <p className="text-xs text-blue-100/70 font-medium">Practice terminology and core co...</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/20 pt-4 relative z-10">
                        <div className="flex -space-x-2">
                          <div className="w-7 h-7 rounded-full bg-blue-400 border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">EW</div>
                          <div className="w-7 h-7 rounded-full bg-indigo-400 border-2 border-blue-600 flex items-center justify-center text-[10px] font-bold">AS</div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-white/80">
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 2/4</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 12</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Task Card 1 */}
                    <div className="min-w-[280px] bg-slate-50 dark:bg-[#1a1c22]/50 border border-slate-100 dark:border-white/10 rounded-[2rem] p-6 shadow-sm relative group hover:-translate-y-1 transition-transform cursor-pointer hover:shadow-md">
                      <div className="flex justify-between items-start mb-8">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-300">01:00 - 02:30 PM</span>
                        <button className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </button>
                      </div>
                      <div className="mb-8">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 mb-2"><Briefcase className="w-3 h-3" /> Design</span>
                        <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white mb-2">UI Components<br />Workshop</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">Create and refine interface eleme...</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                        <div className="flex -space-x-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">MK</div>
                          <div className="w-7 h-7 rounded-full bg-orange-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">PL</div>
                          <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">+2</div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 3/10</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 14</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Task Card 2 */}
                    <div className="min-w-[280px] bg-slate-50 dark:bg-[#1a1c22]/50 border border-slate-100 dark:border-white/10 rounded-[2rem] p-6 shadow-sm relative group hover:-translate-y-1 transition-transform cursor-pointer hover:shadow-md">
                      <div className="flex justify-between items-start mb-8">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-300">2:30 - 16:00 PM</span>
                        <button className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </button>
                      </div>
                      <div className="mb-8">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2"><Video className="w-3 h-3" /> Meeting</span>
                        <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white mb-2">Extended Team Sync<br />Meeting</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">Discuss progress, blockers, and ne...</p>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                        <div className="flex -space-x-2">
                          <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">AS</div>
                          <div className="w-7 h-7 rounded-full bg-pink-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">TR</div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> 0/5</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 9</span>
                        </div>
                      </div>
                    </div>

                    {/* Add new space */}
                    <div className="min-w-[100px] flex items-center justify-center">
                      <button className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-1 flex flex-col gap-6">

                {/* F-14: Live Memory Stats Card */}
                <div className="glass-card rounded-[2rem] p-6 lg:p-7 relative overflow-hidden group">
                  <BorderBeam duration={8} size={250} className="from-transparent via-emerald-500 to-transparent" />
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" /> Live Database
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Syncing</span>
                    </div>
                  </div>

                  {/* F-14: Total Animated Count */}
                  <div className="relative mx-auto mb-10 text-center">
                    <div className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 font-['Outfit'] tabular-nums">
                      {displayCount.toLocaleString()}
                    </div>
                    <div className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-[0.2em]">Total Memories Indexed</div>
                  </div>

                  {/* F-14: Memory Breakdown */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Memory Composition</h4>
                    
                    {liveStats?.memories_by_type ? Object.entries(liveStats.memories_by_type).map(([type, count], i) => {
                      if (count === 0) return null;
                      const percentage = Math.round((count / liveStats.total_memories) * 100);
                      const colors = [
                        'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'
                      ];
                      const colorClass = colors[i % colors.length];
                      
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 capitalize">
                            <span>{type.replace('_', ' ')}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${colorClass} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center text-sm text-slate-500 py-4">Waiting for data...</div>
                    )}
                  </div>
                  
                  {/* Footer stats */}
                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] font-medium text-slate-400">
                    <span>{liveStats?.chromadb_size_mb || '0'} MB Database</span>
                    <span>{liveStats?.total_chunks || '0'} Vector Chunks</span>
                  </div>
                </div>

                {/* F-13: Recent Activity (Query History) */}
                <div className="glass-card rounded-[2rem] p-6 lg:p-7 relative overflow-hidden group flex-1 min-h-[400px]">
                  <BorderBeam duration={8} size={250} reverse className="from-transparent via-purple-500 to-transparent" />
                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" /> Recent Activity
                    </h3>
                    {queryHistory.length > 0 && (
                      <button onClick={() => setQueryHistory([])} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#ED1C24] transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="w-full relative z-10 h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {queryHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No recent queries</p>
                        <p className="text-xs text-slate-500">Ask a question to see it appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {queryHistory.map((item, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-left group/item cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug break-words pr-4 line-clamp-2">
                                "{item.query}"
                              </h4>
                              <span className="text-[10px] font-medium whitespace-nowrap text-slate-400 mt-0.5 block">{relativeTime(item.timestamp)}</span>
                            </div>
                            
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                              {item.answer_preview}
                            </p>
                            
                            <div className="flex items-center justify-between mt-auto">
                              <div className="flex flex-wrap gap-1">
                                {item.sources && item.sources.map((src, idx) => (
                                  <span key={idx} className="bg-slate-200/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700 truncate max-w-[80px]">
                                    {src}
                                  </span>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.response_time_ms && (
                                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                                    <Zap className="w-2.5 h-2.5" /> {item.response_time_ms}ms
                                  </span>
                                )}
                                <span className={`w-2 h-2 rounded-full ${item.confidence === 'High' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : item.confidence === 'Medium' ? 'bg-amber-500' : 'bg-[#ED1C24]'}`}></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* F-23: India-First Badges */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                <span className="text-sm">🇮🇳</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Proudly Made in Bengaluru, India</span>
              </div>
              <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-700"></div>
              <button onClick={() => {setActiveTab('dpdp'); window.scrollTo(0, 0);}} className="flex items-center gap-2 px-4 py-2 bg-[#6EE7C3]/5 hover:bg-[#6EE7C3]/10 border border-[#6EE7C3]/20 rounded-full transition-colors cursor-pointer group">
                <Shield className="w-3.5 h-3.5 text-[#6EE7C3]" />
                <span className="text-[11px] font-bold text-[#6EE7C3] uppercase tracking-widest group-hover:text-white transition-colors">Fully Compliant with DPDP Act 2023</span>
              </button>
            </div>
          </div>
        )}

        {/* --- F-19: DPDP COMPLIANCE PAGE --- */}
        {activeTab === 'dpdp' && (
          <div className="animate-slide-up w-full px-4 relative z-20">
            <DPDPPage activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App

