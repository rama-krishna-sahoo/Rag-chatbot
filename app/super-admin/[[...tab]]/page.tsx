"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Users, 
  Database, 
  CreditCard, 
  Megaphone, 
  Sliders, 
  Activity, 
  Settings, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Trash2, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Calendar, 
  DollarSign, 
  MessageSquare,
  HelpCircle,
  Play,
  RotateCcw,
  BookOpen,
  Info,
  LogOut
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";

export default function SuperAdminDashboard() {
  const params = useParams();
  const router = useRouter();

  const activeTab = (params?.tab as string[])?.[0] || "overview";

  const setActiveTab = (newTab: string) => {
    router.push(`/super-admin/${newTab}`);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  
  // Impersonate state
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Search & Filter state for Clients
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Live and Mock Data States
  const [clients, setClients] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [summary, setSummary] = useState({
    totalClients: 0,
    activeChatbots: 0,
    premiumSubscribers: 0,
    monthlyRevenue: 0
  });
  const [dbHealth, setDbHealth] = useState("Healthy");
  const [geminiHealth, setGeminiHealth] = useState("Healthy");

  useEffect(() => {
    async function fetchSuperData() {
      try {
        const [metricsRes, healthRes] = await Promise.all([
          fetch("/api/admin/super-metrics"),
          fetch("/api/admin/health")
        ]);

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          if (data.summary) {
            setSummary(data.summary);
          }
          if (data.clients) {
            setClients(data.clients);
          }
          if (data.auditLogs) {
            setAuditLogs(data.auditLogs);
          }
          if (data.currentUser?.email) {
            setCurrentUserEmail(data.currentUser.email);
          }
        }

        if (healthRes.ok) {
          const health = await healthRes.json();
          setDbHealth(health.database === "healthy" ? "Healthy" : "Unhealthy");
          setGeminiHealth(health.gemini === "healthy" ? "Healthy" : "Unhealthy");
        }
      } catch (err) {
        console.error("Error loading super admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSuperData();
  }, []);

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    trialDuration: 14,
    defaultWelcomeMsg: "Hi there! I am Oogway AI, how can I help you today?",
    defaultKbSizeLimit: 100, // MB
    smtpServer: "smtp.sendgrid.net",
    smtpUser: "apikey",
    emailFromName: "Oogway Platform",
    backupFrequency: "daily"
  });

  // Actions
  const handleToggleStatus = (clientId: string, newStatus: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient((prev: any) => ({ ...prev, status: newStatus }));
    }
  };

  const handleImpersonate = (client: any) => {
    localStorage.setItem("oogway_simulated_workspace_id", client.id);
    localStorage.setItem("oogway_simulated_company", client.companyName);
    localStorage.setItem("oogway_simulated_website", client.website || "");
    localStorage.setItem("oogway_simulated_role", "Super Admin");
    localStorage.setItem("oogway_simulated_industry", "E-commerce");
    localStorage.setItem("oogway_simulated_logo", "💼");
    window.location.href = "/dashboard";
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm("Are you sure you want to permanently delete this client? All customer data will be wiped.")) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      setSelectedClient(null);
    }
  };



  const filteredClients = clients.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "free") return matchesSearch && c.status === "free";
    if (statusFilter === "premium") return matchesSearch && c.status === "premium";
    if (statusFilter === "active") return matchesSearch && (c.status === "premium" || c.status === "free");
    if (statusFilter === "suspended") return matchesSearch && c.status === "suspended";
    if (statusFilter === "expired") return matchesSearch && c.status === "expired";
    return matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* IMPERSONATION BANNER */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-slate-950 font-bold px-6 py-2.5 z-[100] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="animate-ping w-2 h-2 rounded-full bg-slate-950"></span>
            Impersonating: <span className="underline">{impersonating}</span> (Super Admin Mode)
          </div>
          <Button size="sm" onClick={() => setImpersonating(null)} className="h-7 bg-slate-950 text-white hover:bg-slate-900 font-bold">
            Exit Impersonation
          </Button>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur shrink-0 flex flex-col justify-between ${impersonating ? 'pt-12' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/10">
              <Sparkles className="w-5 h-5 text-slate-950" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Oogway Platform</h1>
              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">Super Admin</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "overview", label: "Dashboard", icon: TrendingUp },
              { id: "clients", label: "Client Accounts", icon: Users },
              { id: "audit-logs", label: "System Audit Logs", icon: Clock },
              { id: "system", label: "Platform Health", icon: Activity },
              { id: "settings", label: "Settings", icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedClient(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                      : "text-slate-300 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-white font-black text-xs">SA</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Owner Portal</div>
              <div className="text-[9px] text-slate-400 font-mono">{currentUserEmail || "Loading..."}</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout} 
            className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-slate-800/40 rounded-lg"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* MAIN MAIN VIEW CANVAS */}
      <main className={`flex-1 p-8 overflow-y-auto ${impersonating ? 'pt-20' : ''}`}>
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Super Admin Dashboard</h2>
              <p className="text-slate-300 text-sm mt-1">Platform overview, system metrics, and analytics at a glance.</p>
            </div>

            {/* Overview Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-900/40 border-slate-800 p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clients</span>
                  <span className="text-2xl font-extrabold text-white mt-1 block">{loading ? "..." : summary.totalClients}</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1.5 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +12% this week
                  </span>
                </div>
                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
                  <Users className="w-6 h-6" />
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Chatbots</span>
                  <span className="text-2xl font-extrabold text-white mt-1 block">{loading ? "..." : summary.activeChatbots}</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1.5 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +8% this week
                  </span>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Premium Subscribers</span>
                  <span className="text-2xl font-extrabold text-white mt-1 block">{loading ? "..." : summary.premiumSubscribers}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1.5 font-bold">
                    {summary.totalClients > 0 ? ((summary.premiumSubscribers / summary.totalClients) * 100).toFixed(1) : "0.0"}% subscription rate
                  </span>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                  <CreditCard className="w-6 h-6" />
                </div>
              </Card>

              <Card className="bg-slate-900/40 border-slate-800 p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Revenue</span>
                  <span className="text-2xl font-extrabold text-white mt-1 block">
                    ${loading ? "..." : summary.monthlyRevenue.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1.5 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +15.2% MoM
                  </span>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </Card>
            </div>

            {/* Platform Monitoring Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Health highlights */}
              <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                    Platform Status 
                    <span className={`border text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      dbHealth === "Healthy" && geminiHealth === "Healthy"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}>
                      {dbHealth === "Healthy" && geminiHealth === "Healthy" ? "Healthy" : "Degraded"}
                    </span>
                  </h3>
                  <div className="space-y-3.5">
                    {[
                      { name: "API Gateway", status: "Healthy" },
                      { name: "Gemini AI Ingestion", status: geminiHealth },
                      { name: "Vector Database", status: dbHealth },
                      { name: "Sync Queue", status: "0 pending" }
                    ].map((s, idx) => {
                      const isHealthy = s.status === "Healthy" || s.status === "0 pending";
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">{s.name}</span>
                          <span className={`font-semibold flex items-center gap-1 ${
                            isHealthy ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isHealthy ? "bg-emerald-400" : "bg-rose-400"
                            }`}></span>
                            {s.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button onClick={() => setActiveTab("system")} variant="outline" className="w-full mt-6 h-9 border-slate-800 bg-slate-950 text-xs hover:bg-slate-900">
                  Detailed Monitoring
                </Button>
              </Card>

              {/* Mock visual analytics - Premium CSS Bar chart for daily operations */}
              <Card className="bg-slate-900/40 border-slate-800 p-6 lg:col-span-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-white">Daily Operations Activity</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">Website Syncs & Conversations completed over the last 7 days.</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2.5 h-2.5 bg-teal-500 rounded"></span> Conversations
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded"></span> Syncs
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between h-40 pt-4 px-2">
                    {(() => {
                      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      const chartData = daysOfWeek.map(dayName => {
                        let syncs = 0;
                        let convs = 0;
                        auditLogs.forEach(log => {
                          const date = new Date(log.created_at);
                          const day = date.toLocaleDateString("en-US", { weekday: "short" });
                          if (day === dayName) {
                            if (log.action.includes("Ingestion") || log.action.includes("Sync")) {
                              syncs += 1;
                            } else {
                              convs += 1;
                            }
                          }
                        });
                        return {
                          day: dayName,
                          syncs: Math.max(1, syncs * 15), // scale for visual representation
                          convs: Math.max(2, convs * 10),
                          actualSyncs: syncs,
                          actualConvs: convs
                        };
                      });
                      return chartData.map((data, index) => (
                        <div key={index} className="flex flex-col items-center gap-2 w-full group">
                          <div className="flex gap-1.5 items-end justify-center w-full h-28 relative">
                            {/* Hover stats tooltip */}
                            <div className="absolute -top-8 bg-slate-900 border border-slate-800 p-1.5 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-lg">
                              <div>Syncs: {data.actualSyncs}</div>
                              <div>Events: {data.actualConvs}</div>
                            </div>
                            <div 
                              style={{ height: `${Math.min(100, data.syncs)}%` }} 
                              className="w-3.5 bg-indigo-500 rounded-t transition-all group-hover:brightness-110"
                            ></div>
                            <div 
                              style={{ height: `${Math.min(100, data.convs)}%` }} 
                              className="w-3.5 bg-teal-500 rounded-t transition-all group-hover:brightness-110"
                            ></div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">{data.day}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </Card>

            </div>
          </div>
        )}

        {/* TAB 2: CLIENT ACCOUNTS */}
        {activeTab === "clients" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Client Accounts</h2>
                <p className="text-slate-300 text-sm mt-1">Manage tenant configurations, suspend accounts, and view usage metrics.</p>
              </div>
            </div>

            {selectedClient ? (
              /* CLIENT DETAILS VIEW */
              <div className="space-y-6">
                <Button variant="ghost" onClick={() => setSelectedClient(null)} className="h-9 text-slate-300 hover:text-white mb-2">
                  ← Back to client list
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Account Profile */}
                  <Card className="bg-slate-900/40 border-slate-800 p-6 space-y-6">
                    <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
                      <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 font-extrabold text-lg">
                        {selectedClient.companyName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{selectedClient.companyName}</h3>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 uppercase tracking-wide border ${
                          selectedClient.status === "premium"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : selectedClient.status === "suspended"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : selectedClient.status === "expired"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-slate-500/10 text-slate-300 border-slate-800"
                        }`}>
                          {selectedClient.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Contact Person</span>
                        <div className="text-sm font-semibold text-slate-200">{selectedClient.contactPerson}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Email Address</span>
                        <div className="text-sm font-semibold text-slate-200">{selectedClient.email}</div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Website URL</span>
                        <a href={selectedClient.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-teal-400 flex items-center gap-1 hover:underline">
                          {selectedClient.website} <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider mb-1">Billing Cycle</span>
                        <div className="text-sm font-semibold text-slate-200 capitalize">{selectedClient.billingCycle}</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-2">
                      <Button onClick={() => handleImpersonate(selectedClient)} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-9 text-xs">
                        Login as Client (Impersonate)
                      </Button>
                      {selectedClient.status !== "suspended" ? (
                        <Button onClick={() => handleToggleStatus(selectedClient.id, "suspended")} variant="outline" className="w-full h-9 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs">
                          Suspend Account
                        </Button>
                      ) : (
                        <Button onClick={() => handleToggleStatus(selectedClient.id, "premium")} className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold h-9 text-xs">
                          Activate Account
                        </Button>
                      )}
                      <Button onClick={() => handleDeleteClient(selectedClient.id)} variant="outline" className="w-full h-9 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 text-xs">
                        Delete Account
                      </Button>
                    </div>
                  </Card>

                  {/* Middle Column: Resource Usage */}
                  <Card className="bg-slate-900/40 border-slate-800 p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Resource & API Usage</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Monthly Conversations</span>
                          <span className="font-semibold text-slate-200">{selectedClient.conversationsThisMonth} / 10,000</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                          <div style={{ width: `${(selectedClient.conversationsThisMonth / 10000) * 100}%` }} className="bg-teal-500 h-full rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Knowledge Base Vector Size</span>
                          <span className="font-semibold text-slate-200">{selectedClient.kbSize}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Documents Uploaded</span>
                          <span className="font-semibold text-slate-200">{selectedClient.docsCount} files</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Last Scraper Run</span>
                          <span className="font-semibold text-slate-200">{selectedClient.lastSync}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">Storage Allocated</span>
                          <span className="font-semibold text-slate-200">{selectedClient.storageUsage}</span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Right Column: Ingestion Controls */}
                  <Card className="bg-slate-900/40 border-slate-800 p-6 space-y-6">
                    <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">Ingestion Diagnostics</h3>
                    <div className="space-y-3">
                      <Button className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:bg-slate-900 justify-start gap-3 h-10">
                        <RefreshCw className="w-4 h-4 text-teal-400" />
                        Trigger Website Sync
                      </Button>
                      <Button className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:bg-slate-900 justify-start gap-3 h-10">
                        <Database className="w-4 h-4 text-indigo-400" />
                        Rebuild Knowledge Base
                      </Button>
                      <Button className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:bg-slate-900 justify-start gap-3 h-10">
                        <Sliders className="w-4 h-4 text-purple-400" />
                        Reset Client API Keys
                      </Button>
                      <Button className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:bg-slate-900 justify-start gap-3 h-10">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        Upgrade / Renew subscription
                      </Button>
                    </div>
                  </Card>

                </div>
              </div>
            ) : (
              /* MAIN CLIENTS LISTING TABLE */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search company or email..."
                      className="bg-slate-900/50 border-slate-800 text-slate-200 pl-9" 
                    />
                  </div>

                  {/* Status Filters */}
                  <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: "all", label: "All Clients" },
                      { id: "premium", label: "Premium" },
                      { id: "free", label: "Free Plan" },
                      { id: "active", label: "Active" },
                      { id: "suspended", label: "Suspended" },
                      { id: "expired", label: "Expired" }
                    ].map(f => (
                      <Button 
                        key={f.id}
                        variant={statusFilter === f.id ? "default" : "outline"}
                        onClick={() => setStatusFilter(f.id)}
                        className={`h-8 text-xs shrink-0 ${statusFilter === f.id ? 'bg-teal-500 text-slate-950 font-bold hover:bg-teal-600' : 'border-slate-850 text-slate-300 bg-slate-900/30'}`}
                      >
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950 text-slate-300 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Company Name</th>
                          <th className="px-6 py-4">Contact</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Billing</th>
                          <th className="px-6 py-4">Created Date</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredClients.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">No client accounts found matching those filters.</td>
                          </tr>
                        ) : (
                          filteredClients.map(client => (
                            <tr key={client.id} className="hover:bg-slate-900/10">
                              <td className="px-6 py-4 font-semibold text-white truncate max-w-xs">{client.companyName}</td>
                              <td className="px-6 py-4 text-slate-300 text-xs">{client.contactPerson}</td>
                              <td className="px-6 py-4 text-slate-300 text-xs">{client.email}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  client.status === "premium" 
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                    : client.status === "suspended"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : client.status === "expired"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-slate-500/10 text-slate-300 border-slate-800"
                                }`}>
                                  {client.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-300 text-xs capitalize">{client.billingCycle}</td>
                              <td className="px-6 py-4 text-slate-400 text-xs">{new Date(client.createdDate).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right space-x-1.5">
                                <Button size="sm" onClick={() => setSelectedClient(client)} className="h-7 border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-850 hover:text-white text-[10px] px-2.5">
                                  View Details
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYSTEM AUDIT LOGS */}
        {activeTab === "audit-logs" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">System Audit Logs</h2>
              <p className="text-slate-300 text-sm mt-1">Platform-wide event tracking and activity monitoring across all workspaces.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
                <span className="ml-3 text-slate-300">Loading audit logs...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <Card className="bg-slate-900/40 border-slate-800 p-12 text-center">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-300 text-sm">No audit events found.</p>
              </Card>
            ) : (
              <Card className="bg-slate-900/40 border-slate-800 p-6">
                <p className="text-slate-300 text-sm">Audit log UI components will be added in subsequent tasks.</p>
                <p className="text-slate-400 text-xs mt-2">
                  {auditLogs.length} audit log{auditLogs.length !== 1 ? 's' : ''} loaded from API.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* TAB 7: PLATFORM HEALTH MONITORING */}
        {activeTab === "system" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight font-sans">Platform Infrastructure</h2>
              <p className="text-slate-300 text-sm mt-1">Live health checks, active scraper job cues, and audit logs.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "API Gateway", latency: "24ms", load: "12%", status: "Healthy" },
                { name: "Gemini Model Service", latency: "380ms", load: "4%", status: "Healthy" },
                { name: "Supabase DB Pool", latency: "8ms", load: "35%", status: "Healthy" },
                { name: "Vector Database Engine", latency: "14ms", load: "18%", status: "Healthy" }
              ].map((sys, idx) => (
                <Card key={idx} className="bg-slate-900/40 border-slate-800 p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-white block">{sys.name}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>Latency</span>
                    <span className="font-mono text-slate-200">{sys.latency}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>Current Load</span>
                    <span className="font-mono text-slate-200">{sys.load}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Queue overview */}
            <Card className="bg-slate-900/40 border-slate-800 p-6">
              <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-800 pb-3">Scraper Synchronization Queue</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <div className="flex-1 text-slate-350">
                    Job <span className="font-mono font-bold text-white">#sync_98a4d</span>: Processing Wayne Enterprises website URL
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">Started 4m ago</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                  <div className="flex-1">
                    Job <span className="font-mono font-bold">#sync_98a4e</span>: In Queue for Acme Corp
                  </div>
                  <span className="font-mono text-[10px]">Pending</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 8: SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-4xl space-y-6 animate-in fade-in duration-300 pb-20">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Platform Configurations</h2>
              <p className="text-slate-300 text-sm mt-1">Configure email templates, SMTP settings, default parameters, and backups.</p>
            </div>

            <Card className="bg-slate-900/40 border-slate-800 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Default Trial Duration (Days)</label>
                  <Input 
                    type="number"
                    value={platformSettings.trialDuration}
                    onChange={e => setPlatformSettings({...platformSettings, trialDuration: Number(e.target.value)})}
                    className="bg-slate-950 border-slate-800 text-sm h-10" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Default Storage Allocation Limit (MB)</label>
                  <Input 
                    type="number"
                    value={platformSettings.defaultKbSizeLimit}
                    onChange={e => setPlatformSettings({...platformSettings, defaultKbSizeLimit: Number(e.target.value)})}
                    className="bg-slate-950 border-slate-800 text-sm h-10" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Default Welcome Message</label>
                  <Input 
                    value={platformSettings.defaultWelcomeMsg}
                    onChange={e => setPlatformSettings({...platformSettings, defaultWelcomeMsg: e.target.value})}
                    className="bg-slate-950 border-slate-800 text-sm h-10" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">Email SMTP Server</label>
                  <Input 
                    value={platformSettings.smtpServer}
                    onChange={e => setPlatformSettings({...platformSettings, smtpServer: e.target.value})}
                    className="bg-slate-950 border-slate-800 text-sm h-10" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">SMTP User</label>
                  <Input 
                    value={platformSettings.smtpUser}
                    onChange={e => setPlatformSettings({...platformSettings, smtpUser: e.target.value})}
                    className="bg-slate-950 border-slate-800 text-sm h-10" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800/50 justify-end">
                <Button variant="ghost" className="text-slate-300 hover:text-white text-xs h-10 px-5">Reset</Button>
                <Button onClick={() => alert("Platform configurations saved!")} className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs h-10 px-8">Save Config</Button>
              </div>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
