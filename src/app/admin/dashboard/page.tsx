"use client";

import * as React from "react";
import Link from "next/link";
import { Ship, Plane, Train, Truck, ArrowUpRight, Users } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  listenToShipments,
  getShipmentCounts,
  getMonthlyModeBreakdown,
  getPlatformUserCount,
} from "@/shared/lib/firebase";
import type { Shipment } from "@/shared/types";

/**
 * Gauge geometry.
 *
 * The three segments sit at fixed positions around the ring, taken from the
 * reference design. Each segment's length scales with that mode's share of
 * the month's shipments, so the arc always tells the truth about the data.
 */
const GAUGE_CIRCUMFERENCE = 414.7;

const GAUGE_SEGMENTS = [
  { key: "ocean", start: 96, max: 212, color: "#38BDF8" },
  { key: "air", start: -22, max: 112, color: "#A78BFA" },
  { key: "ground", start: 315, max: 66, color: "#A3E635" },
] as const;

export default function DashboardPage() {
  const [counts, setCounts] = React.useState({
    total: 0,
    inTransit: 0,
    onHold: 0,
    delivered: 0,
  });
  const [userCount, setUserCount] = React.useState(0);
  const [thisMonthBreakdown, setThisMonthBreakdown] = React.useState({
    ocean: 0,
    air: 0,
    ground: 0,
    total: 0,
  });
  const [recentShipments, setRecentShipments] = React.useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Live metrics + the latest dispatches
  React.useEffect(() => {
    let cancelled = false;

    const refreshMetrics = async () => {
      try {
        const [shipmentCounts, breakdown, users] = await Promise.all([
          getShipmentCounts(),
          getMonthlyModeBreakdown(),
          getPlatformUserCount(),
        ]);
        if (cancelled) return;
        setCounts(shipmentCounts);
        setThisMonthBreakdown(breakdown);
        setUserCount(users);
        setLoadError(null);
      } catch (error) {
        console.error("Failed to load dashboard metrics:", error);
        if (cancelled) return;
        setLoadError(
          "Unable to reach the shipment database. Check the connection and try again."
        );
      }
    };

    const unsubscribe = listenToShipments(
      6,
      (shipments) => {
        if (cancelled) return;
        setRecentShipments(shipments);
        setIsLoading(false);
        // The collection changed — refresh the aggregates.
        void refreshMetrics();
      },
      (error) => {
        console.error("Dashboard subscription error:", error);
        if (cancelled) return;
        setLoadError(
          "Unable to reach the shipment database. Check the connection and try again."
        );
        setIsLoading(false);
      }
    );

    void refreshMetrics();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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

  // Each segment's length is its share of the month's shipments.
  const gaugeSegments = GAUGE_SEGMENTS.map((segment) => {
    const value = thisMonthBreakdown[segment.key];
    const share =
      thisMonthBreakdown.total > 0 ? value / thisMonthBreakdown.total : 0;
    const length = share * segment.max;

    return {
      ...segment,
      dashArray: `${length.toFixed(2)} ${GAUGE_CIRCUMFERENCE}`,
      dashOffset: -segment.start,
    };
  });

  return (
    <div>
      {/* Database Connection Error */}
      {loadError && (
        <div className="mb-6 px-5 py-4 rounded-2xl bg-[#BA1C20]/10 text-[#BA1C20] text-sm font-semibold">
          {loadError}
        </div>
      )}

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
                  {counts.total.toLocaleString()}
                </span>
                <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  Total Created
                </span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#BA1C20] block">
                  {counts.onHold}
                </span>
                <span className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
                  On Hold
                </span>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F313A] dark:text-teal-400 block">
                  {counts.inTransit}
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
                  {userCount.toLocaleString()}
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

                {/* Segmented arcs — one per mode, length scaled by live share */}
                {gaugeSegments.map((segment) => (
                  <circle
                    key={segment.key}
                    cx="100"
                    cy="100"
                    r="66"
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="14"
                    strokeLinecap="butt"
                    strokeDasharray={segment.dashArray}
                    strokeDashoffset={segment.dashOffset}
                    className="transition-all duration-700"
                  />
                ))}
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
              {/* Left: Ocean */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-left">
                <span className="text-lg font-bold text-white block leading-tight font-mono">
                  {thisMonthBreakdown.ocean}
                </span>
                <span className="text-xs text-white/60 block font-normal">
                  Ocean
                </span>
              </div>

              {/* Top Right: Air */}
              <div className="absolute right-1 top-4 text-right pr-1">
                <span className="text-lg font-bold text-white block leading-tight font-mono">
                  {thisMonthBreakdown.air}
                </span>
                <span className="text-xs text-white/60 block font-normal">
                  Air
                </span>
              </div>

              {/* Bottom Right: Ground */}
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

          {!isLoading && recentShipments.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              No dispatches logged yet. Create the first shipment to populate the console.
            </p>
          )}

          {/* Mobile Cards (< sm) */}
          <div className="sm:hidden space-y-3">
            {recentShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/shipments/${shipment.id}`}
                    className="font-mono font-bold text-sm text-black dark:text-white hover:text-[#BA1C20] transition-colors"
                  >
                    {shipment.trackingCode}
                  </Link>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 capitalize shrink-0">
                    {modeIcon(shipment.mode)}
                    <span>{shipment.mode}</span>
                  </div>
                </div>

                <div>
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      statusColor(shipment.status)
                    )}
                  >
                    {formatStatus(shipment.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Route</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {shipment.originCode} → {shipment.destinationCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">ETA</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(shipment.estimatedDeliveryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table (>= sm) */}
          <div className="hidden sm:block overflow-x-auto">
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
