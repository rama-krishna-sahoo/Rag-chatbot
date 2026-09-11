"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { 
  CheckCircle2, ChevronRight, ArrowRight, 
  Loader2, Globe, Building2, ShieldCheck, Mail, Lock
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  // Analysis Animation States
  const [completedItems, setCompletedItems] = useState<number[]>([]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  // Root check: If user is ALREADY present and logged in, never show the setup wizard
  useEffect(() => {
    async function checkExistingUser() {
      try {
        const res = await fetch("/api/auth/role");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.email && !data.isSimulated) {
            window.location.href = "/dashboard";
          }
        }
      } catch (err) {
        // ignore
      }
    }
    checkExistingUser();
  }, []);

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !websiteUrl || !email || !password) return;
    
    setAuthError("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      
      // 1. Sign Up the User
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authErr && !authErr.message.includes("already registered")) {
        setAuthError(authErr.message);
        setIsSubmitting(false);
        return;
      }
      
      // Try to sign them in immediately so the browser gets the session cookie
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr && signInErr.message.includes("Invalid login credentials")) {
        setAuthError("Account exists, but password was incorrect.");
        setIsSubmitting(false);
        return;
      }

      // 2. Provision / Update Workspace
      const res = await fetch("/api/onboarding/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          websiteUrl,
          industry,
          email,
          password
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

    let currentItem = 0;
    const itemInterval = setInterval(() => {
      if (currentItem < CHECKLIST_ITEMS.length) {
        setCompletedItems(prev => [...prev, currentItem]);
        currentItem++;
      } else {
        clearInterval(itemInterval);
        setTimeout(() => {
          localStorage.setItem("oogway_onboarded", "true");
          localStorage.setItem("oogway_simulated_company", companyName || "My Business");
          localStorage.setItem("oogway_simulated_website", websiteUrl || "https://example.com");
          localStorage.setItem("oogway_simulated_industry", industry);
          localStorage.setItem("oogway_simulated_pages_count", "24");
          localStorage.setItem("oogway_simulated_docs_count", "5");
          localStorage.setItem("oogway_simulated_sync_time", new Date().toLocaleString());
          setStep("complete");
        }, 1000);
      }
    }, 800);

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
    <div className="min-h-screen bg-[#050B06] text-white flex flex-col font-sans selection:bg-lime-500/30 selection:text-lime-200 relative overflow-hidden">
      {/* Immersive Nature / Moss Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-lime-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-900/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-teal-900/10 blur-[100px] transform -translate-x-1/2" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
      </div>
      
      {/* Top Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#0c1407]/60 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/images/oogway_turtle_logo.png" 
            alt="Oogway Turtle Logo" 
            width={34} 
            height={34} 
            className="object-contain"
          />
          <Image 
            src="/images/oogway_text_logo.png" 
            alt="Oogway Text Logo" 
            width={90} 
            height={24} 
            className="object-contain brightness-0 invert opacity-90"
          />
        </Link>
        
        {/* Step Indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          <span className={step === "welcome" ? "text-lime-400 font-bold" : ""}>Welcome</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={step === "info" ? "text-lime-400 font-bold" : ""}>Business Info</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={step === "analysis" ? "text-lime-400 font-bold" : ""}>Analysis</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={step === "complete" ? "text-lime-400 font-bold" : ""}>Ready</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md md:max-w-xl mx-auto">
          
          {/* Step 1: Welcome */}
          {step === "welcome" && (
            <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl text-center space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-center">
                <Image 
                  src="/images/oogway_turtle_logo.png" 
                  alt="Oogway Brand Logo" 
                  width={64} 
                  height={64} 
                  className="object-contain drop-shadow-[0_0_20px_rgba(163,230,53,0.35)]"
                />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to Oogway!</h1>
                <p className="text-gray-400 text-sm">Let's set up your AI chatbot in just a few minutes.</p>
              </div>
              <Button 
                onClick={() => setStep("info")}
                className="w-full h-11 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold rounded-xl group transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)]"
              >
                Start Setup <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          )}

          {/* Step 2: Business Information */}
          {step === "info" && (
            <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-2">Create Account & Business Info</h2>
              <p className="text-gray-400 text-sm mb-6">Create your admin account and tell us about your company.</p>
              
              {authError && (
                <div className="mb-4 p-3 bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-xl text-sm font-medium">
                  {authError}
                </div>
              )}
              
              <form 
                onSubmit={handleInfoSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-1.5 block">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl" 
                      placeholder="admin@company.com" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl" 
                      placeholder="••••••••" 
                      required 
                      minLength={6}
                    />
                  </div>
                </div>
                
                <hr className="border-white/10 my-3" />

                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-1.5 block">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="pl-10 h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl" 
                      placeholder="e.g. Acme Corp" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-1.5 block">Business Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input 
                      type="url"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      className="pl-10 h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl" 
                      placeholder="https://acme.com" 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-widest mb-1.5 block">Industry (Optional)</label>
                  <select 
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full h-11 px-3 bg-[#080e09]/80 border border-white/10 text-white rounded-xl text-sm outline-none focus:border-lime-400 transition-colors"
                  >
                    {INDUSTRIES.map(i => <option key={i} value={i} className="bg-[#0c1407] text-white">{i}</option>)}
                  </select>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-11 mt-4 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold rounded-xl group transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.3)] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#050B06]" />
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
            <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl animate-in slide-in-from-bottom-4 duration-300 space-y-6">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-lime-400 animate-spin mx-auto mb-2" />
                <h2 className="text-xl font-bold text-white">Intelligent Website Analysis</h2>
                <p className="text-lime-300/80 text-xs mt-1 animate-pulse font-medium">
                  {USER_FRIENDLY_STATUS[currentStatusIndex]}
                </p>
              </div>

              <div className="border border-white/10 rounded-xl bg-[#080e09]/80 divide-y divide-white/5 max-h-[300px] overflow-y-auto p-4 space-y-3 font-mono text-xs">
                {CHECKLIST_ITEMS.map((item, idx) => {
                  const isCompleted = completedItems.includes(idx);
                  const isCurrent = completedItems.length === idx;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 py-1 transition-all duration-300">
                      {isCompleted ? (
                        <span className="text-lime-400 font-bold shrink-0">✓</span>
                      ) : isCurrent ? (
                        <Loader2 className="w-3.5 h-3.5 text-lime-400 animate-spin shrink-0" />
                      ) : (
                        <span className="text-gray-600 shrink-0">○</span>
                      )}
                      <span className={`font-medium ${isCompleted ? "text-gray-200 font-semibold" : isCurrent ? "text-lime-300" : "text-gray-500"}`}>
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
            <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-lime-500/15 border border-lime-500/30 text-lime-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(163,230,53,0.25)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">🎉 Your AI chatbot is ready!</h1>
                <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
                  Oogway has successfully learned about your business and is ready to answer customer questions using your latest website content.
                </p>
              </div>
              <Button 
                onClick={handleFinish}
                className="w-full h-11 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all"
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
