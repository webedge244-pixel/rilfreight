"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/shared/components/navbar";
import { PageFooter } from "@/shared/components/page-footer";
import { ALL_SERVICES_LIST } from "@/features/services/data/servicesData";

export default function ServicesHubPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#BA1C20] selection:text-white">
      {/* 1. Main Navigation */}
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        {/* 2. Full-Width Edge-to-Edge Hero Banner */}
        <section
          aria-label="Services Directory Header"
          className="w-full relative min-h-[340px] md:min-h-[420px] overflow-hidden group"
        >
          <Image
            src="/images/home-multimodal-connectivity.jpg"
            alt="RILFREIGHT Multimodal Logistics Connectivity Hub"
            fill
            priority
            className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />

          <div className="absolute inset-0 bg-[#0F313A]/55 backdrop-blur-[1px]" />

          <div className="relative z-10 max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex flex-col justify-between h-full min-h-[340px] md:min-h-[420px]">
            <div />

            <div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase leading-none select-none drop-shadow-sm">
                SERVICES
              </h1>
            </div>

            <div>
              <nav
                aria-label="Breadcrumb"
                className="inline-flex items-center gap-2 bg-white text-[#0F313A] px-5 py-2 rounded-full text-xs sm:text-sm font-semibold select-none shadow-sm"
              >
                <Link
                  href="/"
                  className="hover:text-[#BA1C20] transition-colors"
                >
                  Home
                </Link>
                <span className="text-slate-400">/</span>
                <span className="text-slate-800 font-bold">Services</span>
              </nav>
            </div>
          </div>
        </section>

        {/* 3. Executive Statement Section */}
        <section className="w-full">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-6 space-y-4">
                <span className="inline-block text-[#BA1C20] font-black text-xs sm:text-sm uppercase tracking-widest select-none">
                  / MULTIMODAL LOGISTICS SUITE /
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F313A] tracking-tight uppercase leading-[1.1]">
                  SYNCHRONIZED GLOBAL FREIGHT CAPABILITIES ACROSS ALL COMMERCIAL MODES
                </h2>
              </div>

              <div className="lg:col-span-6 space-y-6 text-slate-600 text-base sm:text-lg leading-relaxed">
                <p>
                  RILFREIGHT provides coordinated industrial transportation services engineered for high velocity modern supply chains. Whether moving thousands of containers across oceans, expediting critical aviation charters, or managing certified pharmaceutical cold chains, our dedicated divisions deliver reliable commercial freight capacity worldwide.
                </p>
                <div className="pt-2">
                  <Link
                    href="/contact"
                    className="group inline-flex items-center gap-3 bg-[#0F313A] hover:bg-[#0b252c] text-white rounded-full pl-7 pr-2.5 py-2 font-bold text-sm sm:text-base transition-all shadow-md active:scale-95"
                  >
                    <span>Request Multimodal Consultation</span>
                    <span className="w-10 h-10 rounded-full bg-[#BA1C20] text-white flex items-center justify-center group-hover:bg-[#9c171a] transition-all transform group-hover:rotate-45">
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. 6 Dedicated Service Cards Directory */}
        <section className="w-full bg-slate-50/70 border-t border-slate-200/80">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="text-[#BA1C20] font-black text-xs sm:text-sm uppercase tracking-widest select-none">
                OUR SPECIALIZED DIVISIONS
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F313A] tracking-tight uppercase leading-[1.1]">
                SIX DEDICATED FREIGHT TRANSPORT SERVICES
              </h2>
              <p className="text-slate-600 text-base sm:text-lg">
                Explore our full suite of modal solutions with dedicated vessel allocations, aircraft charters, rail lines, highway fleets, and temperature controlled facilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {ALL_SERVICES_LIST.map((service, index) => (
                <div
                  key={service.slug}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-[#0F313A]/40 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Photographic Card Header */}
                    <div className="relative h-56 sm:h-64 w-full overflow-hidden">
                      <Image
                        src={service.heroImage}
                        alt={service.heroImageAlt}
                        fill
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F313A]/80 via-[#0F313A]/20 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[#0F313A] font-mono font-bold text-xs">
                          0{index + 1}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="text-xs font-bold text-white/80 uppercase tracking-wider block mb-1">
                          {service.statement.badge}
                        </span>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                          {service.breadcrumbTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 sm:p-8 space-y-4">
                      <p className="text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3">
                        {service.statement.description}
                      </p>

                      {/* Primary Highlight Metric */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block">
                            {service.metrics[0].label}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {service.metrics[0].description}
                          </span>
                        </div>
                        <span className="text-3xl font-mono font-black text-[#BA1C20] ml-4 shrink-0">
                          {service.metrics[0].value}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="p-6 sm:p-8 pt-0">
                    <Link
                      href={`/services/${service.slug}`}
                      className="w-full flex items-center justify-between py-3.5 px-6 rounded-full bg-slate-100 hover:bg-[#0F313A] text-[#0F313A] hover:text-white font-bold text-sm uppercase tracking-wider transition-colors group/btn"
                    >
                      <span>Explore {service.breadcrumbTitle}</span>
                      <ArrowUpRight className="w-4 h-4 transform group-hover/btn:rotate-45 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Pre-Footer Conversion Callout */}
        <section className="w-full">
          <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="relative rounded-3xl md:rounded-[40px] bg-[#0F313A] text-white p-8 sm:p-12 md:p-16 overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#BA1C20]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-6">
                <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-[#BA1C20] font-black text-xs uppercase tracking-widest">
                  SEAMLESS INTEGRATION
                </span>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase leading-[1.1]">
                  CONNECT YOUR SUPPLY CHAIN WITH DEDICATED CARRIAGE CAPACITY
                </h2>

                <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                  Our logistics engineering team evaluates freight volumes, corridors, and modal combinations to deliver high reliability transport schedules tailored to your business objectives.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/contact"
                    className="group inline-flex items-center gap-3 bg-[#BA1C20] hover:bg-[#9c171a] text-white rounded-full pl-8 pr-3 py-2.5 font-bold text-base transition-all shadow-lg active:scale-95"
                  >
                    <span>Request Freight Consultation</span>
                    <span className="w-9 h-9 rounded-full bg-white text-[#BA1C20] flex items-center justify-center transition-all transform group-hover:rotate-45">
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  </Link>

                  <Link
                    href="/tracking"
                    className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 text-white font-bold text-base transition-all"
                  >
                    Track Existing Shipment
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Standard Global Page Footer */}
        <PageFooter />
      </main>
    </div>
  );
}
