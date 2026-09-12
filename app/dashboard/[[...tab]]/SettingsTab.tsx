"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Settings, 
  Globe, 
  MessageSquare, 
  Bell, 
  Megaphone, 
  ChevronDown,
  ChevronUp,
  Save,
  UploadCloud,
  Database,
  Activity,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Palette,
  Lock,
  Star,
  CheckCircle2,
  Image as ImageIcon,
  CreditCard,
  Sparkles,
  User,
  Mail,
  Wand2,
  Upload
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SectionCardProps {
  id: string;
  icon: any;
  title: string;
  description?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

function SectionCard({ 
  id, 
  icon: Icon, 
  title, 
  description, 
  children,
  badge,
  isExpanded,
  onToggle
}: SectionCardProps) {
  return (
    <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
      <div 
        onClick={onToggle}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#203210]/40 select-none group"
      >
        <div className="flex items-center gap-3.5">
          <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-[#B2EA4D]/20 text-[#B2EA4D]' : 'bg-slate-800 text-slate-400 group-hover:text-slate-300 group-hover:bg-[#203210]/80'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              {badge}
            </div>
            {description && !isExpanded && (
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">{description}</p>
            )}
          </div>
        </div>
        <div className="text-slate-500">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-[#B2EA4D]/15 animate-in slide-in-from-top-2 duration-200">
          {description && (
            <p className="text-xs text-slate-400 mb-6 bg-[#0c1407]/50 p-3 rounded-lg border border-[#B2EA4D]/15 leading-relaxed">
              {description}
            </p>
          )}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      )}
    </Card>
  );
}

interface SettingsTabProps {
  setActiveTab: (tab: string) => void;
  onOpenUpgradeModal?: (tab?: "pro" | "branding") => void;
}

export function SettingsTab({ setActiveTab, onOpenUpgradeModal }: SettingsTabProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "general", "profile", "subscription", "branding", "website", "chatbot", "notifications", "updates"
  ]);

  const searchParams = useSearchParams();
  const paymentStatus = searchParams?.get("payment");

  // Premium feature state
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("oogway_premium_unlocked") === "true") {
      setIsPremiumUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (paymentStatus === "success") {
      setIsPremiumUnlocked(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("oogway_premium_unlocked", "true");
      }
      if (!expandedSections.includes("branding")) {
        setExpandedSections(prev => [...prev, "branding"]);
      }
      window.history.replaceState({}, '', '/dashboard/settings');
    } else if (paymentStatus === "cancelled") {
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [paymentStatus]);

  // Form State
  const [formData, setFormData] = useState({
    chatbotName: "Oogway AI Assistant",
    companyName: "NM Institute Of Engineering & Technology",
    companyLogo: "",
    defaultLanguage: "English (US)",
    timeZone: "UTC-8 (Pacific Time)",
    websiteUrl: "https://example.com/support",
    syncEnabled: true,
    syncFrequency: "weekly",
    welcomeMessage: "Hi there! How can I help you today?",
    suggestedQuestions: "What are your pricing plans?\nHow do I reset my password?\nCan I schedule a demo?",
    responseLength: "balanced",
    notifyFailures: true,
    notifySuccess: false,
    adminEmail: "sangram@yopmail.com",
    avatarUrl: ""
  });

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const isProActive = typeof window !== "undefined" && localStorage.getItem("oogway_pro_active") === "true";
  const trialDaysRemaining = React.useMemo(() => {
    if (typeof window === "undefined") return 15;
    const stored = localStorage.getItem("oogway_trial_start_time");
    let startTime = stored ? Number(stored) : null;
    if (!startTime || isNaN(startTime)) return 15;
    const elapsed = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, 15 - elapsed);
  }, []);

  // Updates state
  const [updates, setUpdates] = useState([
    {
      id: 1,
      title: "🚀 Faster Website Synchronization",
      desc: "We've improved the website synchronization engine for faster and more accurate knowledge base updates.",
      date: "Aug 02, 2026",
      isNew: true,
      hasPremiumLink: false
    },
    {
      id: 2,
      title: "✨ Custom Branding Available",
      desc: "You can now personalize your chatbot with your own name and logo. Unlock this feature for a one-time payment of ₹540.",
      date: "Aug 01, 2026",
      isNew: true,
      hasPremiumLink: true
    },
    {
      id: 3,
      title: "🔒 Security Improvements",
      desc: "We've enhanced platform security and optimized authentication.",
      date: "Jul 28, 2026",
      isNew: false,
      hasPremiumLink: false
    }
  ]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedEmail = typeof window !== "undefined" ? localStorage.getItem("oogway_cached_user_email") || "sangram@yopmail.com" : "sangram@yopmail.com";
        const storedAvatar = typeof window !== "undefined" ? localStorage.getItem("oogway_admin_avatar") || "" : "";
        const storedLogo = typeof window !== "undefined" ? localStorage.getItem("oogway_simulated_logo") || "" : "";
        const storedCompany = typeof window !== "undefined" ? localStorage.getItem("oogway_simulated_company") || "" : "";
        const storedSite = typeof window !== "undefined" ? localStorage.getItem("oogway_simulated_website") || "" : "";

        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            companyName: data.name || storedCompany || prev.companyName,
            websiteUrl: data.website_url || storedSite || prev.websiteUrl,
            companyLogo: data.logo_url || storedLogo || prev.companyLogo,
            chatbotName: data.chatbot_name || prev.chatbotName,
            defaultLanguage: data.default_language || prev.defaultLanguage,
            timeZone: data.time_zone || prev.timeZone,
            welcomeMessage: data.welcome_message || prev.welcomeMessage,
            suggestedQuestions: data.suggested_questions || prev.suggestedQuestions,
            responseLength: data.response_length || prev.responseLength,
            syncEnabled: data.sync_enabled ?? prev.syncEnabled,
            syncFrequency: data.sync_frequency || prev.syncFrequency,
            notifyFailures: data.notify_failures ?? prev.notifyFailures,
            notifySuccess: data.notify_success ?? prev.notifySuccess,
            adminEmail: storedEmail,
            avatarUrl: data.avatar_url || storedAvatar || prev.avatarUrl
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            adminEmail: storedEmail,
            avatarUrl: storedAvatar,
            companyLogo: storedLogo
          }));
        }
      } catch (e) {}
    }
    loadSettings();
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Handler: Extract profile avatar directly from registered email
  const handleExtractAvatarFromEmail = () => {
    const email = formData.adminEmail || "admin@example.com";
    const namePart = email.split("@")[0].replace(/[._-]/g, " ");
    const extractedUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(namePart)}&background=10b981&color=ffffff&bold=true&font-size=0.45`;
    
    setFormData(prev => ({ ...prev, avatarUrl: extractedUrl }));
    if (typeof window !== "undefined") {
      localStorage.setItem("oogway_admin_avatar", extractedUrl);
      window.dispatchEvent(new Event("oogway-avatar-updated"));
    }
    alert(`Extracted high-resolution profile avatar for ${email}! Click 'Save Changes' to confirm.`);
  };

  // Handler: Upload Avatar file
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, avatarUrl: result }));
        if (typeof window !== "undefined") {
          localStorage.setItem("oogway_admin_avatar", result);
          window.dispatchEvent(new Event("oogway-avatar-updated"));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Handler: Upload Company Logo file
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, companyLogo: result }));
        if (typeof window !== "undefined") {
          localStorage.setItem("oogway_simulated_logo", result);
          window.dispatchEvent(new Event("oogway-logo-updated"));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.companyName,
          website_url: formData.websiteUrl,
          logo_url: formData.companyLogo,
          chatbot_name: formData.chatbotName,
          default_language: formData.defaultLanguage,
          time_zone: formData.timeZone,
          welcome_message: formData.welcomeMessage,
          suggested_questions: formData.suggestedQuestions,
          response_length: formData.responseLength,
          sync_enabled: formData.syncEnabled,
          sync_frequency: formData.syncFrequency,
          notify_failures: formData.notifyFailures,
          notify_success: formData.notifySuccess,
          avatar_url: formData.avatarUrl
        })
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("oogway_simulated_company", formData.companyName);
        localStorage.setItem("oogway_simulated_website", formData.websiteUrl);
        if (formData.companyLogo) localStorage.setItem("oogway_simulated_logo", formData.companyLogo);
        if (formData.avatarUrl) localStorage.setItem("oogway_admin_avatar", formData.avatarUrl);
        
        window.dispatchEvent(new Event("oogway-logo-updated"));
        window.dispatchEvent(new Event("oogway-avatar-updated"));
      }

      alert("All Admin Settings saved successfully!");
    } catch (e: any) {
      alert("Failed to save settings: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handlePurchasePremium = async () => {
    if (isCheckingOut) return;
    try {
      setIsCheckingOut(true);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: 540, 
          currency: "inr",
          successUrl: `${window.location.origin}/dashboard/settings?payment=success`,
          cancelUrl: `${window.location.origin}/dashboard/settings?payment=cancelled`
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setIsCheckingOut(false);
        alert("Failed to create Stripe session.");
      }
    } catch (err) {
      setIsCheckingOut(false);
      alert("Failed to initiate checkout. Please try again.");
    }
  };

  const markUpdateAsRead = (id: number) => {
    setUpdates(prev => prev.map(u => u.id === id ? { ...u, isNew: false } : u));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28 animate-mac-page relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Configure your chatbot, profile image, brand identity, and system notifications.</p>
      </div>

      {/* Hidden file inputs for avatar & logo */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        onChange={handleAvatarFileUpload} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={logoInputRef} 
        onChange={handleLogoFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* 1. Admin Profile & Avatar */}
      <SectionCard 
        id="profile" 
        icon={User} 
        title="Admin Profile & Avatar"
        description="Manage your account profile picture. Extract an avatar automatically from your registered email address or upload a custom image."
        isExpanded={expandedSections.includes("profile")}
        onToggle={() => toggleSection("profile")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#B2EA4D]" />
              Registered Email Address
            </label>
            <Input 
              value={formData.adminEmail}
              onChange={e => setFormData({...formData, adminEmail: e.target.value})}
              className="bg-[#0c1407] border-[#B2EA4D]/15 text-sm h-10 font-mono text-slate-200" 
            />
            <span className="text-[10px] text-slate-500 mt-1 block">This registered email is used for authentication and profile avatar generation.</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Admin Profile Picture
            </label>
            <div className="flex items-center gap-4 bg-[#0c1407] border border-[#B2EA4D]/15 p-3 rounded-xl">
              <div className="relative w-14 h-14 rounded-full border-2 border-[#B2EA4D] p-0.5 overflow-hidden shrink-0 bg-[#1b2e11] shadow-lg">
                {formData.avatarUrl ? (
                  <img 
                    src={formData.avatarUrl} 
                    alt="Admin Avatar Preview" 
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.adminEmail.split("@")[0])}&background=10b981&color=ffffff&bold=true`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#B2EA4D]/20 text-[#B2EA4D] font-extrabold flex items-center justify-center text-lg">
                    {(formData.adminEmail || "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <Button 
                  onClick={handleExtractAvatarFromEmail}
                  className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950 font-bold h-8 text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Extract Avatar from Mail
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  className="border-slate-700 bg-[#1b2e11] hover:bg-[#203210]/60 text-slate-300 h-8 text-xs flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-[#B2EA4D]" />
                  Upload Custom Picture
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 2. General Settings */}
      <SectionCard 
        id="general" 
        icon={Settings} 
        title="2. General Settings"
        isExpanded={expandedSections.includes("general")}
        onToggle={() => toggleSection("general")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Company Name</label>
            <Input 
              value={formData.companyName}
              onChange={e => setFormData({...formData, companyName: e.target.value})}
              className="bg-[#0c1407] border-[#B2EA4D]/15 text-sm h-10" 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Chatbot Name</label>
            <div className="relative">
              <Input 
                value={formData.chatbotName}
                onChange={e => setFormData({...formData, chatbotName: e.target.value})}
                disabled={!isPremiumUnlocked}
                className="bg-[#0c1407] border-[#B2EA4D]/15 text-sm h-10 pr-10 disabled:opacity-75 disabled:text-slate-500" 
              />
              {!isPremiumUnlocked && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B2EA4D] cursor-pointer animate-pulse" title="Upgrade to modify chatbot name">
                  <Lock className="w-4 h-4" />
                </div>
              )}
            </div>
            {!isPremiumUnlocked && (
              <span className="text-[10px] text-[#B2EA4D]/80 mt-1 block font-medium">Upgrade required to change chatbot name.</span>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0c1407] border border-[#B2EA4D]/15 flex items-center justify-center overflow-hidden border-dashed p-1">
                {formData.companyLogo ? (
                  <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => logoInputRef.current?.click()}
                className="h-9 border-[#B2EA4D]/30 bg-[#0c1407] hover:bg-[#203210]/60 text-xs text-slate-200 font-bold"
              >
                Upload Logo
              </Button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Default Language</label>
            <select 
              value={formData.defaultLanguage}
              onChange={e => setFormData({...formData, defaultLanguage: e.target.value})}
              className="w-full bg-[#0c1407] border border-[#B2EA4D]/15 text-sm text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-[#B2EA4D]"
            >
              <option>English (US)</option>
              <option>Spanish (ES)</option>
              <option>French (FR)</option>
              <option>German (DE)</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Time Zone</label>
            <select 
              value={formData.timeZone}
              onChange={e => setFormData({...formData, timeZone: e.target.value})}
              className="w-full bg-[#0c1407] border border-[#B2EA4D]/15 text-sm text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-[#B2EA4D]"
            >
              <option>UTC-8 (Pacific Time)</option>
              <option>UTC-5 (Eastern Time)</option>
              <option>UTC+0 (GMT)</option>
              <option>UTC+1 (Central European Time)</option>
              <option>UTC+5:30 (India Standard Time)</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 3. Subscription & Plan */}
      <SectionCard 
        id="subscription" 
        icon={CreditCard} 
        title="3. Subscription & Plan"
        description="Manage your Oogway platform plan, billing cycles, and feature entitlements."
        badge={
          isProActive ? (
            <span className="bg-lime-500/20 text-lime-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-lime-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-400" /> Pro Plan Active
            </span>
          ) : (
            <span className="bg-amber-500/15 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/25 flex items-center gap-1">
              🟢 15-Day Free Trial ({trialDaysRemaining} days left)
            </span>
          )
        }
        isExpanded={expandedSections.includes("subscription")}
        onToggle={() => toggleSection("subscription")}
      >
        <div className="p-5 rounded-xl bg-[#0c1407]/80 border border-[#B2EA4D]/20 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">
                  {isProActive ? "Pro Monthly Plan" : "15-Day Free Trial"}
                </h4>
                <span className="text-[11px] font-semibold text-gray-400">
                  {isProActive ? "₹2,999 / month" : "₹0 (Free Trial)"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-lg">
                {isProActive 
                  ? "Your account has active 24/7 AI Chatbot automation with unlimited customer inquiries and priority support."
                  : `You are currently experiencing complete Oogway platform features. ${trialDaysRemaining} days remaining in your free trial.`}
              </p>
            </div>
            <Button
              onClick={() => onOpenUpgradeModal?.("pro")}
              className="bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-bold rounded-xl px-5 h-10 text-xs shadow-[0_0_20px_rgba(163,230,53,0.25)] transition-all cursor-pointer shrink-0"
            >
              {isProActive ? "Manage Plan & Billing" : "Upgrade to Pro • ₹2,999/mo"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
              <span>24/7 Autonomous AI Chatbot Conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
              <span>Vector Knowledge Base Embeddings</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
              <span>Website Crawling & Auto-Syncing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
              <span>Real-Time Logs & Sentiment Analytics</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 4. Branding (Premium) */}
      <SectionCard 
        id="branding" 
        icon={Palette} 
        title="4. Branding"
        description="Customize your chatbot's identity to match your brand."
        badge={
          !isPremiumUnlocked && (
            <span className="bg-white/10 text-amber-400 border border-[#B2EA4D]/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Star className="w-3 h-3" fill="currentColor" /> Premium
            </span>
          )
        }
        isExpanded={expandedSections.includes("branding")}
        onToggle={() => toggleSection("branding")}
      >
        <div className="relative border border-[#B2EA4D]/15 rounded-xl bg-[#0c1407]/30 overflow-hidden">
          {!isPremiumUnlocked && (
            <div className="absolute inset-0 z-10 bg-[#0c1407]/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-[#B2EA4D]/20">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-white font-bold text-lg mb-2">Custom Branding Locked</h4>
              <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed">
                Unlock Custom Branding for a one-time payment of ₹540 (≈ US$6). Personalize your chatbot with your own name and logo instantly.
              </p>
              <Button onClick={() => onOpenUpgradeModal ? onOpenUpgradeModal("branding") : handlePurchasePremium()} disabled={isCheckingOut} className="bg-white hover:bg-slate-100 text-[#203210] font-bold px-8 h-10 shadow-lg shadow-[#B2EA4D]/25">
                {isCheckingOut ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-amber-950 border-t-transparent animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" fill="currentColor" />
                    Upgrade Now - ₹540
                  </>
                )}
              </Button>
            </div>
          )}

          <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-8 ${!isPremiumUnlocked ? 'opacity-30 pointer-events-none' : ''}`}>
            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Custom Chatbot Name</label>
                <Input 
                  value={formData.chatbotName}
                  onChange={e => setFormData({...formData, chatbotName: e.target.value})}
                  disabled={!isPremiumUnlocked}
                  className="bg-[#0c1407] border-[#B2EA4D]/15 text-sm h-10 disabled:opacity-100" 
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Custom Chatbot Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-[#FFFFFF]/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden">
                    {formData.companyLogo ? (
                      <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[#FFFFFF] font-black text-lg">{formData.chatbotName.charAt(0)}</span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => logoInputRef.current?.click()}
                    disabled={!isPremiumUnlocked} 
                    className="h-9 border-[#B2EA4D]/15 bg-[#0c1407] hover:bg-[#203210]/60 text-xs text-slate-300"
                  >
                    Replace Logo
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Brand Preview</label>
              <div className="bg-[#0c1407] border border-[#B2EA4D]/15 rounded-xl p-4 flex flex-col h-full min-h-[150px]">
                <div className="flex items-center gap-3 border-b border-[#B2EA4D]/15 pb-3">
                  <div className="w-8 h-8 rounded bg-[#FFFFFF]/20 border border-indigo-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {formData.companyLogo ? (
                      <img src={formData.companyLogo} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[#FFFFFF] font-bold text-sm">{formData.chatbotName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{formData.chatbotName}</div>
                    <div className="text-[10px] text-[#B2EA4D] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Online
                    </div>
                  </div>
                </div>
                <div className="flex-1 pt-4 flex flex-col gap-3">
                  <div className="bg-slate-800 rounded-lg rounded-tl-none p-3 text-xs text-slate-200 self-start max-w-[80%]">
                    {formData.welcomeMessage || "Hello! How can I help you?"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 5. Knowledge Base */}
      <SectionCard 
        id="website" 
        icon={Globe} 
        title="5. Knowledge Base Sync"
        description="When enabled, Oogway automatically detects website changes, processes content, and updates your chatbot's knowledge base."
        isExpanded={expandedSections.includes("website")}
        onToggle={() => toggleSection("website")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Website URL</label>
              <Input 
                value={formData.websiteUrl}
                onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                placeholder="https://example.com"
                className="bg-[#0c1407] border-[#B2EA4D]/15 text-sm h-10" 
              />
            </div>

            <div className="bg-[#0c1407] border border-[#B2EA4D]/15 p-4 rounded-xl space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-semibold text-white">Enable Auto Website Sync</span>
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={formData.syncEnabled}
                    onChange={e => setFormData({...formData, syncEnabled: e.target.checked})}
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${formData.syncEnabled ? 'bg-[#B2EA4D]' : 'bg-slate-700'}`}></div>
                  <div className={`absolute left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.syncEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </label>

              {formData.syncEnabled && (
                <div className="pt-3 border-t border-[#B2EA4D]/15">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Sync Frequency</label>
                  <select 
                    value={formData.syncFrequency}
                    onChange={e => setFormData({...formData, syncFrequency: e.target.value})}
                    className="w-full bg-[#1b2e11] border border-[#B2EA4D]/15 text-sm text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-[#B2EA4D]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>
            
            <Button onClick={() => setActiveTab("website_sync")} className="w-full bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950 font-bold h-10">
              Sync Now
            </Button>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0c1407] border border-[#B2EA4D]/15 p-4 rounded-xl flex flex-col justify-center gap-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#B2EA4D]/15 pb-2">Sync Status</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Last Sync</span>
                <span className="text-xs font-bold text-[#B2EA4D] bg-[#B2EA4D]/8 px-2.5 py-1 rounded-full border border-[#B2EA4D]/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Status</span>
                <span className="text-xs text-slate-400 font-mono">Synced</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => setActiveTab("documents")} variant="outline" className="w-full h-10 border-slate-700 text-slate-300 hover:bg-[#203210]/60 justify-start gap-3">
                <UploadCloud className="w-4 h-4 text-[#B2EA4D]" />
                Upload Documents
              </Button>
              <Button onClick={() => setActiveTab("documents")} variant="outline" className="w-full h-10 border-slate-700 text-slate-300 hover:bg-[#203210]/60 justify-start gap-3">
                <Database className="w-4 h-4 text-white" />
                View Documents
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 6. Chatbot Customization */}
      <SectionCard 
        id="chatbot" 
        icon={MessageSquare} 
        title="6. Chatbot Behavior & Prompts"
        isExpanded={expandedSections.includes("chatbot")}
        onToggle={() => toggleSection("chatbot")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Welcome Message</label>
              <textarea 
                rows={3}
                value={formData.welcomeMessage}
                onChange={e => setFormData({...formData, welcomeMessage: e.target.value})}
                className="w-full bg-[#0c1407] border border-[#B2EA4D]/15 text-sm text-slate-200 p-3 rounded-lg focus:outline-none focus:border-[#B2EA4D] resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Suggested Questions (One per line)</label>
              <textarea 
                rows={4}
                value={formData.suggestedQuestions}
                onChange={e => setFormData({...formData, suggestedQuestions: e.target.value})}
                className="w-full bg-[#0c1407] border border-[#B2EA4D]/15 text-sm text-slate-200 p-3 rounded-lg focus:outline-none focus:border-[#B2EA4D] resize-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Response Style</label>
              <select 
                value={formData.responseLength}
                onChange={e => setFormData({...formData, responseLength: e.target.value})}
                className="w-full bg-[#0c1407] border border-[#B2EA4D]/15 text-sm text-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-[#B2EA4D]"
              >
                <option value="short">Short (Concise answers)</option>
                <option value="balanced">Balanced (Recommended)</option>
                <option value="detailed">Detailed (Comprehensive explanations)</option>
              </select>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 7. Notifications */}
      <SectionCard 
        id="notifications" 
        icon={Bell} 
        title="7. Notifications"
        isExpanded={expandedSections.includes("notifications")}
        onToggle={() => toggleSection("notifications")}
      >
        <div className="bg-[#0c1407] border border-[#B2EA4D]/15 rounded-xl divide-y divide-slate-800/50">
          <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1b2e11]/30 transition-colors">
            <div>
              <span className="text-sm font-medium text-white block">Notify on Failed Sync</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Receive an email alert if automated website sync fails.</span>
            </div>
            <div className="relative flex items-center shrink-0 ml-4">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={formData.notifyFailures}
                onChange={e => setFormData({...formData, notifyFailures: e.target.checked})}
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${formData.notifyFailures ? 'bg-[#B2EA4D]' : 'bg-slate-700'}`}></div>
              <div className={`absolute left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.notifyFailures ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </label>
          
          <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#1b2e11]/30 transition-colors">
            <div>
              <span className="text-sm font-medium text-white block">Notify When Processing Completes</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Receive an email when new knowledge base indexing is finished.</span>
            </div>
            <div className="relative flex items-center shrink-0 ml-4">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={formData.notifySuccess}
                onChange={e => setFormData({...formData, notifySuccess: e.target.checked})}
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${formData.notifySuccess ? 'bg-[#B2EA4D]' : 'bg-slate-700'}`}></div>
              <div className={`absolute left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${formData.notifySuccess ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </label>
        </div>
      </SectionCard>

      {/* 8. System Updates */}
      <SectionCard 
        id="updates" 
        icon={Megaphone} 
        title="8. System Updates"
        badge={
          updates.some(u => u.isNew) && (
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider shadow-lg shadow-rose-500/20">
              {updates.filter(u => u.isNew).length} NEW
            </span>
          )
        }
        isExpanded={expandedSections.includes("updates")}
        onToggle={() => toggleSection("updates")}
      >
        <div className="space-y-4">
          {updates.map((update) => (
            <div 
              key={update.id} 
              className={`relative border rounded-xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-colors ${
                update.isNew 
                  ? 'bg-[#1b2e11]/80 border-slate-700 shadow-md shadow-slate-900' 
                  : 'bg-[#0c1407] border-[#B2EA4D]/15'
              }`}
            >
              {update.isNew && (
                <div className="absolute top-0 left-0 w-1 h-full bg-[#B2EA4D] rounded-l-xl"></div>
              )}
              
              <div className="flex-1 ml-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">{update.title}</h4>
                  {update.isNew && (
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/30 bg-[#203210]/15 px-1.5 py-0.5 rounded">New</span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono ml-auto md:ml-0">{update.date}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{update.desc}</p>
              </div>

              <div className="flex flex-row md:flex-col items-center justify-end gap-2 shrink-0 md:min-w-[120px]">
                {update.isNew ? (
                  <Button onClick={() => markUpdateAsRead(update.id)} variant="outline" className="w-full h-8 text-[10px] border-slate-700 bg-[#1b2e11] hover:bg-[#203210]/60 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-[#B2EA4D]" /> Mark Read
                  </Button>
                ) : null}
                
                {update.hasPremiumLink && !isPremiumUnlocked ? (
                  <Button onClick={() => {
                    document.getElementById('branding')?.scrollIntoView({ behavior: 'smooth' });
                    if (!expandedSections.includes('branding')) toggleSection('branding');
                  }} className="w-full h-8 text-[10px] bg-white hover:bg-slate-100 text-[#203210] font-bold shadow-lg shadow-[#B2EA4D]/25">
                    <Star className="w-3.5 h-3.5 mr-1.5" fill="currentColor" /> Upgrade
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full h-8 text-[10px] text-[#B2EA4D] hover:text-[#B2EA4D]/90 hover:bg-[#B2EA4D]/8">
                    Learn More
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-full max-w-xl z-50">
        <div className="bg-[#1b2e11]/90 backdrop-blur-xl border border-[#B2EA4D]/30 p-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex items-center justify-end gap-3">
          <Button variant="ghost" className="text-slate-400 hover:text-white h-10 px-6 rounded-xl text-sm font-medium">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950 font-extrabold h-10 px-8 rounded-xl shadow-lg shadow-[#B2EA4D]/25 text-sm"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
