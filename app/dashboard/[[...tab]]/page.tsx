// app/dashboard/[[...tab]]/page.tsx

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  LayoutDashboard, 
  UploadCloud, 
  Database, 
  Search, 
  Users, 
  FileSpreadsheet, 
  Activity, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  ExternalLink,
  ChevronRight,
  Eye,
  Sliders,
  Send,
  UserCheck,
  UserPlus,
  LogOut,
  Sparkles,
  Globe,
  Settings,
  Bot,
  Loader2,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import dynamic from "next/dynamic";
import { SettingsTab } from "./SettingsTab";

const KnowledgeUniverse = dynamic(
  () => import("./KnowledgeUniverse").then((mod) => mod.KnowledgeUniverse),
  { ssr: false }
);

type ActiveTab = "overview" | "chatbot" | "knowledge_base" | "website_sync" | "documents" | "conversations" | "analytics" | "team" | "settings";

export default function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();

  // Resolve tab from catch-all dynamic route segment
  const tabSegment = (params?.tab as string[])?.[0] || "overview";

  // Maps URL path tabs to internal state tabs
  const activeTabMap: Record<string, ActiveTab> = {
    "overview": "overview",
    "chatbot": "chatbot",
    "knowledge-base": "knowledge_base",
    "website": "website_sync",
    "documents": "documents",
    "conversations": "conversations",
    "analytics": "analytics",
    "team": "team",
    "settings": "settings"
  };

  const activeTab = activeTabMap[tabSegment] || "overview";

  const setActiveTab = (newTab: string) => {
    // Reverse lookup key
    const urlSegment = Object.keys(activeTabMap).find(key => activeTabMap[key] === newTab) || newTab;
    router.push(`/dashboard/${urlSegment}`);
  };

  const [user, setUser] = useState<any>(null);
  const [simulatedRole, setSimulatedRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("oogway_simulated_role") || "Knowledge Admin";
    }
    return "Knowledge Admin";
  });
  const [role, setRole] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [loadingAuth, setLoadingAuth] = useState(true); // check credentials silently in the background
  const [isRealAuth, setIsRealAuth] = useState(false);
  const [industry, setIndustry] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("oogway_simulated_industry") || "E-commerce";
    return "E-commerce";
  });
  const [companyName, setCompanyName] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("oogway_simulated_company") || "Oogway";
    return "Oogway";
  });
  const [website, setWebsite] = useState<string>("");
  const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false);
  const [pagesCount, setPagesCount] = useState<string>("0");
  const [docsCount, setDocsCount] = useState<string>("0");
  const [syncTime, setSyncTime] = useState<string>("Never");

  const isSuperAdmin = user?.email === "superadmin@yopmail.com" || role === "Super Admin";

  useEffect(() => {
    fetchRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole();
      } else {
        setIsRealAuth(false);
      }
    });

    if (typeof window !== "undefined") {
      if (localStorage.getItem("oogway_simulated_role") === "Super Admin" && user?.email !== "superadmin@yopmail.com") {
        localStorage.setItem("oogway_simulated_role", "Knowledge Admin");
        setSimulatedRole("Knowledge Admin");
      }
      
      const site = localStorage.getItem("oogway_simulated_website") || "";
      const onboarded = localStorage.getItem("oogway_onboarded") === "true";
      setWebsite(site);
      
      setPagesCount(localStorage.getItem("oogway_simulated_pages_count") || "0");
      setDocsCount(localStorage.getItem("oogway_simulated_docs_count") || "0");
      setSyncTime(localStorage.getItem("oogway_simulated_sync_time") || "Never");

      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        setShowSuccessBanner(true);
      }

      if (!onboarded) {
        window.location.href = "/setup";
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // States for stats & health
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // States for upload center
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States for chunk explorer
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [editingChunk, setEditingChunk] = useState<any>(null);
  const [editingText, setEditingText] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");
  const [savingChunk, setSavingChunk] = useState(false);

  // States for search sandbox
  const [testQuery, setTestQuery] = useState("");
  const [matchCount, setMatchCount] = useState(4);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchStatus, setSearchStatus] = useState("published");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // States for users & roles
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Viewer");
  const [invitingUser, setInvitingUser] = useState(false);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);

  // States for audit logs & conversations
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // States for website scraper
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Supabase client instance
  const supabase = createClient();

  // Intercept window.fetch to automatically append simulated active role headers
  useEffect(() => {
    setRole(simulatedRole);
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const headers = new Headers(init?.headers || {});
      const storedRole = localStorage.getItem("oogway_simulated_role") || "Knowledge Admin";
      const storedWorkspace = localStorage.getItem("oogway_simulated_workspace_id") || "00000000-0000-0000-0000-000000000000";
      headers.set("x-simulated-role", storedRole);
      headers.set("x-simulated-workspace-id", storedWorkspace);
      return originalFetch(input, {
        ...init,
        headers
      });
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [simulatedRole]);

  const handleSimulatedRoleChange = (newRole: string) => {
    setSimulatedRole(newRole);
    setRole(newRole);
    localStorage.setItem("oogway_simulated_role", newRole);
    // Refresh admin tables to reflect new permission boundaries
    fetchMetricsAndHealth();
    fetchDocuments();
    fetchUsers();
    fetchLogs();
  };

  const fetchRole = async () => {
    try {
      const res = await fetch("/api/auth/role");
      if (res.ok) {
        const data = await res.json();
        if (data.email === "superadmin@yopmail.com" && typeof window !== "undefined" && !localStorage.getItem("oogway_simulated_workspace_id")) {
          window.location.href = "/super-admin";
          return;
        }
        setRole(data.role);
        setWorkspaceId(data.workspaceId || "00000000-0000-0000-0000-000000000000");
        if (data.email) {
          setUser((prev: any) => ({ ...prev, email: data.email }));
        }
        setIsRealAuth(!data.isSimulated);
      }
    } catch (err) {
      console.error("Failed to fetch role:", err);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem("oogway_simulated_workspace_id");
    localStorage.removeItem("oogway_simulated_company");
    localStorage.removeItem("oogway_simulated_website");
    localStorage.removeItem("oogway_simulated_role");
    localStorage.removeItem("oogway_simulated_industry");
    localStorage.removeItem("oogway_simulated_logo");
    window.location.href = "/super-admin";
  };

  // Fetch metrics and health data
  const fetchMetricsAndHealth = async () => {
    if (!stats) setLoadingStats(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/health")
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      } else {
        const healthData = await healthRes.json().catch(() => ({}));
        setHealth({ ...healthData, gemini: "unhealthy", database: "healthy" });
      }
    } catch (err) {
      console.error("Error loading metrics:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch documents list
  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/admin/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  // Fetch chunks list
  const fetchChunksForDoc = async (doc: any) => {
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const res = await fetch(`/api/admin/chunks?documentId=${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setChunks(data);
      }
    } catch (err) {
      console.error("Error loading chunks:", err);
    } finally {
      setLoadingChunks(false);
    }
  };

  // Fetch users list
  const fetchUsers = async () => {
    if (usersList.length === 0) setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch conversations
  const fetchLogs = async () => {
    if (logs.length === 0) setLoadingLogs(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load correct tab datasets
  useEffect(() => {
    if (!role || role === "Chatbot User") return;

    if (activeTab === "overview") {
      fetchMetricsAndHealth();
    } else if (activeTab === "documents") {
      fetchDocuments();
    } else if (activeTab === "knowledge_base") {
      fetchDocuments();
      setSelectedDoc(null);
      setChunks([]);
    } else if (activeTab === "team") {
      fetchUsers();
    } else if (activeTab === "conversations") {
      fetchLogs();
    }
  }, [activeTab, role]);

  // Upload file pipeline
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress("Uploading file to Storage...");

    try {
      const storagePath = `docs/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress("Registering document in Database...");
      const registerRes = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          storagePath,
          fileSize: file.size,
          mimeType: file.type || "text/plain"
        })
      });

      if (!registerRes.ok) {
        const errData = await registerRes.json();
        throw new Error(errData.error || "Failed to register document");
      }

      const registeredDoc = await registerRes.json();
      fetchDocuments();

      setUploadProgress("Processing chunks & embeddings with Gemini...");
      const processRes = await fetch("/api/admin/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: registeredDoc.id })
      });

      if (!processRes.ok) {
        const errData = await processRes.json();
        throw new Error(errData.error || "Document registered but processing failed");
      }

      setUploadProgress("Processing completed successfully!");
      setTimeout(() => {
        setUploadProgress("");
        setUploading(false);
        fetchDocuments();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      alert(`Upload/Process failed: ${err.message}`);
      setUploadProgress("");
      setUploading(false);
      fetchDocuments();
    }
  };

  // Website URL Ingestion pipeline
  const handleUrlIngest = async () => {
    if (!websiteUrl.trim() || !websiteUrl.startsWith("http")) {
      alert("Please enter a valid website URL starting with http:// or https://");
      return;
    }

    setUploading(true);
    setUploadProgress("Crawling website and downloading HTML...");

    try {
      const res = await fetch("/api/admin/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process website URL");
      }

      const data = await res.json();
      setUploadProgress(`Successfully processed website! Created ${data.chunksCount} chunks.`);
      setWebsiteUrl("");
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress("");
        fetchDocuments();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      alert(`Website Ingestion failed: ${err.message}`);
      setUploading(false);
      setUploadProgress("");
      fetchDocuments();
    }
  };

  // Delete a document
  const triggerDeleteDoc = async (docId: string) => {
    if (!confirm("Are you sure you want to permanently delete this document and all its chunks? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/documents?id=${docId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        alert("Document deleted successfully.");
        fetchDocuments();
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setChunks([]);
        }
      } else {
        const data = await res.json();
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Test search query sandbox
  const runTestSearch = async () => {
    if (!testQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/admin/test-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: testQuery,
          matchCount,
          category: filterCategory || null,
          status: searchStatus || null
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        const data = await res.json();
        alert(`Search error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Search error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Change user role
  const changeUserRole = async (userId: string, newRole: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (res.ok) {
        if (!skipConfirm) {
          alert("User role updated successfully.");
        }
        fetchUsers();
      } else {
        const data = await res.json();
        alert(`Failed to update role: ${data.error}`);
        fetchUsers();
      }
    } catch (err: any) {
      alert(`Error changing role: ${err.message}`);
      fetchUsers();
    }
  };

  // Invite/create new user
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserRole) return;
    setInvitingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail.trim(), role: newUserRole })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "User invited/created successfully!");
        setNewUserEmail("");
        fetchUsers();
      } else {
        alert(`Failed to invite user: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error inviting user: ${err.message}`);
    } finally {
      setInvitingUser(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  if (loadingAuth) {
    return (
      <div className="dark min-h-screen bg-slate-950 text-white flex items-center justify-center flex-col gap-4 font-sans">
        <RefreshCw className="w-10 h-10 animate-spin text-teal-400" />
        <p className="text-slate-300 text-sm tracking-widest animate-pulse">VERIFYING CREDENTIALS...</p>
      </div>
    );
  }

  const isAuthorized = role && role !== "Chatbot User";
  if (!user || !isAuthorized) {
    return (
      <div className="dark min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 p-8 shadow-2xl rounded-2xl border flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-bounce" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">Admin Control Center</h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            {!user 
              ? "You must be signed in with an authorized account to access the administrative tools." 
              : `Your current role (${role || "None"}) does not grant administrative access. Please contact a Super Admin.`}
          </p>

          {!user ? (
            <Button onClick={handleLogin} className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold h-11 rounded-lg">
              GitHub Sign In
            </Button>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {!isRealAuth && user?.email?.endsWith("@oogway.com") && (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-left w-full">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Simulate Role</label>
                  <select
                    value={simulatedRole}
                    onChange={(e) => handleSimulatedRoleChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-xs font-bold text-teal-400 rounded px-2 py-1.5 focus:outline-none focus:border-teal-500 cursor-pointer"
                  >
                    {["Knowledge Admin", "Content Editor", "Reviewer", "Viewer", "Chatbot User"].map((r) => (
                      <option key={r} value={r} className="bg-slate-950 text-slate-300 text-xs">{r === "Knowledge Admin" ? "Admin" : r}</option>
                    ))}
                  </select>
                </div>
              )}

              <Button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-11 rounded-lg">
                Log Out
              </Button>
              <a href="/">
                <Button variant="ghost" className="w-full text-slate-300 hover:text-white">
                  Back to Store
                </Button>
              </a>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-lg shadow-sm border border-teal-500/30">
              {companyName.charAt(0)}
            </div>
            <span className="font-extrabold text-lg text-white truncate max-w-[150px]">
              {companyName}
            </span>
          </div>
        </div>

        {/* User profile card */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full border border-teal-500/30" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate font-mono">{user.email}</p>
            {isRealAuth || user?.email === "superadmin@yopmail.com" || (user?.email && !user.email.endsWith("@oogway.com")) ? (
              <span className="text-[9px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                {user?.email === "superadmin@yopmail.com" ? "Super Admin" : (role === "Knowledge Admin" ? "Admin" : role)}
              </span>
            ) : (
              <div className="mt-1">
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Dev Mode Role</label>
                <select
                  value={simulatedRole}
                  onChange={(e) => handleSimulatedRoleChange(e.target.value)}
                  className="mt-0.5 block w-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-teal-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-teal-500 cursor-pointer font-mono"
                >
                  {["Knowledge Admin", "Content Editor", "Reviewer", "Viewer", "Chatbot User"].map((r) => (
                    <option key={r} value={r} className="bg-slate-950 text-slate-300 text-[10px]">{r === "Knowledge Admin" ? "Admin" : r}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "overview"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("chatbot")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "chatbot"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Bot className="w-4 h-4 text-teal-400" />
            Chatbot
          </button>

          <button
            onClick={() => setActiveTab("knowledge_base")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "knowledge_base"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Globe className="w-4 h-4" />
            Knowledge Base
          </button>

          <button
            onClick={() => setActiveTab("website_sync")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "website_sync"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Website Sync
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "documents"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Documents
          </button>

          <button
            onClick={() => setActiveTab("conversations")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "conversations"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Conversations
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "analytics"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            Analytics
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "team"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Team
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "settings"
                ? "bg-teal-500/15 text-teal-400 border-l-2 border-teal-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        {/* Back to store */}
        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
          <a href="/storefront" className="w-full">
            <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9">
              <ExternalLink className="w-3.5 h-3.5" />
              Storefront
            </Button>
          </a>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full text-slate-400 hover:text-rose-400 justify-start text-xs h-9 gap-2">
            <LogOut className="w-3.5 h-3.5" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto flex flex-col bg-slate-950">
        {user?.email === "superadmin@yopmail.com" && typeof window !== "undefined" && localStorage.getItem("oogway_simulated_workspace_id") && (
          <div className="bg-amber-500 text-slate-950 text-xs font-bold px-8 py-2 flex items-center justify-between border-b border-amber-600">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Impersonating: <span className="underline">{localStorage.getItem("oogway_simulated_company") || "Client"}</span> (Super Admin Mode)
            </span>
            <button 
              onClick={handleExitImpersonation} 
              className="bg-slate-950 text-white hover:bg-slate-900 px-3 py-1 rounded text-[10px] font-black transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        )}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white capitalize">
            {activeTab === "knowledge_base" ? "Knowledge Base" :
             activeTab === "website_sync" ? "Website Sync" :
             activeTab} Control
          </h2>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => {
              if (activeTab === "overview") fetchMetricsAndHealth();
              else if (activeTab === "documents") fetchDocuments();
              else if (activeTab === "team") fetchUsers();
              else if (activeTab === "conversations") fetchLogs();
            }} className="h-9 w-9 border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white" title="Refresh data">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Onboarding Intercept: If no website connected yet and not settings, show onboarding card */}
          {!website && activeTab !== "settings" ? (
            <Card className="bg-slate-900 border-slate-800 p-8 text-center max-w-lg mx-auto mt-12 rounded-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shadow-lg border border-teal-500/20">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white">Connect your website</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Before Oogway can assist your customers, it needs to analyze your website. We'll automatically identify products, FAQs, brand colors, and configure your chatbot.
              </p>
              <Button onClick={() => window.location.href = "/setup"} className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-6 h-11 rounded-xl">
                Start Setup Wizard
              </Button>
            </Card>
          ) : (
            <>
              {/* Success Banner */}
              {showSuccessBanner && activeTab === "overview" && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3 mb-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="text-xl">🎉</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-emerald-300">Your AI chatbot is ready!</h4>
                    <p className="text-xs text-emerald-400/90 mt-0.5">
                      Oogway has successfully learned about your business and is ready to answer customer questions using your latest website content.
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowSuccessBanner(false)} 
                    className="h-7 text-emerald-400 hover:text-white text-xs hover:bg-emerald-500/10"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-mac-page">
                  {/* Dynamic Business Branding & Metrics Card */}
                  <Card className="bg-slate-900 border-slate-800 p-6 rounded-xl relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center text-3xl shadow-lg shrink-0 select-none">
                          {localStorage.getItem("oogway_simulated_logo") || "💼"}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {companyName}
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 uppercase font-mono tracking-widest">{industry}</span>
                          </h3>
                          <a href={website} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline flex items-center gap-1 mt-1">
                            {website} <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                      <div className="text-left md:text-right shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          AI Chatbot Ready
                        </span>
                        <p className="text-[10px] text-slate-400 mt-2">Last website sync: {syncTime}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 pt-6 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pages Processed</span>
                        <p className="text-xl font-extrabold text-white mt-1">{pagesCount} pages</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documents Indexed</span>
                        <p className="text-xl font-extrabold text-white mt-1">{docsCount} docs</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Knowledge Base Status</span>
                        <p className="text-xl font-extrabold text-emerald-400 mt-1">Healthy</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto Sync</span>
                        <p className="text-xl font-extrabold text-slate-300 mt-1">Enabled</p>
                      </div>
                    </div>
                  </Card>

                  {/* System Health */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-teal-500/10 text-teal-400">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Database connection</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Supabase Postgres Engine</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.database === "healthy" ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.database || "checking..."}</span>
                      </div>
                    </Card>

                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Gemini LLM & Embeddings</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Google AI Dev Suite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.gemini === "healthy" ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.gemini || "checking..."}</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 2: CHATBOT */}
              {activeTab === "chatbot" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white">Chatbot Playground</h3>
                    <p className="text-slate-300 text-xs mt-1">Test search queries, verify grounded AI answers, and fine-tune your chatbot responses.</p>
                  </div>
                  {/* Search Sandbox */}
                  <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl">
                    <div className="flex flex-wrap items-end gap-6">
                      <div className="flex-1 min-w-[280px]">
                        <label className="text-xs text-slate-300 font-medium">Vector Query Search</label>
                        <div className="relative mt-1">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            placeholder="Enter testing query..."
                            value={testQuery}
                            onChange={(e) => setTestQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && runTestSearch()}
                            className="pl-9 bg-slate-950 border-slate-800"
                          />
                        </div>
                      </div>

                      <div className="w-36">
                        <label className="text-xs text-slate-300 font-medium">Top-K Results</label>
                        <select
                          value={matchCount}
                          onChange={(e) => setMatchCount(Number(e.target.value))}
                          className="mt-1 w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2.5 rounded-lg focus:outline-none"
                        >
                          {[3, 4, 5, 6, 7, 8].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-44">
                        <label className="text-xs text-slate-300 font-medium">Category</label>
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="mt-1 w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 p-2.5 rounded-lg focus:outline-none"
                        >
                          <option value="">All Categories</option>
                          {["Sleep", "Feeding", "Diapering", "Skincare", "Play", "Travel", "Bath", "Teething", "general"].map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <Button onClick={runTestSearch} disabled={searching || !testQuery.trim()} className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-8 gap-2">
                        {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {searching ? "Searching..." : "Search"}
                      </Button>
                    </div>
                  </Card>

                  {searchResults && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Similar Vector Matches</h3>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4 pr-3">
                            {searchResults.sourceChunks.map((m: any, idx: number) => (
                              <Card key={idx} className="bg-slate-900/30 border-slate-800 p-4 rounded-xl flex flex-col gap-2">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <span className="text-[10px] font-extrabold text-teal-400 bg-teal-500/10 px-2 py-0.5 border border-teal-500/20 rounded">Match #{idx + 1}</span>
                                  <span className="text-xs font-bold font-mono text-emerald-400">Score: {Math.round(m.similarity * 100)}%</span>
                                </div>
                                <p className="text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded leading-relaxed border border-slate-900">{m.chunk_text}</p>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Grounded Response Preview</h3>
                        <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl flex flex-col h-[400px]">
                          <ScrollArea className="flex-1">
                            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{searchResults.answer}</p>
                          </ScrollArea>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Website Integration Snippet */}
                  <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl mt-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Code className="w-5 h-5 text-teal-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Embed Chatbot on Your Website</h3>
                        <p className="text-[11px] text-slate-400">Copy and paste this script tag into the HTML body or head of your website to launch the chat widget directly.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="relative">
                        <pre className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed select-all">
{`<script 
  src="https://oogway-chatbot-chakadola.vercel.app/embed.js" 
  data-workspace-id="${workspaceId}"
  data-brand-color="#14b8a6"
  integrity="sha384-mockSriHashOogwayAIWidgetForSecuredIntegrity"
  crossorigin="anonymous"
  defer>
</script>`}
                        </pre>
                        <Button 
                          onClick={() => {
                            const snippet = `<script \n  src="https://oogway-chatbot-chakadola.vercel.app/embed.js" \n  data-workspace-id="${workspaceId}"\n  data-brand-color="#14b8a6"\n  integrity="sha384-mockSriHashOogwayAIWidgetForSecuredIntegrity"\n  crossorigin="anonymous"\n  defer>\n</script>`;
                            navigator.clipboard.writeText(snippet);
                            alert("Integration script copied to clipboard!");
                          }}
                          className="absolute right-3 top-3 h-8 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-[10px] px-3 rounded"
                        >
                          Copy Script
                        </Button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 flex flex-col gap-2 bg-slate-900/30 p-4 rounded-lg border border-slate-850">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1 shrink-0 animate-pulse" />
                        <span>The widget automatically adapts to your workspace brand colors, logo, products, and FAQs dynamically resolved from your active knowledge base.</span>
                      </div>
                      <div className="flex items-start gap-2 border-t border-slate-850 pt-2 text-[10px] text-emerald-400 font-mono">
                        <span>🔐 SECURED: Oogway backend enforces strict domain whitelisting. Requests originating from unauthorized URLs are rejected (403 CORS Forbidden).</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* TAB 3: KNOWLEDGE BASE */}
              {activeTab === "knowledge_base" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white">Knowledge Universe</h3>
                    <p className="text-slate-300 text-xs mt-1">3D interactive vector cluster visualization of your database chunks.</p>
                  </div>
                  <KnowledgeUniverse />
                </div>
              )}

              {/* TAB 4: WEBSITE SYNC */}
              {activeTab === "website_sync" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white">Website Sync Engine</h3>
                    <p className="text-slate-300 text-xs mt-1">Configure automated crawling and manually trigger sync tasks.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Website Sync Status Card */}
                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-8 rounded-xl border flex flex-col gap-6">
                      <div>
                        <h4 className="text-white font-bold text-base">Automatic Sync Status</h4>
                        <p className="text-slate-300 text-xs mt-1">Schedule automatic periodic scans of your website for updates.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-xs font-semibold text-slate-300">Enabled Status</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Scans periodically for content changes</p>
                          </div>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold">Active</span>
                        </div>

                        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-xs font-semibold text-slate-300">Sync Frequency</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Current automation interval</p>
                          </div>
                          <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded text-xs font-mono font-bold capitalize">Weekly</span>
                        </div>
                      </div>
                    </Card>

                    {/* Crawler Ingestion Box */}
                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-8 rounded-xl border flex flex-col justify-between">
                      <div className="w-full mb-4">
                        <h3 className="text-white font-bold text-base">Trigger Manual Sync</h3>
                        <p className="text-slate-300 text-xs mt-1">Force Oogway to crawl and re-index your URL immediately.</p>
                      </div>

                      <div className="flex flex-col gap-4 w-full">
                        <div>
                          <label className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">Website URL to crawl</label>
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            value={websiteUrl || website}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            disabled={uploading}
                            className="mt-1 bg-slate-950 border-slate-800 text-xs h-10"
                          />
                        </div>

                        {uploading ? (
                          <div className="flex flex-col items-center text-center gap-3 py-2 border border-slate-800 rounded-2xl bg-slate-950/20">
                            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                            <div>
                              <p className="text-white text-xs font-semibold">Crawl In Progress...</p>
                              <p className="text-slate-300 text-[10px] mt-0.5 animate-pulse">{uploadProgress}</p>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={handleUrlIngest}
                            disabled={uploading}
                            className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold h-10 rounded-lg text-xs"
                          >
                            Sync Now
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white">Reference Documents</h3>
                    <p className="text-slate-300 text-xs mt-1">Browse, upload, and edit files that form your AI chatbot's knowledge base.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Document Upload & List Column */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl border flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Upload New Reference Document</h4>
                          <p className="text-slate-300 text-xs mt-0.5">Supports PDF, DOCX, TXT, MD, CSV, JSON.</p>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.docx,.txt,.csv,.json,.md"
                          disabled={uploading}
                        />
                        <Button 
                          onClick={() => !uploading && fileInputRef.current?.click()}
                          disabled={uploading}
                          className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 h-9 gap-2 text-xs"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                          {uploading ? "Processing..." : "Upload File"}
                        </Button>
                      </Card>

                      <Card className="bg-slate-900/50 border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Ingested Reference Materials</h4>
                        </div>
                        <table className="w-full text-left text-xs text-slate-300">
                          <tbody className="divide-y divide-slate-800">
                            {documents.map((doc) => (
                              <tr key={doc.id} className="hover:bg-slate-900/20">
                                <td className="px-4 py-3 font-semibold text-white truncate max-w-xs">{doc.filename}</td>
                                <td className="px-4 py-3 text-slate-300">{formatBytes(doc.file_size)}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
                                    doc.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                                  }`}>
                                    {doc.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button size="sm" variant="ghost" onClick={() => fetchChunksForDoc(doc)} className="h-7 text-teal-400 hover:bg-teal-500/10 text-[10px] px-2.5">
                                    Explore Chunks
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => triggerDeleteDoc(doc.id)} className="h-7 text-rose-400 hover:bg-rose-500/10 text-[10px] px-2.5 ml-2">
                                    Delete
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    </div>

                    {/* Chunk Explorer Column */}
                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
                      <div className="p-4 border-b border-slate-800">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          {selectedDoc ? `Chunks: ${selectedDoc.filename}` : "Select a document to browse chunks"}
                        </h3>
                      </div>
                      <ScrollArea className="flex-1 p-4 space-y-4">
                        {loadingChunks ? (
                          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-teal-400" /></div>
                        ) : chunks.length === 0 ? (
                          <p className="text-slate-400 text-center py-20 text-xs">No chunks loaded. Select a document on the left.</p>
                        ) : (
                          chunks.map(chunk => (
                            <div key={chunk.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg space-y-2">
                              <span className="text-[9px] font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">CHUNK #{chunk.chunk_id}</span>
                              <p className="text-[11px] text-slate-300 font-mono line-clamp-3 leading-relaxed">{chunk.chunk_text}</p>
                            </div>
                          ))
                        )}
                      </ScrollArea>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 6: CONVERSATIONS */}
              {activeTab === "conversations" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Customer Conversations</h3>
                      <p className="text-slate-300 text-xs mt-1">Real-time transcripts of RAG customer interactions and grounded AI replies.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Conversations Table */}
                    <div className="lg:col-span-2">
                      <Card className="bg-slate-900/50 backdrop-blur border-slate-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900 text-slate-300 text-xs font-semibold uppercase border-b border-slate-800">
                              <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Shopper Query</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {logs.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-20 text-slate-400 text-xs font-mono">
                                    No customer conversations logged yet.
                                  </td>
                                </tr>
                              ) : (
                                logs.map((log) => (
                                  <tr 
                                    key={log.id} 
                                    onClick={() => setSelectedConversation(log)}
                                    className={`hover:bg-slate-900/40 cursor-pointer align-middle transition-colors ${
                                      selectedConversation?.id === log.id ? "bg-teal-500/5 border-l-2 border-teal-400" : ""
                                    }`}
                                  >
                                    <td className="px-6 py-4 text-slate-300 text-xs font-mono">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-semibold text-white truncate max-w-[120px]">
                                      {log.details?.customerId || "Anonymous Guest"}
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 truncate max-w-xs font-mono text-xs">
                                      {log.details?.message}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedConversation(log);
                                        }} 
                                        className="h-7 text-teal-400 hover:bg-teal-500/10 text-[10px] px-2.5 font-bold"
                                      >
                                        View Transcript
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

                    {/* Chat Bubble Transcript Viewer */}
                    <div>
                      <Card className="bg-slate-900/50 border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Transcript Viewer
                          </h4>
                          {selectedConversation && (
                            <span className="text-[9px] font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 border border-teal-500/20 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <ScrollArea className="flex-1 p-4 bg-slate-950/20">
                          {!selectedConversation ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-400 text-xs">
                              <Bot className="w-8 h-8 text-slate-700 mb-2" />
                              Select a conversation row to view the full chat transcript.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="text-[10px] text-slate-400 text-center font-mono border-b border-slate-900 pb-2">
                                Customer Session: {selectedConversation.details?.customerId || "Anonymous Guest"}
                              </div>
                              
                              {/* Customer message bubble */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest block font-mono">Customer Message</span>
                                <div className="bg-slate-800/80 border border-slate-700 text-xs text-slate-100 p-3 rounded-2xl rounded-tl-none leading-relaxed">
                                  {selectedConversation.details?.message}
                                </div>
                              </div>

                              {/* AI grounded response bubble */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest block font-mono">Grounded AI Response</span>
                                <div className="bg-teal-950/40 border border-teal-900/60 text-xs text-teal-200 p-3 rounded-2xl rounded-tr-none leading-relaxed">
                                  {selectedConversation.details?.answer}
                                </div>
                              </div>
                            </div>
                          )}
                        </ScrollArea>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: ANALYTICS */}
              {activeTab === "analytics" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white">System Analytics</h3>
                    <p className="text-slate-300 text-xs mt-1">Health metrics, database capacities, and AI request statistics.</p>
                  </div>

                  {/* System Health */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-teal-500/10 text-teal-400">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Database connection</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Supabase Postgres Engine</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.database === "healthy" ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.database || "checking..."}</span>
                      </div>
                    </Card>

                    <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Gemini LLM & Embeddings</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Google AI Dev Suite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.gemini === "healthy" ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.gemini || "checking..."}</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 8: TEAM */}
              {activeTab === "team" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-white">Team Management</h3>
                    <p className="text-slate-300 text-xs mt-1">Manage platform roles, access control levels, and invite team members.</p>
                  </div>
                  
                  {/* Invite Form */}
                  <Card className="bg-slate-900/50 backdrop-blur border-slate-800 p-6 rounded-xl border shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                      <Users className="w-5 h-5 text-teal-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Invite & Assign New Team Member</h3>
                        <p className="text-[11px] text-slate-400">Register a new login email and provision their initial authorization role.</p>
                      </div>
                    </div>

                    <form onSubmit={handleInviteUser} className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[240px]">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5 font-mono">User Email Address</label>
                        <Input
                          type="email"
                          required
                          placeholder="e.g. member@company.com"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          className="bg-slate-950 border-slate-800 text-xs h-10"
                        />
                      </div>

                      <div className="w-52">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5 font-mono">Initial Access Role</label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="w-full h-10 bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                        >
                          {["Super Admin", "Knowledge Admin", "Content Editor", "Reviewer", "Viewer", "Chatbot User"].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>

                      <Button
                        type="submit"
                        disabled={invitingUser || !newUserEmail.trim()}
                        className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-6 h-10 gap-2 text-xs"
                      >
                        {invitingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                        Invite Member
                      </Button>
                    </form>
                  </Card>

                  {/* Kanban Role Board */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">Visual Access Board</h3>
                        <p className="text-slate-300 text-xs mt-1">Drag and drop team cards between columns to change their authorization level.</p>
                      </div>
                      <Button size="icon" variant="outline" onClick={fetchUsers} disabled={loadingUsers} className="h-9 w-9 bg-slate-900 border-slate-800 text-slate-300 hover:text-white">
                        <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
                      </Button>
                    </div>

                    {loadingUsers ? (
                      <div className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-teal-400 mx-auto" />
                        <span className="text-slate-400 text-xs mt-3 block font-mono">Synchronizing RBAC Board...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[
                          {
                            title: "Administrators",
                            roles: ["Super Admin", "Knowledge Admin"],
                            color: "border-rose-500/20 bg-rose-500/5",
                            badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          },
                          {
                            title: "Content & Operations",
                            roles: ["Content Editor", "Reviewer"],
                            color: "border-indigo-500/20 bg-indigo-500/5",
                            badge: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          },
                          {
                            title: "Consumers & Viewers",
                            roles: ["Viewer", "Chatbot User"],
                            color: "border-slate-500/20 bg-slate-500/5",
                            badge: "bg-slate-500/10 text-slate-300 border border-slate-500/20"
                          }
                        ].map((col, colIdx) => (
                          <div
                            key={colIdx}
                            className={`flex flex-col border rounded-xl overflow-hidden min-h-[400px] transition-all duration-300 ${col.color}`}
                          >
                            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">{col.title}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                {usersList.filter(u => col.roles.includes(u.role || "Viewer")).length} Members
                              </span>
                            </div>

                            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
                              {col.roles.map((roleName) => {
                                const isColumnHovered = hoveredColumn === roleName;
                                const roleUsers = usersList.filter(u => (u.role || "Viewer") === roleName);

                                return (
                                  <div
                                    key={roleName}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDragEnter={(e) => { e.preventDefault(); setHoveredColumn(roleName); }}
                                    onDragLeave={() => setHoveredColumn(null)}
                                    onDrop={(e) => {
                                      setHoveredColumn(null);
                                      const userId = draggingUserId || e.dataTransfer.getData("text/plain");
                                      setDraggingUserId(null);
                                      if (userId) {
                                        changeUserRole(userId, roleName, true);
                                      }
                                    }}
                                    className={`border rounded-lg p-3 transition-all duration-200 min-h-[120px] flex flex-col gap-2 ${
                                      isColumnHovered 
                                        ? "border-teal-400 bg-teal-500/5 shadow-2xl scale-[1.01]" 
                                        : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700/80"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between pb-1 border-b border-slate-900">
                                      <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">{roleName}</span>
                                      <span className="text-[9px] font-mono text-slate-600 font-bold">{roleUsers.length}</span>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                      {roleUsers.length === 0 ? (
                                        <div className="h-full flex items-center justify-center py-6 text-center text-slate-600 text-[10px] font-mono border border-dashed border-slate-900 rounded bg-slate-950/20">
                                          Drop users here
                                        </div>
                                      ) : (
                                        roleUsers.map((usr) => {
                                          const isMe = usr.id === user?.id;
                                          const initials = usr.email ? usr.email.split("@")[0].slice(0, 2).toUpperCase() : "US";
                                          
                                          return (
                                            <div
                                              key={usr.id}
                                              draggable={!isMe}
                                              onDragStart={(e) => {
                                                e.dataTransfer.setData("text/plain", usr.id);
                                                setDraggingUserId(usr.id);
                                              }}
                                              className={`bg-slate-900 border p-3 rounded-lg shadow-md transition-all flex flex-col gap-2 ${
                                                isMe 
                                                  ? "border-amber-500/30 cursor-not-allowed bg-slate-900/40 opacity-90"
                                                  : "border-slate-800 hover:border-slate-700 cursor-grab active:cursor-grabbing"
                                              }`}
                                            >
                                              <div className="flex items-start gap-2.5">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                  isMe 
                                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                    : roleName.includes("Admin")
                                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                      : "bg-slate-800 text-slate-300 border border-slate-700"
                                                }`}>
                                                  {initials}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                  <p className="text-[11px] font-bold text-white truncate leading-tight flex items-center gap-1">
                                                    {usr.email}
                                                    {isMe && <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1 py-0.2 rounded border border-amber-500/20">YOU</span>}
                                                  </p>
                                                  <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                                    Added: {new Date(usr.created_at).toLocaleDateString()}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 9: SETTINGS */}
              {activeTab === "settings" && (
                <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading settings...</div>}>
                  <SettingsTab setActiveTab={setActiveTab} />
                </Suspense>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
