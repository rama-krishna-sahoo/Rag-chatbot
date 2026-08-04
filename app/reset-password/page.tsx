"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sparkles, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans selection:bg-neutral-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-200/50 via-neutral-50 to-neutral-50" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white mb-4 shadow-lg shadow-neutral-900/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">New Password</h1>
          <p className="text-neutral-500 mt-2 text-sm">Enter your new secure password details.</p>
        </div>

        <Card className="p-8 shadow-xl border-neutral-200/60 bg-white/80 backdrop-blur-xl rounded-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#B2EA4D] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Password Changed</h2>
              <p className="text-neutral-500 text-sm">Your account password has been successfully updated.</p>
              <a href="/login" className="block text-sm font-bold text-neutral-900 hover:underline pt-4">Proceed to Sign In</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-neutral-700">New Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900 rounded-lg"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-neutral-700">Confirm New Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 bg-neutral-50/50 border-neutral-200 focus-visible:ring-neutral-900 rounded-lg"
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 mt-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium shadow-md transition-all rounded-xl"
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
