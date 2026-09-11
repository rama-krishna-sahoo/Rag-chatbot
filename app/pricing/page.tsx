"use client";

import React from "react";
import { Sparkles, Check, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function PricingPage() {
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
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="text-lime-300 font-semibold transition-colors">Pricing</Link>
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

      {/* Pricing Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-36 pb-20 text-center space-y-16">
        <div className="space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-lime-300 uppercase tracking-widest bg-lime-500/10 px-3.5 py-1.5 rounded-full border border-lime-500/20 backdrop-blur-sm">Pricing Plans</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">Simple, transparent billing.</h1>
          <p className="text-gray-400 text-base md:text-lg">
            Choose the perfect plan for your business. Start building your secure, isolated AI knowledge base today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto items-stretch">
          {[
            {
              name: "15-Day Free Trial",
              price: "₹0",
              period: "/ 15 days",
              desc: "Experience complete Oogway AI chatbot automation with zero upfront commitment.",
              features: [
                "Full Platform Access for 15 Days",
                "Up to 500 Pages Crawled",
                "Knowledge Base Document Embeddings",
                "Autonomous AI Customer Service",
                "Real-time Conversation Logs",
                "No Credit Card Required"
              ],
              button: "Start 15-Day Free Trial",
              popular: false
            },
            {
              name: "Pro Monthly",
              price: "₹2,999",
              period: "/ month",
              desc: "Full automated customer service after your 15-day trial concludes.",
              features: [
                "Unlimited 24/7 AI Customer Conversations",
                "Smart Website Auto-Sync & Reindexing",
                "Gemini Vector Knowledge Base",
                "Conversation History & Sentiment Insights",
                "Custom Chatbot Branding & Themes",
                "Priority WhatsApp & Email Support"
              ],
              button: "Get Pro Now",
              popular: true
            },
            {
              name: "Enterprise",
              price: "Custom",
              period: "",
              desc: "Dedicated infrastructure, multi-workspace isolation, and custom SLA.",
              features: [
                "Unlimited Isolated Workspaces",
                "Custom Scraper & Knowledge Pipelines",
                "Real-time Webhook Syncing",
                "Dedicated Vector Collection Namespaces",
                "Audit Logs & Compliance Export",
                "24/7 Dedicated SLA Support"
              ],
              button: "Contact Sales",
              popular: false
            }
          ].map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative border rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 backdrop-blur-xl ${
                plan.popular 
                  ? "border-lime-400/50 bg-[#162319]/80 shadow-[0_0_35px_rgba(163,230,53,0.18)] scale-[1.03]" 
                  : "border-white/10 bg-[#111A13]/60 hover:border-lime-500/30"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 right-6 text-[10px] font-bold text-[#050B06] bg-gradient-to-r from-lime-300 to-lime-500 px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(163,230,53,0.3)]">Most Popular</span>
              )}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="text-gray-400 text-xs mt-2 leading-relaxed">{plan.desc}</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-400 text-xs">{plan.period}</span>}
                </div>
                <div className="w-full h-px bg-white/10" />
                <ul className="space-y-3.5 text-xs text-gray-300 font-medium">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-lime-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href={plan.price === "Custom" ? "/contact" : "/register"} className="block mt-8 w-full">
                <Button 
                  className={`w-full h-11 font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    plan.popular 
                      ? "bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] shadow-[0_0_20px_rgba(163,230,53,0.3)]" 
                      : "bg-[#162319]/80 hover:bg-[#1f3323] text-gray-200 hover:text-white border border-white/10 hover:border-lime-500/30"
                  }`}
                >
                  {plan.button} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ))}
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
