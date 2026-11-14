"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import { getClientAuth } from "@/shared/lib/firebaseAuth";
import { checkPermittedEmail } from "@/shared/lib/permissions";

/**
 * Admin sign-in.
 *
 * The operator's e-mail must appear on the operations allowlist
 * (`NEXT_PUBLIC_PERMITTED_EMAILS`). The check runs twice on purpose:
 *
 *   1. here, before the Firebase sign-in call, so an unauthorised account is
 *      rejected immediately;
 *   2. on the server, in `/api/admin/session`, which is the check that
 *      actually grants access.
 */

/**
 * Resolves the post-login destination. Only internal admin paths are allowed
 * so the `next` parameter cannot be used as an open redirect.
 */
function resolveNextPath(raw: string | null): string {
  if (!raw) return "/admin/dashboard";
  if (!raw.startsWith("/admin")) return "/admin/dashboard";
  if (raw.startsWith("//") || raw.startsWith("/admin/login")) {
    return "/admin/dashboard";
  }
  return raw;
}

/**
 * Maps Firebase auth error codes onto operator-facing copy.
 */
function describeAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Those operator credentials were not recognised.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/user-disabled":
      return "This operator account has been disabled.";
    case "auth/operation-not-allowed":
      return "Email and password sign-in is not enabled for this project.";
    default:
      return (
        (error as Error | null)?.message ||
        "Sign-in could not be completed. Please try again."
      );
  }
}

export default function AdminLoginPage() {
  return (
    <React.Suspense
      fallback={<div className="min-h-screen bg-white dark:bg-[#0a0a0a]" />}
    >
      <AdminLoginContent />
    </React.Suspense>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const nextPath = resolveNextPath(searchParams.get("next"));

  // An operator who already holds a valid Firebase session skips the form.
  // The server stays the authority: the console is only entered once it has
  // confirmed the session is authorised.
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      getClientAuth(),
      async (firebaseUser) => {
        if (!firebaseUser) return;

        if (checkPermittedEmail(firebaseUser.email) === false) {
          await signOut(getClientAuth());
          return;
        }

        try {
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch("/api/admin/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (response.ok) {
            router.replace(nextPath);
          }
        } catch {
          // Leave the form in place so the operator can sign in explicitly.
        }
      }
    );

    return unsubscribe;
  }, [router, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const operatorEmail = email.trim().toLowerCase();

    // Gate 1 — allowlist pre-check, before any credentials leave the browser.
    // When the allowlist is not visible client-side this defers to the server.
    if (checkPermittedEmail(operatorEmail) === false) {
      setErrorMessage(
        "This account is not on the operations allowlist and cannot sign in."
      );
      return;
    }

    setIsLoading(true);

    try {
      const clientAuth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        clientAuth,
        operatorEmail,
        password
      );

      const idToken = await credential.user.getIdToken();

      // Gate 2 — the server verifies the token and re-checks the allowlist
      // before minting the session cookie.
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, remember: rememberMe }),
      });

      if (response.status === 403) {
        await signOut(clientAuth);
        setErrorMessage(
          "This account is not on the operations allowlist and cannot sign in."
        );
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Unable to establish an admin session.");
      }

      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(describeAuthError(error));
    } finally {
      setIsLoading(false);
    }
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
      </div>

      {/* Main Login Form Directly on Canvas Background */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto px-4 sm:px-0 py-8">
        {/* Brand Header */}
        <div className="mb-8 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-2">
            <span className="text-2xl font-black tracking-wider text-black dark:text-white leading-none">
              RILFREIGHT
            </span>
            <span className="text-2xl font-black text-[#BA1C20] leading-none">.</span>
          </div>
          <h1 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@rilfreight.com"
              className="w-full font-mono px-4 py-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/40 border-0"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Security Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full font-mono px-4 py-3.5 pr-12 rounded-2xl bg-slate-100/90 dark:bg-slate-900 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/40 border-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-black dark:hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#0F313A] rounded"
              />
              Remember this terminal
            </label>
            <span className="text-slate-400">Access Controlled</span>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="text-xs font-medium text-[#BA1C20] leading-relaxed"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-[#0F313A] dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Access Notice */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-900 text-center">
          <p className="text-xs text-slate-400 font-mono">
            Access restricted to authorised operations personnel.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 font-mono">
        © 2026 RILFREIGHT Express Logistics • Administrative Security
      </div>
    </div>
  );
}
