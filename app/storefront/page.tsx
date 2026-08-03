"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, Monitor, Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chatbot } from "@/app/components/Chatbox";

export default function StorefrontPreview() {
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchWorkspaceInfo() {
      try {
        const res = await fetch("/api/auth/role");
        if (res.ok) {
          const data = await res.json();
          if (data.workspaceInfo && data.workspaceInfo.website_url) {
            setWebsiteUrl(data.workspaceInfo.website_url);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch workspace info for storefront:", err);
      }
      
      // Fallback to local storage for guests
      const url = typeof window !== "undefined" ? localStorage.getItem("oogway_simulated_website") : null;
      setWebsiteUrl(url || "https://example.com");
    }
    
    fetchWorkspaceInfo();
  }, []);

  if (!websiteUrl) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse flex items-center gap-2 text-sm font-medium">
          <div className="w-4 h-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          Loading Preview Environment...
        </div>
      </div>
    );
  }

  // Use our proxy to strip frame-blocking headers
  const iframeSrc = `/api/proxy?url=${encodeURIComponent(websiteUrl)}`;

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden font-sans">
      {/* Top Control Bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <a href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2 h-9 px-3 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
          </a>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div className="text-sm text-slate-400 hidden md:flex items-center gap-2">
            Previewing: 
            <span className="text-white font-medium bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1.5">
              {websiteUrl}
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 transition-colors">
                <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 border border-slate-800">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 rounded-md transition-all ${device === "desktop" ? "bg-slate-800 text-teal-400 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 rounded-md transition-all ${device === "mobile" ? "bg-slate-800 text-teal-400 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 w-full bg-slate-950 relative flex items-center justify-center overflow-hidden p-0 sm:p-4 md:p-8">
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 z-10 text-white">
            <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-slate-400 animate-pulse">Connecting to your website...</p>
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
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Storefront Preview"
          />
          {/* Constrain Chatbot inside the preview container */}
          <Chatbot positionStrategy="absolute" isMobilePreview={device === "mobile"} />
        </div>
      </div>

      </div>
  );
}
