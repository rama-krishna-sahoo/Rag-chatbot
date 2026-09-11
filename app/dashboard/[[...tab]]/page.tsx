// app/dashboard/[[...tab]]/page.tsx

"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  Code,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import dynamic from "next/dynamic";
import { SettingsTab } from "./SettingsTab";
import { TicketsTab } from "./TicketsTab";

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

type ActiveTab = "overview" | "chatbot" | "knowledge_base" | "website_sync" | "documents" | "conversations" | "tickets" | "analytics" | "team" | "settings" | "audit_logs";

export default function WorkspaceDashboard() {
  const params = useParams();
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
    "tickets": "tickets",
    "analytics": "analytics",
    "team": "team",
    "settings": "settings",
    "audit-logs": "audit_logs"
  };

  // Reverse map: internal tab -> URL segment
  const reverseTabMap: Record<string, string> = {};
  for (const [urlSeg, internalTab] of Object.entries(activeTabMap)) {
    reverseTabMap[internalTab] = urlSeg;
  }

  // Use local state for activeTab so switching is instant (no Next.js navigation)
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    return activeTabMap[tabSegment] || "overview";
  });

  const setActiveTab = (newTab: string) => {
    const tab = (newTab as ActiveTab) || "overview";
    setActiveTabState(tab);
    const urlSegment = reverseTabMap[tab] || newTab;
    window.history.pushState(null, "", `/dashboard/${urlSegment}`);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace("/dashboard/", "").replace("/dashboard", "");
      const seg = path.split("/")[0] || "overview";
      setActiveTabState(activeTabMap[seg] || "overview");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const prefetchTab = (newTab: string) => {
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
    } else if (newTab === "tickets") {
      queryClient.prefetchQuery({
        queryKey: ['support-tickets'],
        queryFn: async () => {
          const res = await fetch("/api/admin/tickets");
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

  const [user, setUser] = useState<any>(() => {
    // Initialize from cached auth data so dashboard renders instantly on refresh
    if (typeof window !== "undefined") {
      const cachedEmail = localStorage.getItem("oogway_cached_user_email");
      const cachedRole = localStorage.getItem("oogway_simulated_role") || "Knowledge Admin";
      if (cachedEmail) {
        return { id: "cached", email: cachedEmail, user_metadata: {} };
      }
    }
    return null;
  });
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
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeOtp, setActiveOtp] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("oogway_active_otp");
      if (stored && stored.length === 6) return stored;
    }
    return "";
  });
  const [generatingOtp, setGeneratingOtp] = useState<boolean>(false);

  const fetchOrGenerateOtp = async (forceNew = false) => {
    try {
      setGeneratingOtp(true);
      const res = await fetch("/api/chatbot/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          forceNew,
          workspaceId,
          companyName,
          industry
        })
      });
      const data = await res.json();
      if (data.otp) {
        setActiveOtp(data.otp);
        if (typeof window !== "undefined") {
          localStorage.setItem("oogway_active_otp", data.otp);
        }
      }
    } catch (e) {
      console.warn("Failed to generate OTP:", e);
    } finally {
      setGeneratingOtp(false);
    }
  };

  useEffect(() => {
    if (activeTab === "chatbot") {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("oogway_active_otp");
        if (stored && stored.length === 6) {
          setActiveOtp(stored);
          return;
        }
      }
      fetchOrGenerateOtp(false);
    }
  }, [activeTab, workspaceId]);
  const [industry, setIndustry] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("oogway_simulated_industry") || "E-commerce";
    return "E-commerce";
  });
  const [companyName, setCompanyName] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("oogway_simulated_company") || "Oogway";
    return "Oogway";
  });
  const [website, setWebsite] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("oogway_simulated_website") || "";
    return "";
  });
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

  // 15-Day Free Trial & Subscription / Branding Upgrade State (₹2,999/mo & ₹540)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);
  const [subscriptionModalTab, setSubscriptionModalTab] = useState<"pro" | "branding">("pro");
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<boolean>(false);
  const [subscribing, setSubscribing] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [isProSubscribed, setIsProSubscribed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("oogway_pro_active") === "true";
    }
    return false;
  });

  const openSubscriptionModal = (tab: "pro" | "branding" = "pro") => {
    setSubscriptionModalTab(tab);
    setCheckoutError(null);
    setShowSubscriptionModal(true);
  };

  const handleStripeCheckout = async (type: "pro" | "branding") => {
    try {
      setSubscribing(true);
      setCheckoutError(null);

      const payload = type === "pro"
        ? {
            plan: "pro_monthly",
            successUrl: `${window.location.origin}/dashboard/overview?payment=success&type=pro`,
            cancelUrl: `${window.location.origin}/dashboard/overview?payment=cancelled`
          }
        : {
            amount: 540,
            currency: "inr",
            successUrl: `${window.location.origin}/dashboard/settings?payment=success&type=branding`,
            cancelUrl: `${window.location.origin}/dashboard/settings?payment=cancelled`
          };

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setSubscribing(false);
        setCheckoutError(data.error || "Failed to initiate Stripe checkout session.");
      }
    } catch (err: any) {
      setSubscribing(false);
      setCheckoutError("Failed to initiate checkout. Please try again.");
    }
  };

  const trialDurationDays = 15;
  const trialDaysRemaining = useMemo(() => {
    if (typeof window === "undefined") return 15;
    const stored = localStorage.getItem("oogway_trial_start_time");
    let startTime = stored ? Number(stored) : null;
    if (!startTime || isNaN(startTime)) {
      startTime = Date.now();
      localStorage.setItem("oogway_trial_start_time", startTime.toString());
    }
    const elapsed = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, trialDurationDays - elapsed);
  }, []);
  const isTrialExpired = trialDaysRemaining <= 0;

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
        if (typeof window !== "undefined" && authRoleData.user.email) {
          localStorage.setItem("oogway_cached_user_email", authRoleData.user.email);
        }
      } else if (authRoleData.email) {
        setUser({ id: "real-user", email: authRoleData.email } as any);
        if (typeof window !== "undefined") {
          localStorage.setItem("oogway_cached_user_email", authRoleData.email);
        }
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

        // For real authenticated users, populate workspace details into localStorage
        if (!authRoleData.isSimulated) {
          localStorage.setItem("oogway_onboarded", "true");
          if (authRoleData.workspaceInfo) {
            localStorage.setItem("oogway_simulated_company", authRoleData.workspaceInfo.name || "Oogway");
            localStorage.setItem("oogway_simulated_website", authRoleData.workspaceInfo.website_url || "");
            localStorage.setItem("oogway_simulated_industry", authRoleData.workspaceInfo.industry || "AI Company");
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
      const paymentStatus = params.get("payment");
      const paymentType = params.get("type");

      if (paymentStatus === "success" || params.get("success") === "true") {
        setShowSuccessBanner(true);
        if (paymentType === "branding") {
          localStorage.setItem("oogway_premium_unlocked", "true");
        } else {
          localStorage.setItem("oogway_trial_start_time", Date.now().toString());
          localStorage.setItem("oogway_pro_active", "true");
          setIsProSubscribed(true);
        }
      }

      // Verify active subscription from server API
      fetch("/api/stripe/subscription")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.subscription?.active) {
            setIsProSubscribed(true);
            localStorage.setItem("oogway_pro_active", "true");
          }
        })
        .catch(() => {});
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, user?.email]);

  // Handle Tab Switch / Background Throttling: Auto-recover auth immediately when user refocuses the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!user || loadingAuth) {
          queryClient.invalidateQueries({ queryKey: ['auth-role'] });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, loadingAuth, queryClient]);

  // Safety Watchdog: If auth takes longer than 4.5s (e.g. background tab throttling), attempt direct recovery
  useEffect(() => {
    if (!loadingAuth) return;
    const watchdogTimer = setTimeout(async () => {
      if (loadingAuth && !user) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            if (typeof window !== "undefined" && session.user.email) {
              localStorage.setItem("oogway_cached_user_email", session.user.email);
            }
            setLoadingAuth(false);
          } else {
            const cached = typeof window !== "undefined" ? localStorage.getItem("oogway_cached_user_email") : null;
            if (cached) {
              setUser({ id: "cached", email: cached, user_metadata: {} });
            }
            setLoadingAuth(false);
          }
        } catch (e) {
          setLoadingAuth(false);
        }
      }
    }, 4500);

    return () => clearTimeout(watchdogTimer);
  }, [loadingAuth, user, supabase]);



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
    enabled: !!user && ["overview", "analytics"].includes(activeTab)
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
    enabled: !!user && activeTab === "audit_logs"
  });

  // States for upload center
  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await fetch("/api/admin/documents");
      return res.ok ? await res.json() : [];
    },
    enabled: !!user && ["documents", "knowledge_base", "website_sync"].includes(activeTab)
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

  // Dynamic categories derived from workspace knowledge base & connected website
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', workspaceId, website],
    queryFn: async () => {
      const param = website ? `?website=${encodeURIComponent(website)}` : "";
      const res = await fetch(`/api/admin/categories${param}`);
      return res.ok ? await res.json() : { categories: [] };
    },
    enabled: !!user
  });
  const dynamicCategories: string[] = categoriesData?.categories || [];

  // States for users & roles
  const { data: usersList = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      return res.ok ? await res.json() : [];
    },
    enabled: !!user && activeTab === "team"
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
    enabled: !!user && activeTab === "conversations"
  });
  const [selectedConversation, setSelectedConversation] = useState<any>(null);

  // States for website scraper
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Helpers to trigger refetch
  const fetchMetricsAndHealth = () => queryClient.invalidateQueries({ queryKey: ['metrics'] });
  const fetchDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };
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
    localStorage.removeItem("oogway_cached_user_email");
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

  // Only redirect to login if auth verification is COMPLETE and user is not found
  if (!loadingAuth && !user && !authRoleData?.isSimulated) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("oogway_cached_user_email");
      window.location.href = "/login";
    }
    return (
      <div className="dark min-h-screen bg-[#050B06] text-white flex items-center justify-center flex-col gap-4 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-lime-400" />
        <p className="text-gray-400 text-sm tracking-wider">Redirecting to login...</p>
      </div>
    );
  }

  // 15-Day Free Trial Expired Guard
  if (isTrialExpired && !isSuperAdmin && !isProSubscribed) {
    return (
      <div className="dark min-h-screen bg-[#050B06] text-white flex items-center justify-center p-4 font-sans selection:bg-lime-500/30 selection:text-lime-200 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-lime-900/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-900/20 blur-[120px]" />
        </div>

        <div className="w-full max-w-lg relative z-10 text-center">
          {/* Brand Header */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <Image 
              src="/images/oogway_turtle_logo.png" 
              alt="Oogway Turtle Logo" 
              width={46} 
              height={46} 
              className="object-contain drop-shadow-[0_0_16px_rgba(163,230,53,0.3)]"
            />
            <Image 
              src="/images/oogway_text_logo.png" 
              alt="Oogway Text Logo" 
              width={115} 
              height={30} 
              className="object-contain brightness-0 invert opacity-95"
            />
          </div>

          <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/80 backdrop-blur-xl rounded-2xl text-left space-y-6">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block">
                15-Day Free Trial Concluded
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Upgrade to Continue
              </h1>
              <p className="text-gray-300 text-sm leading-relaxed">
                Your 15-day free trial has expired. Subscribe to the monthly Pro plan to keep your AI chatbot online and serving customers.
              </p>
            </div>

            {/* Plan pricing card */}
            <div className="p-5 rounded-xl bg-[#162319] border border-lime-500/30 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg">Pro Monthly Plan</h3>
                  <p className="text-xs text-gray-400">Complete AI Customer Service</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-lime-400">₹2,999</span>
                  <span className="text-xs text-gray-400"> / month</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-gray-300 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>24/7 Autonomous AI Chatbot responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Up to 500 Knowledge Base pages indexed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Unlimited documents & auto weekly sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                  <span>Real-time conversation logs & analytics</span>
                </div>
              </div>

              <Button
                onClick={() => openSubscriptionModal("pro")}
                className="w-full h-11 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all cursor-pointer"
              >
                Subscribe for ₹2,999 / mo
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <Link href="/contact" className="text-gray-400 hover:text-white underline underline-offset-2">
                Need a custom plan? Contact sales
              </Link>
              <button onClick={handleLogout} className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer">
                Log Out
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dark h-screen w-full overflow-hidden bg-[#0c1407] text-slate-100 flex font-sans antialiased relative">
      {/* Subtle auth verification bar - shows only while verifying, no blocking */}
      {loadingAuth && (
        <div className="absolute top-0 left-0 right-0 z-50 h-0.5 bg-[#0c1407] overflow-hidden">
          <div className="h-full bg-[#B2EA4D] animate-pulse" style={{ width: '60%', animation: 'authSlide 1.5s ease-in-out infinite' }} />
          <style>{`@keyframes authSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
        </div>
      )}
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-[#B2EA4D]/15 bg-[#1b2e11] flex flex-col shrink-0 h-full select-none">
        <div className="px-4 py-3 border-b border-[#B2EA4D]/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div suppressHydrationWarning className="w-7 h-7 rounded-lg bg-[#B2EA4D]/20 text-[#B2EA4D] flex items-center justify-center font-bold text-base shadow-sm border border-[#B2EA4D]/30 overflow-hidden shrink-0">
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
            <span suppressHydrationWarning className="font-extrabold text-base text-white truncate max-w-[150px]">
              {companyName}
            </span>
          </div>
        </div>

        {/* User profile card */}
        <div suppressHydrationWarning className="px-3.5 py-2 border-b border-[#B2EA4D]/15 flex items-center gap-2.5 shrink-0">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-7 h-7 rounded-full border border-[#B2EA4D]/30 shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#B2EA4D]/10 border border-[#B2EA4D]/25 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#B2EA4D]">
                {(user?.email || "U").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {user?.email ? (
              <p suppressHydrationWarning className="text-[11px] font-semibold text-white truncate font-mono leading-tight">{user.email}</p>
            ) : (
              <div className="flex items-center justify-between">
                <span suppressHydrationWarning className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#B2EA4D]" />
                  Verifying...
                </span>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['auth-role'] })}
                  className="text-[9px] text-[#B2EA4D] hover:underline cursor-pointer"
                  title="Click to retry authentication"
                >
                  Retry
                </button>
              </div>
            )}
            <span suppressHydrationWarning className="text-[8px] font-bold text-[#B2EA4D] bg-[#B2EA4D]/8 border border-[#B2EA4D]/20 px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 inline-block">
              {user?.email === "superadmin@yopmail.com" ? "Super Admin" : (role === "Knowledge Admin" ? "Admin" : (role || "Admin"))}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5 scrollbar-custom">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("overview")}
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "overview"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            Overview
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("chatbot")}
            onClick={() => setActiveTab("chatbot")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "chatbot"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Bot className="w-3.5 h-3.5 text-[#B2EA4D] shrink-0" />
            Chatbot
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("knowledge_base")}
            onClick={() => setActiveTab("knowledge_base")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "knowledge_base"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            Knowledge Base
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("website_sync")}
            onClick={() => setActiveTab("website_sync")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "website_sync"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            Website Sync
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("documents")}
            onClick={() => setActiveTab("documents")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "documents"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <UploadCloud className="w-3.5 h-3.5 shrink-0" />
            Documents
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("conversations")}
            onClick={() => setActiveTab("conversations")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "conversations"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            Conversations
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("tickets")}
            onClick={() => setActiveTab("tickets")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "tickets"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
            Support Tickets
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => prefetchTab("analytics")}
            onClick={() => setActiveTab("analytics")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "analytics"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            Analytics
          </button>

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("team")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "team"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            Team
          </button>

          {["Super Admin", "Knowledge Admin", "Reviewer"].includes(role || "") && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveTab("audit_logs")}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "audit_logs"
                  ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                  : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
                }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              Audit Logs
            </button>
          )}

          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === "settings"
                ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-l-2 border-[#B2EA4D]"
                : "text-slate-300 hover:bg-[#203210]/60 hover:text-slate-200"
              }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            Settings
          </button>
        </nav>

        {/* 15-Day Free Trial Progress Card (Hidden when subscribed to Pro) */}
        {!isProSubscribed && (
          <div className="mx-2.5 my-1.5 p-2 rounded-xl bg-[#111A13]/90 border border-[#B2EA4D]/25 text-xs space-y-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-[10px] uppercase tracking-wider">Free Trial</span>
              <span suppressHydrationWarning className="text-[#B2EA4D] font-mono font-bold text-[10px]">{trialDaysRemaining}d left</span>
            </div>
            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
              <div 
                suppressHydrationWarning
                className="h-full bg-gradient-to-r from-lime-400 to-[#B2EA4D] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, ((15 - trialDaysRemaining) / 15) * 100)}%` }}
              />
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => openSubscriptionModal("pro")}
              className="w-full py-1 px-2 text-center text-[10px] font-bold text-[#050B06] bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 rounded-lg transition-all shadow-[0_0_10px_rgba(163,230,53,0.2)] cursor-pointer"
            >
              Upgrade &bull; ₹2,999/mo
            </button>
          </div>
        )}

        {/* Back to store & Logout footer */}
        <div className="p-2.5 border-t border-[#B2EA4D]/15 flex items-center gap-2 shrink-0">
          <a href="/storefront" className="flex-1">
            <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1.5 border-[#B2EA4D]/15 text-slate-300 hover:bg-[#203210]/60 hover:text-white text-xs h-8 px-2">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              Storefront
            </Button>
          </a>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout} 
            title="Log Out"
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs h-8 px-2.5 flex items-center gap-1 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Logout</span>
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
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white capitalize">
              {activeTab === "knowledge_base" ? "Knowledge Base" :
                activeTab === "website_sync" ? "Website Sync" :
                  activeTab} Control
            </h2>
            {/* 15-Day Free Trial / Pro Active Badge */}
            {!isProSubscribed ? (
              <div suppressHydrationWarning className="hidden sm:flex items-center gap-2 bg-lime-500/10 border border-lime-500/25 px-3 py-1 rounded-full text-xs font-medium text-lime-300 shadow-[0_0_15px_rgba(163,230,53,0.1)]">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                <span suppressHydrationWarning>15-Day Free Trial &bull; {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"} left</span>
              </div>
            ) : (
              <div suppressHydrationWarning className="hidden sm:flex items-center gap-2 bg-lime-500/15 border border-lime-500/30 px-3 py-1 rounded-full text-xs font-bold text-lime-300 shadow-[0_0_15px_rgba(163,230,53,0.15)]">
                <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                <span>Pro Plan Active</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isProSubscribed && (
              <Button
                onClick={() => openSubscriptionModal("pro")}
                size="sm"
                className="bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-bold rounded-full px-4 h-8 text-xs shadow-[0_0_15px_rgba(163,230,53,0.25)] transition-all cursor-pointer"
              >
                Upgrade &bull; ₹2,999/mo
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => {
              if (activeTab === "overview" || activeTab === "analytics") fetchMetricsAndHealth();
              else if (activeTab === "knowledge_base" || activeTab === "documents") fetchDocuments();
              else if (activeTab === "team") fetchUsers();
              else if (activeTab === "conversations") fetchLogs();
              else if (activeTab === "audit_logs") queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
              else if (activeTab === "website_sync") queryClient.invalidateQueries({ queryKey: ['categories'] });
              else if (activeTab === "settings") queryClient.invalidateQueries({ queryKey: ['auth-role'] });
            }} className="h-9 w-9 border-[#B2EA4D]/15 hover:bg-slate-850 text-slate-300 hover:text-white" title="Refresh data">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-8">
          {/* Quick Website Connect Banner if on Overview tab and no website connected */}
          {!website && activeTab === "overview" && (
            <Card className="bg-[#1b2e11]/80 border-[#B2EA4D]/25 p-5 mb-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-3.5 text-left">
                <div className="w-10 h-10 rounded-xl bg-[#B2EA4D]/15 text-[#B2EA4D] flex items-center justify-center shrink-0 border border-[#B2EA4D]/25">
                  <Globe className="w-5 h-5 text-lime-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Connect your website for automated AI training</h3>
                  <p className="text-gray-300 text-xs mt-0.5">
                    Sync your website content, products, and FAQs directly into your chatbot knowledge base.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setActiveTab("website_sync")} 
                className="bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-bold text-xs px-5 h-9 rounded-xl shrink-0 cursor-pointer shadow-[0_0_15px_rgba(163,230,53,0.2)]"
              >
                Connect Website
              </Button>
            </Card>
          )}
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

                      <div className="w-48">
                        <label className="text-xs text-slate-300 font-medium">Category</label>
                        <CustomSelect
                          value={filterCategory}
                          onChange={setFilterCategory}
                          options={[
                            { value: "", label: "All Categories" },
                            ...dynamicCategories.map(cat => ({ value: cat, label: cat }))
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
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between bg-[#1b2e11]/60 border border-[#B2EA4D]/20 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#B2EA4D] animate-pulse" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Search & RAG Sandbox Test Results</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchResults(null)}
                          className="h-7 text-slate-400 hover:text-white text-xs gap-1 hover:bg-[#203210]/40 rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Close Results
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Similar Vector Matches</h3>
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

                    {/* Linking & Account Sync OTP Display Card */}
                    <div className="bg-[#0c1407]/80 p-4 rounded-xl border border-[#B2EA4D]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">Linking & Account Sync OTP</span>
                          <span className="bg-[#B2EA4D]/20 text-[#B2EA4D] text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#B2EA4D]/30 font-mono">One-Time Unique</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          When embedding this chatbot on another website, entering this unique 6-digit OTP will sync your actual Account ID and Knowledgebase context.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="bg-[#1b2e11] border border-[#B2EA4D]/40 px-4 py-2 rounded-lg text-[#B2EA4D] font-mono text-lg font-black tracking-widest shadow-inner flex items-center gap-2 select-all">
                          {generatingOtp ? <Loader2 className="w-5 h-5 animate-spin text-[#B2EA4D]" /> : (activeOtp || "A8B9X2")}
                        </div>
                        <Button
                          onClick={() => fetchOrGenerateOtp(true)}
                          disabled={generatingOtp}
                          variant="outline"
                          size="sm"
                          className="border-[#B2EA4D]/30 text-slate-200 hover:bg-[#B2EA4D]/10 hover:text-[#B2EA4D] text-[11px] h-9 font-bold font-mono"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${generatingOtp ? 'animate-spin' : ''}`} />
                          New OTP
                        </Button>
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
  data-otp="${activeOtp || 'A8B9X2'}"
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
  data-otp="${activeOtp || 'A8B9X2'}"
  data-brand-color="#B2EA4D"
  defer>
</script>
<!-- End Oogway Chatbot Integration -->`;
                            navigator.clipboard.writeText(snippet);
                            setCopiedEmbed(true);
                            setTimeout(() => setCopiedEmbed(false), 2000);
                          }}
                          className={`absolute right-3 top-3 h-7 font-bold text-[9px] px-3.5 rounded transition-all duration-300 ${copiedEmbed ? 'bg-emerald-500 text-white scale-105' : 'bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-slate-950'}`}
                        >
                          {copiedEmbed ? '✓ Copied!' : 'Copy Code'}
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
                    <div className={`${selectedDoc ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6 transition-all duration-200`}>
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
                          className="bg-[#B2EA4D] hover:bg-[#B2EA4D] text-slate-950 font-bold px-4 h-9 gap-2 text-xs cursor-pointer shadow-sm"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                          {uploading ? "Processing..." : "Upload File"}
                        </Button>
                      </Card>

                      <Card className="bg-[#1b2e11]/50 border-[#B2EA4D]/15 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-[#B2EA4D]/15 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-widest">Ingested Reference Materials</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{documents.length} File{documents.length !== 1 ? 's' : ''}</span>
                        </div>
                        <table className="w-full text-left text-xs text-slate-300">
                          <tbody className="divide-y divide-slate-800">
                            {documents.map((doc: any) => {
                              const isSelected = selectedDoc?.id === doc.id;
                              return (
                                <tr key={doc.id} className={`transition-colors ${isSelected ? 'bg-[#B2EA4D]/10 border-l-2 border-[#B2EA4D]' : 'hover:bg-[#1b2e11]/20'}`}>
                                  <td className="px-4 py-3 font-semibold text-white truncate max-w-xs">{doc.filename}</td>
                                  <td className="px-4 py-3 text-slate-300 font-mono">{formatBytes(doc.file_size)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
                                      doc.status === "published"
                                        ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border-[#B2EA4D]/30"
                                        : (doc.status === "draft" || doc.status === "completed")
                                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                        : doc.status === "failed"
                                        ? "bg-red-500/15 text-red-400 border-red-500/30"
                                        : "bg-white/10 text-slate-300 border-slate-700 animate-pulse"
                                    }`}>
                                      {doc.status === "completed" ? "draft" : doc.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {(doc.status === "draft" || doc.status === "completed") && (
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
                                              alert("Document published to Production environment!");
                                              fetchDocuments();
                                            } else {
                                              const data = await res.json();
                                              alert(`Publish failed: ${data.error}`);
                                            }
                                          } catch (err: any) {
                                            alert(`Publish error: ${err.message}`);
                                          }
                                        }}
                                        className="h-7 bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#050B06] text-[10px] px-2.5 font-bold rounded mr-2 cursor-pointer shadow-sm"
                                      >
                                        Publish to Live Production
                                      </Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => fetchChunksForDoc(doc)} className={`h-7 text-[10px] px-2.5 cursor-pointer ${isSelected ? 'bg-[#B2EA4D] text-slate-950 font-bold' : 'text-[#B2EA4D] hover:bg-[#B2EA4D]/8'}`}>
                                      {isSelected ? 'Viewing Chunks' : 'Explore Chunks'}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => triggerDeleteDoc(doc.id)} className="h-7 text-rose-400 hover:bg-[#203210]/15 text-[10px] px-2.5 ml-2 cursor-pointer">
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Card>
                    </div>

                    {/* Chunk Explorer Column (Only rendered when a document is selected) */}
                    {selectedDoc && (
                      <Card className="bg-[#1b2e11]/50 backdrop-blur border-[#B2EA4D]/15 rounded-xl overflow-hidden flex flex-col h-[500px] animate-in fade-in duration-200">
                        <div className="p-4 border-b border-[#B2EA4D]/15 flex items-center justify-between bg-[#1b2e11]/80">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate max-w-[200px]" title={selectedDoc.filename}>
                            Chunks: {selectedDoc.filename}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDoc(null)}
                            className="h-7 text-slate-400 hover:text-white text-xs gap-1 hover:bg-[#203210]/40 rounded-lg cursor-pointer shrink-0"
                            title="Close Chunks Explorer"
                          >
                            <X className="w-3.5 h-3.5" /> Close
                          </Button>
                        </div>
                        <ScrollArea className="flex-1 p-4 space-y-4">
                          {loadingChunks ? (
                            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#B2EA4D]" /></div>
                          ) : chunks.length === 0 ? (
                            <p className="text-slate-400 text-center py-20 text-xs">No chunks found for this document.</p>
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
                    )}
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
                    <div className={`${selectedConversation ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all duration-200`}>
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
                                logs.map((log: any) => {
                                  const isSelected = selectedConversation?.id === log.id;
                                  return (
                                    <tr
                                      key={log.id}
                                      onClick={() => setSelectedConversation(log)}
                                      className={`hover:bg-[#1b2e11]/40 cursor-pointer align-middle transition-colors ${isSelected ? "bg-[#B2EA4D]/10 border-l-2 border-[#B2EA4D]" : ""
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
                                          className={`h-7 text-[10px] px-2.5 font-bold cursor-pointer ${isSelected ? 'bg-[#B2EA4D] text-slate-950' : 'text-[#B2EA4D] hover:bg-[#B2EA4D]/8'}`}
                                        >
                                          {isSelected ? 'Viewing' : 'View Transcript'}
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>

                    {/* Chat Bubble Transcript Viewer (Only rendered when a conversation is selected) */}
                    {selectedConversation && (
                      <div className="animate-in fade-in duration-200">
                        <Card className="bg-[#1b2e11]/50 border-[#B2EA4D]/15 rounded-xl overflow-hidden flex flex-col h-[500px]">
                          <div className="p-4 border-b border-[#B2EA4D]/15 bg-[#1b2e11]/70 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                Transcript Viewer
                              </h4>
                              <span className="text-[9px] font-mono text-[#B2EA4D] bg-[#B2EA4D]/8 px-2 py-0.5 border border-[#B2EA4D]/20 rounded">
                                ACTIVE
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedConversation(null)}
                              className="h-7 text-slate-400 hover:text-white text-xs gap-1 hover:bg-[#203210]/40 rounded-lg cursor-pointer"
                              title="Close Transcript Viewer"
                            >
                              <X className="w-3.5 h-3.5" /> Close
                            </Button>
                          </div>

                          <ScrollArea className="flex-1 p-4 bg-[#0c1407]/20">
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
                          </ScrollArea>
                        </Card>
                      </div>
                    )}
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

              {/* TAB: SUPPORT TICKETS & ESCALATIONS */}
              {activeTab === "tickets" && <TicketsTab />}

              {/* TAB 9: SETTINGS */}
              {activeTab === "settings" && (
                <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading settings...</div>}>
                  <SettingsTab setActiveTab={setActiveTab} onOpenUpgradeModal={openSubscriptionModal} />
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
        </div>
      </main>

      {/* 15-Day Trial / Pro Subscription & Custom Branding Upgrade Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="w-full max-w-xl bg-[#111A13] border border-lime-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowSubscriptionModal(false);
                setSubscriptionSuccess(false);
                setCheckoutError(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Brand Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Image
                  src="/images/oogway_turtle_logo.png"
                  alt="Oogway Turtle Logo"
                  width={36}
                  height={36}
                  className="object-contain drop-shadow-[0_0_12px_rgba(163,230,53,0.3)]"
                />
                <Image
                  src="/images/oogway_text_logo.png"
                  alt="Oogway Text Logo"
                  width={90}
                  height={24}
                  className="object-contain brightness-0 invert opacity-95"
                />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Oogway Upgrade Center</h2>
              <p className="text-gray-300 text-xs leading-relaxed">
                Choose between full monthly plan automation or one-time brand customization upgrade.
              </p>
            </div>

            {/* Plan / Upgrade Option Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-[#0c1407] p-1.5 rounded-xl border border-lime-500/20">
              <button
                type="button"
                onClick={() => {
                  setSubscriptionModalTab("pro");
                  setCheckoutError(null);
                }}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  subscriptionModalTab === "pro"
                    ? "bg-gradient-to-r from-lime-400 to-[#B2EA4D] text-[#050B06] shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>⚡ Pro Plan (₹2,999/mo)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubscriptionModalTab("branding");
                  setCheckoutError(null);
                }}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  subscriptionModalTab === "branding"
                    ? "bg-gradient-to-r from-lime-400 to-[#B2EA4D] text-[#050B06] shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🎨 Custom Brand (₹540)</span>
              </button>
            </div>

            {/* Tab 1: Pro Monthly Subscription (₹2,999/month) */}
            {subscriptionModalTab === "pro" && (
              <div className="p-5 rounded-xl bg-[#162319]/80 border border-lime-500/30 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">Monthly Pro Subscription</h3>
                      <span className="bg-lime-500/20 text-lime-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-lime-500/30 uppercase tracking-wider">
                        Recurring
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Cancel anytime &bull; Instant activation</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-lime-400">₹2,999</span>
                    <span className="text-xs text-gray-400"> / month</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-300 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Unlimited 24/7 AI Chatbot customer inquiries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Up to 500 crawled website pages with smart sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Document uploads (PDF, DOCX, TXT) with Gemini embeddings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Visitor conversation history & analytics tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                    <span>Priority WhatsApp & Email customer support</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    disabled={subscribing}
                    onClick={() => handleStripeCheckout("pro")}
                    className="w-full h-11 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all cursor-pointer"
                  >
                    {subscribing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#050B06]" /> Connecting to Stripe...
                      </span>
                    ) : (
                      "Subscribe for ₹2,999 / month"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Tab 2: Brand Name Upgradation (₹540 One-Time) */}
            {subscriptionModalTab === "branding" && (
              <div className="p-5 rounded-xl bg-[#162319]/80 border border-amber-500/30 space-y-4 animate-in fade-in duration-150">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">Brand Name Upgradation</h3>
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-wider">
                        One-Time
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Pay once &bull; Lifetime brand unlock</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-amber-400">₹540</span>
                    <span className="text-xs text-gray-400"> (≈ US$6)</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-300 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Personalize Chatbot Name (replace default name)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Upload your official company logo to the AI chat widget</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Remove "Powered by Oogway" watermark badge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Permanent custom identity across all visitor widgets</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    disabled={subscribing}
                    onClick={() => handleStripeCheckout("branding")}
                    className="w-full h-11 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
                  >
                    {subscribing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> Connecting to Stripe...
                      </span>
                    ) : (
                      "Upgrade Branding for ₹540 (One-Time)"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Error Message Display */}
            {checkoutError && (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                ⚠️ {checkoutError}
              </div>
            )}

            <p className="text-center text-[11px] text-gray-400">
              Secured Stripe Checkout. Invoice and receipt sent instantly to your email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
