"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
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
    <div className="min-h-screen bg-[#050B06] text-white flex items-center justify-center p-4 font-sans selection:bg-lime-500/30 selection:text-lime-200 relative overflow-hidden">
      {/* Immersive Nature / Moss Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-lime-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-green-900/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[40%] h-[40%] rounded-full bg-teal-900/10 blur-[100px] transform -translate-x-1/2" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5 hover:opacity-85 transition-opacity">
            <Image 
              src="/images/oogway_turtle_logo.png" 
              alt="Oogway Turtle Logo" 
              width={46} 
              height={46} 
              className="object-contain drop-shadow-[0_0_16px_rgba(163,230,53,0.3)]"
            />
            <Image 
              src="/images/oogway_text_logo.png" 
              alt="Oogway Text Logo" 
              width={115} 
              height={30} 
              className="object-contain brightness-0 invert opacity-95"
            />
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-gray-400 mt-1.5 text-sm">We'll email you a link to reset your password.</p>
        </div>

        <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(163,230,53,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-gray-400 text-sm">We've sent password reset instructions to <strong className="text-lime-300">{email}</strong>.</p>
              <Link href="/login" className="inline-block text-sm font-semibold text-lime-400 hover:text-lime-300 hover:underline pt-4">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="you@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 transition-all rounded-xl"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 mt-2 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all rounded-xl disabled:opacity-50"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </Button>
              <div className="text-center pt-2">
                <Link href="/login" className="text-xs text-gray-400 hover:text-lime-400 transition-colors font-medium">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
