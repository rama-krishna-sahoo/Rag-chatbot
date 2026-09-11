"use client";

import React, { useState } from "react";
import { Sparkles, Send, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 1000);
  };

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
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/contact" className="text-lime-300 font-semibold transition-colors">Contact</Link>
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

      {/* Contact Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-36 pb-20 text-center space-y-12">
        <div className="space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-lime-300 uppercase tracking-widest bg-lime-500/10 px-3.5 py-1.5 rounded-full border border-lime-500/20 backdrop-blur-sm">Talk to Sales</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">Get in touch.</h1>
          <p className="text-gray-400 text-base md:text-lg">
            Looking for dedicated database nodes or high-volume RAG index syncing? Let us construct a custom plan.
          </p>
        </div>

        <Card className="max-w-xl mx-auto border border-white/10 bg-[#111A13]/70 p-8 rounded-2xl text-left backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {sent ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-full bg-lime-500/15 text-lime-400 flex items-center justify-center mx-auto border border-lime-500/30 shadow-[0_0_20px_rgba(163,230,53,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Message Transmitted</h2>
              <p className="text-gray-400 text-xs leading-relaxed max-w-xs mx-auto">
                Thank you! Our enterprise solution engineer will reach out to you within 2 business hours.
              </p>
              <Link href="/" className="inline-block text-xs font-semibold text-lime-400 hover:text-lime-300 hover:underline pt-4">
                Back to Homepage
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Full Name</label>
                  <Input 
                    type="text" 
                    placeholder="Alice Vance" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl text-xs h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Work Email</label>
                  <Input 
                    type="email" 
                    placeholder="alice@acme.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl text-xs h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Company / Website</label>
                <Input 
                  type="text" 
                  placeholder="Acme Corp" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 rounded-xl text-xs h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Message details</label>
                <textarea 
                  rows={4} 
                  placeholder="How can we help scale your AI chatbot operations?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#080e09]/80 border border-white/10 text-white placeholder:text-gray-500 rounded-xl p-3 outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all text-xs"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold h-11 rounded-xl flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all disabled:opacity-50"
              >
                {loading ? "Transmitting..." : "Send Request"} <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </Card>
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
