import { useEffect, useRef } from 'react'
import './Integrations.css'
import CurvedLoop from './components/core/CurvedLoop'
import { SparklesText } from './components/ui/sparkles-text'
import { ScrollMarkerReveal } from './components/ui/scroll-marker-reveal'

export default function Integrations() {
  const stageRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const stage = stageRef.current
      if (!stage) return
      const cards = stage.querySelectorAll('.app-card')
      if (cards.length === 0) return
      const card = cards[Math.floor(Math.random() * cards.length)]

      const p = document.createElement('div')
      p.className = 'particle'
      stage.appendChild(p)

      const sr = stage.getBoundingClientRect()
      const cr = card.getBoundingClientRect()
      const fx = cr.left + cr.width / 2 - sr.left
      const fy = cr.top + cr.height / 2 - sr.top
      const tx = sr.width / 2
      const ty = sr.height / 2

      p.style.left = `${fx}px`
      p.style.top = `${fy}px`

      const dx = tx - fx
      const dy = ty - fy
      let progress = 0
      const speed = 0.02

      function step() {
        progress += speed
        if (progress >= 1) {
          p.remove()
          return
        }
        const t = progress
        p.style.left = `${fx + dx * t}px`
        p.style.top = `${fy + dy * t}px`
        p.style.opacity = `${Math.sin(t * Math.PI) * 0.8}`
        p.style.transform = `scale(${1 - t * 0.5})`
        requestAnimationFrame(step)
      }

      requestAnimationFrame(step)
    }, 600)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative z-20 flex w-full flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#09090b]">
      <div className="pointer-events-none absolute left-1/2 top-[30%] z-0 flex w-[120vw] min-w-[1400px] -translate-x-1/2 items-center justify-center overflow-visible opacity-[0.25]">
        <CurvedLoop
          marqueeText="CONNECT ✦ SYNC ✦ AUTOMATE ✦"
          speed={1.5}
          curveAmount={350}
          interactive={false}
        />
      </div>

      <div className="integration-section relative z-10 w-full border-none !bg-transparent">
        <div className="section-label relative z-10">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="3" fill="#7c3aed" />
            <circle cx="6" cy="6" r="5.5" stroke="#7c3aed" strokeOpacity=".4" />
          </svg>
          Integrations
        </div>

        <h2 className="section-title">
          <SparklesText sparklesCount={8}>
            Integrate with your
            <br />
            <span>existing tools in seconds</span>
          </SparklesText>
        </h2>

        <p className="section-sub mt-4 flex flex-wrap justify-center gap-x-1.5 gap-y-2 leading-loose">
          <ScrollMarkerReveal delay={0} markerColor="bg-blue-200 dark:bg-blue-600/40">
            ContextOS silently connects to everything your team already uses.
          </ScrollMarkerReveal>
          <ScrollMarkerReveal delay={0.3} markerColor="bg-purple-200 dark:bg-purple-600/40">
            All data stays local - on your system.
          </ScrollMarkerReveal>
        </p>

        <div className="orbit-stage" ref={stageRef} aria-hidden="true">
          <div className="orbit-ring ring-1" />
          <div className="orbit-ring ring-2" />
          <div className="orbit-ring ring-3" />

          <div className="center-node">
            <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="22" r="10" stroke="white" strokeWidth="2" />
              <circle cx="22" cy="22" r="4" fill="white" opacity=".9" />
              <line x1="22" y1="12" x2="22" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="36" x2="22" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="22" x2="8" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="36" y1="22" x2="32" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="14.9" y1="14.9" x2="12.1" y2="12.1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="31.9" y1="31.9" x2="29.1" y2="29.1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="29.1" y1="14.9" x2="31.9" y2="12.1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12.1" y1="31.9" x2="14.9" y2="29.1" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="app-card card-gmail" data-name="Gmail">
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" />
          </div>
          <div className="app-card card-slack" data-name="Slack">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" />
          </div>
          <div className="app-card card-amd" data-name="AMD Ryzen AI">
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7c/AMD_Logo.svg" alt="AMD" />
          </div>

          <div className="app-card card-drive" data-name="Google Drive">
            <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" />
          </div>
          <div className="app-card card-notion" data-name="Notion" style={{ background: '#1a1a1a' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="18" fill="#1a1a1a" />
              <path d="M20 25 L20 75 L30 75 L30 42 L60 75 L80 75 L80 25 L70 25 L70 58 L40 25 Z" fill="white" />
            </svg>
          </div>
          <div className="app-card card-jira" data-name="Jira">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg" alt="Jira" />
          </div>
          <div className="app-card card-word" data-name="Word">
            <img src="/integrations/word.png" alt="Word" />
          </div>

          <div className="app-card card-github" data-name="GitHub" style={{ background: '#0d1117' }}>
            <svg width="36" height="36" viewBox="0 0 98 96" fill="white">
              <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
            </svg>
          </div>
          <div className="app-card card-outlook" data-name="Outlook">
            <img src="/integrations/outlook.png" alt="Outlook" />
          </div>
          <div className="app-card card-teams" data-name="MS Teams">
            <img src="/integrations/teams.png" alt="Teams" />
          </div>
          <div className="app-card card-excel" data-name="Excel">
            <img src="/integrations/excel.png" alt="Excel" />
          </div>
          <div className="app-card card-powerpoint" data-name="PowerPoint">
            <img src="/integrations/powerpoint.png" alt="PowerPoint" />
          </div>
        </div>

        <div className="live-feed">
          <span className="feed-label">Active connections &rarr;</span>
          <span className="feed-pill"><span className="feed-dot" /><img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="" /> Gmail synced</span>
          <span className="feed-pill"><span className="feed-dot" /><img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="" /> Slack synced</span>
          <span className="feed-pill"><span className="feed-dot" /><img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="" /> Drive synced</span>
          <span className="feed-pill" style={{ animationDelay: '0.3s' }}><span className="feed-dot" style={{ background: '#8b5cf6', animationDelay: '0.4s' }} />248 new memories</span>
        </div>
      </div>
    </div>
  )
}
