import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ServiceStatementConfig } from "../types";

interface ServiceStatementSectionProps {
  config: ServiceStatementConfig;
}

export function ServiceStatementSection({
  config,
}: ServiceStatementSectionProps) {
  return (
    <section className="w-full">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* Left Column: Overline Badge + Giant Nautical Headline */}
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-block text-[#BA1C20] font-black text-xs sm:text-sm uppercase tracking-widest select-none">
              {config.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F313A] tracking-tight uppercase leading-[1.1]">
              {config.headline}
            </h2>
          </div>

          {/* Right Column: Deep Copy + Primary CTA to /contact */}
          <div className="lg:col-span-6 space-y-6 text-slate-600 text-base sm:text-lg leading-relaxed">
            <p>{config.description}</p>
            {config.secondaryDescription && (
              <p className="text-slate-500 text-sm sm:text-base">
                {config.secondaryDescription}
              </p>
            )}

            <div className="pt-2">
              <Link
                href={config.ctaHref}
                className="group inline-flex items-center gap-3 bg-[#0F313A] hover:bg-[#0b252c] text-white rounded-full pl-7 pr-2.5 py-2 font-bold text-sm sm:text-base transition-all shadow-md active:scale-95"
              >
                <span>{config.ctaText}</span>
                <span className="w-10 h-10 rounded-full bg-[#BA1C20] text-white flex items-center justify-center group-hover:bg-[#9c171a] transition-all transform group-hover:rotate-45">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
