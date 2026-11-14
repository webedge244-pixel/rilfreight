import * as React from "react";
import { ServiceCapabilitiesConfig } from "../types";

interface ServiceCapabilitiesGridProps {
  config: ServiceCapabilitiesConfig;
}

export function ServiceCapabilitiesGrid({
  config,
}: ServiceCapabilitiesGridProps) {
  return (
    <section className="w-full">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-[#BA1C20] font-black text-xs sm:text-sm uppercase tracking-widest select-none">
            {config.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F313A] tracking-tight uppercase leading-[1.1]">
            {config.headline}
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* 6 Capability Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {config.items.map((item, idx) => (
            <div
              key={item.title}
              className="bg-white rounded-3xl p-7 sm:p-8 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  {item.tag && (
                    <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-[#0F313A] group-hover:bg-[#0F313A] group-hover:text-white transition-colors">
                      {item.tag}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-slate-400">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-[#0F313A] tracking-tight leading-snug">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-[#BA1C20] transition-colors">
                <span>Verified Standard</span>
                <span className="inline-block transform group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
