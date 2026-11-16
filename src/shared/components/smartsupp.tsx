"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    _smartsupp?: {
      key?: string;
      [key: string]: unknown;
    };
    smartsupp?: {
      (...args: unknown[]): void;
      _?: unknown[];
    };
  }
}

function initSmartsupp(key: string) {
  if (typeof window === "undefined" || window.smartsupp) return;

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = key;

  (function (d: Document) {
    const s = d.getElementsByTagName("script")[0];
    const c = d.createElement("script");
    c.type = "text/javascript";
    c.charset = "utf-8";
    c.async = true;
    c.src = "https://www.smartsuppchat.com/loader.js?";
    if (s && s.parentNode) {
      s.parentNode.insertBefore(c, s);
    } else {
      d.head.appendChild(c);
    }
  })(document);
}

export function SmartsuppChat() {
  const pathname = usePathname();
  const smartsuppKey = process.env.NEXT_PUBLIC_SMARTSUPP_KEY;

  // Determine if the current route or host is admin
  const isAdmin = React.useMemo(() => {
    if (!pathname) return false;
    const isSubdomain =
      typeof window !== "undefined" &&
      window.location.hostname.startsWith("admin.");
    return (
      pathname.startsWith("/admin") ||
      pathname === "/login" ||
      isSubdomain
    );
  }, [pathname]);

  React.useEffect(() => {
    if (!smartsuppKey) return;

    if (isAdmin) {
      // Hide widget if an operator visits admin screens
      if (typeof window !== "undefined" && window.smartsupp) {
        window.smartsupp("chat:hide");
      }
      return;
    }

    // Initialize on public/user screens
    if (typeof window !== "undefined") {
      if (!window.smartsupp) {
        initSmartsupp(smartsuppKey);
      } else {
        window.smartsupp("chat:show");
      }

      // Notify Smartsupp of page change on SPA navigation
      const timer = setTimeout(() => {
        if (window.smartsupp) {
          window.smartsupp("variables", {
            "Current Page": pathname,
            "Page Title": document.title || pathname,
          });
          try {
            window.smartsupp("url", window.location.href);
          } catch {
            // Fallback if specific method isn't available in the current widget version
          }
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [isAdmin, pathname, smartsuppKey]);

  return null;
}
