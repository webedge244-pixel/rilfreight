"use client";

import { getAuth, type Auth } from "firebase/auth";
import { app } from "@/shared/lib/firebase";

/**
 * Lazily created browser Auth instance.
 *
 * The instance is created on first use rather than at module scope so that
 * `getAuth` never runs during server rendering, where there is no browser
 * session to attach to.
 */

let authInstance: Auth | null = null;

/**
 * Returns the Firebase Auth instance for the browser.
 */
export function getClientAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}
