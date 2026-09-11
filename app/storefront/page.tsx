"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Monitor, Smartphone, ExternalLink, Code, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chatbot } from "@/app/components/Chatbox";

export default function StorefrontPreview() {
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [websiteUrl, setWebsiteUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("oogway_simulated_website");
      if (stored && stored.trim() && stored !== "https://example.com") {
        return stored;
      }
    }
    return "/store";
  });

  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isLoaded, setIsLoaded] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    async function fetchWorkspaceInfo() {
      try {
        let activeWsId: string | undefined = undefined;
        let activeUrl: string | undefined = undefined;
        if (typeof window !== "undefined") {
          const simWs = localStorage.getItem("oogway_simulated_workspace_id");
          const simUrl = localStorage.getItem("oogway_simulated_website");
          if (simWs && simWs !== "00000000-0000-0000-0000-000000000000") activeWsId = simWs;
          if (simUrl && simUrl.trim() && simUrl !== "https://example.com") activeUrl = simUrl;
        }

        const res = await fetch("/api/auth/role");
        if (res.ok) {
          const data = await res.json();
          if (data.workspaceId && !activeWsId && data.workspaceId !== "ffffffff-ffff-ffff-ffff-ffffffffffff") {
            activeWsId = data.workspaceId;
          }
          if (data.workspaceInfo?.website_url && !activeUrl) {
            activeUrl = data.workspaceInfo.website_url;
          }
        }

        if (activeWsId) setWorkspaceId(activeWsId);
        if (activeUrl) setWebsiteUrl(activeUrl);
      } catch (err) {
        console.error("Failed to fetch workspace info for storefront:", err);
      }
    }
    fetchWorkspaceInfo();
  }, []);

  const iframeSrc = websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://")
    ? `/api/proxy?url=${encodeURIComponent(websiteUrl)}`
    : websiteUrl;

  useEffect(() => {
    setIsLoaded(false);
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [iframeSrc]);

  const handleCopyScript = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://oogway.ai";
    const script = `<script src="${origin}/embed.js" data-workspace-id="${workspaceId || "active-workspace"}"></script>`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden font-sans">
      {/* Top Control Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <a href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2 h-9 px-3 rounded-lg transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </a>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="text-sm text-slate-400 hidden md:flex items-center gap-2">
            Previewing:
            <span className="text-white font-medium bg-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono text-xs border border-slate-700/50">
              {websiteUrl}
              <a href={websiteUrl.startsWith("http") ? websiteUrl : `${typeof window !== "undefined" ? window.location.origin : ""}${websiteUrl}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#B2EA4D] transition-colors" title="Open in new tab">
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Get Embed Code Button */}
          <Button
            onClick={handleCopyScript}
            variant="outline"
            size="sm"
            className="h-9 border-lime-500/40 bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 text-xs font-bold gap-2 px-3.5 rounded-lg flex items-center cursor-pointer shadow-sm shadow-lime-500/10 transition-all"
          >
            {copiedScript ? <Check className="w-4 h-4 text-lime-400" /> : <Code className="w-4 h-4 text-lime-400" />}
            <span>{copiedScript ? "Copied Embed Code!" : "Get Embed Code"}</span>
          </Button>

          {/* Device Controls */}
          <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setDevice("desktop")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${device === "desktop" ? "bg-slate-800 text-[#B2EA4D] shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${device === "mobile" ? "bg-slate-800 text-[#B2EA4D] shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 w-full bg-slate-950 relative flex items-center justify-center overflow-hidden p-0 sm:p-4 md:p-8">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-10 text-white">
            <div className="w-8 h-8 rounded-full border-2 border-[#B2EA4D] border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-slate-400 animate-pulse">Connecting to website preview...</p>
          </div>
        )}

        <div
          className={`relative bg-white rounded-none sm:rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 transition-all duration-500 ${
            device === "mobile" ? "w-[375px] h-[812px]" : "w-full h-full"
          }`}
        >
          <iframe
            src={iframeSrc}
            onLoad={() => setIsLoaded(true)}
            className="absolute inset-0 w-full h-full border-none bg-white"
            title="Storefront Preview"
          />
          {/* Constrain Chatbot inside the preview container with the workspace ID */}
          <Chatbot positionStrategy="absolute" isMobilePreview={device === "mobile"} embeddedWorkspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
