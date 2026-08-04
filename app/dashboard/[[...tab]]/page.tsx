// app/dashboard/[[...tab]]/page.tsx

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthRole } from "@/hooks/useAuthRole";
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
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import dynamic from "next/dynamic";
import { SettingsTab } from "./SettingsTab";

const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  
  return (
    <div className="space-y-2">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;
        
        // Check if bullet point using regex (matches *, -, bullet characters, )
        const bulletMatch = trimmed.match(/^([\*\-\u2022\u25E6\u25AA])\s*(.*)$/);
        const isBullet = !!bulletMatch;
        const content = isBullet ? bulletMatch[2] : trimmed;
        
        // Parse bold markers **word**
        const parts = content.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={pIdx} className="font-extrabold text-[#B2EA4D]">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        
        if (isBullet) {
          return (
            <div key={lIdx} className="flex gap-2 text-[11px] leading-relaxed text-slate-300">
              <span className="text-[#B2EA4D] shrink-0 font-bold">•</span>
              <span>{renderedParts}</span>
            </div>
          );
        }
        
        return (
          <p key={lIdx} className="text-[11px] leading-relaxed text-slate-300">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
};

const KnowledgeUniverse = dynamic(
  () => import("./KnowledgeUniverse").then((mod) => mod.KnowledgeUniverse),
  { ssr: false }
);

type ActiveTab = "overview" | "chatbot" | "knowledge_base" | "website_sync" | "documents" | "conversations" | "analytics" | "team" | "settings" | "audit_logs";

export default function WorkspaceDashboard() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: authRoleData, isLoading: authRoleLoading } = useAuthRole();

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
    "settings": "settings",
    "audit-logs": "audit_logs"
  };

  const activeTab = activeTabMap[tabSegment] || "overview";

  const setActiveTab = (newTab: string) => {
    // Reverse lookup key
    const urlSegment = Object.keys(activeTabMap).find(key => activeTabMap[key] === newTab) || newTab;
    router.push(`/dashboard/${urlSegment}`);
  };

  const prefetchTab = (newTab: string) => {
    const urlSegment = Object.keys(activeTabMap).find(key => activeTabMap[key] === newTab) || newTab;
    router.prefetch(`/dashboard/${urlSegment}`);

    // Prefetch API data before navigation
    if (newTab === "overview") {
      queryClient.prefetchQuery({
        queryKey: ['metrics'],
        queryFn: async () => {
          const [statsRes, healthRes] = await Promise.all([
            fetch("/api/admin/metrics"),
            fetch("/api/admin/health")
          ]);
          const stats = statsRes.ok ? await statsRes.json() : null;
          const health = healthRes.ok ? await healthRes.json() : await healthRes.json().catch(() => ({}));
          return { stats, health: healthRes.ok ? health : { ...health, gemini: "unhealthy", database: "healthy" } };
        }
      });
    } else if (["documents", "knowledge_base", "website_sync"].includes(newTab)) {
      queryClient.prefetchQuery({
        queryKey: ['documents'],
        queryFn: async () => {
          const res = await fetch("/api/admin/documents");
          return res.ok ? await res.json() : [];
        }
      });
    } else if (newTab === "team") {
      queryClient.prefetchQuery({
        queryKey: ['users'],
        queryFn: async () => {
          const res = await fetch("/api/admin/users");
          return res.ok ? await res.json() : [];
        }
      });
    } else if (newTab === "conversations") {
      queryClient.prefetchQuery({
        queryKey: ['logs'],
        queryFn: async () => {
          const res = await fetch("/api/conversations");
          return res.ok ? await res.json() : [];
        }
      });
    } else if (newTab === "audit_logs") {
      queryClient.prefetchQuery({
        queryKey: ['audit-logs'],
        queryFn: async () => {
          const res = await fetch("/api/admin/audit-logs");
          return res.ok ? await res.json() : [];
        }
      });
    }
  };

  const [user, setUser] = useState<any>(null);
  const [simulatedRole, setSimulatedRole] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("oogway_simulated_role") || "Knowledge Admin";
    }
    return "Knowledge Admin";
  });
  const [role, setRole] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>("ffffffff-ffff-ffff-ffff-ffffffffffff");
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
  const [autoLogoUrl, setAutoLogoUrl] = useState<string | null>(null);

  // Helper to extract domain from website URL
  const getDomainForLogo = (url: string) => {
    try {
      const trimmed = url.trim();
      if (!trimmed) return "";
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      return parsed.hostname.replace("www.", "");
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    if (website) {
      const domain = getDomainForLogo(website);
      if (domain) {
        // Try Clearbit logo API first
        setAutoLogoUrl(`https://logo.clearbit.com/${domain}`);
      } else {
        setAutoLogoUrl(null);
      }
    } else {
      setAutoLogoUrl(null);
    }
  }, [website]);

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const domain = getDomainForLogo(website);
    const target = e.currentTarget;
    if (domain && !target.src.includes("google.com")) {
      // Fallback to Google's Favicon service
      target.src = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } else {
      // Fallback to default text representation
      setAutoLogoUrl(null);
    }
  };
  const [workspaceLogo, setWorkspaceLogo] = useState<string>("");
  const [showSuccessBanner, setShowSuccessBanner] = useState<boolean>(false);
  const [pagesCount, setPagesCount] = useState<string>("0");
  const [docsCount, setDocsCount] = useState<string>("0");
  const [syncTime, setSyncTime] = useState<string>("Never");

  const isSuperAdmin = user?.email === "superadmin@yopmail.com" || role === "Super Admin";

  useEffect(() => {
    if (authRoleData) {
      if (authRoleData.email === "superadmin@yopmail.com" && typeof window !== "undefined" && !localStorage.getItem("oogway_simulated_workspace_id")) {
        window.location.href = "/super-admin";
        return;
      }
      setRole(authRoleData.role);
      setWorkspaceId(authRoleData.workspaceId || "ffffffff-ffff-ffff-ffff-ffffffffffff");
      if (authRoleData.user) {
        setUser(authRoleData.user);
      }
      if (authRoleData.workspaceInfo) {
        setCompanyName(authRoleData.workspaceInfo.name || "Oogway AI");
        setWebsite(authRoleData.workspaceInfo.website_url || "");
        setIndustry(authRoleData.workspaceInfo.industry || "AI Company");
        setWorkspaceLogo(authRoleData.workspaceInfo.logo_url || "💼");
      }
      setIsRealAuth(!authRoleData.isSimulated);

      if (!authRoleData.isSimulated) {
        localStorage.removeItem("oogway_simulated_pages_count");
        localStorage.removeItem("oogway_simulated_docs_count");
        localStorage.removeItem("oogway_simulated_sync_time");
      }
      setLoadingAuth(false);

      // Perform secure redirection checks
      if (typeof window !== "undefined") {
        if (!authRoleData.user && !authRoleData.isSimulated) {
          window.location.href = "/login";
          return;
        }

        // For real authenticated users, check if they have completed the onboarding setup
        if (!authRoleData.isSimulated) {
          const isSuperAdminUser = authRoleData.role === "Super Admin" || authRoleData.email === "superadmin@yopmail.com";
          if (!isSuperAdminUser) {
            const hasWorkspace = authRoleData.workspaceId &&
              authRoleData.workspaceId !== "00000000-0000-0000-0000-000000000000" &&
              authRoleData.workspaceId !== "ffffffff-ffff-ffff-ffff-ffffffffffff";
            const hasWebsite = authRoleData.workspaceInfo?.website_url &&
              authRoleData.workspaceInfo.website_url.trim() !== "";

            if (!hasWorkspace || !hasWebsite) {
              window.location.href = "/setup";
              return;
            } else {
              localStorage.setItem("oogway_onboarded", "true");
              localStorage.setItem("oogway_simulated_company", authRoleData.workspaceInfo.name || "Oogway");
              localStorage.setItem("oogway_simulated_website", authRoleData.workspaceInfo.website_url || "");
              localStorage.setItem("oogway_simulated_industry", authRoleData.workspaceInfo.industry || "AI Company");
            }
          }
        }
      }
    } else if (!authRoleLoading) {
      setLoadingAuth(false);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, [authRoleData, authRoleLoading]);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.invalidateQueries({ queryKey: ['auth-role'] });
      if (session?.user) {
        setUser(session.user);
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
      setWebsite(site);

      setPagesCount(localStorage.getItem("oogway_simulated_pages_count") || "0");
      setDocsCount(localStorage.getItem("oogway_simulated_docs_count") || "0");
      setSyncTime(localStorage.getItem("oogway_simulated_sync_time") || "Never");

      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        setShowSuccessBanner(true);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, user?.email]);



  // Queries replacing manual states
  const { data: metricsData, isLoading: loadingStats } = useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/health")
      ]);
      const stats = statsRes.ok ? await statsRes.json() : null;
      const health = healthRes.ok ? await healthRes.json() : await healthRes.json().catch(() => ({}));
      return { stats, health: healthRes.ok ? health : { ...health, gemini: "unhealthy", database: "healthy" } };
    },
    enabled: !!role && role !== "Chatbot User" && ["overview", "analytics"].includes(activeTab)
  });
  const stats = metricsData?.stats || null;
  const health = metricsData?.health || null;

  // Queries replacing manual states
  const { data: auditLogs = [], isLoading: loadingAuditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit-logs");
      return res.ok ? await res.json() : [];
    },
    enabled: !!role && role !== "Chatbot User" && activeTab === "audit_logs"
  });

  // States for upload center
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch("/api/admin/documents");
      return res.ok ? await res.json() : [];
    },
    enabled: !!role && role !== "Chatbot User" && ["documents", "knowledge_base", "website_sync"].includes(activeTab)
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States for chunk explorer
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const { data: chunks = [], isLoading: loadingChunks } = useQuery({
    queryKey: ['chunks', selectedDoc?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/chunks?documentId=${selectedDoc.id}`);
      return res.ok ? await res.json() : [];
    },
    enabled: !!selectedDoc
  });
  const [editingChunk, setEditingChunk] = useState<any>(null);
  const [editingText, setEditingText] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");
  const [savingChunk, setSavingChunk] = useState(false);

  // States for search sandbox
  const [testQuery, setTestQuery] = useState("");
  const [matchCount, setMatchCount] = useState(4);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  // States for users & roles
  const { data: usersList = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      return res.ok ? await res.json() : [];
    },
    enabled: !!role && role !== "Chatbot User" && activeTab === "team"
  });
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("Viewer");
  const [invitingUser, setInvitingUser] = useState(false);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null);

  // States for audit logs & conversations
  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      return res.ok ? await res.json() : [];
    },
    enabled: !!role && role !== "Chatbot User" && activeTab === "conversations"
  });
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // States for website scraper
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Helpers to trigger refetch
  const fetchMetricsAndHealth = () => queryClient.invalidateQueries({ queryKey: ['metrics'] });
  const fetchDocuments = () => queryClient.invalidateQueries({ queryKey: ['documents'] });
  const fetchUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const fetchLogs = () => queryClient.invalidateQueries({ queryKey: ['logs'] });
  const fetchChunksForDoc = (doc: any) => setSelectedDoc(doc);

  // Intercept window.fetch to automatically append simulated active role headers
  useEffect(() => {
    setRole(simulatedRole);
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const headers = new Headers(init?.headers || {});
      const storedRole = localStorage.getItem("oogway_simulated_role") || "Knowledge Admin";
      const storedWorkspace = localStorage.getItem("oogway_simulated_workspace_id") || "ffffffff-ffff-ffff-ffff-ffffffffffff";
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
    queryClient.invalidateQueries();
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

  // Resolves paths relative to the base domain and verifies domain ownership
  const resolveAndValidateUrl = (input: string): string | null => {
    let target = input.trim();
    if (!target) return null;

    // Resolve relative paths using the workspace base domain URL (website state variable)
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      let base = website.trim();
      if (!base) {
        alert("Please configure your website URL in Settings first.");
        return null;
      }
      if (!base.startsWith("http")) base = "https://" + base;
      if (!base.endsWith("/")) base += "/";

      // Remove leading slash if any
      if (target.startsWith("/")) target = target.slice(1);
      target = base + target;
    }

    try {
      const parsedTarget = new URL(target);
      const parsedBase = new URL(website.startsWith("http") ? website : "https://" + website);

      const targetHost = parsedTarget.hostname.replace(/^www\./, "");
      const baseHost = parsedBase.hostname.replace(/^www\./, "");

      if (targetHost !== baseHost && !targetHost.endsWith("." + baseHost)) {
        alert(`Domain Mismatch: The page URL domain (${parsedTarget.hostname}) must match your whitelisted domain (${parsedBase.hostname}).`);
        return null;
      }
      return target;
    } catch (e) {
      alert("Please enter a valid URL or page path.");
      return null;
    }
  };

  // Add a new specific page URL to the crawler
  const handleAddPage = async () => {
    const resolvedUrl = resolveAndValidateUrl(websiteUrl);
    if (!resolvedUrl) return;

    setUploading(true);
    setUploadProgress("Ingesting website page content...");

    try {
      const res = await fetch("/api/admin/process-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: resolvedUrl })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process website page URL");
      }

      const data = await res.json();
      const capWarning = data.wasCapped ? ` (capped to first ${data.limit} pages)` : "";
      setUploadProgress(`Successfully synced ${data.successCount} of ${data.totalMatched} matched pages${capWarning}!`);
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

  // Manual trigger sync for a single page
  const handleSinglePageSync = async (docId: string, url: string) => {
    setUploading(true);
    setUploadProgress(`Syncing ${url}...`);

    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: docId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync website page");
      }

      setUploadProgress("Sync completed successfully!");
      setTimeout(() => {
        setUploading(false);
        setUploadProgress("");
        fetchDocuments();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert(`Sync failed: ${err.message}`);
      setUploading(false);
      setUploadProgress("");
      fetchDocuments();
    }
  };

  // Manual trigger sync for all pages sequentially
  const handleSyncAllPages = async (syncedPages: any[]) => {
    if (syncedPages.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < syncedPages.length; i++) {
        const page = syncedPages[i];
        setUploadProgress(`Syncing page ${i + 1}/${syncedPages.length}: ${page.storage_path}...`);
        const res = await fetch("/api/admin/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: page.id })
        });
        if (!res.ok) {
          console.error(`Failed to sync page: ${page.storage_path}`);
        }
      }
      setUploadProgress("Successfully synchronized all pages!");
      setTimeout(() => {
        setUploading(false);
        setUploadProgress("");
        fetchDocuments();
      }, 2000);
    } catch (err: any) {
      alert(`Sync All failed: ${err.message}`);
      setUploading(false);
      setUploadProgress("");
      fetchDocuments();
    }
  };

  // Backward compatibility alias
  const handleUrlIngest = handleAddPage;

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

    queryClient.setQueryData<any[]>(['users'], (prev) =>
      prev ? prev.map((u: any) => u.id === userId ? { ...u, role: newRole } : u) : []
    );

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
      <div className="dark min-h-screen bg-[#0c1407] text-white flex items-center justify-center flex-col gap-4 font-sans">
        <RefreshCw className="w-10 h-10 animate-spin text-[#B2EA4D]" />
        <p className="text-slate-300 text-sm tracking-widest animate-pulse">VERIFYING CREDENTIALS...</p>
      </div>
    );
  }

  const isAuthorized = role && role !== "Chatbot User";
  if (!user || !isAuthorized) {
    return (
      <div className="dark min-h-screen bg-[#0c1407] text-white flex items-center justify-center font-sans">
        <Card className="max-w-md w-full bg-[#1b2e11] border-[#B2EA4D]/15 p-8 shadow-2xl rounded-2xl border flex flex-col items-center text-center">
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
            <Button onClick={handleLogin} className="w-full bg-[#B2EA4D] hover:bg-[#B2EA4D] text-slate-950 font-bold h-11 rounded-lg">
              GitHub Sign In
            </Button>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              {!isRealAuth && user?.email?.endsWith("@oogway.com") && (
                <div className="bg-[#0c1407] border border-[#B2EA4D]/15 rounded-xl p-3 text-left w-full">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Simulate Role</label>
                  <CustomSelect
                    value={simulatedRole}
                    onChange={handleSimulatedRoleChange}
                    options={[
                      { value: "Knowledge Admin", label: "Admin" },
                      { value: "Content Editor", label: "Content Editor" },
                      { value: "Reviewer", label: "Reviewer" },
                      { value: "Viewer", label: "Viewer" },
                      { value: "Chatbot User", label: "Chatbot User" }
                    ]}
                    className="w-full h-8 mt-1 border-[#B2EA4D]/15 bg-[#1b2e11] text-[#B2EA4D]"
                  />
                </div>
              )}

              <Button onClick={handleLogout} className="w-full bg-slate-800 hover:bg-[#203210]/80 text-white font-bold h-11 rounded-lg">
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
    <div className="dark min-h-screen bg-[#0c1407] text-slate-100 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#B2EA4D]/15 bg-[#1b2e11] flex flex-col shrink-0 h-screen sticky top-0">
        <div className="p-6 border-b border-[#B2EA4D]/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#B2EA4D]/20 text-[#B2EA4D] flex items-center justify-center font-bold text-lg shadow-sm border border-[#B2EA4D]/30 overflow-hidden shrink-0">
              {autoLogoUrl ? (
                <img 
                  src={autoLogoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-0.5 bg-white"
                  onError={handleLogoError}
                />
              ) : (
                companyName.charAt(0)
              )}
            </div>
            <span className="font-extrabold text-lg text-white truncate max-w-[150px]">
              {companyName}
            </span>
          </div>
        </div>

        {/* User profile card */}
        <div className="p-4 border-b border-[#B2EA4D]/15 flex items-center gap-3">
          {user.user_metadata?.avatar_url && (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full border border-[#B2EA4D]/30" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate font-mono">{user.email}</p>
            {isRealAuth || user?.email === "superadmin@yopmail.com" || (user?.email && !user.email.endsWith("@oogway.com")) ? (
              <span className="text-[9px] font-bold text-[#B2EA4D] bg-[#B2EA4D]/8 border border-[#B2EA4D]/20 px-1.5 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                {user?.email === "superadmin@yopmail.com" ? "Super Admin" : (role === "Knowledge Admin" ? "Admin" : role)}
              </span>
            ) : (
              <div className="mt-1">
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Dev Mode Role</label>
                <CustomSelect
                  value={simulatedRole}
                  onChange={handleSimulatedRoleChange}
                  options={[
                    { value: "Knowledge Admin", label: "Admin" },
                    { value: "Content Editor", label: "Content Editor" },
                    { value: "Reviewer", label: "Reviewer" },
                    { value: "Viewer", label: "Viewer" },
                    { value: "Chatbot User", label: "Chatbot User" }
                  ]}
                  className="w-full h-7 mt-1 block border-[#B2EA4D]/15 bg-[#1b2e11] text-[#B2EA4D] text-[10px] px-2 py-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-custom">
          <button
            onMouseEnter={() => prefetchTab("overview")}
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "overview"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>

          <button
            onMouseEnter={() => prefetchTab("chatbot")}
            onClick={() => setActiveTab("chatbot")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "chatbot"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Bot className="w-4 h-4 text-[#B2EA4D]" />
            Chatbot
          </button>

          <button
            onMouseEnter={() => prefetchTab("knowledge_base")}
            onClick={() => setActiveTab("knowledge_base")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "knowledge_base"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Globe className="w-4 h-4" />
            Knowledge Base
          </button>

          <button
            onMouseEnter={() => prefetchTab("website_sync")}
            onClick={() => setActiveTab("website_sync")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "website_sync"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <RefreshCw className="w-4 h-4" />
            Website Sync
          </button>

          <button
            onMouseEnter={() => prefetchTab("documents")}
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "documents"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <UploadCloud className="w-4 h-4" />
            Documents
          </button>

          <button
            onMouseEnter={() => prefetchTab("conversations")}
            onClick={() => setActiveTab("conversations")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "conversations"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Conversations
          </button>

          <button
            onMouseEnter={() => prefetchTab("analytics")}
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "analytics"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Activity className="w-4 h-4" />
            Analytics
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "team"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Users className="w-4 h-4" />
            Team
          </button>

          {["Super Admin", "Knowledge Admin", "Reviewer"].includes(role || "") && (
            <button
              onClick={() => setActiveTab("audit_logs")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "audit_logs"
                  ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                  : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
                }`}
            >
              <Activity className="w-4 h-4" />
              Audit Logs
            </button>
          )}

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "settings"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        {/* Back to store */}
        <div className="p-4 border-t border-[#B2EA4D]/15 flex flex-col gap-2">
          <a href="/storefront" className="w-full">
            <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 border-[#B2EA4D]/15 text-slate-300 hover:bg-[#203210]/60 hover:text-white text-xs h-9">
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
      <main className="flex-1 overflow-auto flex flex-col bg-[#0c1407]">
        {user?.email === "superadmin@yopmail.com" && typeof window !== "undefined" && localStorage.getItem("oogway_simulated_workspace_id") && (
          <div className="bg-white text-slate-950 text-xs font-bold px-8 py-2 flex items-center justify-between border-b border-amber-600">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Impersonating: <span className="underline">{localStorage.getItem("oogway_simulated_company") || "Client"}</span> (Super Admin Mode)
            </span>
            <button
              onClick={handleExitImpersonation}
              className="bg-[#0c1407] text-white hover:bg-[#1b2e11] px-3 py-1 rounded text-[10px] font-black transition-colors"
            >
              Exit Impersonation
            </button>
          </div>
        )}
        <header className="h-16 border-b border-[#B2EA4D]/15 bg-[#1b2e11]/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
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
              else if (activeTab === "audit_logs") queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
            }} className="h-9 w-9 border-[#B2EA4D]/15 hover:bg-slate-850 text-slate-300 hover:text-white" title="Refresh data">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Onboarding Intercept: If no website connected yet and not settings, show onboarding card */}
          {!website && activeTab !== "settings" ? (
            <Card className="bg-[#1b2e11] border-[#B2EA4D]/15 p-8 text-center max-w-lg mx-auto mt-12 rounded-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#B2EA4D]/8 text-[#B2EA4D] flex items-center justify-center shadow-lg border border-[#B2EA4D]/20">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white">Connect your website</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Before Oogway can assist your customers, it needs to analyze your website. We'll automatically identify products, FAQs, brand colors, and configure your chatbot.
              </p>
              <Button onClick={() => window.location.href = "/setup"} className="bg-[#B2EA4D] hover:bg-[#B2EA4D] text-slate-950 font-bold px-6 h-11 rounded-xl">
                Start Setup Wizard
              </Button>
            </Card>
          ) : (
            <>
              {/* Success Banner */}
              {showSuccessBanner && activeTab === "overview" && (
                <div className="bg-[#B2EA4D]/8 border border-[#B2EA4D]/20 text-[#B2EA4D] p-4 rounded-xl flex items-start gap-3 mb-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="text-xl">🎉</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-emerald-300">Your AI chatbot is ready!</h4>
                    <p className="text-xs text-[#B2EA4D]/90 mt-0.5">
                      Oogway has successfully learned about your business and is ready to answer customer questions using your latest website content.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuccessBanner(false)}
                    className="h-7 text-[#B2EA4D] hover:text-white text-xs hover:bg-[#B2EA4D]/8"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-mac-page">
                  {/* Dynamic Business Branding & Metrics Card */}
                  <Card className="bg-[#1b2e11] border-[#B2EA4D]/15 p-6 rounded-xl relative overflow-hidden group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#1b2e11] border border-[#B2EA4D]/15 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                          {autoLogoUrl ? (
                            <img 
                              src={autoLogoUrl} 
                              alt="Logo" 
                              className="w-full h-full object-contain p-1 bg-white"
                              onError={handleLogoError}
                            />
                          ) : (
                            <span className="text-2xl">{workspaceLogo || "💼"}</span>
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            {companyName}
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-extrabold tracking-widest uppercase border border-slate-700">
                              {industry}
                            </span>
                          </h2>
                          {website && (
                            <a href={website} target="_blank" rel="noreferrer" className="text-xs text-[#B2EA4D] hover:text-[#B2EA4D]/90 flex items-center gap-1 mt-1 transition-colors">
                              {website} <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-left md:text-right shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#B2EA4D]/8 text-[#B2EA4D] border border-[#B2EA4D]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B2EA4D] animate-pulse" />
                          AI Chatbot Ready
                        </span>
                        <p className="text-[10px] text-slate-400 mt-2">Last website sync: {syncTime}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 pt-6 border-t border-[#B2EA4D]/15">
                      <div className="col-span-2 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pages Processed</p>
                        <p className="text-xl font-extrabold text-white mt-1">{stats?.totalChunks ?? pagesCount} pages</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documents Indexed</p>
                        <p className="text-xl font-extrabold text-white mt-1">{stats?.totalDocuments ?? docsCount} docs</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Knowledge Base Status</span>
                        <p className="text-xl font-extrabold text-[#B2EA4D] mt-1">Healthy</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto Sync</span>
                        <p className="text-xl font-extrabold text-slate-300 mt-1">Enabled</p>
                      </div>
                    </div>
                  </Card>

                  {/* System Health */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-[#B2EA4D]/8 text-[#B2EA4D]">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Database connection</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Supabase Postgres Engine</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.database === "healthy" ? "bg-[#B2EA4D] animate-pulse shadow-[0_0_10px_#B2EA4D]" : "bg-rose-500 shadow-[0_0_10px_#ffffff]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.database || "checking..."}</span>
                      </div>
                    </Card>

                    <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-[#B2EA4D]/8 text-[#B2EA4D]">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Gemini LLM & Embeddings</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Google AI Dev Suite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.gemini === "healthy" ? "bg-[#B2EA4D] animate-pulse shadow-[0_0_10px_#B2EA4D]" : "bg-rose-500 shadow-[0_0_10px_#ffffff]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.gemini || "checking..."}</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 2: CHATBOT */}
              {activeTab === "chatbot" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-[#B2EA4D]/15 pb-4">
                    <h3 className="text-lg font-bold text-white">Chatbot Playground</h3>
                    <p className="text-slate-300 text-xs mt-1">Test search queries, verify grounded AI answers, and fine-tune your chatbot responses.</p>
                  </div>
                  {/* Search Sandbox */}
                  <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl relative z-20">
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
                            className="pl-9 bg-[#0c1407] border-[#B2EA4D]/15"
                          />
                        </div>
                      </div>

                      <div className="w-36">
                        <label className="text-xs text-slate-300 font-medium">Top-K Results</label>
                        <CustomSelect
                          value={String(matchCount)}
                          onChange={(val) => setMatchCount(Number(val))}
                          options={[3, 4, 5, 6, 7, 8].map(n => ({ value: String(n), label: String(n) }))}
                          className="mt-1"
                        />
                      </div>

                      <div className="w-44">
                        <label className="text-xs text-slate-300 font-medium">Category</label>
                        <CustomSelect
                          value={filterCategory}
                          onChange={setFilterCategory}
                          options={[
                            { value: "", label: "All Categories" },
                            ...["Sleep", "Feeding", "Diapering", "Skincare", "Play", "Travel", "Bath", "Teething", "general"].map(cat => ({ value: cat, label: cat }))
                          ]}
                          className="mt-1"
                        />
                      </div>

                      <div className="w-44">
                        <label className="text-xs text-slate-300 font-medium">Status</label>
                        <CustomSelect
                          value={searchStatus}
                          onChange={setSearchStatus}
                          options={[
                            { value: "", label: "All Statuses" },
                            { value: "published", label: "Published Only" },
                            { value: "draft", label: "Drafts Only" }
                          ]}
                          className="mt-1"
                        />
                      </div>

                      <Button onClick={runTestSearch} disabled={searching || !testQuery.trim()} className="bg-[#B2EA4D] hover:bg-[#B2EA4D] text-slate-950 font-bold px-8 gap-2">
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
                              <Card key={idx} className="bg-[#1b2e11]/30 border-[#B2EA4D]/15 p-4 rounded-xl flex flex-col gap-2">
                                <div className="flex items-center justify-between border-b border-[#B2EA4D]/15 pb-2">
                                  <span className="text-[10px] font-extrabold text-[#B2EA4D] bg-[#B2EA4D]/8 px-2 py-0.5 border border-[#B2EA4D]/20 rounded">Match #{idx + 1}</span>
                                  <span className="text-xs font-bold font-mono text-[#B2EA4D]">Score: {Math.round(m.similarity * 100)}%</span>
                                </div>
                                <p className="text-xs font-mono text-slate-300 bg-[#0c1407] p-3 rounded leading-relaxed border border-[#B2EA4D]/15">{m.chunk_text}</p>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Grounded Response Preview</h3>
                        <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex flex-col h-[400px]">
                          <ScrollArea className="flex-1">
                            <div className="text-sm text-slate-200 leading-relaxed">{renderMarkdown(searchResults.answer)}</div>
                          </ScrollArea>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Website Integration Snippet */}
                  <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl mt-6 space-y-6">
                    <div className="flex items-center gap-2 border-b border-[#B2EA4D]/15 pb-3">
                      <Code className="w-5 h-5 text-[#B2EA4D]" />
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Embed Chatbot on Your Website</h3>
                        <p className="text-[11px] text-slate-400 font-mono">Follow the step-by-step guide below to integrate the chat widget securely onto your website.</p>
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                      <div className="bg-[#0c1407]/60 p-3 rounded-lg border border-[#B2EA4D]/10 space-y-1.5">
                        <span className="text-[#B2EA4D] font-bold text-[10px] block uppercase tracking-wider">Step 1: Whitelist Domain</span>
                        <div className="text-[10px] text-slate-400 leading-relaxed space-y-1">
                          <p>1. In the left sidebar, click the <strong className="text-white">"Website Sync"</strong> tab.</p>
                          <p>2. Locate the <strong className="text-white">"Connect Website"</strong> card at the top.</p>
                          <p>3. Enter your website domain URL and click the <strong className="text-white">"Connect Website"</strong> button to whitelist it.</p>
                        </div>
                      </div>
                      
                      <div className="bg-[#0c1407]/60 p-3 rounded-lg border border-[#B2EA4D]/10 space-y-1">
                        <span className="text-[#B2EA4D] font-bold text-[10px] block uppercase tracking-wider">Step 2: Copy Embed Code</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Click the <strong className="text-white">Copy Code</strong> button in the editor box below to copy the combined HTML/CSS integration script with cryptographic SRI protection.
                        </p>
                      </div>

                      <div className="bg-[#0c1407]/60 p-3 rounded-lg border border-[#B2EA4D]/10 space-y-1">
                        <span className="text-[#B2EA4D] font-bold text-[10px] block uppercase tracking-wider">Step 3: Paste to Website</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Paste the copied snippet inside the <code className="bg-[#1b2e11] px-1 rounded text-white">&lt;head&gt;</code> or <code className="bg-[#1b2e11] px-1 rounded text-white">&lt;body&gt;</code> tag of your website. The widget will instantly render in the bottom-right corner.
                        </p>
                      </div>
                    </div>

                    {/* Unified Copy-Paste Snippet Box */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block font-mono">Combined HTML & CSS Embed Code</label>
                      <div className="relative">
                        <pre className="bg-[#0c1407] border border-[#B2EA4D]/15 p-4 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed select-all max-h-64 scrollbar-custom">
{`<!-- Start Oogway Chatbot Integration -->
<style>
  #oogway-chatbot-iframe {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    border: none !important;
    z-index: 2147483647 !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    background-color: transparent !important;
  }
</style>
<script
  src="https://oogway-chatbot-chakadola.vercel.app/embed.js"
  data-workspace-id="${workspaceId}"
  data-brand-color="#B2EA4D"
  defer>
</script>
<!-- End Oogway Chatbot Integration -->`}
                        </pre>
                        <Button
                          onClick={() => {
                            const snippet = `<!-- Start Oogway Chatbot Integration -->
<style>
  #oogway-chatbot-iframe {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    border: none !important;
    z-index: 2147483647 !important;
    max-width: 100vw !important;
    max-height: 100vh !important;
    background-color: transparent !important;
  }
</style>
<script
  src="https://oogway-chatbot-chakadola.vercel.app/embed.js"
  data-workspace-id="${workspaceId}"
  data-brand-color="#B2EA4D"
  defer>
</script>
<!-- End Oogway Chatbot Integration -->`;
                            navigator.clipboard.writeText(snippet);
                            alert("Unified chatbot embed code copied to clipboard!");
                          }}
                          className="absolute right-3 top-3 h-7 bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950 font-bold text-[9px] px-3.5 rounded"
                        >
                          Copy Code
                        </Button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 flex flex-col gap-2 bg-[#1b2e11]/30 p-4 rounded-lg border border-[#B2EA4D]/15 font-mono">
                      <div className="flex items-start gap-2 border-t border-[#B2EA4D]/15 pt-2 text-[10px] text-[#B2EA4D] font-mono">
                        <span className="shrink-0 text-amber-400">🔒</span>
                        <div>
                          <strong>Multi-Tenant Data Isolation & Security:</strong>
                          <ul className="list-disc list-inside space-y-1 mt-1 text-[9px] text-slate-400">
                            <li><strong>Isolation Constraint:</strong> Every company workspace is fully logic-segregated. Queries are processed strictly within your own vector embedding partition.</li>
                            
                            <li><strong>CORS Policy:</strong> External embeds are blocked unless authorized. Go to website settings to configure permitted origins.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* TAB 3: KNOWLEDGE BASE */}
              {activeTab === "knowledge_base" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-[#B2EA4D]/15 pb-4">
                    <h3 className="text-lg font-bold text-white">Knowledge Universe</h3>
                    <p className="text-slate-300 text-xs mt-1">3D interactive vector cluster visualization of your database chunks.</p>
                  </div>
                  <KnowledgeUniverse />
                </div>
              )}

              {/* TAB 4: WEBSITE SYNC */}
              {activeTab === "website_sync" && (() => {
                const syncedPages = documents.filter((doc: any) => doc.mime_type === "text/html");
                return (
                  <div className="space-y-6 animate-mac-page">
                    <div className="border-b border-[#B2EA4D]/15 pb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">Website Sync Engine</h3>
                        <p className="text-slate-300 text-xs mt-1">Configure automated crawling and manually trigger sync tasks for specific pages.</p>
                      </div>
                      {syncedPages.length > 0 && (
                        <Button
                          onClick={() => handleSyncAllPages(syncedPages)}
                          disabled={uploading}
                          className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950 font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-2"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${uploading ? 'animate-spin' : ''}`} />
                          Sync All Pages
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left Column: Sync settings & Add Specific Page */}
                      <div className="lg:col-span-1 space-y-6">
                        {/* Whitelisted Domain Overview */}
                        <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl border flex flex-col gap-4">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Whitelisted Base Domain</span>
                            <span className="text-white text-sm font-bold block truncate mt-1 bg-[#0c1407] px-3 py-2 rounded border border-[#B2EA4D]/10">
                              {website || "Not configured"}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                              Configure this under <strong className="text-slate-300">Settings</strong> to authorize the chatbot widget and anchor specific page paths.
                            </p>
                          </div>

                          <div className="border-t border-[#B2EA4D]/15 pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-semibold">Periodic Auto Sync</span>
                              <span className="bg-[#B2EA4D]/10 text-[#B2EA4D] border border-[#B2EA4D]/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-semibold">Interval</span>
                              <span className="text-slate-300 text-xs font-mono font-semibold">Weekly</span>
                            </div>
                          </div>
                        </Card>

                        {/* Add Specific Page Form */}
                        <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl border flex flex-col gap-4">
                          <div>
                            <h4 className="text-white font-bold text-sm">Add Specific Pages</h4>
                            <p className="text-slate-400 text-[10px] mt-0.5">Scrape specific paths, multiple pages, or wildcard patterns from your whitelisted domain.</p>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Page Paths, URLs, or Wildcards</label>
                              <Input
                                type="text"
                                placeholder="e.g. /about, /faq, /blog/* (comma or newline separated)"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                disabled={uploading}
                                className="mt-1 bg-[#0c1407] border-[#B2EA4D]/15 text-xs h-9"
                              />
                            </div>

                            {uploading ? (
                              <div className="flex flex-col items-center justify-center text-center gap-2 py-3 border border-[#B2EA4D]/15 rounded-xl bg-[#0c1407]/40 min-h-[60px]">
                                <RefreshCw className="w-5 h-5 text-[#B2EA4D] animate-spin" />
                                <span className="text-slate-300 text-[10px] animate-pulse font-mono">{uploadProgress}</span>
                              </div>
                            ) : (
                              <Button
                                onClick={handleAddPage}
                                disabled={uploading || !websiteUrl.trim()}
                                className="w-full bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950 font-bold h-9 rounded-lg text-xs"
                              >
                                Crawl & Index Pages
                              </Button>
                            )}
                          </div>
                        </Card>
                      </div>

                      {/* Right Column: Synced Pages List */}
                      <div className="lg:col-span-2 space-y-4">
                        <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl border">
                          <div className="border-b border-[#B2EA4D]/15 pb-3 flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Configured Specific Pages</h4>
                            <span className="bg-[#B2EA4D]/15 text-[#B2EA4D] border border-[#B2EA4D]/25 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono">
                              {syncedPages.length} Pages
                            </span>
                          </div>

                          {syncedPages.length === 0 ? (
                            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <span className="text-4xl">🌐</span>
                              <div>
                                <p className="text-slate-300 text-xs font-semibold">No specific pages crawled yet</p>
                                <p className="text-slate-400 text-[10px] mt-1 max-w-sm mx-auto">
                                  Use the form on the left to add specific page URLs (e.g. `/refund-policy` or `/about`) from your domain to sync.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 scrollbar-custom">
                              {syncedPages.map((page: any) => {
                                let pathText = page.storage_path;
                                try {
                                  const parsed = new URL(page.storage_path);
                                  pathText = parsed.pathname === "/" ? "/" : parsed.pathname + parsed.search;
                                } catch (e) {
                                  // fallback if not a valid url
                                }
                                
                                return (
                                  <div
                                    key={page.id}
                                    className="bg-[#0c1407]/60 border border-[#B2EA4D]/10 rounded-lg p-3 flex items-center justify-between gap-4 hover:border-[#B2EA4D]/25 transition-all"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-xs font-semibold truncate font-mono">{pathText}</span>
                                        <a
                                          href={page.storage_path}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-slate-400 hover:text-[#B2EA4D] transition-colors shrink-0"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                      <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-400 font-mono">
                                        <span className="truncate max-w-[180px]">Full URL: {page.storage_path}</span>
                                        <span>•</span>
                                        <span>Synced: {new Date(page.last_synced_at || page.created_at).toLocaleString()}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Status Tag */}
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                                        page.status === "completed"
                                          ? "bg-green-950/60 text-green-400 border border-green-500/20"
                                          : page.status === "processing"
                                          ? "bg-yellow-950/60 text-yellow-400 border border-yellow-500/20 animate-pulse"
                                          : "bg-red-950/60 text-red-400 border border-red-500/20"
                                      }`}>
                                        {page.status}
                                      </span>

                                      {/* Sync page action */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleSinglePageSync(page.id, page.storage_path)}
                                        disabled={uploading}
                                        className="h-8 w-8 hover:bg-[#B2EA4D]/10 text-slate-300 hover:text-[#B2EA4D] rounded-lg"
                                        title="Sync this page"
                                      >
                                        <RefreshCw className={`w-3.5 h-3.5 ${uploading && uploadProgress.includes(page.storage_path) ? 'animate-spin text-[#B2EA4D]' : ''}`} />
                                      </Button>

                                      {/* Delete page action */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => triggerDeleteDoc(page.id)}
                                        disabled={uploading}
                                        className="h-8 w-8 hover:bg-red-500/10 text-slate-300 hover:text-red-400 rounded-lg"
                                        title="Delete page"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 5: DOCUMENTS */}
              {activeTab === "documents" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-[#B2EA4D]/15 pb-4">
                    <h3 className="text-lg font-bold text-white">Reference Documents</h3>
                    <p className="text-slate-300 text-xs mt-1">Browse, upload, and edit files that form your AI chatbot's knowledge base.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Document Upload & List Column */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl border flex items-center justify-between">
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
                          className="bg-[#B2EA4D] hover:bg-[#B2EA4D] text-slate-950 font-bold px-4 h-9 gap-2 text-xs"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                          {uploading ? "Processing..." : "Upload File"}
                        </Button>
                      </Card>

                      <Card className="bg-[#1b2e11]/50 border-[#B2EA4D]/15 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-[#B2EA4D]/15">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Ingested Reference Materials</h4>
                        </div>
                        <table className="w-full text-left text-xs text-slate-300">
                          <tbody className="divide-y divide-slate-800">
                            {documents.map((doc: any) => (
                              <tr key={doc.id} className="hover:bg-[#1b2e11]/20">
                                <td className="px-4 py-3 font-semibold text-white truncate max-w-xs">{doc.filename}</td>
                                <td className="px-4 py-3 text-slate-300">{formatBytes(doc.file_size)}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${doc.status === "published" ? "bg-[#B2EA4D]/8 text-[#B2EA4D] border-[#B2EA4D]/20" :
                                      doc.status === "draft" ? "bg-slate-550/10 text-slate-400 border-slate-700" :
                                        doc.status === "failed" ? "bg-[#203210]/15 text-[#ffffff] border-rose-500/20" :
                                          "bg-white/10 text-amber-400 border-[#B2EA4D]/20 animate-pulse"
                                    }`}>
                                    {doc.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {doc.status === "draft" && ["Super Admin", "Knowledge Admin", "Reviewer"].includes(role || "") && (
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const res = await fetch("/api/admin/publish-document", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ documentId: doc.id })
                                          });
                                          if (res.ok) {
                                            alert("Document published successfully!");
                                            fetchDocuments();
                                          } else {
                                            const data = await res.json();
                                            alert(`Publish failed: ${data.error}`);
                                          }
                                        } catch (err: any) {
                                          alert(`Publish error: ${err.message}`);
                                        }
                                      }}
                                      className="h-7 bg-[#B2EA4D] hover:bg-[#B2EA4D] text-[#203210] text-slate-950 text-[10px] px-2.5 font-black rounded mr-2"
                                    >
                                      Publish
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => fetchChunksForDoc(doc)} className="h-7 text-[#B2EA4D] hover:bg-[#B2EA4D]/8 text-[10px] px-2.5">
                                    Explore Chunks
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => triggerDeleteDoc(doc.id)} className="h-7 text-rose-400 hover:bg-[#203210]/15 text-[10px] px-2.5 ml-2">
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
                    <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 rounded-xl overflow-hidden flex flex-col h-[500px]">
                      <div className="p-4 border-b border-[#B2EA4D]/15">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          {selectedDoc ? `Chunks: ${selectedDoc.filename}` : "Select a document to browse chunks"}
                        </h3>
                      </div>
                      <ScrollArea className="flex-1 p-4 space-y-4">
                        {loadingChunks ? (
                          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#B2EA4D]" /></div>
                        ) : chunks.length === 0 ? (
                          <p className="text-slate-400 text-center py-20 text-xs">No chunks loaded. Select a document on the left.</p>
                        ) : (
                          chunks.map((chunk: any) => (
                            <div key={chunk.id} className="bg-[#0c1407] border border-[#B2EA4D]/15 p-3 rounded-lg space-y-2">
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
                  <div className="border-b border-[#B2EA4D]/15 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">Customer Conversations</h3>
                      <p className="text-slate-300 text-xs mt-1">Real-time transcripts of RAG customer interactions and grounded AI replies.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Conversations Table */}
                    <div className="lg:col-span-2">
                      <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-[#1b2e11] text-slate-300 text-xs font-semibold uppercase border-b border-[#B2EA4D]/15">
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
                                logs.map((log: any) => (
                                  <tr
                                    key={log.id}
                                    onClick={() => setSelectedConversation(log)}
                                    className={`hover:bg-[#1b2e11]/40 cursor-pointer align-middle transition-colors ${selectedConversation?.id === log.id ? "bg-[#B2EA4D]/5 border-l-2 border-[#B2EA4D]" : ""
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
                                        className="h-7 text-[#B2EA4D] hover:bg-[#B2EA4D]/8 text-[10px] px-2.5 font-bold"
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
                      <Card className="bg-[#1b2e11]/50 border-[#B2EA4D]/15 rounded-xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-[#B2EA4D]/15 bg-[#1b2e11]/70 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Transcript Viewer
                          </h4>
                          {selectedConversation && (
                            <span className="text-[9px] font-mono text-[#B2EA4D] bg-[#B2EA4D]/8 px-2 py-0.5 border border-[#B2EA4D]/20 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <ScrollArea className="flex-1 p-4 bg-[#0c1407]/20">
                          {!selectedConversation ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-slate-400 text-xs">
                              <Bot className="w-8 h-8 text-slate-700 mb-2" />
                              Select a conversation row to view the full chat transcript.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="text-[10px] text-slate-400 text-center font-mono border-b border-[#B2EA4D]/15 pb-2">
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
                                <span className="text-[9px] font-bold text-[#B2EA4D] uppercase tracking-widest block font-mono">Grounded AI Response</span>
                                <div className="bg-[#1b2e11]/40 border border-[#B2EA4D]/15 text-xs text-slate-200 p-3 rounded-2xl rounded-tr-none leading-relaxed">
                                  {renderMarkdown(selectedConversation.details?.answer)}
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
                  <div className="border-b border-[#B2EA4D]/15 pb-4">
                    <h3 className="text-lg font-bold text-white">System Analytics</h3>
                    <p className="text-slate-300 text-xs mt-1">Health metrics, database capacities, and AI request statistics.</p>
                  </div>

                  {/* System Health */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-[#B2EA4D]/8 text-[#B2EA4D]">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Database connection</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Supabase Postgres Engine</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.database === "healthy" ? "bg-[#B2EA4D] animate-pulse shadow-[0_0_10px_#B2EA4D]" : "bg-rose-500 shadow-[0_0_10px_#ffffff]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.database || "checking..."}</span>
                      </div>
                    </Card>

                    <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-[#B2EA4D]/8 text-[#B2EA4D]">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300">Gemini LLM & Embeddings</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Google AI Dev Suite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${health?.gemini === "healthy" ? "bg-[#B2EA4D] animate-pulse shadow-[0_0_10px_#B2EA4D]" : "bg-rose-500 shadow-[0_0_10px_#ffffff]"}`} />
                        <span className="text-sm font-bold capitalize text-white">{health?.gemini || "checking..."}</span>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* TAB 8: TEAM */}
              {activeTab === "team" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-[#B2EA4D]/15 pb-4">
                    <h3 className="text-lg font-bold text-white">Team Management</h3>
                    <p className="text-slate-300 text-xs mt-1">Manage platform roles, access control levels, and invite team members.</p>
                  </div>

                  {/* Invite Form */}
                  <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 p-6 rounded-xl border shadow-2xl relative z-20">
                    <div className="flex items-center gap-2 border-b border-[#B2EA4D]/15 pb-3 mb-4">
                      <Users className="w-5 h-5 text-[#B2EA4D]" />
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
                          className="bg-[#0c1407] border-[#B2EA4D]/15 text-xs h-10"
                        />
                      </div>

                      <div className="w-52">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1.5 font-mono">Initial Access Role</label>
                        <CustomSelect
                          value={newUserRole}
                          onChange={setNewUserRole}
                          options={["Knowledge Admin", "Content Editor", "Reviewer", "Viewer", "Chatbot User"].map(r => ({ value: r, label: r }))}
                          className="w-full h-10"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={invitingUser || !newUserEmail.trim()}
                        className="bg-[#B2EA4D] hover:bg-[#B2EA4D] text-slate-950 font-bold px-6 h-10 gap-2 text-xs"
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
                      <Button size="icon" variant="outline" onClick={fetchUsers} disabled={loadingUsers} className="h-9 w-9 bg-[#1b2e11] border-[#B2EA4D]/15 text-slate-300 hover:text-white">
                        <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
                      </Button>
                    </div>

                    {loadingUsers ? (
                      <div className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#B2EA4D] mx-auto" />
                        <span className="text-slate-400 text-xs mt-3 block font-mono">Synchronizing RBAC Board...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[
                          {
                            title: "Administrators",
                            roles: ["Knowledge Admin"],
                            color: "border-rose-500/20 bg-[#203210]/10",
                            badge: "bg-[#203210]/15 text-rose-400 border border-rose-500/20"
                          },
                          {
                            title: "Content & Operations",
                            roles: ["Content Editor", "Reviewer"],
                            color: "border-indigo-500/20 bg-[#B2EA4D]/5",
                            badge: "bg-[#FFFFFF]/10 text-[#FFFFFF] border border-indigo-500/20"
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
                            <div className="p-4 border-b border-[#B2EA4D]/15 bg-[#1b2e11]/60 flex items-center justify-between">
                              <span className="text-xs font-bold text-white uppercase tracking-wider">{col.title}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                {usersList.filter((u: any) => col.roles.includes(u.role || "Viewer")).length} Members
                              </span>
                            </div>

                            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
                              {col.roles.map((roleName: any) => {
                                const isColumnHovered = hoveredColumn === roleName;
                                const roleUsers = usersList.filter((u: any) => (u.role || "Viewer") === roleName);

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
                                    className={`border rounded-lg p-3 transition-all duration-200 min-h-[120px] flex flex-col gap-2 ${isColumnHovered
                                        ? "border-[#B2EA4D] bg-[#B2EA4D]/5 shadow-2xl scale-[1.01]"
                                        : "border-[#B2EA4D]/15 bg-[#0c1407]/40 hover:border-slate-700/80"
                                      }`}
                                  >
                                    <div className="flex items-center justify-between pb-1 border-b border-[#B2EA4D]/15">
                                      <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">{roleName}</span>
                                      <span className="text-[9px] font-mono text-slate-600 font-bold">{roleUsers.length}</span>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                      {roleUsers.length === 0 ? (
                                        <div className="h-full flex items-center justify-center py-6 text-center text-slate-600 text-[10px] font-mono border border-dashed border-[#B2EA4D]/15 rounded bg-[#0c1407]/20">
                                          Drop users here
                                        </div>
                                      ) : (
                                        roleUsers.map((usr: any) => {
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
                                              className={`bg-[#1b2e11] border p-3 rounded-lg shadow-md transition-all flex flex-col gap-2 ${isMe
                                                  ? "border-amber-500/30 cursor-not-allowed bg-[#1b2e11]/40 opacity-90"
                                                  : "border-[#B2EA4D]/15 hover:border-slate-700 cursor-grab active:cursor-grabbing"
                                                }`}
                                            >
                                              <div className="flex items-start gap-2.5">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isMe
                                                    ? "bg-white/10 text-amber-400 border border-[#B2EA4D]/20"
                                                    : roleName.includes("Admin")
                                                      ? "bg-[#203210]/15 text-rose-400 border border-rose-500/20"
                                                      : "bg-slate-800 text-slate-300 border border-slate-700"
                                                  }`}>
                                                  {initials}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                  <p className="text-[11px] font-bold text-white truncate leading-tight flex items-center gap-1">
                                                    {usr.email}
                                                    {isMe && <span className="text-[8px] bg-white/10 text-amber-400 px-1 py-0.2 rounded border border-[#B2EA4D]/20">YOU</span>}
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

              {/* TAB 10: AUDIT LOGS */}
              {activeTab === "audit_logs" && (
                <div className="space-y-6 animate-mac-page">
                  <div className="border-b border-[#B2EA4D]/15 pb-4">
                    <h3 className="text-lg font-bold text-white">System Audit Trail</h3>
                    <p className="text-slate-300 text-xs mt-1">Append-only compliance log recording administrative changes, authentication events, and document tasks.</p>
                  </div>

                  <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-[#1b2e11] text-slate-300 text-xs font-semibold uppercase border-b border-[#B2EA4D]/15">
                          <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {loadingAuditLogs ? (
                            <tr>
                              <td colSpan={3} className="text-center py-20">
                                <Loader2 className="w-6 h-6 animate-spin text-[#B2EA4D] mx-auto" />
                                <span className="text-slate-400 text-[10px] mt-2 block">Loading audit logs...</span>
                              </td>
                            </tr>
                          ) : auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center py-20 text-slate-450 text-center font-mono">
                                No audit events logged.
                              </td>
                            </tr>
                          ) : (
                            auditLogs.map((log: any) => (
                              <tr key={log.id} className="hover:bg-[#1b2e11]/20 align-middle">
                                <td className="px-6 py-4 text-slate-400 font-mono text-[10px]">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-bold text-white">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold tracking-wider ${log.action.includes("Failed") ? "bg-[#203210]/15 text-rose-400 border border-rose-500/20" :
                                      log.action.includes("Completed") || log.action.includes("Published") ? "bg-[#B2EA4D]/8 text-[#B2EA4D] border border-[#B2EA4D]/20" :
                                        "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-[10px] max-w-lg truncate" title={JSON.stringify(log.details)}>
                                  {JSON.stringify(log.details)}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}
