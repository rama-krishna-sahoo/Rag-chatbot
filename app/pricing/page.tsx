"use client";

import React from "react";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
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
            <a href="/pricing" className="text-white hover:text-white transition-colors">Pricing</a>
            <a href="/contact" className="hover:text-white transition-colors">Contact</a>
            <a href="/store" className="hover:text-white transition-colors font-semibold text-teal-400">Demo Store</a>
          </nav>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Sign In</a>
            <a href="/register">
              <Button size="sm" className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 rounded-lg">Get Started</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center space-y-16">
        <div className="space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">Pricing Plans</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">Simple, transparent billing.</h1>
          <p className="text-slate-400 text-base md:text-lg">
            Choose the perfect plan for your business. Start building your secure, isolated AI knowledge base today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
          {[
            {
              name: "Starter",
              price: "$29",
              desc: "Perfect for exploring Oogway chatbot integrations.",
              features: [
                "1 Private Workspace",
                "Up to 24 Pages Crawled",
                "5 Reference Documents",
                "Standard Response Delay",
                "Basic Analytics Dashboard"
              ],
              button: "Start Free Trial",
              popular: false
            },
            {
              name: "Pro",
              price: "$79",
              desc: "For growing businesses needing automated website sync.",
              features: [
                "3 Isolated Workspaces",
                "Up to 500 Pages Crawled",
                "Unlimited Documents",
                "Auto Website Sync (Weekly)",
                "Draggable Team Authorization Board",
                "Advanced AI Search Sandbox"
              ],
              button: "Get Pro Now",
              popular: true
            },
            {
              name: "Enterprise",
              price: "Custom",
              desc: "Ultimate security with dedicated collection isolation.",
              features: [
                "Unlimited Isolated Workspaces",
                "Custom Scraper Configuration",
                "Real-time Webhook Syncer",
                "Dedicated Vector Collection Namespaces",
                "Audit Logs & Compliance Export",
                "24/7 Priority SLA Support"
              ],
              button: "Contact Sales",
              popular: false
            }
          ].map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative border rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.popular 
                  ? "border-teal-500/50 bg-slate-900/40 shadow-xl shadow-teal-500/5 scale-[1.03]" 
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 right-6 text-[10px] font-bold text-teal-950 bg-teal-400 px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-slate-500 text-xs">/ month</span>}
                </div>
                <div className="w-full h-px bg-slate-800/80" />
                <ul className="space-y-3.5 text-xs text-slate-300 font-medium">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a href={plan.price === "Custom" ? "/contact" : "/register"} className="block mt-8 w-full">
                <Button 
                  className={`w-full h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    plan.popular 
                      ? "bg-teal-500 hover:bg-teal-400 text-slate-950" 
                      : "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800"
                  }`}
                >
                  {plan.button} <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          ))}
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
