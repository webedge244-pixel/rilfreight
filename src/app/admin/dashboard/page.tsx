"use client";

import * as React from "react";
import Link from "next/link";
import { Ship, Plane, Train, Truck, ArrowUpRight, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  DEMO_DASHBOARD_KPIS,
  DEMO_SHIPMENTS,
} from "@/shared/lib/demoData";

export default function DashboardPage() {
  const kpis = DEMO_DASHBOARD_KPIS;
  const recentShipments = DEMO_SHIPMENTS.slice(0, 6);

  // Exact 3-mode breakdown matching the reference image's 3 segments
  const thisMonthBreakdown = {
    ocean: 20,
    air: 11,
    ground: 7, // Road & Rail
    total: 38,
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "in_transit":
        return "text-[#0F313A] bg-[#0F313A]/10";
      case "delivered":
        return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
      case "customs_hold":
      case "weather_delay":
        return "text-[#BA1C20] bg-[#BA1C20]/10";
      default:
        return "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
    }
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const modeIcon = (mode: string) => {
    switch (mode) {
      case "ocean": return <Ship className="w-3.5 h-3.5" />;
      case "air": return <Plane className="w-3.5 h-3.5" />;
      case "rail": return <Train className="w-3.5 h-3.5" />;
      case "road": return <Truck className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  // 12 radial dots around the inner circle (spaced at every 30 degrees)
  const dialDots = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const r = 40;
    return {
      cx: 100 + r * Math.cos(angle),
      cy: 100 + r * Math.sin(angle),
    };
  });

  return (
    <div>
      {/* 4-Component Bento Grid Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">

        {/* Left Column Stack (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4 lg:gap-5">

          {/* Component 1: Active Operations (Strictly 3 stats) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 lg:p-8">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-6">
              Active Operations
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-black dark:text-white block">
                  {kpis.totalShipments.toLocaleString()}
                </span>
                <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  Total Created
                </span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#BA1C20] block">
                  {kpis.onHold}
                </span>
                <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  On Hold
                </span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F313A] dark:text-teal-400 block">
                  {kpis.inTransit}
                </span>
                <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  In Transit
                </span>
              </div>
            </div>
          </div>

          {/* Two Sub-Cards Underneath */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 flex-1">
            {/* Component 2: Platform Users (Enlarged prominent typography) */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 lg:p-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Platform Users
                </span>
                <Users className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <span className="text-5xl sm:text-6xl font-black text-black dark:text-white block font-mono my-2">
                  {kpis.totalUsers.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 mt-1 block font-medium">
                  Registered customer & consignee accounts
                </span>
              </div>
            </div>

            {/* Component 3: Empty Placeholder Card (Hidden on mobile, visible on desktop) */}
            <div className="hidden sm:block bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 lg:p-8" />
          </div>

        </div>

        {/* Component 4: Created This Month (Stretched Full Height with Dial Gauge) */}
        <div className="lg:col-span-1 bg-[#0F313A] rounded-2xl p-6 lg:p-8 flex flex-col justify-between text-white">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/95">
              Created This Month
            </h2>
            <Link
              href="/admin/shipments"
              className="text-xs font-semibold text-[#A78BFA] hover:text-white transition-colors"
            >
              Go to Shipments
            </Link>
          </div>

          {/* Reference Image Dial Gauge & Radial Callouts */}
          <div className="my-auto py-6 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Exact SVG Segmented Ring */}
              <svg className="w-full h-full" viewBox="0 0 200 200">
                {/* Inner Filled Disc Plate */}
                <circle
                  cx="100"
                  cy="100"
                  r="48"
                  fill="rgba(255, 255, 255, 0.04)"
                />

                {/* 12 Radial Dial Dots */}
                {dialDots.map((dot, idx) => (
                  <circle
                    key={idx}
                    cx={dot.cx}
                    cy={dot.cy}
                    r="1.4"
                    fill="rgba(255, 255, 255, 0.4)"
                  />
                ))}

                {/* Segment 1: Cyan Arc (Ocean) - Left Sweep (~200 deg) */}
                {/* Circumference = 414.7. Stroke length = 212, offset = -96 */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray="212 414.7"
                  strokeDashoffset="-96"
                  className="transition-all duration-700"
                />

                {/* Segment 2: Purple Arc (Air) - Top Right Sweep (~100 deg) */}
                {/* Stroke length = 112, offset = 22 */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray="112 414.7"
                  strokeDashoffset="22"
                  className="transition-all duration-700"
                />

                {/* Segment 3: Lime Green Arc (Ground) - Bottom Right Sweep (~50 deg) */}
                {/* Stroke length = 66, offset = -315 */}
                <circle
                  cx="100"
                  cy="100"
                  r="66"
                  fill="none"
                  stroke="#A3E635"
                  strokeWidth="14"
                  strokeLinecap="butt"
                  strokeDasharray="66 414.7"
                  strokeDashoffset="-315"
                  className="transition-all duration-700"
                />
              </svg>

              {/* Center Donut Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-none">
                  {thisMonthBreakdown.total}
                </span>
                <span className="text-[11px] text-white/60 font-medium mt-1">
                  Total Created
                </span>
              </div>

              {/* Exact Callouts Positioned Around the Gauge (Shifted left to prevent curve interception) */}
              {/* Left: Ocean (20) */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-left">
                <span className="text-lg font-bold text-white block leading-tight font-mono">
                  {thisMonthBreakdown.ocean}
                </span>
                <span className="text-xs text-white/60 block font-normal">
                  Ocean
                </span>
              </div>

              {/* Top Right: Air (11) */}
              <div className="absolute right-1 top-4 text-right pr-1">
                <span className="text-lg font-bold text-white block leading-tight font-mono">
                  {thisMonthBreakdown.air}
                </span>
                <span className="text-xs text-white/60 block font-normal">
                  Air
                </span>
              </div>

              {/* Bottom Right: Ground (7) */}
              <div className="absolute right-1 bottom-6 text-right pr-1">
                <span className="text-lg font-bold text-white block leading-tight font-mono">
                  {thisMonthBreakdown.ground}
                </span>
                <span className="text-xs text-white/60 block font-normal">
                  Ground
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Full-Width Section: Recent Dispatches */}
        <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 lg:p-8">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Recent Dispatches
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest freight movements logged across all transport corridors
              </p>
            </div>
            <Link
              href="/admin/shipments"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#BA1C20] hover:underline"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Tracking Code</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Mode</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4 hidden sm:table-cell">Route</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">Status</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">ETA</th>
                </tr>
              </thead>
              <tbody>
                {recentShipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                  >
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/admin/shipments/${shipment.id}`}
                        className="font-mono font-semibold text-sm text-black dark:text-white hover:text-[#BA1C20] transition-colors"
                      >
                        {shipment.trackingCode}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 capitalize">
                        {modeIcon(shipment.mode)}
                        <span>{shipment.mode}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 hidden sm:table-cell">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {shipment.originCode} → {shipment.destinationCode}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={cn(
                        "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                        statusColor(shipment.status)
                      )}>
                        {formatStatus(shipment.status)}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(shipment.estimatedDeliveryDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
