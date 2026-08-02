"use client";

import React, { useState } from "react";
import { Sparkles, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

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
            <a href="/contact" className="text-white hover:text-white transition-colors">Contact</a>
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

      {/* Contact Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center space-y-12">
        <div className="space-y-4 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">Talk to Sales</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">Get in touch.</h1>
          <p className="text-slate-400 text-base md:text-lg">
            Looking for dedicated database nodes or high-volume RAG index syncing? Let us construct a custom plan.
          </p>
        </div>

        <Card className="max-w-xl mx-auto border-slate-800 bg-slate-900/30 p-8 rounded-2xl text-left backdrop-blur-xl shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Message Transmitted</h2>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Thank you! Our enterprise solution engineer will reach out to you within 2 business hours.
              </p>
              <a href="/" className="block text-xs font-bold text-teal-400 hover:underline pt-4">Back to Homepage</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Full Name</label>
                  <Input 
                    type="text" 
                    placeholder="Alice Vance" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Work Email</label>
                  <Input 
                    type="email" 
                    placeholder="alice@acme.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Company / Website</label>
                <Input 
                  type="text" 
                  placeholder="Acme Corp" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Message details</label>
                <textarea 
                  rows={4} 
                  placeholder="How can we help scale your AI chatbot operations?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-3 outline-none focus:border-teal-500 transition-colors"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold h-11 rounded-xl flex items-center justify-center gap-2 mt-4"
              >
                {loading ? "Transmitting..." : "Send Request"} <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </Card>
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
