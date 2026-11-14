import * as React from "react";
import Image from "next/image";
import Link from "next/link";

interface ServiceHeroBannerProps {
  title: string;
  heroImage: string;
  heroImageAlt: string;
  breadcrumbTitle: string;
}

export function ServiceHeroBanner({
  title,
  heroImage,
  heroImageAlt,
  breadcrumbTitle,
}: ServiceHeroBannerProps) {
  return (
    <section
      aria-label={`${title} Header Banner`}
      className="w-full relative min-h-[340px] md:min-h-[420px] overflow-hidden group"
    >
      {/* Background Logistics Image */}
      <Image
        src={heroImage}
        alt={heroImageAlt}
        fill
        priority
        className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
      />

      {/* Subtle Nautical Teal Contrast Overlay */}
      <div className="absolute inset-0 bg-[#0F313A]/55 backdrop-blur-[1px]" />

      {/* Inner Container Constrained to max-w-[1760px] */}
      <div className="relative z-10 max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex flex-col justify-between h-full min-h-[340px] md:min-h-[420px]">
        <div />

        {/* Giant Monolithic Uppercase Headline */}
        <div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase leading-none select-none drop-shadow-sm">
            {title}
          </h1>
        </div>

        {/* Floating Breadcrumb Pill */}
        <div>
          <nav
            aria-label="Breadcrumb"
            className="inline-flex items-center gap-2 bg-white text-[#0F313A] px-5 py-2 rounded-full text-xs sm:text-sm font-semibold select-none shadow-sm"
          >
            <Link href="/" className="hover:text-[#BA1C20] transition-colors">
              Home
            </Link>
            <span className="text-slate-400">/</span>
            <Link
              href="/services"
              className="hover:text-[#BA1C20] transition-colors"
            >
              Services
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-bold">{breadcrumbTitle}</span>
          </nav>
        </div>
      </div>
    </section>
  );
}
