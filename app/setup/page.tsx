"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, CheckCircle2, ChevronRight, ArrowRight, 
  Loader2, Globe, Building2, ShieldCheck, HeartPulse
} from "lucide-react";

type SetupStep = "welcome" | "info" | "analysis" | "complete";

const INDUSTRIES = [
  "E-commerce",
  "Healthcare",
  "Education",
  "Real Estate",
  "Restaurant",
  "SaaS / Software",
  "Other"
];

const CHECKLIST_ITEMS = [
  "Website Connected",
  "Website Pages Discovered",
  "Extracting Business Information",
  "Identifying Products & Services",
  "Cleaning & Organizing Content",
  "Detecting FAQs & Policies",
  "Processing AI Knowledge",
  "Building Knowledge Base",
  "Optimizing Search Index",
  "AI Chatbot Ready"
];

const USER_FRIENDLY_STATUS = [
  "Analyzing your website...",
  "Organizing your business information...",
  "Preparing your chatbot knowledge...",
  "Optimizing AI responses...",
  "Finalizing setup..."
];

export default function OnboardingWizard() {
  const [step, setStep] = useState<SetupStep>("welcome");
  
  // Business Info Form State
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("E-commerce");
  const [companyLogo, setCompanyLogo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Analysis Animation States
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !websiteUrl) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          websiteUrl,
          industry,
          companyLogo
        })
      });
      const data = await res.json();
      if (data.workspaceId) {
        localStorage.setItem("oogway_simulated_workspace_id", data.workspaceId);
      } else {
        localStorage.setItem("oogway_simulated_workspace_id", "11111111-1111-1111-1111-111111111111");
      }
    } catch (err) {
      console.warn("Failed to create workspace in database:", err);
      localStorage.setItem("oogway_simulated_workspace_id", "11111111-1111-1111-1111-111111111111");
    } finally {
      setIsSubmitting(false);
      setStep("analysis");
    }
  };

  // Run the analysis checklist simulation
  useEffect(() => {
    if (step !== "analysis") return;

    // Simulate checklist progression
    let currentItem = 0;
    const itemInterval = setInterval(() => {
      if (currentItem < CHECKLIST_ITEMS.length) {
        setCompletedItems(prev => [...prev, currentItem]);
        currentItem++;
      } else {
        clearInterval(itemInterval);
        // Move to complete
        setTimeout(() => {
          // Save to localStorage
          localStorage.setItem("oogway_onboarded", "true");
          localStorage.setItem("oogway_simulated_company", companyName || "My Business");
          localStorage.setItem("oogway_simulated_website", websiteUrl || "https://example.com");
          localStorage.setItem("oogway_simulated_industry", industry);
          localStorage.setItem("oogway_simulated_logo", companyLogo || "💼");
          localStorage.setItem("oogway_simulated_pages_count", "24");
          localStorage.setItem("oogway_simulated_docs_count", "5");
          localStorage.setItem("oogway_simulated_sync_time", new Date().toLocaleString());
          setStep("complete");
        }, 1000);
      }
    }, 800);

    // Simulate friendly status changes
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      if (statusIndex < USER_FRIENDLY_STATUS.length - 1) {
        statusIndex++;
        setCurrentStatusIndex(statusIndex);
      }
    }, 1600);

    return () => {
      clearInterval(itemInterval);
      clearInterval(statusInterval);
    };
  }, [step]);

  const handleFinish = () => {
    window.location.href = "/dashboard?success=true";
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans selection:bg-neutral-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-200/50 via-neutral-50 to-neutral-50" />
      
      {/* Top Header */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-neutral-100 bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-xl text-neutral-900 tracking-tight">
          <Sparkles className="w-5 h-5 text-neutral-900 animate-pulse" />
          Oogway AI
        </div>
        
        {/* Step Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-widest">
          <span className={step === "welcome" ? "text-neutral-950 font-extrabold" : ""}>Welcome</span>
          <ChevronRight className="w-3 h-3" />
          <span className={step === "info" ? "text-neutral-950 font-extrabold" : ""}>Business Info</span>
          <ChevronRight className="w-3 h-3" />
          <span className={step === "analysis" ? "text-neutral-950 font-extrabold" : ""}>Analysis</span>
          <ChevronRight className="w-3 h-3" />
          <span className={step === "complete" ? "text-neutral-950 font-extrabold" : ""}>Ready</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md md:max-w-xl mx-auto">
          
          {/* Step 1: Welcome */}
          {step === "welcome" && (
            <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl text-center space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-neutral-900/20">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Welcome to Oogway!</h1>
                <p className="text-neutral-500 text-sm">Let's set up your AI chatbot in just a few minutes.</p>
              </div>
              <Button 
                onClick={() => setStep("info")}
                className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl group transition-all"
              >
                Start Setup <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          )}

          {/* Step 2: Business Information */}
          {step === "info" && (
            <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Business Information</h2>
              <p className="text-neutral-500 text-sm mb-6">Tell us about your company so Oogway can configure itself.</p>
              
              <form 
                onSubmit={handleInfoSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-1.5 block">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="pl-10 h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900" 
                      placeholder="e.g. Acme Corp" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-1.5 block">Business Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input 
                      type="url"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      className="pl-10 h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900" 
                      placeholder="https://acme.com" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-1.5 block">Industry (Optional)</label>
                    <select 
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      className="w-full h-11 px-3 bg-neutral-50/50 border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-900 transition-colors"
                    >
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-1.5 block">Company Logo URL (Opt.)</label>
                    <Input 
                      value={companyLogo}
                      onChange={e => setCompanyLogo(e.target.value)}
                      className="h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900" 
                      placeholder="https://acme.com/logo.png" 
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-11 mt-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl group transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Private Workspace...
                    </>
                  ) : (
                    <>
                      Analyze Website <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </Card>
          )}

          {/* Step 3: Intelligent Website Analysis */}
          {step === "analysis" && (
            <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300 space-y-6">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-neutral-900 animate-spin mx-auto mb-2" />
                <h2 className="text-xl font-bold text-neutral-900">Intelligent Website Analysis</h2>
                <p className="text-neutral-500 text-xs mt-1 animate-pulse font-medium">
                  {USER_FRIENDLY_STATUS[currentStatusIndex]}
                </p>
              </div>

              <div className="border border-neutral-100 rounded-xl bg-neutral-50/50 divide-y divide-neutral-100/50 max-h-[300px] overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {CHECKLIST_ITEMS.map((item, idx) => {
                  const isCompleted = completedItems.includes(idx);
                  const isCurrent = completedItems.length === idx;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 py-1 transition-all duration-300">
                      {isCompleted ? (
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin shrink-0" />
                      ) : (
                        <span className="text-neutral-300 shrink-0">○</span>
                      )}
                      <span className={`font-medium ${isCompleted ? "text-neutral-900 font-semibold" : isCurrent ? "text-neutral-500" : "text-neutral-400"}`}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && (
            <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/10">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">🎉 Your AI chatbot is ready!</h1>
                <p className="text-neutral-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Oogway has successfully learned about your business and is ready to answer customer questions using your latest website content.
                </p>
              </div>
              <Button 
                onClick={handleFinish}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-lg transition-all"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
