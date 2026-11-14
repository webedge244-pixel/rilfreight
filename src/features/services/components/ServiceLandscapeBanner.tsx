import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ServiceLandscapeConfig } from "../types";

interface ServiceLandscapeBannerProps {
  config: ServiceLandscapeConfig;
}

export function ServiceLandscapeBanner({
  config,
}: ServiceLandscapeBannerProps) {
  return (
    <section className="w-full relative min-h-[320px] md:min-h-[420px] overflow-hidden group">
      {/* Background Logistics Image */}
      <Image
        src={config.image}
        alt={config.imageAlt}
        fill
        className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
      />

      {/* Dark Teal Gradient Contrast Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F313A]/90 via-[#0F313A]/75 to-[#0F313A]/60 backdrop-blur-[0.5px]" />

      {/* Content Container */}
      <div className="relative z-10 max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 flex flex-col justify-center min-h-[320px] md:min-h-[420px]">
        <div className="max-w-3xl space-y-4">
          <div className="w-12 h-1 bg-[#BA1C20] rounded-full mb-4" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase leading-tight">
            {config.headline}
          </h2>
          {config.subheadline && (
            <p className="text-slate-200 text-base sm:text-lg font-medium leading-relaxed">
              {config.subheadline}
            </p>
          )}

          {config.ctaText && config.ctaHref && (
            <div className="pt-4">
              <Link
                href={config.ctaHref}
                className="group inline-flex items-center gap-3 bg-[#BA1C20] hover:bg-[#9c171a] text-white rounded-full pl-7 pr-2.5 py-2 font-bold text-sm sm:text-base transition-all shadow-lg active:scale-95"
              >
                <span>{config.ctaText}</span>
                <span className="w-9 h-9 rounded-full bg-white text-[#BA1C20] flex items-center justify-center transition-all transform group-hover:rotate-45">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
