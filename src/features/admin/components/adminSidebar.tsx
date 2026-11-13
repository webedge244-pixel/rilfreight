"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Settings, X, LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ADMIN_NAV_LINKS } from "@/shared/lib/demoData";

// Icon definition for collapsed mode (Image 2 reference)
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/admin/dashboard": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  "/admin/shipments": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  "/admin/shipments/new": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  "/admin/users": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "/admin/email": (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [slideOutOpen, setSlideOutOpen] = React.useState(false);

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
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col h-full rounded-xl bg-white dark:bg-[#121619] justify-between transition-all duration-300 shrink-0 relative overflow-hidden",
        isCollapsed ? "w-[76px] p-3 items-center" : "w-[256px] xl:w-[280px] p-5 xl:p-6"
      )}
    >
      {/* Top Header Block & Collapse Toggle */}
      <div className={cn("w-full", isCollapsed && "flex flex-col items-center")}>
        <div
          className={cn(
            "flex items-center mb-8",
            isCollapsed ? "flex-col gap-3 justify-center" : "justify-between"
          )}
        >
          {/* Profile & Greeting */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">
              A
            </div>
            {!isCollapsed && (
              <span className="text-sm font-semibold text-black dark:text-white truncate">
                Hello Admin
              </span>
            )}
          </div>

          {/* Shrink / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation Rail */}
        <nav aria-label="Admin Navigation" className="w-full">
          <ul className="space-y-4 sm:space-y-5 w-full">
            {ADMIN_NAV_LINKS.map((link) => {
              const active = isActive(link.href);
              const icon = NAV_ICONS[link.href];

              if (isCollapsed) {
                // Collapsed: Compact pill button with centered icon (Image 2 style)
                return (
                  <li key={link.href} className="w-full flex justify-center">
                    <Link
                      href={link.href}
                      title={link.label}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative group",
                        active
                          ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      {icon}
                      {/* Active indicator dot on collapsed rail */}
                      {active && (
                        <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-[#BA1C20] rounded-full" />
                      )}
                    </Link>
                  </li>
                );
              }

              // Expanded: Full bold uppercase text link with Crimson Red underline
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "block py-3.5 sm:py-4 px-2.5 font-black uppercase tracking-tight text-xl xl:text-2xl whitespace-nowrap transition-colors relative leading-none",
                      active
                        ? "text-[#0F313A] dark:text-white"
                        : "text-black dark:text-white/70 hover:text-[#0F313A] dark:hover:text-white"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-0.5 left-2.5 right-2.5 h-[3.5px] bg-[#BA1C20] rounded-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom-Right Corner Cutout Tab -> Full-Width Expansion */}
      {isCollapsed ? (
        <div className="absolute bottom-0 right-0 z-30 w-[52px] h-[52px] rounded-tl-[32px] overflow-hidden bg-[#BA1C20] text-white shadow-lg flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/admin/login";
            }}
            title="Log Out"
            aria-label="Log Out"
            className="w-full h-full flex items-center justify-center pt-1.5 pl-1.5 hover:bg-[#9c171a] transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-white" />
          </button>
        </div>
      ) : (
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
              title="Account & Log Out"
              aria-label="Open account menu"
              className="w-full h-full flex items-center justify-center pt-1.5 pl-1.5"
            >
              <LogOut className="w-5 h-5 text-white" />
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
                  aria-label="Close menu"
                  className="w-6 h-6 flex items-center justify-center text-white/80 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSlideOutOpen(false);
                  window.location.href = "/admin/login";
                }}
                className="flex items-center gap-2 w-full text-left py-2 px-2 rounded-lg text-lg xl:text-xl font-black uppercase tracking-tight text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </aside>
  );
}
