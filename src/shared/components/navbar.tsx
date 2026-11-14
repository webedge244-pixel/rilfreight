"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  User,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/shared/lib/utils";

interface NavItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/",
    hasDropdown: false,
  },
  {
    label: "Services",
    href: "/services",
    hasDropdown: true,
    children: [
      { label: "Ocean Freight", href: "/services/ocean-freight" },
      { label: "Air Cargo Express", href: "/services/air-cargo" },
      { label: "Intermodal Rail", href: "/services/intermodal-rail" },
      { label: "Road Freight Transport", href: "/services/road-freight" },
      { label: "Cold Chain Logistics", href: "/services/cold-chain" },
      { label: "Life Sciences & Healthcare", href: "/services/life-sciences" },
    ],
  },
  {
    label: "About",
    href: "/about",
    hasDropdown: false,
  },
  {
    label: "Contacts",
    href: "/contact",
    hasDropdown: false,
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Scroll detection: determine when natural navbar has scrolled off-screen
  const [isScrolledPast, setIsScrolledPast] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      // Once scrolled past 160px, the natural navbar is out of view
      if (window.scrollY > 160) {
        setIsScrolledPast(true);
      } else {
        setIsScrolledPast(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Reset mobile menu and active dropdown when pathname changes
  const [prevPathname, setPrevPathname] = React.useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }

  const isActive = (item: NavItem) => {
    if (item.href === "/" && pathname === "/") return true;
    if (item.href === "/contact" && pathname === "/contact") return true;
    if (item.href !== "/" && item.href !== "/contact" && pathname.startsWith(item.href)) {
      return true;
    }
    return false;
  };

  const renderNavContent = () => (
    <div className="max-w-[1760px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-28 sm:h-32 flex items-center justify-between gap-4 sm:gap-6">
      {/* Left Branding Mark: Pure Text Wordmark */}
      <Link
        href="/"
        className="flex items-center group select-none shrink-0"
        aria-label="RILFREIGHT Homepage"
      >
        <div className="flex flex-col">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#0F313A] flex items-center leading-none">
            RILFREIGHT
            <span className="text-[#BA1C20] ml-0.5">.</span>
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 leading-none mt-1">
            Express Logistics
          </span>
        </div>
      </Link>

      {/* Center: Floating Pill Navigation Menu (Desktop >= lg) */}
      <nav
        ref={dropdownRef}
        aria-label="Main Navigation"
        className="hidden lg:flex items-center bg-[#F0F2F5] rounded-full px-6 sm:px-8 py-3 sm:py-3.5 relative"
      >
        <ul className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const isOpen = activeDropdown === item.label;

            return (
              <li key={item.label} className="relative">
                {item.hasDropdown ? (
                  <div
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDropdown(isOpen ? null : item.label)
                      }
                      aria-expanded={isOpen}
                      className={cn(
                        "relative px-5 py-2 text-base lg:text-[17px] font-semibold transition-colors flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0F313A]",
                        active
                          ? "text-[#0F313A] font-bold"
                          : "text-slate-700 hover:text-[#0F313A]"
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform duration-200",
                          isOpen && "rotate-180 text-[#0F313A]"
                        )}
                      />
                      {active && (
                        <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#0F313A] rounded-full" />
                      )}
                    </button>

                    {/* Dropdown Flyout */}
                    {isOpen && item.children && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 min-w-[250px]">
                        <div className="bg-white rounded-2xl p-2 shadow-xl border border-slate-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
                          {item.children.map((sub) => (
                            <Link
                              key={sub.label}
                              href={sub.href}
                              onClick={() => setActiveDropdown(null)}
                              className="block px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-[#0F313A] hover:bg-slate-50 rounded-xl transition-colors"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "relative px-5 py-2 text-base lg:text-[17px] font-semibold transition-colors flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0F313A]",
                      active
                        ? "text-[#0F313A] font-bold"
                        : "text-slate-700 hover:text-[#0F313A]"
                    )}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#0F313A] rounded-full" />
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right Side: Utility Action Icons + Secondary Red Double-Sized CTA Button */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* User Profile */}
        <Link
          href="/#account"
          className="w-12 h-12 hidden sm:flex items-center justify-center rounded-full text-slate-700 hover:text-[#0F313A] bg-slate-100/80 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA1C20]"
          aria-label="User Account"
        >
          <User className="w-5 h-5" />
        </Link>

        {/* Secondary Crimson Red (#BA1C20) CTA "Track Your Shipment" Button (Twice as big) - Desktop only (lg+) */}
        <Link
          href="/tracking"
          className="hidden lg:inline-flex items-center justify-center px-9 sm:px-11 py-4 sm:py-4.5 rounded-full bg-[#BA1C20] hover:bg-[#9c171a] text-white text-base sm:text-lg font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA1C20] focus-visible:ring-offset-2"
        >
          Track Your Shipment
        </Link>

        {/* Mobile Drawer Hamburger Button (< lg) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F313A]"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );

  const renderMobileDropdown = () => (
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          key="mobile-nav-dropdown"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="lg:hidden fixed top-28 sm:top-32 left-0 right-0 bottom-0 z-40 bg-white px-6 py-6 flex flex-col justify-between overflow-y-auto"
        >
          {/* Nav List with Enlarged Bold Typography & Underline Active Indicator */}
          <div className="flex-1 overflow-y-auto py-2">
            <nav aria-label="Mobile Navigation">
              <ul className="space-y-4">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item);
                  const isOpen = activeDropdown === item.label;

                  return (
                    <li key={item.label}>
                      {item.hasDropdown ? (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDropdown(isOpen ? null : item.label)
                            }
                            className={cn(
                              "w-full flex items-center justify-between py-3 px-2 font-black uppercase tracking-tight text-2xl sm:text-3xl transition-colors relative leading-none",
                              active ? "text-[#0F313A]" : "text-slate-900"
                            )}
                          >
                            <span>{item.label}</span>
                            <ChevronDown
                              className={cn(
                                "w-6 h-6 text-slate-400 transition-transform",
                                isOpen && "rotate-180 text-[#0F313A]"
                              )}
                            />
                            {active && (
                              <span className="absolute -bottom-1 left-2 right-2 h-[4px] bg-[#BA1C20] rounded-full" />
                            )}
                          </button>

                          {isOpen && item.children && (
                            <div className="pl-4 pr-2 py-3 space-y-2 bg-slate-50/70 rounded-xl mt-2">
                              {item.children.map((sub) => (
                                <Link
                                  key={sub.label}
                                  href={sub.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block py-2 px-3 text-base font-bold text-slate-700 hover:text-[#BA1C20] transition-colors"
                                >
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "block py-3 px-2 font-black uppercase tracking-tight text-2xl sm:text-3xl transition-colors relative leading-none",
                            active ? "text-[#0F313A]" : "text-slate-900"
                          )}
                        >
                          {item.label}
                          {active && (
                            <span className="absolute -bottom-1 left-2 right-2 h-[4px] bg-[#BA1C20] rounded-full" />
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Bottom Action: Crimson CTA */}
          <div className="pt-4 border-t border-slate-100 shrink-0">
            <Link
              href="/tracking"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center py-4 px-6 rounded-full bg-[#BA1C20] hover:bg-[#9c171a] text-white text-base sm:text-lg font-bold uppercase tracking-tight transition-all shadow-md active:scale-[0.99]"
            >
              Track Your Shipment
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* 1. INITIAL STATIC NAVBAR: Pinned fixed if mobile menu is open, otherwise in-flow */}
      <header
        className={cn(
          "w-full bg-white transition-colors",
          mobileMenuOpen
            ? "fixed top-0 left-0 right-0 z-50 border-b border-slate-100"
            : "relative z-40"
        )}
      >
        {renderNavContent()}
      </header>

      {/* 2. ANIMATED FIXED NAVBAR: Slides down smoothly via Motion once initial navbar scrolls off-screen */}
      <AnimatePresence>
        {isScrolledPast && !mobileMenuOpen && (
          <motion.header
            key="fixed-navbar"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-40 w-full bg-white/95 backdrop-blur-md"
          >
            {renderNavContent()}
          </motion.header>
        )}
      </AnimatePresence>

      {/* 3. FULL-WIDTH FIXED MOBILE DROPDOWN (Directly below header) */}
      {renderMobileDropdown()}
    </>
  );
}
