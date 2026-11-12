"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_SHIPMENTS } from "@/shared/lib/demoData";
import { Search, Compass, Shield, ArrowRight, Ship, Plane, Train, Truck } from "lucide-react";

export default function TrackingSearchPage() {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingInput.trim().toUpperCase();
    if (clean) {
      router.push(`/tracking/${encodeURIComponent(clean)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Compass className="w-3.5 h-3.5 text-[#BA1C20]" />
            Global Satellite Telemetry Registry
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-black dark:text-white">
            Live Freight & Vessel Tracking
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Monitor multimodal freight shipments in real time with continuous AIS vessel tracking, flight ADS-B positioning, rail checkpoint telemetry, and customs clearance status.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Enter 16-character code (e.g. RIL-8492-3019-US)..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm sm:text-base font-mono font-medium text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#BA1C20]"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-sm font-bold uppercase tracking-wider transition-colors active:scale-[0.98] shadow-md shadow-red-600/20"
            >
              Track Live <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Shipments */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Explore Active Corridor Shipments:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEMO_SHIPMENTS.map((s) => (
                <Link
                  key={s.id}
                  href={`/tracking/${s.trackingCode}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-mono text-xs font-bold text-black dark:text-white group-hover:text-[#BA1C20] transition-colors truncate">
                      {s.trackingCode}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {s.originCode} → {s.destinationCode} ({s.mode})
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      s.isPaused
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                    }`}
                  >
                    {s.isPaused ? "Hold" : s.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Value Proportions Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-[#0284c7] flex items-center justify-center">
              <Ship className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Corridor Splitting
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Solid and dashed trajectory partition indicating historical traveled segments vs scheduled legs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Customs Hold Gates
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full dwell time tracking with administrative pause-and-release gate enforcement for import clearance.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
              Live Satellite AIS
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time pulsed coordinate interpolation based on departure, dwell, and estimated destination arrival.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
