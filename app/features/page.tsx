"use client";

import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, Database, RefreshCw, Cpu, Brain, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased selection:bg-[#B2EA4D]/30 selection:text-slate-200">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-teal-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <Sparkles className="w-5 h-5 text-[#B2EA4D]" />
            Oogway AI
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="/features" className="text-white hover:text-white transition-colors">Features</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact</a>
            <a href="/store" className="hover:text-white transition-colors font-semibold text-[#B2EA4D]">Demo Store</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Sign In</a>
            <a href="/register">
              <Button size="sm" className="bg-[#B2EA4D] hover:bg-teal-400 text-slate-950 font-bold px-4 rounded-lg">Get Started</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Features Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center space-y-20">
        <div className="space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-[#B2EA4D] uppercase tracking-widest bg-[#B2EA4D]/10 px-3 py-1 rounded-full border border-[#B2EA4D]/20">Platform Capabilities</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">Engineered for absolute isolation.</h1>
          <p className="text-slate-400 text-base md:text-lg">
            Oogway implements enterprise RAG pipelines scoping website knowledge bases to strictly isolated tenant namespaces.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-6xl mx-auto">
          {[
            {
              icon: ShieldCheck,
              title: "Multi-Tenant Data Isolation",
              desc: "Complete logical segregation of database records, similarity indexes, vector namespace collections, and conversation logs. Zero bleed-through guaranteed."
            },
            {
              icon: Database,
              title: "Vector Database Namespace",
              desc: "Dedicated workspaces automatically provision logical namespaces inside Supabase pgvector collections to partition crawled chunks and search weights."
            },
            {
              icon: RefreshCw,
              title: "Automatic Website Syncing",
              desc: "Enable periodic crawler routines to check website HTML edits, recalculate embeddings, and update grounded chatbot responses asynchronously."
            },
            {
              icon: Brain,
              title: "Personalized Customer Memory",
              desc: "Detect, verify, and store shopper preference indexes securely within company workspaces. Continue old discussions and recommend related products."
            },
            {
              icon: Cpu,
              title: "Grounded Gemini Pipelines",
              desc: "Leverages Gemini LLMs to build high-density chunks, extract brand color specifications, and validate search queries in the dashboard sandbox."
            },
            {
              icon: GitBranch,
              title: "Kanban Role Assignment",
              desc: "Drag-and-drop team dashboard to update administrative credentials dynamically, sync access permissions, and provision secure access levels."
            }
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="border border-slate-900 bg-slate-950/40 p-8 rounded-2xl hover:border-slate-800 transition-all duration-300 flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#B2EA4D]/10 text-[#B2EA4D] border border-[#B2EA4D]/20 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mt-2">{feat.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-white">Ready to automate your customer experience?</h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Get started in under 3 minutes with our Guided Setup Wizard. No complex technical integrations required.
          </p>
          <a href="/register" className="inline-block">
            <Button className="bg-[#B2EA4D] hover:bg-teal-400 text-slate-950 font-bold px-8 h-11 rounded-xl flex items-center gap-1">
              Create Your Workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-500 space-y-4">
          <p>© 2026 Oogway AI Chatbot Platform. All rights isolated.</p>
        </div>
      </footer>
    </div>
  );
}
