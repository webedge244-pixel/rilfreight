"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@rilfreight.com");
  const [password, setPassword] = React.useState("••••••••••••");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Demo authentication simulation (Firebase Auth will be wired here)
    setTimeout(() => {
      setIsLoading(false);
      router.push("/admin/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white dark:bg-[#0a0a0a] p-6 sm:p-10">
      {/* Top Header Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
        >
          ← Return to Public Site
        </Link>
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          RIL Secure Terminal v1.0
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-8 sm:p-10 border border-slate-200/80 dark:border-slate-800">
          {/* Brand Header */}
          <div className="mb-8">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-2xl font-black tracking-wider text-black dark:text-white leading-none">
                RILFREIGHT
              </span>
              <span className="text-2xl font-black text-[#BA1C20] leading-none">.</span>
            </div>
            <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Operations Admin Console
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Operator Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rilfreight.com"
                className="w-full font-mono px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full font-mono px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#BA1C20] rounded"
                />
                Remember this terminal
              </label>
              <span className="text-slate-400">Demo Active</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-sm font-bold uppercase tracking-wider transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Sign In to Dispatch Console"}
            </button>
          </form>

          {/* Demo Note */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400 font-mono">
              Demo Credentials: Any email / password
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 font-mono">
        © 2026 RILFREIGHT Express Logistics • Administrative Security
      </div>
    </div>
  );
}
