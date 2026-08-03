"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, ShieldCheck, Database, RefreshCw, Cpu, ExternalLink, Bot, CheckCircle2, ChevronRight, Share2, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";

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
    <div className="min-h-screen bg-[#050B06] text-white font-sans antialiased overflow-x-hidden selection:bg-lime-500/30 selection:text-lime-200">
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
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/store" className="hover:text-white transition-colors flex items-center gap-1">
              Demo Store <ExternalLink className="w-3 h-3" />
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 pr-1">
            {user ? (
              <Link href={user?.email === "superadmin@yopmail.com" ? "/super-admin" : "/dashboard"}>
                <Button size="sm" className="bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-black font-semibold rounded-full px-5 h-10 shadow-[0_0_15px_rgba(163,230,53,0.3)]">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-[13px] font-medium text-gray-300 hover:text-white px-4 transition-colors">Log in</Link>
                <Link href="/register">
                  <Button size="sm" className="bg-gradient-to-r from-lime-200 to-lime-400 hover:from-lime-100 hover:to-lime-300 text-[#050B06] font-semibold rounded-full px-6 h-10 shadow-[0_0_20px_rgba(163,230,53,0.4)] transition-all">
                    Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-40 pb-24">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime-500/20 bg-lime-500/10 text-lime-300 text-xs font-medium shadow-[0_0_10px_rgba(163,230,53,0.1)] backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
            New Oogway 2.0 is now available <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white leading-[1.1]">
            Automate Customer<br />Experience with <em className="font-serif italic font-light text-lime-300">Strict Data Isolation.</em>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Construct isolated vector database namespaces for your business website. Crawl content, generate embeddings, and serve secure personalized RAG replies instantly.
          </p>

          <div className="pt-4 space-y-6 flex flex-col items-center">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-lime-200 to-lime-400 hover:from-lime-100 hover:to-lime-300 text-[#050B06] font-semibold rounded-full px-8 h-14 text-base shadow-[0_0_30px_rgba(163,230,53,0.3)] hover:shadow-[0_0_40px_rgba(163,230,53,0.5)] transition-all flex items-center gap-2 group">
                Start Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-lime-500/70" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-lime-500/70" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-lime-500/70" /> Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Section */}
        <div className="max-w-6xl mx-auto px-6 mt-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#131B15]/80 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 flex flex-col group hover:border-lime-500/30 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-lime-500/20 transition-colors" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C281F] to-[#0A120D] border border-white/10 flex items-center justify-center text-lime-300 mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_0_15px_rgba(163,230,53,0.1)]">
                <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-xl text-white font-medium mb-3">Isolated Vector Collections</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-12">
                Every registered business is logically separated. Crawled pages and embeddings remain partitioned inside dedicated tenant namespaces.
              </p>
              
              <div className="mt-auto h-40 flex items-center justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full flex justify-between items-center px-4">
                    <div className="space-y-4">
                      <div className="w-8 h-8 rounded bg-[#1C281F] border border-white/10 flex items-center justify-center text-gray-500 shadow-lg"><Database className="w-4 h-4" /></div>
                      <div className="w-8 h-8 rounded bg-[#1C281F] border border-white/10 flex items-center justify-center text-gray-500 shadow-lg"><Share2 className="w-4 h-4" /></div>
                    </div>
                    
                    <svg className="absolute left-16 right-16 top-1/2 -translate-y-1/2 text-lime-500/30" height="80" fill="none" viewBox="0 0 100 80" preserveAspectRatio="none">
                      <path d="M0 20 Q 50 20 100 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
                      <path d="M0 60 Q 50 60 100 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" style={{ animationDelay: '500ms' }} />
                    </svg>

                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime-900/40 to-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-300 shadow-[0_0_30px_rgba(163,230,53,0.2)] relative z-10">
                      <Bot className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#131B15]/80 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 flex flex-col group hover:border-lime-500/30 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-lime-500/20 transition-colors" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C281F] to-[#0A120D] border border-white/10 flex items-center justify-center text-lime-300 mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_0_15px_rgba(163,230,53,0.1)]">
                <RefreshCw className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-xl text-white font-medium mb-3">Intelligent Crawling</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-12">
                Provide your URL, and Oogway extracts products, services, policies, and FAQs automatically to build a high-performance RAG index.
              </p>
              
              <div className="mt-auto h-40 flex items-end relative overflow-hidden pb-4">
                 <div className="w-full flex items-end justify-between h-24 border-b border-lime-500/20 relative z-10">
                    <div className="w-[14%] bg-lime-500/10 rounded-t-sm transition-all duration-700 hover:h-[40%]" style={{ height: "30%" }}></div>
                    <div className="w-[14%] bg-lime-500/20 rounded-t-sm transition-all duration-700 hover:h-[55%]" style={{ height: "45%" }}></div>
                    <div className="w-[14%] bg-lime-500/30 rounded-t-sm transition-all duration-700 hover:h-[70%]" style={{ height: "60%" }}></div>
                    <div className="w-[14%] bg-lime-500/40 rounded-t-sm transition-all duration-700 hover:h-[50%]" style={{ height: "40%" }}></div>
                    <div className="w-[14%] bg-gradient-to-t from-lime-500/50 to-lime-400 rounded-t-sm relative transition-all duration-700 hover:h-[95%]" style={{ height: "85%" }}>
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-lime-200 shadow-[0_0_12px_#A3E635]"></div>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1C281F] border border-lime-500/30 text-lime-300 px-2 py-0.5 rounded shadow-lg flex items-center gap-1 whitespace-nowrap">
                        <TrendingUp className="w-3 h-3" /> 98%
                      </div>
                    </div>
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-[#131B15] to-transparent z-20 pointer-events-none" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#131B15]/80 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 flex flex-col group hover:border-lime-500/30 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-lime-500/20 transition-colors" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1C281F] to-[#0A120D] border border-white/10 flex items-center justify-center text-lime-300 mb-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_0_15px_rgba(163,230,53,0.1)]">
                <Cpu className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-xl text-white font-medium mb-3">Memory Engine</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-12">
                Chatbots identify returning customers, access private workspace memory to recommend products, and offer custom codes seamlessly.
              </p>
              
              <div className="mt-auto h-40 flex items-center justify-center relative">
                <div className="w-32 h-32 rounded-full border border-lime-500/10 absolute animate-ping" style={{ animationDuration: '3s' }} />
                <div className="w-24 h-24 rounded-full border border-lime-500/20 absolute animate-pulse" />
                <div className="w-16 h-16 rounded-full border border-lime-500/40 absolute" />
                <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center text-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.4)] z-10 border border-lime-500/50">
                   <Shield className="w-5 h-5 fill-lime-500/30" />
                </div>
                
                {/* Orbital dots */}
                <div className="absolute w-24 h-24 animate-[spin_10s_linear_infinite]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-lime-300 shadow-[0_0_8px_#A3E635]" />
                </div>
                <div className="absolute w-32 h-32 animate-[spin_15s_linear_infinite_reverse]">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime-400/50" />
                  <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-lime-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technologies Section */}
        <div className="mt-32 max-w-5xl mx-auto px-6 text-center border-t border-white/5 pt-16">
          <h4 className="text-[11px] font-bold tracking-[0.2em] text-gray-500 mb-10 uppercase">Powered by Modern Technologies</h4>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {/* Next.js */}
            <div className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <svg width="28" height="28" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="64" cy="64" r="64" fill="black"/>
                <path d="M106.913 95.8239L41.3655 16.5H30.5V112.5H41.0118V36.9365L97.9405 106.331C101.213 103.228 104.223 99.6961 106.913 95.8239Z" fill="url(#paint0_linear)"/>
                <path d="M88.75 34.5H99.25V97.5H88.75V34.5Z" fill="white"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="white"/>
                    <stop offset="1" stopColor="white" stopOpacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
              Next.js
            </div>
            
            {/* React */}
            <div className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <svg width="28" height="28" viewBox="-11.5 -10.23174 23 20.46348" xmlns="http://www.w3.org/2000/svg">
                <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
                <g stroke="#61dafb" strokeWidth="1" fill="none">
                  <ellipse rx="11" ry="4.2"/>
                  <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
                  <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
                </g>
              </svg>
              React
            </div>
            
            {/* Supabase */}
            <div className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <svg width="26" height="26" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60.1018 0.697266C31.5036 0.697266 8.32422 23.8767 8.32422 52.4749C8.32422 81.0731 31.5036 104.253 60.1018 104.253V0.697266Z" fill="#3ECF8E"/>
                <path d="M60.1018 119.303C88.7 119.303 111.879 96.1233 111.879 67.5251C111.879 38.9269 88.7 15.7475 60.1018 15.7475V119.303Z" fill="#3ECF8E"/>
              </svg>
              Supabase
            </div>
            
            {/* Tailwind CSS */}
            <div className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <svg width="28" height="28" viewBox="0 0 256 154" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M128 0C101.333 0 85.3333 12.8205 80 38.4615C93.3333 25.641 109.333 21.7949 128 30.7692C137.935 35.5457 144.757 42.6074 152.33 50.4571C164.671 63.2458 178.694 77.7816 213.333 77.7816C240 77.7816 256 64.9611 261.333 39.3201C248 52.1406 232 55.9867 213.333 47.0124C203.398 42.2359 196.577 35.1742 188.981 27.3012C176.663 14.5359 162.64 0 128 0ZM42.6667 76.9231C16 76.9231 0 89.7436 -5.33333 115.385C8 102.564 24 98.7179 42.6667 107.692C52.6015 112.469 59.4234 119.53 67.0195 127.404C79.3375 140.169 93.3601 154.705 128 154.705C154.667 154.705 170.667 141.884 176 116.243C162.667 129.064 146.667 132.91 128 123.936C118.065 119.159 111.243 112.098 103.67 104.248C91.3288 91.4593 77.3059 76.9231 42.6667 76.9231Z" fill="#38BDF8"/>
              </svg>
              Tailwind
            </div>
            
            {/* Vercel */}
            <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <svg width="24" height="24" viewBox="0 0 116 100" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M57.5 0L115 100H0L57.5 0Z"/>
              </svg>
              Vercel
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#030804] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-600 space-y-4">
          <p>© 2026 Oogway AI Chatbot Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
