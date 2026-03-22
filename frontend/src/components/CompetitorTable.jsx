import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

export default function CompetitorTable() {
  const comparisonData = [
    {
      feature: "Data Privacy",
      contextOS: { type: "check", text: "Full offline" },
      notion: { type: "warning", text: "Partial" },
      confluence: { type: "warning", text: "Partial" },
      glean: { type: "cross", text: "Cloud only" },
    },
    {
      feature: "Hardware Acceleration",
      contextOS: { type: "check", text: "Native" },
      notion: { type: "cross", text: "No" },
      confluence: { type: "cross", text: "No" },
      glean: { type: "cross", text: "No" },
    },
    {
      feature: "DPDP Act Compliant",
      contextOS: { type: "check", text: "By design" },
      notion: { type: "warning", text: "Partial" },
      confluence: { type: "warning", text: "Partial" },
      glean: { type: "warning", text: "Partial" },
    },
    {
      feature: "On-Device Inference",
      contextOS: { type: "check", text: "Always" },
      notion: { type: "cross", text: "Never" },
      confluence: { type: "cross", text: "Never" },
      glean: { type: "cross", text: "Never" },
    },
    {
      feature: "Integration Sync",
      contextOS: { type: "check", text: "Automatic" },
      notion: { type: "cross", text: "Manual" },
      confluence: { type: "cross", text: "Manual" },
      glean: { type: "check", text: "Automatic" },
    },
    {
      feature: "Recurring AI Costs",
      contextOS: { type: "cross", text: "None" }, // Wait, the instructions say ContextOS column should be all positive/green. "None" is a positive thing for costs. I will format it as check + None.
      notion: { type: "cross", text: "High" },
      confluence: { type: "cross", text: "High" },
      glean: { type: "cross", text: "High" },
    }
  ];

  // Adjust "None" for ContextOS to be a checkmark based on instructions ("Values in this column are positive/green")
  comparisonData[5].contextOS = { type: "check", text: "None" };

  const pricingData = [
    {
      feature: "Cost (50 Users)",
      contextOS: { type: "price", text: "₹19,999/mo" },
      notion: { type: "price", text: "₹1,25,000/mo" },
      confluence: { type: "price", text: "₹85,000/mo" },
      glean: { type: "price", text: "Custom Enterprise" },
    }
  ];

  const renderCell = (data, isContextOS = false) => {
    if (data.type === 'price') {
      return <span className={`font-semibold ${isContextOS ? 'text-[#6EE7C3]' : 'text-white'}`}>{data.text}</span>;
    }

    if (isContextOS) {
      // All items in ContextOS column are green
      return (
        <div className="flex justify-center items-center gap-2 text-[#6EE7C3]">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">{data.text}</span>
        </div>
      );
    }

    if (data.type === 'check') {
      return (
        <div className="flex justify-center items-center gap-2 text-[#6EE7C3]">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">{data.text}</span>
        </div>
      );
    }
    if (data.type === 'cross') {
      return (
        <div className="flex justify-center items-center gap-2 text-[#ef4444]">
          <X className="w-4 h-4" />
          <span className="text-sm font-medium">{data.text}</span>
        </div>
      );
    }
    if (data.type === 'warning') {
      return (
        <div className="flex justify-center items-center gap-2 text-[#f59e0b]">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">{data.text}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto my-16 px-4">
      
      {/* Table Title Block */}
      <div className="text-center mb-8">
        <h2 className="text-[28px] font-bold text-white mb-2 font-['Syne']">How We Compare</h2>
        <p className="text-[#7a90a8] text-[14px] max-w-2xl mx-auto leading-relaxed">
          Unlike legacy cloud tools, ContextOS runs on your own hardware, ensuring complete privacy and zero recurring AI cloud costs.
        </p>
      </div>

      {/* Main Table Container */}
      <div className="w-full overflow-x-auto rounded-[16px] border border-[#ED1C24]/20 bg-[#0f1520] hide-scrollbar mb-8">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex bg-[#161e2d] h-[60px] border-b border-white/5">
            <div className="w-[200px] shrink-0 flex items-center px-6 font-bold text-white text-sm sticky left-0 bg-[#161e2d] z-10 border-r border-white/5">
              Feature
            </div>
            
            <div className="flex-1 min-w-[160px] flex flex-col justify-center items-center relative bg-[rgba(237,28,36,0.06)] border-r border-white/5">
              <span className="absolute top-1 text-[9px] font-bold text-[#ED1C24] uppercase tracking-wider bg-[#ED1C24]/10 px-1.5 py-0.5 rounded">You</span>
              <span className="text-[#ED1C24] font-bold text-sm mt-3">ContextOS</span>
            </div>
            
            <div className="flex-1 min-w-[160px] flex items-center justify-center font-bold text-[#7a90a8] text-sm border-r border-white/5">
              Notion AI
            </div>
            
            <div className="flex-1 min-w-[160px] flex items-center justify-center font-bold text-[#7a90a8] text-sm border-r border-white/5">
              Confluence
            </div>
            
            <div className="flex-1 min-w-[160px] flex items-center justify-center font-bold text-[#7a90a8] text-sm">
              Glean
            </div>
          </div>

          {/* Body Rows */}
          {[...comparisonData, ...pricingData].map((row, i) => {
            const isPricing = i === comparisonData.length;
            
            return (
              <div 
                key={i} 
                className={`flex h-[48px] hover:bg-white/[0.02] transition-colors ${
                  i < [...comparisonData, ...pricingData].length - 1 ? 'border-b border-white/5' : ''
                } ${isPricing ? 'bg-white/[0.01]' : ''}`}
              >
                <div className="w-[200px] shrink-0 flex items-center px-6 text-white text-[14px] sticky left-0 bg-[#0f1520] group-hover:bg-[#121926] transition-colors border-r border-white/5 z-10">
                  {row.feature}
                </div>
                
                <div className="flex-1 min-w-[160px] flex items-center justify-center bg-[rgba(237,28,36,0.06)] border-r border-white/5">
                  {renderCell(row.contextOS, true)}
                </div>
                
                <div className="flex-1 min-w-[160px] flex items-center justify-center border-r border-white/5">
                  {renderCell(row.notion)}
                </div>
                
                <div className="flex-1 min-w-[160px] flex items-center justify-center border-r border-white/5">
                  {renderCell(row.confluence)}
                </div>
                
                <div className="flex-1 min-w-[160px] flex items-center justify-center">
                  {renderCell(row.glean)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Savings Callout */}
      <div className="max-w-3xl mx-auto bg-[rgba(110,231,195,0.08)] border border-[#6EE7C3]/30 rounded-xl p-5 md:p-6 text-center shadow-lg font-['DM_Sans']">
        <p className="text-white text-[14px] leading-relaxed mb-3">
          At 50 users, ContextOS costs ₹19,999/month.<br className="hidden sm:block"/>
          Notion AI costs ₹1,25,000/month for the same team.
        </p>
        <p className="text-white text-[14px] flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>That is</span>
          <span className="text-[#6EE7C3] text-[24px] font-bold tracking-tight shadow-[#6EE7C3]/20 drop-shadow-md">₹1,05,001</span>
          <span>saved every month.</span>
        </p>
      </div>

    </div>
  );
}
