"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Settings, X, LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ADMIN_NAV_LINKS } from "@/shared/lib/demoData";
import { useAdminAuth } from "@/features/auth/AdminAuthProvider";

/**
 * Page title derived from the current pathname.
 */
function getPageTitle(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/dashboard") return "DASHBOARD";
  if (pathname === "/admin/shipments/new") return "NEW SHIPMENT";
  if (pathname.startsWith("/admin/shipments/")) return "SHIPMENT";
  if (pathname === "/admin/shipments") return "SHIPMENTS";
  if (pathname === "/admin/users") return "USERS";
  if (pathname === "/admin/email") return "SEND EMAIL";
  if (pathname === "/admin/settings") return "SETTINGS";
  return "ADMIN";
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [slideOutOpen, setSlideOutOpen] = React.useState(false);
  const pageTitle = getPageTitle(pathname);
  const { email, displayName, initial, signOutAdmin } = useAdminAuth();

  const handleSignOut = React.useCallback(async () => {
    setSlideOutOpen(false);
    setMenuOpen(false);
    await signOutAdmin();
    router.replace("/admin/login");
  }, [signOutAdmin, router]);

  // Close menu on route change
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setSlideOutOpen(false);
  }

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }
    if (href === "/admin/shipments") {
      return pathname === "/admin/shipments";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="lg:hidden w-full relative">
      {/* Invisible spacer matching the collapsed pill height so page flow is reserved */}
      <div className="h-[60px] w-full" />

      {/* Floating Top Bar: Clean Rounded Rectangle (Not a circle), Expanding Directly Downwards */}
      <motion.div
        initial={false}
        animate={{
          height: menuOpen ? "calc(100dvh - 20px)" : "60px",
        }}
        transition={{
          duration: 0.32,
          ease: [0.16, 1, 0.3, 1], // Smooth, fluid downward expansion without jumping or centering
        }}
        style={{ transformOrigin: "top" }}
        className={cn(
          "fixed top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-50 rounded-xl bg-white dark:bg-[#121619] overflow-hidden flex flex-col justify-between origin-top",
          menuOpen ? "p-6 sm:p-7 shadow-2xl" : "px-6 py-3.5"
        )}
      >
        {/* Top Header Row: Larger Page Title + Morphing Hamburger-to-X Icon */}
        <div className="flex items-center justify-between shrink-0 h-[32px]">
          <span className="text-base sm:text-lg font-black uppercase tracking-tight text-black dark:text-white select-none">
            {pageTitle}
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="w-9 h-9 flex items-center justify-center text-black dark:text-white hover:opacity-80 transition-opacity"
          >
            {/* Absolutely Centered Morphing Hamburger / Symmetrical X */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <motion.span
                animate={{
                  rotate: menuOpen ? 45 : 0,
                  y: menuOpen ? 0 : -6,
                }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="absolute w-5 h-[2px] bg-black dark:bg-white rounded-full"
              />
              <motion.span
                animate={{
                  opacity: menuOpen ? 0 : 1,
                  scaleX: menuOpen ? 0 : 1,
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="absolute w-5 h-[2px] bg-black dark:bg-white rounded-full"
              />
              <motion.span
                animate={{
                  rotate: menuOpen ? -45 : 0,
                  y: menuOpen ? 0 : 6,
                }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="absolute w-5 h-[2px] bg-black dark:bg-white rounded-full"
              />
            </div>
          </button>
        </div>

        {/* Expanded Navigation Content (Revealed during downward expansion, NO DIVIDERS) */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="flex-1 flex flex-col justify-between pt-8 overflow-y-auto custom-scrollbar"
          >
            <div>
              {/* Profile Greeting */}
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0"
                  title={email ?? undefined}
                >
                  {initial}
                </div>
                <span className="text-base font-semibold text-black dark:text-white">
                  {displayName ?? "Admin"}
                </span>
              </div>

              {/* Navigation Rail with Enlarged Bold Typography (NO DIVIDERS) */}
              <nav aria-label="Mobile Admin Navigation">
                <ul className="space-y-4 sm:space-y-5">
                  {ADMIN_NAV_LINKS.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "block py-3 px-2 font-black uppercase tracking-tight text-2xl sm:text-3xl transition-colors relative leading-none",
                            active
                              ? "text-[#0F313A] dark:text-white"
                              : "text-black dark:text-white/70"
                          )}
                        >
                          {link.label}
                          {active && (
                            <span className="absolute -bottom-1 left-2 right-2 h-[4px] bg-[#BA1C20] rounded-full" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Bottom-Right Corner Cutout Tab -> Full-Width Expansion */}
            <motion.div
              layout
              initial={false}
              animate={{
                width: slideOutOpen ? "100%" : "58px",
                height: slideOutOpen ? "auto" : "58px",
                borderRadius: slideOutOpen ? "12px 12px 0px 0px" : "32px 0px 0px 0px",
              }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "absolute bottom-0 right-0 z-30 overflow-hidden bg-[#BA1C20] text-white shadow-lg",
                slideOutOpen ? "w-full p-4 left-0" : "flex items-center justify-center cursor-pointer hover:bg-[#9c171a]"
              )}
              onClick={!slideOutOpen ? () => setSlideOutOpen(true) : undefined}
            >
              {!slideOutOpen ? (
                <button
                  type="button"
                  title="Account & Settings"
                  aria-label="Open settings and account menu"
                  className="w-full h-full flex items-center justify-center pt-1.5 pl-1.5"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
              ) : (
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSlideOutOpen(false);
                      }}
                      aria-label="Close settings menu"
                      className="w-6 h-6 flex items-center justify-center text-white/80 hover:text-white rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleSignOut();
                    }}
                    className="flex items-center gap-2 w-full text-left py-2 px-2 rounded-lg text-lg font-black uppercase tracking-tight text-white hover:bg-white/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
