import { ArrowLeft, Check, Shield, MapPin, Scale, Target } from 'lucide-react'

export default function DPDPPage({ activeTab, setActiveTab }) {
  // Navigation wrapper to integrate with existing App.jsx state if it's not React Router
  const goBack = () => setActiveTab ? setActiveTab('search') : (window.location.hash = '')

  return (
    <div className="min-h-screen bg-[#080c10] text-slate-300 font-['DM_Sans'] pt-24 pb-20 selection:bg-[#6EE7C3]/30">
      
      {/* Top Nav (Basic) */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#080c10]/80 backdrop-blur-md border-b border-white/5 z-50 flex items-center px-6">
        <button 
          onClick={goBack} 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to ContextOS
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-[#6EE7C3]/10 border border-[#6EE7C3]/20 text-[#6EE7C3] px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase mb-6 shadow-[0_0_15px_rgba(110,231,195,0.15)]">
            <Check className="w-4 h-4" /> DPDP Act 2023 ✓
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight font-['Syne']">
            Built for India's <br className="hidden md:block"/>Data Privacy Law.
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            ContextOS is DPDP Act 2023 compliant by hardware design — not just policy.
          </p>
        </div>

        {/* Section 1: What is DPDP Act 2023? */}
        <div className="mb-16">
          <div className="glass-card rounded-2xl p-8 border border-white/5 bg-white/[0.02]">
            <h2 className="text-xl font-bold text-white mb-4">What is the DPDP Act 2023?</h2>
            <p className="text-slate-400 leading-relaxed text-base">
              The Digital Personal Data Protection Act 2023 is India's primary data privacy law. It requires businesses to protect personal data and get explicit consent before processing it. Non-compliance can result in penalties up to ₹250 crore. ContextOS eliminates this risk by keeping data entirely on your local hardware.
            </p>
          </div>
        </div>

        {/* Section 2: How ContextOS Complies */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center font-['Syne']">How ContextOS Complies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1 */}
            <div className="glass-card rounded-2xl p-6 border border-[#6EE7C3]/20 bg-[#6EE7C3]/[0.02] hover:bg-[#6EE7C3]/[0.04] transition-colors group">
              <div className="w-12 h-12 rounded-full bg-[#6EE7C3]/10 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
                🇮🇳
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Data Localisation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                All data stays on your hardware in India. ContextOS never routes data through foreign servers — zero cross-border data transfer risk.
              </p>
            </div>

            {/* Card 2 */}
            <div className="glass-card rounded-2xl p-6 border border-[#6EE7C3]/20 bg-[#6EE7C3]/[0.02] hover:bg-[#6EE7C3]/[0.04] transition-colors group">
              <div className="w-12 h-12 rounded-full bg-[#6EE7C3]/10 text-[#6EE7C3] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">No Third-Party Processing</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ContextOS uses local AI models (Mistral 7B, nomic-embed-text) running on AMD hardware. No data is sent to OpenAI, Google, Anthropic, or any third party — ever.
              </p>
            </div>

            {/* Card 3 */}
            <div className="glass-card rounded-2xl p-6 border border-[#6EE7C3]/20 bg-[#6EE7C3]/[0.02] hover:bg-[#6EE7C3]/[0.04] transition-colors group">
              <div className="w-12 h-12 rounded-full bg-[#6EE7C3]/10 text-[#6EE7C3] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Data Principal Rights</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Since data stays on your own machine, your organisation has complete control. Delete any memory instantly. No data retention on vendor servers to worry about.
              </p>
            </div>

            {/* Card 4 */}
            <div className="glass-card rounded-2xl p-6 border border-[#6EE7C3]/20 bg-[#6EE7C3]/[0.02] hover:bg-[#6EE7C3]/[0.04] transition-colors group">
              <div className="w-12 h-12 rounded-full bg-[#6EE7C3]/10 text-[#6EE7C3] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Purpose Limitation</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ContextOS only uses your data for answering your own questions. No training on your data, no analytics shared with us, no advertising profile built from your knowledge.
              </p>
            </div>

          </div>
        </div>

        {/* Section 3: Compliance Comparison Table */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8 text-center font-['Syne']">Compliance Comparison</h2>
          <div className="w-full overflow-x-auto custom-scrollbar pb-6 rounded-2xl">
            <div className="min-w-[600px] bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden glass-card">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10">
                    <th className="p-5 font-bold text-slate-300 w-1/3">Feature</th>
                    <th className="p-5 font-bold text-[#6EE7C3] w-1/3 bg-[rgba(110,231,195,0.05)] border-x border-[#6EE7C3]/10">ContextOS</th>
                    <th className="p-5 font-bold text-slate-400 w-1/3">Cloud AI Tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { feature: "Data leaves India", us: "Never", them: "Always" },
                    { feature: "Third-party processing", us: "None", them: "OpenAI/Google/Microsoft" },
                    { feature: "DPDP cross-border risk", us: "Zero", them: "High" },
                    { feature: "Consent requirement", us: "Not needed (local)", them: "Required" },
                    { feature: "Penalty exposure", us: "None", them: "Up to ₹250 crore" },
                    { feature: "Audit trail", us: "Full local control", them: "Vendor dependent" },
                  ].map((row, i) => (
                    <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? 'bg-transparent' : 'bg-black/20'}`}>
                      <td className="p-4 font-medium text-slate-300">{row.feature}</td>
                      <td className="p-4 font-bold text-[#6EE7C3] bg-[rgba(110,231,195,0.03)] border-x border-[#6EE7C3]/10">{row.us}</td>
                      <td className="p-4 text-amber-500/80">{row.them}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: CTA */}
        <div className="text-center bg-[#6EE7C3]/5 border border-[#6EE7C3]/20 rounded-2xl p-10 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6EE7C3] to-transparent opacity-50"></div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Talk to your legal team. Show them this.</h2>
          
          <a href="https://github.com/Cyansiiii/ContextOS/blob/main/DEPLOYMENT.md" target="_blank" rel="noreferrer"
             className="inline-flex mt-6 items-center justify-center gap-2 bg-[#6EE7C3] text-slate-900 font-bold px-8 py-4 rounded-xl hover:bg-white hover:text-[#6EE7C3] hover:shadow-[0_0_20px_rgba(110,231,195,0.4)] transition-all duration-300">
            Download Compliance Brief <ArrowLeft className="w-5 h-5 rotate-180" />
          </a>
          
          <p className="mt-8 text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
            This page is for informational purposes. Consult your legal counsel for official compliance advice regarding the DPDP Act 2023.
          </p>
        </div>

      </div>
    </div>
  )
}
