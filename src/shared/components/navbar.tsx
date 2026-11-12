"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Search,
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
    href: "/#services",
    hasDropdown: true,
    children: [
      { label: "Ocean Freight", href: "/#services" },
      { label: "Air Cargo Express", href: "/#services" },
      { label: "Intermodal Rail", href: "/#services" },
      { label: "Road Freight Transport", href: "/#services" },
      { label: "Cold-Chain Life Sciences", href: "/#special-services" },
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
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
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
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 min-w-[220px]">
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
        {/* Search Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-12 h-12 flex items-center justify-center rounded-full text-slate-700 hover:text-[#0F313A] bg-slate-100/80 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA1C20]"
            aria-label="Search site"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Quick Search Popover */}
          {searchOpen && (
            <div className="absolute right-0 top-14 z-50 w-72 bg-white p-2.5 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-top-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracking, corridors..."
                  className="w-full text-xs py-1.5 px-2 bg-transparent focus:outline-none text-slate-800"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Close search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* User Profile */}
        <Link
          href="/#account"
          className="w-12 h-12 hidden sm:flex items-center justify-center rounded-full text-slate-700 hover:text-[#0F313A] bg-slate-100/80 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA1C20]"
          aria-label="User Account"
        >
          <User className="w-5 h-5" />
        </Link>

        {/* Secondary Crimson Red (#BA1C20) CTA "Track Your Shipment" Button (Twice as big) */}
        <Link
          href="/tracking"
          className="hidden sm:inline-flex items-center justify-center px-9 sm:px-11 py-4 sm:py-4.5 rounded-full bg-[#BA1C20] hover:bg-[#9c171a] text-white text-base sm:text-lg font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BA1C20] focus-visible:ring-offset-2"
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

  const renderMobileDrawer = () => (
    mobileMenuOpen && (
      <div className="lg:hidden bg-white/98 backdrop-blur-lg px-4 pt-4 pb-6 shadow-xl border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
        <nav aria-label="Mobile Navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const isOpen = activeDropdown === item.label;

            return (
              <div key={item.label} className="border-b border-slate-50 last:border-0">
                {item.hasDropdown ? (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDropdown(isOpen ? null : item.label)
                      }
                      className={cn(
                        "w-full flex items-center justify-between py-3 px-3 rounded-xl text-sm font-medium transition-colors",
                        active
                          ? "bg-slate-100 text-[#0F313A] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform",
                          isOpen && "rotate-180 text-[#0F313A]"
                        )}
                      />
                    </button>

                    {isOpen && item.children && (
                      <div className="pl-4 pr-2 pb-2 space-y-1 bg-slate-50/60 rounded-b-xl">
                        {item.children.map((sub) => (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 px-3 text-xs font-medium text-slate-600 hover:text-[#0F313A] rounded-lg transition-colors"
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
                      "block py-3 px-3 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-slate-100 text-[#0F313A] font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Mobile CTA */}
        <div className="pt-4 mt-2">
          <Link
            href="/tracking"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center py-3.5 px-6 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-base font-bold transition-all shadow-xs active:scale-[0.99]"
          >
            Track Your Shipment
          </Link>
        </div>
      </div>
    )
  );

  return (
    <>
      {/* 1. INITIAL STATIC NAVBAR: Sits in document flow, fully scrollable with page */}
      <header className="relative w-full bg-white z-40 transition-colors">
        {renderNavContent()}
        {renderMobileDrawer()}
      </header>

      {/* 2. ANIMATED FIXED NAVBAR: Slides down smoothly via Motion once initial navbar scrolls off-screen */}
      <AnimatePresence>
        {isScrolledPast && (
          <motion.header
            key="fixed-navbar"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-md shadow-md"
          >
            {renderNavContent()}
            {renderMobileDrawer()}
          </motion.header>
        )}
      </AnimatePresence>
    </>
  );
}
