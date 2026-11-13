/**
 * Operations allowlist.
 *
 * A comma-separated list of e-mail addresses that are authorised to operate the
 * admin console:
 *
 *   NEXT_PUBLIC_PERMITTED_EMAILS=webedge244@gmail.com,hs@gmail.com
 *
 * Whitespace around each entry is tolerated and comparison is case-insensitive.
 * `PERMITTED_EMAILS` is accepted as a server-side fallback.
 *
 * The list is read on both sides of the wire:
 *
 *   - the browser runs a pre-check so an unauthorised operator gets an
 *     immediate answer instead of a round trip;
 *   - the server re-checks the address before a session cookie is minted.
 *
 * The server check is the one that grants access. The browser copy is only
 * ever a convenience, so it degrades to "defer to the server" whenever the
 * allowlist is not visible on the client — it never rejects on its own.
 */

/**
 * Reads the allowlist from the environment.
 */
export function getPermittedEmails(): Set<string> {
  const raw =
    process.env.NEXT_PUBLIC_PERMITTED_EMAILS ??
    process.env.PERMITTED_EMAILS ??
    "";

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  );
}

/**
 * Strict allowlist check. Returns false when the list is empty.
 *
 * Use this on the server, where an empty list must mean "nobody is allowed".
 */
export function isPermittedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getPermittedEmails().has(email.trim().toLowerCase());
}

/**
 * Lenient allowlist check for the browser.
 *
 *   true  — the e-mail is on the allowlist
 *   false — the e-mail is definitely not on the allowlist
 *   null  — no allowlist is available on this side; defer to the server
 */
export function checkPermittedEmail(
  email: string | null | undefined
): boolean | null {
  if (!email) return false;

  const allowed = getPermittedEmails();
  if (allowed.size === 0) return null;

  return allowed.has(email.trim().toLowerCase());
}
