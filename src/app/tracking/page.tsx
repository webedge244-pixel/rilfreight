"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Search,
  Ship,
  Plane,
  Train,
  Truck,
  ChevronRight,
  Plus,
  Minus,
  Package,
} from "lucide-react";

import { Navbar } from "@/shared/components/navbar";
import { Footer } from "@/shared/components/footer";
import { DEMO_SHIPMENTS } from "@/shared/lib/demoData";

// ==========================================
// TYPES
// ==========================================

interface RecentlyTrackedItem {
  code: string;
  mode: "ocean" | "air" | "rail" | "road";
  origin: string;
  destination: string;
  timestamp: number;
}

// ==========================================
// CONSTANTS
// ==========================================

const FAQ_ITEMS = [
  {
    question: "What is a Tracking Number & Where Can I Find It?",
    answer:
      "Your tracking number is a unique alphanumeric code (e.g., RIL-8492-3019-CA) provided when your shipment is booked. You can find it on your booking confirmation email, bill of lading, air waybill, or any shipping documentation issued by RILFREIGHT or your freight forwarder.",
  },
  {
    question: "When will my tracking information appear?",
    answer:
      "Tracking data becomes available once your shipment has been physically received and scanned at the origin terminal. For ocean freight, this typically occurs within 24 hours of container gate-in. Air cargo tracking activates upon receipt at the cargo terminal, and rail/road shipments are tracked from dispatch.",
  },
  {
    question: "Why is my tracking number not working?",
    answer:
      "Please ensure you have entered the full tracking code including the prefix (e.g., RIL-). If your shipment was recently booked, allow up to 24 hours for the tracking system to activate. If the issue persists, contact our 24/7 dispatch center at +1 800 555-RILF for assistance.",
  },
  {
    question: "Can I track multiple shipments at once?",
    answer:
      "Currently, you can track one shipment at a time by entering each tracking number separately. Your recently tracked shipments are automatically saved to your device for quick re-access. For bulk tracking needs, contact our logistics coordinators for a dedicated dashboard.",
  },
  {
    question: "What do the different shipment statuses mean?",
    answer:
      "Our system uses standard logistics statuses: 'In Transit' means your cargo is actively moving along its route. 'Customs Hold' indicates the shipment is undergoing regulatory inspection. 'Out for Delivery' means final-mile transport is underway. 'Delivered' confirms the cargo has been received and signed for by the consignee.",
  },
];

// ==========================================
// HELPERS
// ==========================================

function getModeIcon(mode: string, className = "w-4 h-4") {
  switch (mode) {
    case "ocean":
      return <Ship className={className} />;
    case "air":
      return <Plane className={className} />;
    case "rail":
      return <Train className={className} />;
    case "road":
      return <Truck className={className} />;
    default:
      return <Package className={className} />;
  }
}

function getRecentlyTracked(): RecentlyTrackedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("rilfreight_recently_tracked");
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyTrackedItem[];
  } catch {
    return [];
  }
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export default function TrackingSearchPage() {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [recentItems, setRecentItems] = React.useState<RecentlyTrackedItem[]>(
    []
  );
  const [openFaqIndex, setOpenFaqIndex] = React.useState<number | null>(null);

  // Load recently tracked items from localStorage on mount
  React.useEffect(() => {
    setRecentItems(getRecentlyTracked());
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingInput.trim().toUpperCase();
    if (!clean) return;

    setIsSearching(true);

    // Save to recently tracked in localStorage
    try {
      const existing = getRecentlyTracked();
      const demo = DEMO_SHIPMENTS.find(
        (s) => s.trackingCode.toUpperCase() === clean
      );
      const newItem: RecentlyTrackedItem = {
        code: clean,
        mode: demo?.mode || "ocean",
        origin: demo
          ? `${demo.originName} (${demo.originCode})`
          : "Unknown Origin",
        destination: demo
          ? `${demo.destinationName} (${demo.destinationCode})`
          : "Unknown Destination",
        timestamp: Date.now(),
      };
      const filtered = existing.filter((r) => r.code !== clean);
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem(
        "rilfreight_recently_tracked",
        JSON.stringify(updated)
      );
      setRecentItems(updated);
    } catch {
      // localStorage may be unavailable
    }

    // Navigate to the detail page
    setTimeout(() => {
      router.push(`/tracking/${encodeURIComponent(clean)}`);
    }, 150);
  };

  const handleQuickTrack = (code: string) => {
    setTrackingInput(code);
    // Save to recently tracked
    try {
      const existing = getRecentlyTracked();
      const demo = DEMO_SHIPMENTS.find(
        (s) => s.trackingCode.toUpperCase() === code.toUpperCase()
      );
      const newItem: RecentlyTrackedItem = {
        code: code.toUpperCase(),
        mode: demo?.mode || "ocean",
        origin: demo
          ? `${demo.originName} (${demo.originCode})`
          : "Unknown Origin",
        destination: demo
          ? `${demo.destinationName} (${demo.destinationCode})`
          : "Unknown Destination",
        timestamp: Date.now(),
      };
      const filtered = existing.filter(
        (r) => r.code !== code.toUpperCase()
      );
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem(
        "rilfreight_recently_tracked",
        JSON.stringify(updated)
      );
      setRecentItems(updated);
    } catch {
      // silently fail
    }

    router.push(`/tracking/${encodeURIComponent(code)}`);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#BA1C20] selection:text-white">
      {/* ====================================================
          1. NAVBAR
          ==================================================== */}
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-16 md:space-y-24">
          {/* ====================================================
              2. HERO BANNER (Matching Contact & About)
              ==================================================== */}
          <section aria-labelledby="tracking-header-title">
            <div className="relative w-full min-h-[340px] md:min-h-[420px] rounded-[32px] md:rounded-[36px] overflow-hidden group">
              {/* Background Photography */}
              <Image
                src="/images/home-telemetry-control-room.jpg"
                alt="RILFREIGHT Global Shipment Tracking and Telemetry"
                fill
                priority
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Overlay for typography contrast */}
              <div className="absolute inset-0 bg-[#0F313A]/55 backdrop-blur-[1px]" />

              {/* Banner Content */}
              <div className="relative z-10 flex flex-col justify-between h-full min-h-[340px] md:min-h-[420px] p-8 sm:p-12 md:p-16">
                <div />

                {/* Giant Title */}
                <div>
                  <h1
                    id="tracking-header-title"
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase leading-none select-none"
                  >
                    TRACKING
                  </h1>
                </div>

                {/* Breadcrumb Pill */}
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
                    <span className="text-slate-800">Tracking</span>
                  </nav>
                </div>
              </div>
            </div>
          </section>

          {/* ====================================================
              3. MAIN CONTENT: TRACK INPUT + RECENTLY TRACKED
              ==================================================== */}
          <section
            aria-labelledby="track-trace-heading"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start"
          >
            {/* ── LEFT COLUMN: Track Your Shipment (8 cols) ── */}
            <div className="lg:col-span-8 space-y-8">
              <div>
                <h2
                  id="track-trace-heading"
                  className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-[#0F313A] tracking-tight leading-[1.08] max-w-3xl"
                >
                  Enter your tracking number to locate your shipment
                </h2>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mt-4">
                  Monitor multimodal freight shipments in real time. No
                  registration required — enter your bill of lading, air
                  waybill, or booking reference to get instant status updates,
                  GPS coordinates, and milestone timelines.
                </p>
              </div>

              {/* Search Input Box */}
              <div className="bg-white rounded-[28px] p-6 sm:p-8">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative flex items-center bg-[#F0F2F5] rounded-full pl-5 pr-1.5 py-1.5 transition-colors">
                    <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                    <input
                      type="text"
                      placeholder="Enter your tracking number (e.g., RIL-8492-3019-CA)..."
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      className="w-full bg-transparent text-sm sm:text-base text-[#0F313A] placeholder:text-slate-400 focus:outline-none py-2.5 font-medium"
                    />
                    <button
                      type="submit"
                      disabled={isSearching}
                      aria-label="Track shipment"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#0F313A] hover:bg-[#BA1C20] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Quick Demo Shipments */}
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                      Explore Active Corridor Shipments:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DEMO_SHIPMENTS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleQuickTrack(s.trackingCode)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0F2F5] hover:bg-slate-200 text-xs font-mono font-medium text-[#0F313A] transition-all group cursor-pointer"
                        >
                          <span className="text-slate-400 group-hover:text-[#BA1C20] transition-colors">
                            {getModeIcon(s.mode, "w-3.5 h-3.5")}
                          </span>
                          <span className="group-hover:text-[#BA1C20] transition-colors">
                            {s.trackingCode}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.isPaused
                                ? "bg-amber-100 text-amber-800"
                                : s.status === "delivered"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {s.isPaused
                              ? "Hold"
                              : s.status === "delivered"
                              ? "Delivered"
                              : "Active"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Recently Tracked Packages (4 cols) ── */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 sticky top-28">
                {/* Header */}
                <h3 className="text-lg font-bold text-[#0F313A] mb-1">
                  Recently Tracked
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Based on your device tracking history
                </p>

                {/* Recently Tracked List */}
                {recentItems.length > 0 ? (
                  <div className="space-y-2">
                    {recentItems.map((item) => (
                      <Link
                        key={item.code + item.timestamp}
                        href={`/tracking/${encodeURIComponent(item.code)}`}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F0F2F5] transition-all group"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#F0F2F5] group-hover:bg-white flex items-center justify-center text-[#0F313A] shrink-0 transition-colors">
                          {getModeIcon(item.mode, "w-4 h-4")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs font-bold text-[#0F313A] group-hover:text-[#BA1C20] transition-colors truncate">
                            {item.code}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.origin} → {item.destination}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#BA1C20] shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#F0F2F5] flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      No recent shipments
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                      Track a shipment and it will appear here for quick
                      re-access
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile Recently Tracked Horizontal Strip */}
              {recentItems.length > 0 && (
                <div className="mt-4 lg:hidden">
                  <div
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-none"
                    style={{
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {recentItems.map((item) => (
                      <Link
                        key={`mobile-${item.code}-${item.timestamp}`}
                        href={`/tracking/${encodeURIComponent(item.code)}`}
                        className="shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-white transition-all group"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#0F313A]">
                          {getModeIcon(item.mode, "w-3.5 h-3.5")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-[#0F313A] group-hover:text-[#BA1C20] transition-colors whitespace-nowrap">
                            {item.code}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ====================================================
              4. FAQ SECTION
              ==================================================== */}
          <section aria-labelledby="faq-heading" className="space-y-10">
            {/* Section Header */}
            <div>
              <h2
                id="faq-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-[#0F313A] tracking-tight leading-[1.08] max-w-3xl"
              >
                Frequently asked questions
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mt-4">
                Everything you need to know about tracking your shipments with
                RILFREIGHT. Can&apos;t find what you&apos;re looking for?
                Contact our 24/7 dispatch center.
              </p>
            </div>

            {/* FAQ Accordion */}
            <div className="max-w-4xl">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between gap-4 py-6 text-left group cursor-pointer"
                    aria-expanded={openFaqIndex === index}
                  >
                    <h3 className="text-base sm:text-lg font-bold text-[#0F313A] group-hover:text-[#BA1C20] transition-colors pr-4">
                      {item.question}
                    </h3>
                    <span className="w-9 h-9 rounded-xl bg-[#F0F2F5] group-hover:bg-[#0F313A] group-hover:text-white text-[#0F313A] flex items-center justify-center shrink-0 transition-all">
                      {openFaqIndex === index ? (
                        <Minus className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {/* Expandable Answer */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openFaqIndex === index
                        ? "max-h-[500px] opacity-100 pb-6"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <p className="text-sm text-slate-600 leading-relaxed max-w-3xl pr-14">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ====================================================
            5. PRE-FOOTER CTA + FOOTER (Matching Contact & About)
            ==================================================== */}
        <div className="w-full bg-[#0F313A] text-white rounded-t-[36px] md:rounded-t-[48px] mt-24 sm:mt-28 lg:mt-32 relative">
          {/* Customer Hotline Callout */}
          <section
            className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-10"
            aria-label="Customer Hotline Callout"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12 border-b border-white/10">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  Have any questions?
                  <br />
                  <span className="text-[#BA1C20]">
                    Call us +1 800 555-RILF
                  </span>
                </h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-2">
                  Delivered on time with no hassle.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-full pl-7 pr-2.5 py-2 text-white font-bold text-sm sm:text-base transition-all active:scale-95"
                >
                  <span>Contact us</span>
                  <span className="w-10 h-10 rounded-full bg-[#BA1C20] text-white flex items-center justify-center group-hover:bg-[#9c171a] transition-all transform group-hover:rotate-45">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* Embedded Footer */}
          <Footer embedded={true} />
        </div>
      </main>
    </div>
  );
}
