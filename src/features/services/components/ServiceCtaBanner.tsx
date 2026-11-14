import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ServiceCtaConfig } from "../types";

interface ServiceCtaBannerProps {
  config: ServiceCtaConfig;
}

export function ServiceCtaBanner({ config }: ServiceCtaBannerProps) {
  return (
    <section className="w-full">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="relative rounded-3xl md:rounded-[40px] bg-[#0F313A] text-white p-8 sm:p-12 md:p-16 overflow-hidden">
          {/* Subtle Background Accent Gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#BA1C20]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-[#BA1C20] font-black text-xs uppercase tracking-widest">
              {config.badge}
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase leading-[1.1]">
              {config.headline}
            </h2>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              {config.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={config.primaryCta.href}
                className="group inline-flex items-center gap-3 bg-[#BA1C20] hover:bg-[#9c171a] text-white rounded-full pl-8 pr-3 py-2.5 font-bold text-base transition-all shadow-lg active:scale-95"
              >
                <span>{config.primaryCta.text}</span>
                <span className="w-9 h-9 rounded-full bg-white text-[#BA1C20] flex items-center justify-center transition-all transform group-hover:rotate-45">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </span>
              </Link>

              {config.secondaryCta && (
                <Link
                  href={config.secondaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 text-white font-bold text-base transition-all"
                >
                  {config.secondaryCta.text}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
