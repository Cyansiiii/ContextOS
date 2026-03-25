import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import axios from 'axios'
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { BorderBeam } from "@/components/ui/border-beam"
import {
  Search, Database, MessageSquare, BrainCircuit,
  Activity, UploadCloud, Zap, Menu, X, Shield,
  CheckCircle2, ShieldCheck, Sparkles, Files,
  Bell, Clock, ArrowUpRight, Plus, Video, CheckCircle, Github,
  UserRound, Save, LogOut, ChevronDown, Mail, CalendarDays, CreditCard, BarChart3, Cpu, Settings, CircleHelp
} from 'lucide-react'

const AuthPage = lazy(() => import('./AuthPage'))
const ErrorCard = lazy(() => import('./components/ErrorCard'))
const LineShadowText = lazy(() =>
  import('./components/core/line-shadow-text').then((module) => ({
    default: module.LineShadowText,
  }))
)
const Integrations = lazy(() => import('./Integrations'))
const Pricing = lazy(() => import('./Pricing'))
const GmailCard = lazy(() => import('./components/GmailCard'))
const SlackCard = lazy(() => import('./components/SlackCard'))
const AmdStatusCard = lazy(() => import('./components/AmdStatusCard'))
const DPDPPage = lazy(() => import('./pages/DPDPPage'))
const CurvedLoop = lazy(() => import('./components/core/CurvedLoop'))
const ActivityChart = lazy(() => import('./components/ActivityChart'))
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))

// MOCK DATA for floating bubbles to simulate Guru homepage
const FLOATING_CHATS = [
  { text: "What's our current security review process?", type: "q", user: "dev", delayMs: 0, pos: "top-20 -left-12 lg:-left-32" },
  { text: "Standard timeframe is 3-5 business days requiring Approval.", type: "a", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, delayMs: 2000, pos: "top-36 left-0 lg:-left-12" },
  { text: "Did we update the Stripe payment API?", type: "q", user: "pm", delayMs: 1000, pos: "bottom-40 -left-8 lg:-left-24" },
  { text: "Yes—Stripe integration was just updated to support passkey.", type: "a", icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, delayMs: 3000, pos: "bottom-20 left-4 lg:-left-8" },
  { text: "Who leads the Acme Corp renewal?", type: "q", user: "sales", delayMs: 500, pos: "top-16 -right-12 lg:-right-32" },
  { text: "Priya is the lead for Acme Corp.", type: "a", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, delayMs: 2500, pos: "top-32 right-0 lg:-right-12" },
]


function App() {
  const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const defaultUploadLabel = useCallback((source) => (
    source === 'document'
      ? 'Internal_Q4_Strategy'
      : source === 'email'
        ? 'Inbox_Context_Import'
        : source === 'meeting_notes'
          ? 'Weekly_Product_Meeting'
          : source === 'slack'
            ? 'Slack_Context_Import'
            : 'Decision_Record'
  ), [])
  const [currentUser, setCurrentUser] = useState(() => {
    return {
      id: 'local_dev_user',
      name: 'Team Workspace',
      email: 'team@contextos.ai',
      created_at: new Date('2024-01-01').toISOString(),
    }
  })

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [confidence, setConfidence] = useState('')
  const [chunksSearched, setChunksSearched] = useState(0)
  const [responseTime, setResponseTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') === 'upload' ? 'upload' : 'search'
  })
  const [activityPeriod, setActivityPeriod] = useState('Week')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [appNotice, setAppNotice] = useState('')

  // Upload state
  const [uploadContent, setUploadContent] = useState('')
  const [uploadSource, setUploadSource] = useState('document')
  const [uploadSourceLabel, setUploadSourceLabel] = useState('Internal_Q4_Strategy')
  const [selectedUploadFile, setSelectedUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [onboardingRunning, setOnboardingRunning] = useState(false)
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
  const [dashboardMeeting, setDashboardMeeting] = useState(null)
  const [analyticsOverview, setAnalyticsOverview] = useState(null)

  // F-16: Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [deferSearchSections, setDeferSearchSections] = useState(false)
  const [deferHeroDecor, setDeferHeroDecor] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const profileMenuRef = useRef(null)
  const avatarInputRef = useRef(null)
  const memoryFileInputRef = useRef(null)
  const hasMountedRef = useRef(false)

  // F-14: Poll /stats every 30s
  useEffect(() => {
    const fetchStats = () => {
      axios.get(`${API}/stats`).then(({ data }) => setLiveStats(data)).catch(() => { })
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
      axios.get(`${API}/history`).then(({ data }) => setQueryHistory(data.history || [])).catch(() => { })
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 10000)
    return () => clearInterval(interval)
  }, [API])

  // F-20: Fetch benchmarks helper
  const fetchBenchmarks = useCallback(() => {
    axios.get(`${API}/benchmarks`).then(({ data }) => setBenchmarks(data)).catch(() => { })
  }, [API])

  const fetchAnalyticsOverview = useCallback(() => {
    axios.get(`${API}/analytics/overview`).then(({ data }) => setAnalyticsOverview(data)).catch(() => { })
  }, [API])

  useEffect(() => {
    fetchBenchmarks()
  }, [fetchBenchmarks])

  useEffect(() => {
    axios.get(`${API}/dashboard/meeting`).then(({ data }) => setDashboardMeeting(data)).catch(() => { })
  }, [API])

  useEffect(() => {
    fetchAnalyticsOverview()
    const interval = setInterval(fetchAnalyticsOverview, 30000)
    return () => clearInterval(interval)
  }, [fetchAnalyticsOverview])

  useEffect(() => {
    if (!appNotice) return undefined
    const timeoutId = window.setTimeout(() => setAppNotice(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [appNotice])

  useEffect(() => {
    setUploadSourceLabel(defaultUploadLabel(uploadSource))
  }, [defaultUploadLabel, uploadSource])

  // F-13: Relative time helper
  const relativeTime = useCallback((isoStr) => {
    if (!isoStr) return ''
    const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) > 1 ? 's' : ''} ago`
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`
  }, [])

  useEffect(() => {
    try {
      if (currentUser) {
        window.localStorage.setItem('contextos-user', JSON.stringify(currentUser))
      } else {
        window.localStorage.removeItem('contextos-user')
      }
    } catch {
      // Ignore storage failures and continue with in-memory auth state.
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser?.id) return

    axios.get(`${API}/auth/profile/${currentUser.id}`)
      .then(({ data }) => {
        if (data?.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(() => { })
  }, [API, currentUser?.id])

  useEffect(() => {
    if (!currentUser) return
    setProfileForm({
      name: currentUser.name || '',
      email: currentUser.email || '',
      password: '',
    })
  }, [currentUser])

  useEffect(() => {
    if (!profileMenuOpen) return

    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenuOpen])

  useEffect(() => {
    const lenis = window.__contextosLenis
    if (profileOpen) {
      lenis?.stop()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      lenis?.start()
    }

    return () => {
      document.body.style.overflow = ''
      lenis?.start()
    }
  }, [profileOpen])

  useEffect(() => {
    let timeoutId = 0
    let idleId = 0

    const enableDeferredSections = () => setDeferSearchSections(true)

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enableDeferredSections, { timeout: 1500 })
    } else {
      timeoutId = window.setTimeout(enableDeferredSections, 1000)
    }

    return () => {
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  useEffect(() => {
    let timeoutId = 0
    let idleId = 0

    const enableHeroDecor = () => setDeferHeroDecor(true)

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enableHeroDecor, { timeout: 2000 })
    } else {
      timeoutId = window.setTimeout(enableHeroDecor, 1200)
    }

    return () => {
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    const lenis = window.__contextosLenis
    if (lenis) {
      lenis.scrollTo(0, { duration: 0.8 })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeTab])

  const handleAuthenticate = (user) => {
    setCurrentUser(user)
  }

  const handleLogout = () => {
    // setCurrentUser(null)
    setQuestion('')
    setAnswer('')
    setSources([])
    setUploadContent('')
    setUploadMessage('')
    setActiveTab('search')
    setProfileMenuOpen(false)
    setProfileOpen(false)
  }

  const handleProfileChange = (key, value) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }))
    if (profileError) setProfileError('')
    if (profileSuccess) setProfileSuccess('')
  }

  const handleProfileSave = async () => {
    if (!currentUser?.id) return
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileError('Name and email are required.')
      return
    }

    setProfileSaving(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const { data } = await axios.patch(`${API}/auth/profile/${currentUser.id}`, {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        password: profileForm.password.trim() || null,
      })
      setCurrentUser(data.user)
      setProfileForm((prev) => ({ ...prev, password: '' }))
      setProfileSuccess('Profile updated successfully.')
    } catch (error) {
      setProfileError(error.response?.data?.detail || 'Profile update failed.')
    } finally {
      setProfileSaving(false)
    }
  }

  const avatarUrl = currentUser?.avatar_url
    ? (currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${API}${currentUser.avatar_url}`)
    : ''

  const scrollToPricing = () => {
    setActiveTab('search')
    setMobileMenuOpen(false)
    window.setTimeout(() => {
      const target = document.getElementById('pricing')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 120)
  }

  const focusWorkspaceSearch = () => {
    setActiveTab('search')
    setMobileMenuOpen(false)
    window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 160)
  }

  const handleNewChat = () => {
    setQuestion('')
    setAnswer('')
    setSources([])
    setConfidence('')
    setChunksSearched(0)
    setResponseTime(null)
    setExpertResult(null)
    setErrorData(null)
    setSearchMode('ask')
    focusWorkspaceSearch()
    setAppNotice('Ready for a new conversation.')
  }

  const openHelp = () => {
    setAppNotice('Opening deployment and setup guide in a new tab.')
    window.open('https://github.com/Cyansiiii/ContextOS/blob/main/DEPLOYMENT.md', '_blank', 'noopener,noreferrer')
  }

  const openSettings = () => {
    setProfileOpen(true)
    setProfileMenuOpen(false)
    setAppNotice('Profile and workspace settings opened.')
  }

  const renderAvatar = (className, textClassName = 'text-xs') => (
    avatarUrl ? (
      <img src={avatarUrl} alt={currentUser?.name || 'Profile'} className={`${className} object-cover`} />
    ) : (
      <div className={`${className} bg-blue-600 text-white flex items-center justify-center font-bold ${textClassName}`}>
        {currentUser?.name?.[0]?.toUpperCase() || 'C'}
      </div>
    )
  )

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !currentUser?.id) return

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file.')
      event.target.value = ''
      return
    }

    setAvatarUploading(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await axios.post(`${API}/auth/profile/${currentUser.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCurrentUser(data.user)
      setProfileSuccess('Profile photo updated successfully.')
    } catch (error) {
      setProfileError(error.response?.data?.detail || 'Profile photo upload failed.')
    } finally {
      setAvatarUploading(false)
      event.target.value = ''
    }
  }

  const handleClearHistory = async () => {
    try {
      await axios.delete(`${API}/history`)
    } catch {
      // Keep the UI responsive even if the backend clear call fails.
    }
    setQueryHistory([])
    fetchAnalyticsOverview()
  }

  const handleUploadFileSelect = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedUploadFile(file)
    setUploadMessage('')
  }

  const handleUploadDrop = (event) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (!file) return
    setSelectedUploadFile(file)
    setUploadMessage('')
  }

  const clearSelectedUploadFile = () => {
    setSelectedUploadFile(null)
    if (memoryFileInputRef.current) {
      memoryFileInputRef.current.value = ''
    }
  }


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

    try {
      const response = await axios.post(`${API}/ask`, { question })

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
      fetchAnalyticsOverview()
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
    if (!uploadContent.trim() && !selectedUploadFile) return;
    setUploading(true);
    setUploadMessage('');
    try {
      if (selectedUploadFile) {
        const formData = new FormData()
        formData.append('file', selectedUploadFile)
        formData.append('source', uploadSource)
        formData.append('date', new Date().toISOString())
        formData.append('content', uploadContent)
        const { data } = await axios.post(`${API}/upload-file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setUploadMessage(data?.status ? `${data.status}: ${selectedUploadFile.name}` : `Uploaded ${selectedUploadFile.name}`)
        clearSelectedUploadFile()
      } else {
        await axios.post(`${API}/upload`, {
          content: uploadContent,
          source: uploadSourceLabel.trim() || uploadSource,
          date: new Date().toISOString(),
          content_type: uploadSource,
          author: 'team',
        });
        setUploadMessage('Memory stored successfully!');
      }
      setUploadContent('');
      fetchAnalyticsOverview()
    } catch (error) {
      console.error(error);
      setUploadMessage(error.response?.data?.detail || 'Failed to upload memory.');
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
      fetchAnalyticsOverview()
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
    setOnboardingRunning(true)
    try {
      await axios.post(`${API}/demo/setup-onboarding`)
      setErrorData(null)
      fetchAnalyticsOverview()
      // Show success briefly
      setUploadMessage('✅ Onboarding Co-pilot ready — 3 memories added')
      setTimeout(() => setUploadMessage(''), 4000)
    } catch {
      setErrorData({ error: true, error_code: 'OLLAMA_OFFLINE', user_message: 'Failed to set up onboarding data. Is Ollama running?', recovery_action: 'start_ollama' })
    } finally {
      setOnboardingRunning(false)
    }
  }


  const periodKey = activityPeriod.toLowerCase()
  const chartData = analyticsOverview?.activity?.[periodKey] || []
  const totalActivityCount = chartData.reduce((sum, item) => sum + (item.count || 0), 0)
  const currentPeriodCount = chartData[chartData.length - 1]?.count || 0
  const previousPeriodCount = chartData[chartData.length - 2]?.count || 0
  const activityDelta = currentPeriodCount - previousPeriodCount
  const activityDeltaLabel = previousPeriodCount > 0
    ? `${Math.abs(Math.round((activityDelta / previousPeriodCount) * 100))}%`
    : `${Math.abs(activityDelta)}`
  const activityDeltaText = activityDelta > 0 ? `up ${activityDeltaLabel}` : activityDelta < 0 ? `down ${activityDeltaLabel}` : 'flat'
  const todayActivity = analyticsOverview?.today || { queries: 0, avg_response_ms: 0, high_confidence: 0, sources_touched: 0 }
  const topSourcesOverview = analyticsOverview?.top_sources || []
  const analyticsRecentQueries = analyticsOverview?.recent_queries || []

  const memberSince = currentUser?.created_at
    ? new Date(currentUser.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Not available'
  const totalMemories = analyticsOverview?.summary?.total_memories ?? liveStats?.total_memories ?? 0
  const totalQueries = analyticsOverview?.summary?.total_queries ?? benchmarks?.total_queries_served ?? queryHistory.length
  const avgQuerySeconds = analyticsOverview?.summary?.avg_query_ms
    ? (analyticsOverview.summary.avg_query_ms / 1000).toFixed(2)
    : benchmarks?.avg_query_ms
      ? (benchmarks.avg_query_ms / 1000).toFixed(2)
      : '0.00'
  const recentSources = analyticsRecentQueries.slice(0, 4)
  const paymentOverview = (analyticsOverview?.payment_requests || liveStats?.payment_requests || []).slice(0, 3)
  const activeMemoryTypes = analyticsOverview?.memory_distribution
    ? Object.entries(analyticsOverview.memory_distribution).filter(([, count]) => count > 0).slice(0, 4)
    : []
  const completionScore = Math.min(
    96,
    45
    + (currentUser?.name ? 20 : 0)
    + (currentUser?.email ? 20 : 0)
    + (totalMemories > 0 ? 11 : 0)
  )

  if (!currentUser) {
    return <div className="min-h-screen bg-slate-900" />
  }

  const cardSkeleton = 'rounded-[2rem] border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:shadow-none'

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-200 selection:bg-purple-200 overflow-x-hidden relative hero-gradient">

<<<<<<< HEAD
  {/* FLOATING TOP NAVIGATION */ }
  {
    activeTab !== 'analytics' && (
=======
      {/* FIXED NAVBAR */}
      {activeTab !== 'upload' && (
>>>>>>> b434a7f42059f768774bb556965892361d068111
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300 h-14 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between w-full h-full">
          <div className="flex justify-start items-center">
            {/* F-16: Hamburger for mobile */}
            <button aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 mr-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('search'); setMobileMenuOpen(false) }}>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-['Outfit']">ContextOS</span>
            </div>
          </div>

<<<<<<< HEAD
    <div className="hidden md:flex items-center justify-center gap-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 p-1 rounded-full shadow-sm">
      <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}>Dashboard</button>
      <button onClick={() => setActiveTab('search')} className={`px-4 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'search' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}>Tasks & Search</button>
      <button onClick={() => setActiveTab('upload')} className={`px-4 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'upload' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}>Memory Hub</button>
      <button onClick={() => setActiveTab('analytics')} className={`px-4 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'analytics' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}>Analytics</button>
      <button onClick={() => setActiveTab('dpdp')} className={`px-4 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'dpdp' ? 'bg-slate-900 dark:bg-slate-800 text-[#6EE7C3] font-medium shadow-sm' : 'text-[#6EE7C3] hover:text-[#6EE7C3]/80 hover:bg-black/5 dark:hover:bg-white/5'}`}>DPDP Act ✓</button>
=======
          <div className="hidden md:flex items-center justify-center gap-1">
        <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('search')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'search' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Tasks & Search</button>
        <button onClick={() => setActiveTab('upload')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'upload' ? 'bg-slate-900 dark:bg-slate-800 text-white font-medium' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>Memory Hub</button>
        <button onClick={() => setActiveTab('dpdp')} className={`px-3 py-1.5 rounded-full text-[13px] transition-all ${activeTab === 'dpdp' ? 'bg-slate-900 dark:bg-slate-800 text-[#6EE7C3] font-medium' : 'text-[#6EE7C3] hover:text-[#6EE7C3]/80'}`}>DPDP Act ✓</button>
>>>>>>> b434a7f42059f768774bb556965892361d068111
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <button aria-label="Search workspace" onClick={focusWorkspaceSearch} className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
          <Search className="w-4 h-4" />
        </button>
        <button aria-label="Open notifications" onClick={() => setNotificationsOpen((prev) => !prev)} className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 relative">
          <Bell className="w-4 h-4" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
        </button>
        <a aria-label="Open ContextOS GitHub repository" href="https://github.com/Cyansiiii/ContexOS" target="_blank" rel="noopener noreferrer" className="hidden md:flex w-8 h-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
          <Github className="w-4 h-4" />
        </a>
        <AnimatedThemeToggler className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 focus:outline-none" />
        <div ref={profileMenuRef} className="relative ml-1 border-l border-slate-200 pl-2 dark:border-slate-800">
          {notificationsOpen && (
            <div className="absolute right-[calc(100%+12px)] top-[calc(100%+8px)] z-[70] w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Workspace updates</div>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  Backend analytics are connected and refreshing automatically.
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  Memory Hub now supports live file upload, Gmail sync, and Slack sync.
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setNotificationsOpen(false); setProfileMenuOpen((prev) => !prev) }}
            className="flex min-h-[40px] items-center gap-2 rounded-xl px-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
          >
            {renderAvatar('w-8 h-8 rounded-full overflow-hidden shrink-0')}
            <div className="text-left">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{currentUser.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">{currentUser.email}</p>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => { setProfileMenuOpen(false); setProfileOpen(true) }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <UserRound className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Profile settings</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Update name, email, and password</div>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Log out</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Exit current workspace session</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    {/* F-16: Mobile dropdown menu */ }
    {
      mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50 shadow-xl animate-slide-up">
          <div className="flex flex-col p-4 gap-2">
            {['dashboard', 'search', 'upload', 'analytics', 'dpdp'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setMobileMenuOpen(false) }}
                className={`w-full text-left px-5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${activeTab === tab ? 'bg-[#212121] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {tab === 'dashboard' ? 'Dashboard' : tab === 'search' ? 'Tasks & Search' : tab === 'upload' ? 'Memory Hub' : tab === 'analytics' ? 'Analytics' : 'DPDP Act ✓'}
              </button>
            ))}
          </div>
        </div>
      )
    }
    </nav >
  )
  }

  {/* MAIN CONTENT AREA */ }
  <main className={`${activeTab === 'analytics' || activeTab === 'upload' ? 'pt-0 pb-0' : 'pt-32 pb-24'} relative z-10 min-h-screen`}>

    {/* --- SEARCH / HOME VIEW --- */}
    {activeTab === 'search' && (
      <div className="animate-slide-up w-full flex flex-col items-center">
        {/* HERO CONTAINER */}
        <div className="w-full max-w-7xl mx-auto relative min-h-[75vh] pb-32 px-6 lg:px-12">

          {/* HERO TYPOGRAPHY */}
          {deferHeroDecor && (
            <div className="absolute top-1/4 left-0 w-full z-0 flex items-center justify-center pointer-events-none overflow-visible pt-10">
              <Suspense fallback={null}>
                <CurvedLoop
                  marqueeText="CONTEXT OS ✦ INTELLIGENT ✦ FAST ✦ PRIVATE ✦"
                  speed={2}
                  curveAmount={250}
                  interactive={false}
                />
              </Suspense>
            </div>
          )}

          <div className="text-center max-w-4xl mx-auto mb-16 relative z-10 pt-10 mt-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm mb-6">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Powered by AMD Ryzen AI</span>
            </div>
            <h1 className="text-[3.5rem] md:text-[5rem] font-bold leading-[1.12] tracking-tight text-slate-900 dark:text-white mb-6 overflow-visible">
              Ready to try AI built on <br className="hidden md:block" />
              <Suspense fallback={<span className="text-[#182038] dark:text-white">your knowledge?</span>}>
                <LineShadowText className="text-[#182038] dark:text-white" shadowColor="rgba(124, 58, 237, 0.72)">
                  your knowledge?
                </LineShadowText>
              </Suspense>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 font-normal mb-8 max-w-2xl mx-auto leading-loose flex flex-wrap justify-center gap-x-2 gap-y-2">
              <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 font-semibold text-slate-800 dark:bg-amber-600/30 dark:text-white">Ask, chat, and research</span>
              <span className="rounded-md bg-purple-200/70 px-1.5 py-0.5 dark:bg-purple-600/30">using verified company knowledge.</span>
              <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.5 dark:bg-emerald-600/30">Always cited. Always secure.</span>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-fade-in" style={{ animationDelay: '0ms' }}>
                    {searchMode === 'expert' ? 'Scanning documents for expertise patterns...' : `Searching ${liveStats?.total_chunks || 'your knowledge base'} chunks locally`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium animate-fade-in" style={{ animationDelay: '200ms' }}>
                    {searchMode === 'expert' ? 'Identifying knowledge owners...' : 'Mistral 7B generating answer...'}
                  </p>
                  <p className="text-xs font-bold text-[#ED1C24] animate-fade-in" style={{ animationDelay: '400ms' }}>⚡ 0 external API calls</p>
                </div>
              </div>
            </div>
          )}

          {/* F-15: Error display */}
          {errorData && !isThinking && (
            <div className="max-w-3xl mx-auto mb-4">
              <Suspense fallback={<div className={`${cardSkeleton} h-44 animate-pulse`} />}>
                <ErrorCard
                  error_code={errorData.error_code}
                  user_message={errorData.user_message}
                  recovery_action={errorData.recovery_action}
                  onRetry={() => { setErrorData(null); searchMode === 'expert' ? handleExpertSearch() : askQuestion() }}
                  onDismiss={() => setErrorData(null)}
                  onNavigate={(tab) => { setErrorData(null); setActiveTab(tab) }}
                />
              </Suspense>
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
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${expert.confidence === 'High' ? 'bg-[#6EE7C3]/10 text-[#6EE7C3] border-[#6EE7C3]/25' :
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
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${confidence === 'High' ? 'bg-[#6EE7C3]/10 text-[#6EE7C3] border-[#6EE7C3]/25' :
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
          {!answer && !expertResult && deferHeroDecor && (
            <div className="hidden lg:block absolute top-[10%] left-0 right-0 bottom-0 pointer-events-none z-0">
              <div className="relative w-full h-full max-w-7xl mx-auto">
                {FLOATING_CHATS.map((chat, idx) => (
                  <div
                    key={idx}
                    className={`absolute ${chat.pos} animate-float bg-white dark:bg-[#1a1c22] px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-none border border-slate-100 dark:border-slate-800 max-w-xs flex gap-3 text-sm font-medium text-slate-700 dark:text-slate-300 float-bubble`}
                    style={{
                      animationDelay: `${chat.delayMs ?? 0}ms`,
                    }}
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
        {deferSearchSections ? (
          <>
            <div className="w-full bg-slate-50 relative z-20 border-y border-slate-200 overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '800px' }}>
              <Suspense fallback={<div className={`${cardSkeleton} mx-auto my-10 h-56 max-w-6xl`} />}>
                <Integrations />
              </Suspense>
            </div>

            <div className="w-full" style={{ contentVisibility: 'auto', containIntrinsicSize: '1200px' }}>
              <Suspense fallback={<div className={`${cardSkeleton} mx-auto my-10 h-72 max-w-6xl`} />}>
                <Pricing currentUser={currentUser} />
              </Suspense>
            </div>
          </>
        ) : (
          <div className="w-full px-6 pb-8">
            <div className={`${cardSkeleton} mx-auto h-40 max-w-6xl animate-pulse`} />
          </div>
        )}
      </div>
    )}

    {/* --- UPLOAD VIEW --- */}
    {activeTab === '__legacy_upload' && (
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
            <Suspense fallback={<div className={`${cardSkeleton} h-40 animate-pulse`} />}>
              <GmailCard />
            </Suspense>
            <Suspense fallback={<div className={`${cardSkeleton} h-40 animate-pulse`} />}>
              <SlackCard />
            </Suspense>
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
                    : 'border-[#ED1C24] bg-red-50 dark:bg-red-900/10 text-[#ED1C24]'
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

    {activeTab === '__legacy_upload_alt' && (
      <div className="animate-slide-up mx-auto mt-2 w-full max-w-[980px] px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(241,247,238,0.92),rgba(255,255,255,0.98)_38%,rgba(244,249,241,0.94))] px-5 py-8 shadow-[0_35px_80px_rgba(124,139,118,0.14)] sm:px-8 lg:px-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.98),rgba(2,6,23,0.96)_60%,rgba(6,78,59,0.15))] dark:shadow-none">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,242,210,0.5),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_42%)]" />

          <div className="relative z-10">
            <div className="max-w-3xl">
              <h2 className="text-[3.1rem] leading-[0.95] tracking-[-0.045em] text-[#111111] sm:text-[4.5rem] lg:text-[5.25rem] dark:text-white" style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 500 }}>
                Add to your Knowledge Base
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-[#61665c] dark:text-slate-300">
                Connect your tools or paste directly to train the AI instantly.
              </p>
            </div>

            <div className="mt-11 grid gap-5 lg:grid-cols-2">
              <Suspense fallback={<div className={`${cardSkeleton} h-48 animate-pulse`} />}>
                <GmailCard />
              </Suspense>
              <Suspense fallback={<div className={`${cardSkeleton} h-48 animate-pulse`} />}>
                <SlackCard />
              </Suspense>
            </div>

            <div className="relative mt-10 overflow-hidden rounded-[32px] border border-[#edf1e8] bg-white/88 shadow-[0_28px_65px_rgba(126,140,118,0.16)] dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">

              <div className="flex gap-3 overflow-x-auto border-b border-[#eef2ea] px-4 py-4 no-scrollbar dark:border-white/10 sm:px-6">
                {[
                  { id: 'document', label: 'Document', icon: Files },
                  { id: 'email', label: 'Email', icon: Mail },
                  { id: 'meeting_notes', label: 'Meeting', icon: CalendarDays },
                  { id: 'decision', label: 'Decision', icon: Zap },
                  { id: 'slack', label: 'Slack', icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon
                  const active = uploadSource === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setUploadSource(tab.id); setDecisionMsg(''); setUploadMessage(''); }}
                      className={`inline-flex min-w-fit items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${active
                        ? 'bg-[#e8f4e4] text-[#23713a] shadow-sm dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'text-[#6d7267] hover:bg-[#f5f7f2] hover:text-[#20231e] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {uploadSource === 'decision' ? (
                <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_320px]">
                  <div className="space-y-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                        <Zap className="h-3.5 w-3.5" />
                        Decision DNA
                      </div>
                      <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-white">Permanent decision memory</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        Store the decision, why it happened, what was rejected, and who approved it so the team can retrieve the full context later.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Decision Title</label>
                      <input type="text" value={decisionTitle} onChange={e => setDecisionTitle(e.target.value)}
                        placeholder="e.g. Switch from AWS to Railway"
                        className="w-full rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">What Was Decided</label>
                      <textarea value={decisionWhat} onChange={e => setDecisionWhat(e.target.value)} rows={3}
                        placeholder="What outcome was decided..."
                        className="w-full resize-none rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Why This Decision Was Made</label>
                      <textarea value={decisionWhy} onChange={e => setDecisionWhy(e.target.value)} rows={3}
                        placeholder="Reasoning, context, data points..."
                        className="w-full resize-none rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Rejected Alternatives</label>
                      <textarea value={decisionRejected} onChange={e => setDecisionRejected(e.target.value)} rows={2}
                        placeholder="Options that were considered but not chosen..."
                        className="w-full resize-none rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Who Decided</label>
                        <input type="text" value={decisionWho} onChange={e => setDecisionWho(e.target.value)}
                          placeholder="Name(s)"
                          className="w-full rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Date</label>
                        <input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)}
                          className="w-full rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tags</label>
                      <input type="text" value={decisionTags} onChange={e => setDecisionTags(e.target.value)}
                        placeholder="e.g. infrastructure, cost, tech"
                        className="w-full rounded-[20px] border border-slate-200 bg-white/75 px-4 py-3.5 text-slate-800 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <button
                      onClick={handleDecisionSubmit}
                      disabled={uploading || !decisionTitle.trim() || !decisionWhat.trim()}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#6ecb49] to-[#2f8b45] px-6 py-4 text-base font-black text-white shadow-[0_20px_36px_rgba(57,138,66,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Storing Decision...</>
                      ) : (
                        <><Zap className="h-5 w-5" /> Commit Decision to Memory</>
                      )}
                    </button>

                    {decisionMsg && (
                      <div className={`flex items-center gap-3 rounded-[22px] border px-4 py-4 text-sm font-semibold ${decisionMsg.includes('Failed')
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                        }`}>
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p>{decisionMsg}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,241,242,0.95))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:border-rose-500/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.82),rgba(127,29,29,0.18))] dark:shadow-none">
                      <h4 className="text-lg font-black tracking-[-0.03em] text-slate-900 dark:text-white">Why use Decision DNA</h4>
                      <div className="mt-4 space-y-3">
                        {[
                          'Capture rationale, not just the conclusion.',
                          'Keep institutional knowledge after handoffs.',
                          'Make future audits and reviews much faster.',
                        ].map((item) => (
                          <div key={item} className="flex items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white/80 p-6 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Suggested tags</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {['#strategy', '#ops', '#architecture', '#finance'].map((tag) => (
                          <span key={tag} className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 sm:p-8">
                  <div className="space-y-7">
                    <div className="rounded-[32px] border border-dashed border-[#cad2c0] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(250,251,248,0.96))] p-8 text-center transition hover:border-[#b8c3ac] dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(6,78,59,0.18))]">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f4e4] text-[#2f8b45] dark:text-emerald-300">
                        <UploadCloud className="h-8 w-8" />
                      </div>
                      <h3 className="mt-5 text-[2rem] font-bold tracking-[-0.04em] text-[#151515] dark:text-white">
                        Drag and drop files here or click to browse
                      </h3>
                      <p className="mt-2 text-base text-[#7a7f75] dark:text-slate-400">PDF, DOCX, TXT (Max 50MB)</p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#eef1eb] dark:bg-white/10" />
                      <div className="relative mx-auto w-fit bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8f948a] dark:bg-slate-950 dark:text-slate-500">
                        Or
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.26em] text-[#6a6f66] dark:text-slate-400">Paste Content</label>
                      <textarea
                        value={uploadContent}
                        onChange={(e) => setUploadContent(e.target.value)}
                        placeholder="E.g. Project 'Aurora' Technical Requirements — The objective of this sprint is to integrate the new vector database with the core reasoning engine..."
                        className="h-[220px] w-full resize-none rounded-[28px] border border-[#f0f2ed] bg-[#fcfdfb] px-5 py-5 text-base text-slate-800 outline-none transition placeholder:text-[#c4c8c0] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.26em] text-[#6a6f66] dark:text-slate-400">Source Label</label>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1">
                          <Files className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={uploadSource === 'document' ? 'Internal_Q4_Strategy' : uploadSource === 'email' ? 'Inbox_Context_Import' : uploadSource === 'meeting_notes' ? 'Weekly_Product_Meeting' : 'Slack_Context_Import'}
                            readOnly
                            className="w-full rounded-full border border-[#eef2eb] bg-[#fbfcfa] py-3 pl-11 pr-4 text-sm font-medium text-[#4b5049] outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(uploadSource === 'email'
                            ? ['#customer', '#inbox']
                            : uploadSource === 'meeting_notes'
                              ? ['#meeting', '#weekly']
                              : uploadSource === 'slack'
                                ? ['#team', '#thread']
                                : ['#strategy', '#internal']
                          ).map((tag) => (
                            <span key={tag} className="rounded-full bg-[#eff5ee] px-3 py-2 text-xs font-semibold text-[#697067] dark:bg-white/10 dark:text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={uploading || !uploadContent}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#6ecb49] to-[#2f8b45] px-6 py-4 text-[1.05rem] font-bold text-white shadow-[0_22px_42px_rgba(47,139,69,0.3)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Vectorizing...</>
                      ) : (
                        <><Sparkles className="h-5 w-5" /> Commit to Memory</>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-sm text-[#9aa092] dark:text-slate-400">
                      <Shield className="h-4 w-4" />
                      Your data is processed locally and never sent to external APIs.
                    </div>

                    {uploadMessage && (
                      <div className="flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p>{uploadMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'upload' && (
      <div className="animate-slide-up min-h-screen bg-[radial-gradient(circle_at_top_left,#f7faf4_0%,#fdfdfb_48%,#f2f6ee_100%)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#020617_55%,#07111b_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
          <aside className="hidden w-[244px] shrink-0 flex-col border-r border-[#edf1e7] bg-white/68 px-4 py-5 backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-slate-950/55">
            <button type="button" onClick={() => setActiveTab('search')} className="flex items-center gap-3 px-2 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#78cf53] to-[#2f8b45] shadow-[0_14px_28px_rgba(61,145,75,0.24)]">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-[2rem] font-bold leading-none tracking-[-0.05em] text-[#151515] dark:text-white">ContextOS</div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#83887d] dark:text-slate-400">AI Memory Engine</div>
              </div>
            </button>

            <button onClick={handleNewChat} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6fca49] to-[#2f8b45] px-6 py-4 text-base font-bold text-white shadow-[0_18px_34px_rgba(54,136,65,0.24)] transition hover:scale-[1.01]">
              <Plus className="h-4 w-4" />
              New Chat
            </button>

            <div className="mt-8 space-y-2">
              {[
                { id: 'search', label: 'Chat', icon: MessageSquare },
                { id: 'dashboard', label: 'Analytics', icon: BarChart3 },
                { id: 'upload', label: 'Memory Hub', icon: Database },
              ].map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[1.05rem] transition-all ${active
                      ? 'bg-[#e9f8ec] font-semibold text-[#2d8743] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-emerald-500/15 dark:text-emerald-200'
                      : 'text-[#334155] hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-[#2d8743]' : 'text-slate-500 dark:text-slate-400'}`} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-auto border-t border-[#edf1e7] pt-5 dark:border-white/10">
              <div className="space-y-2">
                <button onClick={openSettings} className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[1.02rem] text-[#334155] transition hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5">
                  <Settings className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  Settings
                </button>
                <button onClick={openHelp} className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[1.02rem] text-[#334155] transition hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/5">
                  <CircleHelp className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  Help
                </button>
              </div>
            </div>
          </aside>

          <div className="relative flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="pointer-events-none absolute left-10 top-24 h-44 w-44 rounded-full bg-[#e8f4df] blur-3xl dark:bg-emerald-500/10" />
            <div className="pointer-events-none absolute bottom-24 right-16 h-56 w-56 rounded-full bg-[#f0f4ed] blur-3xl dark:bg-slate-700/20" />

            <div className="mx-auto w-full max-w-[980px]">
              <div className="flex items-center justify-between lg:hidden">
                <button type="button" onClick={() => setActiveTab('search')} className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">
                  <Database className="h-4 w-4 text-emerald-600" />
                  ContextOS
                </button>
                <button type="button" onClick={() => setActiveTab('search')} className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-white/5 dark:text-slate-200">
                  Back
                </button>
              </div>

              <div className="relative z-10 pt-6 lg:pt-8">
                <h2 className="max-w-4xl text-[3.1rem] leading-[0.92] tracking-[-0.05em] text-[#111111] sm:text-[4.4rem] lg:text-[5.25rem] dark:text-white" style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 500 }}>
                  Add to your Knowledge Base
                </h2>
                <p className="mt-5 max-w-2xl text-lg text-[#61665c] dark:text-slate-300">
                  Connect your tools or paste directly to train the AI instantly.
                </p>
              </div>

              <div className="relative z-10 mt-12 grid gap-6 lg:grid-cols-2">
                <Suspense fallback={<div className={`${cardSkeleton} h-[260px] animate-pulse`} />}>
                  <GmailCard />
                </Suspense>
                <Suspense fallback={<div className={`${cardSkeleton} h-[260px] animate-pulse`} />}>
                  <SlackCard />
                </Suspense>
              </div>

              <div className="relative z-10 mt-10 overflow-hidden rounded-[34px] border border-[#edf1e7] bg-white/92 shadow-[0_35px_80px_rgba(144,156,137,0.18)] dark:border-white/10 dark:bg-slate-950/60 dark:shadow-none">
                <div className="flex gap-3 overflow-x-auto border-b border-[#edf1e7] px-5 py-5 no-scrollbar dark:border-white/10">
                  {[
                    { id: 'document', label: 'Document', icon: Files },
                    { id: 'email', label: 'Email', icon: Mail },
                    { id: 'meeting_notes', label: 'Meeting', icon: CalendarDays },
                    { id: 'decision', label: 'Decision', icon: Zap },
                    { id: 'slack', label: 'Slack', icon: MessageSquare },
                  ].map((tab) => {
                    const Icon = tab.icon
                    const active = uploadSource === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { setUploadSource(tab.id); setDecisionMsg(''); setUploadMessage(''); clearSelectedUploadFile(); }}
                        className={`inline-flex min-w-fit items-center gap-2 rounded-full px-4 py-2.5 text-[1.02rem] transition-all ${active
                          ? 'bg-[#e9f7e6] font-semibold text-[#2f8b45]'
                          : 'text-[#6d7267] hover:bg-[#f5f7f2] hover:text-[#20231e] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {uploadSource === 'decision' ? (
                  <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1.35fr)_300px]">
                    <div className="space-y-5">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#fff2f2] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#c43d3d] dark:bg-rose-500/10 dark:text-rose-300">
                          <Zap className="h-3.5 w-3.5" />
                          Decision
                        </div>
                        <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-white">Commit structured decision memory</h3>
                      </div>

                      <input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} placeholder="Decision title" className="w-full rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />
                      <textarea value={decisionWhat} onChange={(e) => setDecisionWhat(e.target.value)} rows={3} placeholder="What was decided?" className="w-full resize-none rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />
                      <textarea value={decisionWhy} onChange={(e) => setDecisionWhy(e.target.value)} rows={3} placeholder="Why was it decided?" className="w-full resize-none rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />
                      <textarea value={decisionRejected} onChange={(e) => setDecisionRejected(e.target.value)} rows={2} placeholder="Rejected alternatives" className="w-full resize-none rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <input value={decisionWho} onChange={(e) => setDecisionWho(e.target.value)} placeholder="Who decided" className="w-full rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />
                        <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} className="w-full rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />
                      </div>

                      <input value={decisionTags} onChange={(e) => setDecisionTags(e.target.value)} placeholder="Tags" className="w-full rounded-[22px] border border-[#eef2eb] bg-[#fbfcfa] px-5 py-4 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5" />

                      <button
                        onClick={handleDecisionSubmit}
                        disabled={uploading || !decisionTitle.trim() || !decisionWhat.trim()}
                        className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#6fca49] to-[#2f8b45] px-6 py-4 text-[1.02rem] font-bold text-white shadow-[0_22px_42px_rgba(47,139,69,0.3)] transition hover:scale-[1.01] disabled:opacity-50"
                      >
                        {uploading ? <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Storing...</> : <><Sparkles className="h-5 w-5" /> Commit to Memory</>}
                      </button>

                      {decisionMsg && (
                        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                          {decisionMsg}
                        </div>
                      )}
                    </div>

                    <div className="animate-float rounded-[28px] border border-[#eef2ea] bg-[linear-gradient(180deg,#ffffff,rgba(240,247,236,0.98))] p-6 shadow-[0_20px_40px_rgba(144,156,137,0.12)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                      <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7a8175] dark:text-slate-400">Why this helps</div>
                      <div className="mt-4 space-y-3 text-sm leading-6 text-[#556054] dark:text-slate-300">
                        <p>Capture rationale, not just the outcome.</p>
                        <p>Keep company memory after handoffs.</p>
                        <p>Make future audits much faster.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8">
                    <input
                      ref={memoryFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.log"
                      onChange={handleUploadFileSelect}
                      className="hidden"
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => memoryFileInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          memoryFileInputRef.current?.click()
                        }
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={handleUploadDrop}
                      className="rounded-[32px] border border-dashed border-[#cbd2c3] bg-[linear-gradient(180deg,#ffffff,rgba(251,252,249,0.98))] px-6 py-14 text-center transition duration-300 hover:border-[#b8c2af] hover:shadow-[inset_0_0_0_1px_rgba(184,194,175,0.24)] dark:border-white/10 dark:bg-white/5 cursor-pointer"
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f4e4] text-[#2f8b45] transition duration-300 hover:scale-110 dark:bg-emerald-500/15 dark:text-emerald-200">
                        <UploadCloud className="h-8 w-8" />
                      </div>
                      <h3 className="mt-7 text-[2.05rem] font-bold tracking-[-0.05em] text-[#111111] dark:text-white">
                        Drag and drop files here or click to browse
                      </h3>
                      <p className="mt-2 text-base text-[#7a7f75] dark:text-slate-400">PDF, DOCX, TXT (Max 50MB)</p>
                    </div>

                    <div className="relative my-8">
                      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[#edf1e7] dark:bg-white/10" />
                      <div className="relative mx-auto w-fit bg-white px-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#8f948a] dark:bg-slate-950 dark:text-slate-500">
                        Or
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.26em] text-[#6a6f66] dark:text-slate-400">Paste Content</label>
                      <textarea
                        value={uploadContent}
                        onChange={(e) => setUploadContent(e.target.value)}
                        placeholder="E.g. Project 'Aurora' Technical Requirements - The objective of this sprint is to integrate the new vector database with the core reasoning engine..."
                        className="h-[220px] w-full resize-none rounded-[28px] border border-[#f0f2ed] bg-[#fcfdfb] px-5 py-5 text-base text-slate-800 outline-none transition placeholder:text-[#c4c8c0] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                      />
                    </div>

                    <div className="mt-8">
                      <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.26em] text-[#6a6f66] dark:text-slate-400">Source Label</label>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1">
                          <Files className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7d8377]" />
                          <input
                            type="text"
                            value={uploadSourceLabel}
                            onChange={(event) => setUploadSourceLabel(event.target.value)}
                            className="w-full rounded-full border border-[#eef2eb] bg-[#fbfcfa] py-3 pl-11 pr-4 text-sm font-medium text-[#4b5049] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(uploadSource === 'email'
                            ? ['#customer', '#inbox']
                            : uploadSource === 'meeting_notes'
                              ? ['#meeting', '#weekly']
                              : uploadSource === 'slack'
                                ? ['#team', '#thread']
                                : ['#strategy', '#internal']
                          ).map((tag) => (
                            <span key={tag} className="rounded-full bg-[#eef5ee] px-4 py-2 text-xs font-semibold text-[#697067] transition hover:-translate-y-0.5 dark:bg-white/10 dark:text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedUploadFile ? (
                      <div className="mt-6 flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedUploadFile.name}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {(selectedUploadFile.size / 1024).toFixed(1)} KB selected for upload
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedUploadFile}
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}

                    <button
                      onClick={handleUpload}
                      disabled={uploading || (!uploadContent.trim() && !selectedUploadFile)}
                      className="mt-10 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#6fca49] to-[#2f8b45] px-6 py-5 text-[1.12rem] font-bold text-white shadow-[0_22px_42px_rgba(47,139,69,0.3)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_26px_48px_rgba(47,139,69,0.34)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? (
                        <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Vectorizing...</>
                      ) : (
                        <><Sparkles className="h-5 w-5" /> {selectedUploadFile ? 'Upload to Memory' : 'Commit to Memory'}</>
                      )}
                    </button>

                    <div className="mt-7 flex items-center justify-center gap-2 text-sm text-[#9aa092] dark:text-slate-400">
                      <Shield className="h-4 w-4" />
                      Your data is processed locally and never sent to external APIs.
                    </div>

                    {uploadMessage && (
                      <div className="mt-6 flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p>{uploadMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pointer-events-none relative z-10 mt-10 hidden justify-center gap-10 lg:flex">
                <div className="animate-float h-28 w-28 rounded-[2rem] bg-[radial-gradient(circle_at_40%_35%,#ffffff_0%,#d9ddd8_35%,#aab0a9_100%)] opacity-70 shadow-[0_20px_50px_rgba(169,175,166,0.3)]" />
                <div className="animate-float-delayed h-24 w-24 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#e8ebe6_42%,#cfd4ce_100%)] opacity-80 shadow-[0_18px_44px_rgba(183,188,181,0.28)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* --- DASHBOARD VIEW --- */}
    {activeTab === 'dashboard' && (
      <div className="animate-slide-up w-full">
        <Suspense fallback={<div className="max-w-7xl mx-auto p-8"><div className="h-[60vh] rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" /></div>}>
          <DashboardPage
            currentUser={currentUser}
            setupOnboarding={setupOnboarding}
            onboardingRunning={onboardingRunning}
          />
        </Suspense>
      </div>
    )}

    {/* --- ANALYTICS PAGE --- */}
    {activeTab === 'analytics' && (
      <div className="animate-slide-up w-full">
        <Suspense fallback={<div className="max-w-7xl mx-auto p-8"><div className="h-[60vh] rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse" /></div>}>
          <AnalyticsPage onNavigateToChat={() => setActiveTab('search')} />
        </Suspense>
      </div>
    )}

    {/* --- F-19: DPDP COMPLIANCE PAGE --- */}
    {
      activeTab === 'dpdp' && (
        <div className="animate-slide-up w-full px-4 relative z-20">
          <Suspense fallback={<div className="mx-auto max-w-6xl px-6"><div className={`${cardSkeleton} h-[60vh] animate-pulse`} /></div>}>
            <DPDPPage activeTab={activeTab} setActiveTab={setActiveTab} />
          </Suspense>
        </div>
      )
    }
  </main >

  {
    appNotice ? (
      <div className="fixed bottom-4 left-1/2 z-[95] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200" >
        {appNotice}
      </div>
    ) : null
  }

  {
    uploadMessage ? (
      <div className="fixed right-4 top-20 z-[90] max-w-sm rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-2xl dark:border-emerald-500/20 dark:bg-slate-950 dark:text-emerald-300">
        {uploadMessage}
      </div>
    ) : null
  }

  {
    activeTab !== 'analytics' && (
      <footer className="border-t border-slate-200 bg-white/80 px-4 py-5 text-sm text-slate-600 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85 dark:text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => setActiveTab('dpdp')} className="transition-colors hover:text-[#ED1C24]">Privacy (DPDP)</button>
            <button type="button" onClick={scrollToPricing} className="transition-colors hover:text-[#ED1C24]">Pricing</button>
            <a href="https://github.com/Cyansiiii/ContexOS" target="_blank" rel="noreferrer" className="transition-colors hover:text-[#ED1C24]">GitHub</a>
            <a href="https://github.com/Cyansiiii/ContextOS/blob/main/DEPLOYMENT.md" target="_blank" rel="noreferrer" className="transition-colors hover:text-[#ED1C24]">Deployment Guide</a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <span className="rounded-full bg-[#ED1C24]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#ED1C24]">AMD Slingshot 2026</span>
            <span className="font-medium">Made in India 🇮🇳</span>
          </div>
        </div>
      </footer>
    )
  }

  {
    profileOpen && (
      <div data-lenis-prevent className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-slate-200/80 bg-[#f7f8fb] p-4 shadow-2xl dark:border-slate-800 dark:bg-[#090d14] sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#efe9ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d42d8] dark:bg-[#6d42d8]/10 dark:text-[#c8b8ff]">
                Professional Profile
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">ContextOS operator dashboard</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Live account details, workspace performance, activity trail, and profile controls in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfileOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#6d42d8] via-[#8f6cff] to-[#5ac8a5] px-6 pb-8 pt-6 text-white">
                  <div className="absolute right-[-48px] top-[-36px] h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute left-[-24px] bottom-[-54px] h-32 w-32 rounded-full bg-black/10 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {renderAvatar('h-16 w-16 rounded-[20px] border border-white/20 bg-white/18 text-2xl font-black backdrop-blur', 'text-2xl')}
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="absolute -bottom-2 -right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/80 text-white shadow-lg transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Upload profile photo"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{currentUser.name}</h3>
                        <p className="mt-1 text-sm text-white/80">{currentUser.email}</p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verified workspace member
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 px-6 py-5">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Member since</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <CalendarDays className="h-4 w-4 text-[#6d42d8]" />
                      {memberSince}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Performance</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <BarChart3 className="h-4 w-4 text-emerald-500" />
                      Grade {benchmarks?.performance_grade || 'A'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-800">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Profile completion</div>
                      <div className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{completionScore}%</div>
                    </div>
                    <div className="relative h-20 w-20">
                      <svg viewBox="0 0 44 44" className="h-20 w-20 -rotate-90">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="url(#profileCompletionGradient)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${completionScore} 100`}
                          pathLength="100"
                        />
                        <defs>
                          <linearGradient id="profileCompletionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6d42d8" />
                            <stop offset="100%" stopColor="#5ac8a5" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                        {completionScore}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <UploadCloud className="h-4 w-4 text-sky-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Profile photo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="text-sm font-semibold text-slate-900 transition-opacity hover:opacity-70 dark:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {avatarUploading ? 'Uploading...' : avatarUrl ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-[#6d42d8]" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Communication channel</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Email active</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <Cpu className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Inference mode</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Local Ollama</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Memory composition</div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Workspace coverage</h3>
                  </div>
                  <Database className="h-5 w-5 text-[#6d42d8]" />
                </div>
                <div className="space-y-3">
                  {activeMemoryTypes.length > 0 ? activeMemoryTypes.map(([type, count]) => (
                    <div key={type}>
                      <div className="mb-1 flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#6d42d8] to-[#5ac8a5]"
                          style={{ width: `${Math.max(18, Math.min(100, Math.round((count / Math.max(totalMemories, 1)) * 100)))}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      No indexed memory categories yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Memories indexed', value: totalMemories, hint: 'Live company memory', icon: Database, color: 'text-[#6d42d8]' },
                  { label: 'Queries served', value: totalQueries, hint: 'Session intelligence usage', icon: MessageSquare, color: 'text-emerald-500' },
                  { label: 'Avg response', value: `${avgQuerySeconds}s`, hint: 'Current benchmark average', icon: Zap, color: 'text-amber-500' },
                  { label: 'Database size', value: `${liveStats?.chromadb_size_mb || 0} MB`, hint: 'Stored local footprint', icon: Cpu, color: 'text-sky-500' },
                ].map((card) => {
                  const Icon = card.icon
                  return (
                    <div key={card.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center justify-between">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900 ${card.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Live</span>
                      </div>
                      <div className="mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</div>
                      <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{card.label}</div>
                      <div className="mt-2 text-xs text-slate-400">{card.hint}</div>
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace activity</div>
                      <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Recent verified interactions</h3>
                    </div>
                    <Activity className="h-5 w-5 text-[#6d42d8]" />
                  </div>

                  <div className="space-y-4">
                    {recentSources.length > 0 ? recentSources.map((item, index) => (
                      <div key={`${item.query}-${index}`} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">{item.query}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.answer_preview}</div>
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                            {relativeTime(item.timestamp)}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {(item.sources || []).slice(0, 3).map((src) => (
                            <span key={src} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                              {src}
                            </span>
                          ))}
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.confidence === 'High'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : item.confidence === 'Medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                            }`}>
                            {item.confidence || 'Low'} confidence
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        No recent activity yet. Ask a question and this panel will populate automatically.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Billing snapshots</div>
                        <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Recent payment requests</h3>
                      </div>
                      <CreditCard className="h-5 w-5 text-[#6d42d8]" />
                    </div>
                    <div className="space-y-3">
                      {paymentOverview.length > 0 ? paymentOverview.map((payment) => (
                        <div key={payment.request_id} className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{payment.plan} plan</div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {payment.customer_email || 'No customer email'} • {payment.billing_cycle}
                              </div>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold capitalize text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                              {payment.status?.replaceAll('_', ' ')}
                            </span>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                          No billing activity captured yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Account controls</div>
                        <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Update profile</h3>
                      </div>
                      <UserRound className="h-5 w-5 text-[#6d42d8]" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          <UserRound className="h-4 w-4" />
                          Full name
                        </span>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(event) => handleProfileChange('name', event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          <Mail className="h-4 w-4" />
                          Email
                        </span>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(event) => handleProfileChange('email', event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">New password</span>
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(event) => handleProfileChange('password', event.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>

                    {profileError ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                        {profileError}
                      </div>
                    ) : null}

                    {profileSuccess ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        {profileSuccess}
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                      <button
                        type="button"
                        onClick={handleProfileSave}
                        disabled={profileSaving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6d42d8] to-[#8f6cff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:translate-y-[-1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {profileSaving ? 'Saving...' : 'Save profile'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
    </div >
  )
}

export default App

