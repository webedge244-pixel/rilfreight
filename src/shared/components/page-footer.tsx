"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Footer } from "./footer";

export function PageFooter() {
  return (
    <div className="w-full bg-[#0F313A] text-white rounded-t-[36px] md:rounded-t-[48px] mt-24 sm:mt-28 lg:mt-32 relative">
      {/* Customer Hotline Callout */}
      <section
        className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-10"
        aria-label="Customer Hotline Callout"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12 border-b border-white/10">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              Have any questions?
              <br />
              <span className="text-[#BA1C20]">
                Call us +1 800 555-RILF
              </span>
            </h2>
          </div>
          <div className="shrink-0">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-full pl-7 pr-2.5 py-2 text-white font-bold text-sm sm:text-base transition-all active:scale-95"
            >
              <span>Contact us</span>
              <span className="w-10 h-10 rounded-full bg-[#BA1C20] text-white flex items-center justify-center group-hover:bg-[#9c171a] transition-all transform group-hover:rotate-45">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Embedded Footer */}
      <Footer embedded={true} />
    </div>
  );
}