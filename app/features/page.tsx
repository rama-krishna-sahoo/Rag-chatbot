"use client";

import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, Database, RefreshCw, Cpu, Brain, GitBranch, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#050B06] text-white font-sans antialiased selection:bg-lime-500/30 selection:text-lime-200 overflow-x-hidden relative">
      {/* Immersive Nature / Moss Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-lime-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-900/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-teal-900/10 blur-[100px] transform -translate-x-1/2" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
      </div>

      {/* Floating Pill Navigation */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
        <div className="bg-[#111A13]/60 backdrop-blur-xl border border-white/10 rounded-full h-14 flex items-center justify-between px-2 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <Link href="/" className="flex items-center gap-2 pl-3">
            <Image 
              src="/images/oogway_turtle_logo.png" 
              alt="Oogway Turtle Logo" 
              width={32} 
              height={32} 
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
          
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-gray-300">
            <Link href="/features" className="text-lime-300 font-semibold transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/store" className="hover:text-white transition-colors flex items-center gap-1">
              Demo Store <ExternalLink className="w-3 h-3" />
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 pr-1">
            <Link href="/login" className="text-[13px] font-medium text-gray-300 hover:text-white px-4 transition-colors">Log in</Link>
            <Link href="/register">
              <Button size="sm" className="bg-gradient-to-r from-lime-200 to-lime-400 hover:from-lime-100 hover:to-lime-300 text-[#050B06] font-semibold rounded-full px-6 h-10 shadow-[0_0_20px_rgba(163,230,53,0.4)] transition-all">
                Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-20 text-center space-y-20">
        <div className="space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-lime-300 uppercase tracking-widest bg-lime-500/10 px-3.5 py-1.5 rounded-full border border-lime-500/20 backdrop-blur-sm">Platform Capabilities</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">Engineered for absolute isolation.</h1>
          <p className="text-gray-400 text-base md:text-lg">
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
              <div key={idx} className="border border-white/10 bg-[#111A13]/60 backdrop-blur-xl p-8 rounded-2xl hover:border-lime-500/30 transition-all duration-300 flex flex-col gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-400 border border-lime-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mt-2">{feat.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-[#111A13]/70 border border-white/10 backdrop-blur-xl rounded-2xl p-12 max-w-3xl mx-auto space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <h2 className="text-2xl font-bold text-white">Ready to automate your customer experience?</h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Get started in under 3 minutes with our Guided Setup Wizard. No complex technical integrations required.
          </p>
          <Link href="/register" className="inline-block">
            <Button className="bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold px-8 h-11 rounded-full flex items-center gap-1 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              Create Your Workspace <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#050B06] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-500 space-y-4">
          <p>© 2026 Oogway AI Chatbot Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
