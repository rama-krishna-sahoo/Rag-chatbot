"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Database, RefreshCw, Cpu, ExternalLink, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function SaaSLandingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-teal-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <Sparkles className="w-5 h-5 text-teal-400" />
            Oogway AI
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="/features" className="hover:text-white transition-colors">Features</a>
            <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact</a>
            <a href="/store" className="hover:text-white transition-colors font-semibold text-teal-400 flex items-center gap-1">
              Demo Store <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <a href={user?.email === "superadmin@yopmail.com" ? "/super-admin" : "/dashboard"}>
                <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 rounded-lg">Dashboard</Button>
              </a>
            ) : (
              <>
                <a href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Sign In</a>
                <a href="/register">
                  <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 rounded-lg">Get Started</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-24 text-center space-y-8">
        <div className="space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 inline-flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" /> Next-Generation SaaS Grounded Chatbots
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Automate Customer Experience with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Strict Data Isolation</span>.
          </h1>
          <p className="text-slate-400 text-base md:text-xl max-w-2xl mx-auto leading-relaxed">
            Construct isolated vector database namespaces for your business website. Crawl content, generate embeddings, and serve secure personalized RAG replies instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href="/register">
            <Button size="lg" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 h-12 rounded-xl text-sm flex items-center gap-1.5 shadow-xl shadow-teal-500/5">
              Create Your Workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </a>
          <a href="/store">
            <Button size="lg" variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white px-8 h-12 rounded-xl text-sm flex items-center gap-1.5">
              Browse Demo Store
            </Button>
          </a>
        </div>

        {/* Dynamic Product Visual Frame */}
        <div className="pt-16 max-w-5xl mx-auto">
          <div className="border border-slate-800/80 bg-slate-950/60 rounded-2xl p-4 md:p-8 backdrop-blur shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 to-transparent pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {[
                {
                  icon: ShieldCheck,
                  title: "Isolated Vector Collections",
                  desc: "Every registered business is logically separated. Crawled pages and embeddings remain partitioned inside dedicated tenant namespaces."
                },
                {
                  icon: Database,
                  title: "Intelligent Crawling & Chunks",
                  desc: "Provide your URL, and Oogway extracts products, services, policies, and FAQs automatically to build a high-performance RAG context index."
                },
                {
                  icon: Cpu,
                  title: "Personalized Memory Engine",
                  desc: "Chatbots identify returning customers, access private workspace memory to recommend products, check past conversations, and offer custom codes."
                }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{item.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
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
