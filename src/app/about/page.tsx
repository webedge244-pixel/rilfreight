"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/shared/components/navbar";
import { PageFooter } from "@/shared/components/page-footer";

const COMPANY_MILESTONES = [
  {
    period: "2000 - 2005",
    title: "Founding & Maritime Gateway",
    description:
      "Inception in New York and London, securing initial container vessel space and bonded maritime warehouse staging.",
  },
  {
    period: "2005 - 2010",
    title: "Transcontinental Rail Loops",
    description:
      "Synchronized port discharge gantries with dedicated inland double-stack rail loops, reducing intermodal dwell times.",
  },
  {
    period: "2010 - 2015",
    title: "Air Cargo Charter Network",
    description:
      "Launched scheduled express cargo air routes and priority cross-dock facilities across major international aviation hubs.",
  },
  {
    period: "2015 - 2020",
    title: "Cold-Chain & Life Sciences",
    description:
      "Certified GDP-compliant pharmaceutical cold chains with automated multi-zone temperature controls and continuous telemetry.",
  },
  {
    period: "2020 - 2026",
    title: "Autonomous Telemetry & ePODs",
    description:
      "Deployed continuous satellite GPS telemetry, paperless cryptographic ePODs, and carbon-optimized multimodal corridors.",
  },
];

export default function AboutPage() {
  const [activeTimelineIndex, setActiveTimelineIndex] = React.useState(0);
  const [isInteracting, setIsInteracting] = React.useState(false);
  const timelineScrollerRef = React.useRef<HTMLDivElement>(null);
  const resumeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);

  // Smooth scroll to milestone index
  const scrollToMilestone = React.useCallback((index: number) => {
    if (!timelineScrollerRef.current) return;
    const container = timelineScrollerRef.current;
    const item = container.children[index] as HTMLElement | undefined;
    if (item) {
      const targetLeft = item.offsetLeft - container.offsetLeft;
      container.scrollTo({ left: targetLeft, behavior: "smooth" });
      setActiveTimelineIndex(index);
    }
  }, []);

  // Interaction handlers with auto-scroll pause and resume
  const handleInteractionStart = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setIsInteracting(true);
  };

  const handleInteractionEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 2500);
  };

  // Mouse drag scrolling handlers for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleInteractionStart();
    isDraggingRef.current = true;
    startXRef.current =
      e.pageX - (timelineScrollerRef.current?.offsetLeft || 0);
    scrollLeftRef.current = timelineScrollerRef.current?.scrollLeft || 0;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !timelineScrollerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (timelineScrollerRef.current.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.5;
    timelineScrollerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    handleInteractionEnd();
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
    }
    handleInteractionEnd();
  };

  // Detect active index on manual scroll
  const handleScroll = () => {
    if (!timelineScrollerRef.current) return;
    const container = timelineScrollerRef.current;
    const scrollPos = container.scrollLeft;
    let closestIndex = 0;
    let minDiff = Infinity;

    Array.from(container.children).forEach((child, idx) => {
      const el = child as HTMLElement;
      const diff = Math.abs(el.offsetLeft - container.offsetLeft - scrollPos);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    setActiveTimelineIndex(closestIndex);
  };

  // Auto-scroll effect: every 4.5 seconds advances to next milestone unless interacting
  React.useEffect(() => {
    if (isInteracting) return;
    const interval = setInterval(() => {
      setActiveTimelineIndex((prev) => {
        const nextIndex = (prev + 1) % COMPANY_MILESTONES.length;
        scrollToMilestone(nextIndex);
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isInteracting, scrollToMilestone]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#BA1C20] selection:text-white">
      {/* 1. MAIN NAVIGATION */}
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-16 md:space-y-24">
          {/* 2. HERO BANNER: Clean rounded container with giant ABOUT and breadcrumb */}
          <section aria-labelledby="about-header-title">
            <div className="relative w-full min-h-[340px] md:min-h-[420px] rounded-[32px] md:rounded-[36px] overflow-hidden group">
              {/* Background Logistics Photography */}
              <Image
                src="/images/hero-ocean-megaship.jpg"
                alt="RILFREIGHT Global Maritime and Logistics Operations"
                fill
                priority
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Subtle Overlay for typography contrast */}
              <div className="absolute inset-0 bg-[#0F313A]/55 backdrop-blur-[1px]" />

              {/* Banner Content Container */}
              <div className="relative z-10 flex flex-col justify-between h-full min-h-[340px] md:min-h-[420px] p-8 sm:p-12 md:p-16">
                <div />

                {/* Giant Typography matching reference */}
                <div>
                  <h1
                    id="about-header-title"
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase leading-none select-none"
                  >
                    ABOUT
                  </h1>
                </div>

                {/* Breadcrumb Pill at bottom-left */}
                <div>
                  <nav
                    aria-label="Breadcrumb"
                    className="inline-flex items-center gap-2 bg-white text-[#0F313A] px-5 py-2 rounded-full text-xs sm:text-sm font-semibold select-none"
                  >
                    <Link
                      href="/"
                      className="hover:text-[#BA1C20] transition-colors"
                    >
                      Home
                    </Link>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-800">About</span>
                  </nav>
                </div>
              </div>
            </div>
          </section>

          {/* 3. SECTION 1: Clean 2-Column Typography (Matching Reference image media_1794231667371_d1872096.jpg) */}
          <section
            aria-labelledby="company-statement-heading"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start pt-4 sm:pt-6"
          >
            {/* Left Column: Bold Headline Statement */}
            <div className="lg:col-span-5">
              <h2
                id="company-statement-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-[#0F313A] tracking-tight leading-[1.08]"
              >
                RILFREIGHT IS THE BEST TRANSPORTATION COMPANY IN OUR STATE
              </h2>
            </div>

            {/* Right Column: Clean Open Paragraphs (Zero cards, zero borders) */}
            <div className="lg:col-span-7 space-y-6 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>
                Founded in 2000, RILFREIGHT has established itself as an
                industry leader in multimodal freight transport,
                transcontinental shipping, and supply chain logistics. We
                provide comprehensive maritime, air, rail, and road cargo
                transportation engineered for velocity, security, and end-to-end
                transparency.
              </p>
              <p>
                With dedicated container allocations across more than 180 global
                deepwater berths, integrated double-stack rail loops, and
                expedited air cargo charters, our network bridges international
                suppliers with destination distribution hubs without bottlenecks
                or costly transit delays.
              </p>
              <p>
                Every consignment handled by RILFREIGHT is backed by continuous
                GPS satellite telemetry, paperless cryptographic
                proof-of-delivery, and dedicated 24/7 dispatch coordinators
                committed to seamless cargo custody throughout every corridor.
              </p>
            </div>
          </section>

          {/* 4. SECTION 2: Large Landscape Feature Banner (Matching Reference image media_1794231667450_0fa5e43b.jpg) */}
          <section aria-label="Company Capabilities Banner">
            <div className="relative rounded-[32px] md:rounded-[36px] overflow-hidden min-h-[300px] sm:min-h-[360px] md:min-h-[420px] flex items-center justify-end p-6 sm:p-10 md:p-16 group">
              {/* Background Transportation Photography */}
              <Image
                src="/images/road-service-hero.jpg"
                alt="RILFREIGHT Heavy-Duty Intermodal Transportation Fleet"
                fill
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Dark Gradient Overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/50 to-black/85" />

              {/* Right-Aligned Bold Typography */}
              <div className="relative z-10 max-w-xl text-right sm:text-left md:text-right">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase text-white tracking-tight leading-snug">
                  DRIVING YOUR JOURNEY FORWARD WITH RELIABLE, EFFICIENT, AND
                  SEAMLESS TRANSPORTATION SOLUTIONS
                </h3>
              </div>
            </div>
          </section>

          {/* 5. SECTION 3: History of Our Company (5 Milestones Matching Reference media_1794231667337_d2e5afaf.png) */}
          <section
            aria-labelledby="history-heading"
            className="space-y-10 sm:space-y-14 pt-4 select-none"
          >
            {/* Centered Section Title with Reference Tag */}
            <div className="text-center space-y-2">
              <span className="text-xs sm:text-sm font-semibold tracking-widest text-slate-500 uppercase font-mono">
                / history /
              </span>
              <h2
                id="history-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-[#0F313A] tracking-tight"
              >
                HISTORY OF OUR COMPANY
              </h2>
            </div>

            {/* Horizontally Scrollable Timeline (At least 3.5 visible on desktop, generous spacing, auto-scrolling with manual pause/resume) */}
            <div className="relative">
              <div
                ref={timelineScrollerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleInteractionStart}
                onTouchEnd={handleInteractionEnd}
                onScroll={handleScroll}
                className="flex items-start gap-8 lg:gap-10 overflow-x-auto scroll-smooth scrollbar-none pb-4 touch-pan-x cursor-grab active:cursor-grabbing"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {COMPANY_MILESTONES.map((milestone, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 w-[82vw] sm:w-[60vw] md:w-[42%] lg:w-[27.5%] transition-opacity duration-300"
                  >
                    <div
                      className="font-black text-4xl sm:text-5xl lg:text-6xl text-transparent tracking-tight leading-none"
                      style={{
                        WebkitTextStroke: "1.5px #0F313A",
                      }}
                    >
                      {milestone.period}
                    </div>
                    <div className="w-full h-px bg-slate-300 mt-4 mb-5" />
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                      {milestone.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Slider Pagination Counter & Interactive Bars matching reference */}
            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <span className="text-xs font-bold text-slate-500 font-mono tracking-widest">
                0{activeTimelineIndex + 1} / 05
              </span>
              <div className="flex items-center gap-2">
                {COMPANY_MILESTONES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleInteractionStart();
                      scrollToMilestone(idx);
                      handleInteractionEnd();
                    }}
                    aria-label={`Jump to milestone ${idx + 1}`}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === activeTimelineIndex
                        ? "w-10 bg-[#0F313A]"
                        : "w-7 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* 6. STANDARDIZED UNIFIED FOOTER (Exact Match with Homepage - 100% Full Width) */}
        <PageFooter />
      </main>
    </div>
  );
}
