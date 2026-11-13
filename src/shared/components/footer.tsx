"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUp,
  ArrowUpRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from "lucide-react";

interface FooterProps {
  embedded?: boolean;
}

export function Footer({ embedded = false }: FooterProps) {
  const handleScrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      className={`w-full text-slate-300 relative overflow-hidden ${
        embedded ? "bg-transparent border-t-0" : "bg-[#0F313A] border-t border-[#1a434e]"
      }`}
    >
      {/* Main 4-Column Footer Container matching reference */}
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-12">
          {/* Column 1: Brand, Socials & Stylized "since 2000" (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              {/* Brand Logo */}
              <Link
                href="/"
                className="inline-flex items-center group select-none mb-6"
                aria-label="RILFREIGHT Homepage"
              >
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-black tracking-wider text-white flex items-center leading-none">
                    RILFREIGHT
                    <span className="text-[#BA1C20] ml-0.5">.</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#BA1C20] leading-none mt-0.5">
                    Express Logistics
                  </span>
                </div>
              </Link>

              {/* Social Media Links */}
              <div></div>
            </div>

            {/* Stylized Outlined Text "since 2000" */}
            <div className="select-none pt-4">
              <span
                className="text-4xl sm:text-5xl font-black uppercase tracking-wider block opacity-40 hover:opacity-60 transition-opacity"
                style={{
                  WebkitTextStroke: "1.5px #BA1C20",
                  color: "transparent",
                }}
              >
                since 2000
              </span>
            </div>
          </div>

          {/* Column 2: Contacts (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <h3 className="text-base font-bold text-white mb-4">
              Contacts
            </h3>
            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                RILFREIGHT, USA, New York – 1060 Str. First Avenue 1
              </p>
              <div className="space-y-1">
                <a
                  href="tel:+13685678954"
                  className="block text-white hover:text-[#BA1C20] transition-colors underline underline-offset-2"
                >
                  +1 (368) 567 89 54
                </a>
                <a
                  href="tel:+8003508431"
                  className="block text-white hover:text-[#BA1C20] transition-colors underline underline-offset-2"
                >
                  +800 350 84 31
                </a>
              </div>
              <div>
                <a
                  href="mailto:support@rilfreight.com"
                  className="text-white hover:text-[#BA1C20] transition-colors underline underline-offset-2"
                >
                  support@rilfreight.com
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Company (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-base font-bold text-white mb-4">
              Company
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              {[
                { label: "About", href: "/about" },
                { label: "Expertise", href: "/#expertise" },
                { label: "Sustainability", href: "/#services" },
                { label: "News & Media", href: "/#blog" },
                { label: "Case Studies", href: "/#special-services" },
                { label: "Contacts", href: "/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Services (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <h3 className="text-base font-bold text-white mb-4">
              Services
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              {[
                { label: "Air Freight", href: "/#services" },
                { label: "Sea Freight", href: "/#services" },
                { label: "Land Transport", href: "/#services" },
                { label: "Groupage", href: "/#services" },
                { label: "Consultancy", href: "/contact" },
                { label: "Value Added Services", href: "/#special-services" },
              ].map((service) => (
                <li key={service.label}>
                  <Link
                    href={service.href}
                    className="hover:text-white transition-colors"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Sub-Footer Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>©RILFREIGHT 2026. All rights reserved.</p>

          <div className="flex items-center gap-6 text-slate-400">
            <Link
              href="/#terms"
              className="hover:text-white transition-colors"
            >
              Terms of use
            </Link>
            <Link
              href="/#privacy"
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/#environmental"
              className="hover:text-white transition-colors"
            >
              Environmental Policy
            </Link>
          </div>

          {/* Scroll to Top Square Button in Red */}
          <button
            type="button"
            onClick={handleScrollToTop}
            aria-label="Scroll to top"
            className="w-10 h-10 rounded-xl bg-[#BA1C20] text-white hover:bg-[#9c171a] flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </footer>
  );
}
