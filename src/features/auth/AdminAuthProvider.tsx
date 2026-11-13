"use client";

import * as React from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/shared/lib/firebaseAuth";
import { checkPermittedEmail } from "@/shared/lib/permissions";

/**
 * Admin authentication context.
 *
 * Holds the live Firebase session for the console and keeps the server-side
 * session cookie in sync with it:
 *
 *   - on sign-in, the cookie is (re)issued through `/api/admin/session`;
 *   - if the Firebase session disappears — revoked, expired or signed out
 *     elsewhere — the cookie is cleared so `proxy.ts` stops honouring it;
 *   - if the signed-in account is not on the operations allowlist, the
 *     Firebase session is torn down immediately.
 */

export type AdminAuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unauthorized";

export interface AdminAuthContextValue {
  /** Current state of the console session. */
  status: AdminAuthStatus;
  /** Firebase user, when authenticated. */
  user: User | null;
  /** Operator e-mail, when authenticated. */
  email: string | null;
  /** Display name for the console chrome. */
  displayName: string | null;
  /** Single-letter avatar initial. */
  initial: string;
  /** Signs the operator out of both Firebase and the server session. */
  signOutAdmin: () => Promise<void>;
}

const AdminAuthContext = React.createContext<AdminAuthContextValue | undefined>(
  undefined
);

/**
 * Asks the server to (re)issue the admin session cookie.
 */
async function issueSessionCookie(user: User, remember = false): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, remember }),
    });
  } catch {
    // Non-fatal. `proxy.ts` still refuses the route without a valid cookie,
    // so a failed refresh simply sends the operator back to the sign-in page.
  }
}

/**
 * Clears the server session cookie.
 */
async function clearSessionCookie(): Promise<void> {
  try {
    await fetch("/api/admin/session", { method: "DELETE" });
  } catch {
    // Non-fatal — the cookie expires on its own if this request never lands.
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AdminAuthStatus>("loading");
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(
      getClientAuth(),
      async (firebaseUser) => {
        if (cancelled) return;

        if (!firebaseUser) {
          setUser(null);
          setStatus("unauthenticated");
          await clearSessionCookie();
          return;
        }

        // The browser allowlist is a convenience only. When it is not visible
        // client-side the decision is deferred to the server, which is the
        // gate that actually grants access.
        if (checkPermittedEmail(firebaseUser.email) === false) {
          await firebaseSignOut(getClientAuth());
          setUser(null);
          setStatus("unauthorized");
          await clearSessionCookie();
          return;
        }

        setUser(firebaseUser);
        setStatus("authenticated");
        await issueSessionCookie(firebaseUser);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signOutAdmin = React.useCallback(async () => {
    await firebaseSignOut(getClientAuth());
    await clearSessionCookie();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const email = user?.email ?? null;
  const displayName =
    user?.displayName?.trim() || email?.split("@")[0] || null;

  const value = React.useMemo<AdminAuthContextValue>(
    () => ({
      status,
      user,
      email,
      displayName,
      initial: (displayName || email || "A").charAt(0).toUpperCase(),
      signOutAdmin,
    }),
    [status, user, email, displayName, signOutAdmin]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

/**
 * Consumes the admin authentication context.
 */
export function useAdminAuth(): AdminAuthContextValue {
  const context = React.useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
