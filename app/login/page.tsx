"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertTriangle, ExternalLink, Loader2, Info, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { safeSignInWithOAuth } from "@/utils/supabase/oauth";
import Image from "next/image";
import Link from "next/link";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const alreadyExistsParam = searchParams.get("alreadyExists") === "true";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [existingNotice, setExistingNotice] = useState(alreadyExistsParam);
  const [providerDisabledNotice, setProviderDisabledNotice] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
    if (alreadyExistsParam) {
      setExistingNotice(true);
    }
  }, [emailParam, alreadyExistsParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMsg("Your email address is not confirmed yet. Please verify your email or register a new account.");
        } else {
          setErrorMsg(error.message || "Invalid credentials. Please verify your email and password.");
        }
        setLoading(false);
        return;
      }

      // Check user role and workspace state to route them
      const res = await fetch("/api/auth/role");
      if (res.ok) {
        const roleData = await res.json();
        if (roleData.role === "Super Admin" || roleData.email === "superadmin@yopmail.com") {
          window.location.href = "/super-admin";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg("Authentication failed. Internal server error.");
      setLoading(false);
    }
  };

  const handleOAuth = async () => {
    setOauthLoading(true);
    setErrorMsg("");
    setProviderDisabledNotice(false);

    try {
      const result = await safeSignInWithOAuth("google", "/dashboard");

      if (!result.success) {
        setOauthLoading(false);
        if (result.isProviderDisabled) {
          setProviderDisabledNotice(true);
        } else {
          setErrorMsg(result.error || "Could not complete Google Sign In.");
        }
      }
      // If success, window.location is automatically redirected by safeSignInWithOAuth
    } catch (err: any) {
      setOauthLoading(false);
      setErrorMsg("Failed to initiate Google sign-in.");
    }
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Sign in to your Oogway Dashboard.</p>
        </div>

        <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl">
          {/* Google Sign In Button */}
          <Button 
            onClick={handleOAuth}
            disabled={oauthLoading || loading}
            variant="outline" 
            className="w-full h-11 mb-4 bg-[#162319]/80 hover:bg-[#1f3323] border border-white/10 hover:border-lime-500/30 text-gray-200 hover:text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2.5 rounded-xl disabled:opacity-60"
          >
            {oauthLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-lime-400 shrink-0" />
                <span>Checking Google Provider...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>Sign in with Google</span>
              </>
            )}
          </Button>

          {/* Graceful Provider Disabled Alert (prevents raw 400 JSON crash) */}
          {providerDisabledNotice && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-300">Google OAuth is not enabled in Supabase</p>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    The Google provider is currently turned off in your Supabase backend project. 
                    You can log in directly using your <strong>Email and Password</strong> below.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowConfigGuide(!showConfigGuide)}
                  className="text-lime-400 hover:text-lime-300 font-semibold underline underline-offset-2 flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  {showConfigGuide ? "Hide setup instructions" : "How to enable Google OAuth"}
                </button>
                <a 
                  href="https://supabase.com/dashboard/project/zrwlmodsukegpupxqykw/auth/providers" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2 font-medium"
                >
                  Supabase Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {showConfigGuide && (
                <div className="mt-2 p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-gray-300 space-y-1.5 font-mono">
                  <p className="font-sans font-semibold text-lime-300 text-xs">Steps to enable:</p>
                  <p>1. In Supabase Dashboard &rarr; <strong>Authentication &rarr; Providers</strong></p>
                  <p>2. Expand <strong>Google</strong> and toggle <strong>Enable</strong></p>
                  <p>3. Enter your Google Client ID & Client Secret</p>
                  <p>4. Authorized Redirect URI: <span className="text-lime-400 break-all select-all">https://zrwlmodsukegpupxqykw.supabase.co/auth/v1/callback</span></p>
                </div>
              )}
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-[#111A13] px-3 text-gray-400">Or continue with email</span>
            </div>
          </div>

          {existingNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-lime-500/10 border border-lime-500/30 text-lime-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-300">
              <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">This email ID is already registered</p>
                <p className="text-gray-300 text-[11px] mt-0.5 leading-relaxed">
                  Please enter your password to sign in to your dashboard.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl leading-relaxed">
                <strong>Error:</strong> {errorMsg}
              </div>
            )}
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
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-300">Password</label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-lime-400 hover:text-lime-300 hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 transition-all rounded-xl"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || oauthLoading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-lime-300 to-lime-500 hover:from-lime-200 hover:to-lime-400 text-[#050B06] font-semibold shadow-[0_0_20px_rgba(163,230,53,0.3)] group transition-all rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#050B06]" /> Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Sign in <ArrowRight className="w-4 h-4 ml-1.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Don't have an account? <Link href="/register" className="text-lime-400 font-semibold hover:text-lime-300 hover:underline">Sign up</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050B06] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
