"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, Github, Mail, ArrowRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
        setErrorMsg(error.message || "Invalid credentials. Please verify your email and password.");
        setLoading(false);
        return;
      }

      // Check user role and workspace state to route them
      const res = await fetch("/api/auth/role");
      if (res.ok) {
        const roleData = await res.json();
        if (roleData.role === "Super Admin" || roleData.email === "superadmin@yopmail.com") {
          window.location.href = "/super-admin";
        } else if (roleData.workspaceId && roleData.workspaceId !== "00000000-0000-0000-0000-000000000000") {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/setup";
        }
      } else {
        window.location.href = "/setup";
      }
    } catch (err: any) {
      setErrorMsg("Authentication failed. Internal server error.");
      setLoading(false);
    }
  };

  const handleOAuth = () => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/setup`,
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans selection:bg-neutral-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-200/50 via-neutral-50 to-neutral-50" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white mb-4 shadow-lg shadow-neutral-900/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Welcome back</h1>
          <p className="text-neutral-500 mt-2 text-sm">Sign in to your Oogway Dashboard.</p>
        </div>

        <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl">
          <Button 
            onClick={handleOAuth}
            variant="outline" 
            className="w-full h-11 mb-6 bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800 font-medium shadow-sm transition-all flex items-center justify-center gap-2 rounded-xl"
          >
            <Github className="w-4 h-4" />
            Sign in with GitHub
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-white px-2 text-neutral-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-lg leading-relaxed">
                <strong>Error:</strong> {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-neutral-700">Email Address</label>
              <Input 
                type="email" 
                placeholder="you@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900 transition-shadow rounded-lg"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-neutral-700">Password</label>
                <a href="/forgot-password" className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 hover:underline">Forgot password?</a>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900 transition-shadow rounded-lg"
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-11 mt-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-md group transition-all rounded-xl"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-neutral-500 mt-6">
            Don't have an account? <a href="/register" className="text-neutral-900 font-bold hover:underline">Sign up</a>
          </p>
        </Card>
      </div>
    </div>
  );
}
