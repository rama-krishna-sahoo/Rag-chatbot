"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get("token") || "" : "";
  const email = searchParams ? searchParams.get("email") || "" : "";

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function performVerification() {
      if (!token || !email) {
        setVerifying(false);
        setSuccess(true);
        return;
      }

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSuccess(true);
        } else {
          setErrorMsg(data.error || "Email verification failed or token expired.");
        }
      } catch (err: any) {
        setErrorMsg("Failed to verify email. Network or server error.");
      } finally {
        setVerifying(false);
      }
    }

    performVerification();
  }, [token, email]);

  return (
    <div className="min-h-screen bg-[#050B06] text-white flex items-center justify-center p-4 font-sans selection:bg-lime-500/30 selection:text-lime-200 relative overflow-hidden">
      {/* Background Gradients */}
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Email Verification</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Verifying your registered email address with Oogway Auth.</p>
        </div>

        <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl text-center">
          {verifying ? (
            <div className="space-y-4 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-lime-400 mx-auto" />
              <p className="text-gray-400 text-sm font-semibold animate-pulse font-mono uppercase tracking-widest">Validating email token...</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(163,230,53,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Email Verified!</h2>
              <p className="text-gray-400 text-sm">Thank you. Your email address {email ? <strong>{email}</strong> : "address"} has been successfully verified in the software. You can now access all features.</p>
              <Link href="/dashboard" className="block w-full h-11 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold rounded-xl flex items-center justify-center pt-0.5 transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] mt-6">
                Proceed to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Verification Failed</h2>
              <p className="text-rose-300 text-xs bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 leading-relaxed">
                {errorMsg}
              </p>
              <Link href="/setup?onboarding=true" className="block w-full h-11 bg-[#162319]/80 hover:bg-[#1f3323] border border-white/10 hover:border-lime-500/30 text-gray-200 hover:text-white font-medium rounded-xl flex items-center justify-center pt-0.5 transition-all mt-6">
                Return to Setup & Resend Link
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050B06] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
