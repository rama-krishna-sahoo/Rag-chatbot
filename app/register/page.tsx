"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertTriangle, ExternalLink, Loader2, Info, MailCheck } from "lucide-react";
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

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [providerDisabledNotice, setProviderDisabledNotice] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [directVerificationUrl, setDirectVerificationUrl] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editableEmail, setEditableEmail] = useState("");

  const handleResendVerification = async (overrideEmail?: string) => {
    const emailToUse = (overrideEmail || editableEmail || registeredEmail || email).trim();
    if (!emailToUse) return;
    setResending(true);
    setResendNotice(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });
      const data = await res.json();
      if (data.verificationUrl) {
        setDirectVerificationUrl(data.verificationUrl);
      }
      setRegisteredEmail(emailToUse);
      setEditableEmail(emailToUse);
      setIsEditingEmail(false);

      if (res.ok && data.success) {
        if (data.emailSent) {
          setResendNotice(`Verification link re-sent to ${emailToUse}! Please check your email inbox.`);
        } else {
          setResendNotice(data.message || `Verification link generated for ${emailToUse}. You can activate your account using the direct link below.`);
        }
      } else {
        setResendNotice(data.error || "Failed to resend verification link.");
      }
    } catch (e) {
      setResendNotice("Network error resending verification email.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailQuery = params.get("email");
      if (emailQuery) {
        setEmail(emailQuery);
        setRegisteredEmail(emailQuery);
        setEditableEmail(emailQuery);
      }

      const code = params.get("code");
      if (code) {
        setOauthLoading(true);
        const supabase = createClient();
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && data?.session) {
            window.location.href = "/setup?onboarding=true";
          } else {
            setOauthLoading(false);
            setErrorMsg("Authentication session exchange failed. Please try signing up again.");
          }
        }).catch(() => setOauthLoading(false));
      }
    }
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your full name or username.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }

    setLoading(true);

    try {
      // 1. First attempt registration via the server-side API endpoint with instant auto-confirmation
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        const errorText = regData.error || "";
        const isAlready = regData.alreadyExists || errorText.toLowerCase().includes("already in use") || errorText.toLowerCase().includes("already registered") || errorText.toLowerCase().includes("already exists");

        if (isAlready) {
          setErrorMsg("This email ID is already registered. Redirecting you to the login page...");
          setTimeout(() => {
            window.location.href = `/login?email=${encodeURIComponent(email)}&alreadyExists=true`;
          }, 1600);
          return;
        }

        setErrorMsg(errorText || "Registration failed. Please check your details.");
        setLoading(false);
        return;
      }

      // 2. Account created! Require email verification link click before logging in
      setLoading(false);
      const regEmail = email.trim();
      setRegisteredEmail(regEmail);
      setEditableEmail(regEmail);
      if (regData.verificationUrl) {
        setDirectVerificationUrl(regData.verificationUrl);
      }
      if (regData.emailError) {
        setResendNotice(`Note: ${regData.emailError}. You can verify your account directly using the link below.`);
      }
      setEmailSent(true);
    } catch (err: any) {
      // Fallback: standard client signup if API endpoint encountered an issue
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim(),
              username: name.trim(),
            },
            emailRedirectTo: `${window.location.origin}/verify-email`,
          },
        });

        if (error) {
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user_already_exists")) {
            setErrorMsg("This email ID is already registered. Redirecting you to the login page...");
            setTimeout(() => {
              window.location.href = `/login?email=${encodeURIComponent(email)}&alreadyExists=true`;
            }, 1600);
            return;
          }
          setErrorMsg(error.message || "Registration failed.");
          setLoading(false);
          return;
        }

        setLoading(false);
        const regEmail = email.trim();
        setRegisteredEmail(regEmail);
        setEditableEmail(regEmail);
        setEmailSent(true);
      } catch (fallbackErr: any) {
        setErrorMsg("An unexpected error occurred during signup.");
        setLoading(false);
      }
    }
  };

  const handleOAuth = async () => {
    setOauthLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setProviderDisabledNotice(false);

    try {
      const result = await safeSignInWithOAuth("google", "/setup?onboarding=true");

      if (!result.success) {
        setOauthLoading(false);
        if (result.isProviderDisabled) {
          setProviderDisabledNotice(true);
        } else {
          setErrorMsg(result.error || "Could not complete Google Sign Up.");
        }
      }
      // If success, safeSignInWithOAuth automatically redirects the browser
    } catch (err: any) {
      setOauthLoading(false);
      setErrorMsg("Failed to initiate Google sign-up.");
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Join Oogway Platform to automate customer experience.</p>
        </div>

        {emailSent ? (
          <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl font-sans">
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(163,230,53,0.2)]">
                <MailCheck className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">Check your email inbox!</h2>
                <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                  We sent a verification link to:
                </p>

                {isEditingEmail ? (
                  <div className="flex items-center gap-2 max-w-xs mx-auto mt-1">
                    <Input
                      type="email"
                      value={editableEmail}
                      onChange={(e) => setEditableEmail(e.target.value)}
                      placeholder="Enter your mail ID"
                      className="h-10 bg-[#162319] border-lime-500/40 text-lime-300 font-mono text-sm focus:ring-lime-500 focus:border-lime-500 rounded-lg"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleResendVerification(editableEmail)}
                      disabled={resending || !editableEmail.trim()}
                      className="h-10 bg-lime-500 hover:bg-lime-400 text-black font-bold text-xs px-3.5 rounded-lg shrink-0 cursor-pointer"
                    >
                      Update & Send
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2.5 mt-1">
                    <strong className="text-lime-300 font-mono text-sm bg-lime-950/70 border border-lime-500/40 px-3.5 py-1.5 rounded-lg shadow-inner">
                      {registeredEmail || "your email address"}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        setEditableEmail(registeredEmail);
                        setIsEditingEmail(true);
                      }}
                      className="text-xs text-gray-400 hover:text-lime-300 underline font-medium cursor-pointer transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed pt-1">
                  Please open your inbox and click the link to activate your account.
                </p>
              </div>

              {resendNotice && (
                <p className="text-xs text-lime-300 bg-lime-500/10 p-3 rounded-xl border border-lime-500/20 font-medium leading-relaxed">
                  {resendNotice}
                </p>
              )}

              {directVerificationUrl && (
                <div className="bg-lime-500/10 border border-lime-500/30 rounded-xl p-4 text-center space-y-2.5">
                  <p className="text-xs text-lime-200 font-semibold">⚡ Didn't receive the email? Verify immediately below:</p>
                  <a
                    href={directVerificationUrl}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(163,230,53,0.3)] transition-all cursor-pointer"
                  >
                    <MailCheck className="w-4 h-4" /> Click Here to Verify Email Now →
                  </a>
                </div>
              )}

              <div className="pt-2 space-y-3">
                <Button
                  onClick={() => handleResendVerification(registeredEmail)}
                  disabled={resending}
                  variant="outline"
                  className="w-full h-11 border-lime-500/30 bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  {resending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-lime-400" /> Resending Verification Email...
                    </span>
                  ) : (
                    "Resend Verification Email ✉️"
                  )}
                </Button>
                <Link href={`/login?email=${encodeURIComponent(registeredEmail)}`} className="block w-full">
                  <Button
                    variant="ghost"
                    className="w-full h-11 text-gray-400 hover:text-white font-medium rounded-xl cursor-pointer"
                  >
                    Go to Sign In Page →
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 bg-[#111A13]/70 backdrop-blur-xl rounded-2xl">
            {/* Google Sign Up Button */}
            <Button 
              onClick={handleOAuth}
              disabled={oauthLoading || loading}
              variant="outline" 
              className="w-full h-11 mb-4 bg-[#162319]/80 hover:bg-[#1f3323] border border-white/10 hover:border-lime-500/30 text-gray-200 hover:text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2.5 rounded-xl disabled:opacity-60"
            >
              {oauthLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-lime-400 shrink-0" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Sign up with Google</span>
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
                      Google Sign-In is currently disabled on your Supabase backend project. 
                      You can register instantly using your <strong>Email and Password</strong> below.
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
                <span className="bg-[#111A13] px-3 text-gray-400">Or continue with details</span>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl leading-relaxed">
                  <strong>Error:</strong> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-lime-500/10 border border-lime-500/30 text-lime-300 text-xs p-3 rounded-xl leading-relaxed">
                  <strong>Success:</strong> {successMsg}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Full Name / Username</label>
                <Input 
                  type="text" 
                  placeholder="e.g. Alex Rivera" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 transition-all rounded-xl"
                  required
                />
              </div>
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
                <label className="text-sm font-semibold text-gray-300">Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-[#080e09]/80 border-white/10 text-white placeholder:text-gray-500 focus-visible:border-lime-400 focus-visible:ring-1 focus-visible:ring-lime-400 transition-all rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-300">Confirm Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <Loader2 className="w-4 h-4 animate-spin text-[#050B06]" /> Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Get Started <ArrowRight className="w-4 h-4 ml-1.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              Already have an account? <Link href="/login" className="text-lime-400 font-semibold hover:text-lime-300 hover:underline">Sign in</Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
