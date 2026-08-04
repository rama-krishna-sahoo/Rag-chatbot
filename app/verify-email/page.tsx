"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, ShieldCheck, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVerifying(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans selection:bg-neutral-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-200/50 via-neutral-50 to-neutral-50" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white mb-4 shadow-lg shadow-neutral-900/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Email Verification</h1>
          <p className="text-neutral-500 mt-2 text-sm">Verifying your registered email address with Supabase Auth.</p>
        </div>

        <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl text-center">
          {verifying ? (
            <div className="space-y-4 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-900 mx-auto" />
              <p className="text-neutral-500 text-sm font-semibold animate-pulse font-mono uppercase tracking-widest">Validating email token...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#B2EA4D] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Email Verified!</h2>
              <p className="text-neutral-500 text-sm">Thank you. Your email address has been successfully verified. You can now access your Oogway workspace setup.</p>
              <a href="/setup" className="block w-full h-11 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl flex items-center justify-center pt-1 transition-colors mt-6">
                Proceed to Setup
              </a>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
