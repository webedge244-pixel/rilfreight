"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Search,
  Check,
  CheckCircle2,
  X,
  Ship,
  Plane,
  Train,
  Truck,
  ShieldCheck,
  Clock,
  Sparkles,
  Star,
  Activity,
} from "lucide-react";

import { Navbar } from "@/shared/components/navbar";
import { Footer } from "@/shared/components/footer";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { Badge } from "@/shared/components/badge";
import { Select } from "@/shared/components/select";
import { REVIEWS } from "@/config/reviews";

// ==========================================
// DATA & TYPES
// ==========================================

interface HeroSlide {
  id: string;
  tag: string;
  headline: string;
  subtext: string;
  image: string;
  ctaText: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "ocean",
    tag: "/ 01 . OCEAN FREIGHT /",
    headline: "TRANSPORTATION SERVICES AROUND THE WORLD",
    subtext:
      "Global maritime container networks connecting 120+ international ports with ultra-deepwater vessels, real-time satellite AIS telemetry, and guaranteed berth priority.",
    image: "/images/hero-ocean-megaship.jpg",
    ctaText: "Explore Maritime Corridors",
  },
  {
    id: "air",
    tag: "/ 02 . AIR CARGO /",
    headline: "EXPEDITED AIR CARGO RUNWAY DISPATCH",
    subtext:
      "Scheduled widebody freighters and express charter networks with temperature-controlled pharmaceutical biocontainers and rapid customs ramp transfers.",
    image: "/images/hero-air-freighter-runway.jpg",
    ctaText: "Explore Aviation Corridors",
  },
  {
    id: "rail",
    tag: "/ 03 . RAIL INTERMODAL /",
    headline: "TRANSCONTINENTAL INTERMODAL RAIL PASS",
    subtext:
      "Heavy-haul electrified freight trains traversing continental mountain corridors with double-stacked container efficiency and near-zero carbon footprints.",
    image: "/images/hero-rail-intermodal-pass.jpg",
    ctaText: "Explore Rail Freight",
  },
];

interface TrackingRecord {
  code: string;
  mode: "ocean" | "air" | "rail" | "road";
  vesselOrFlight: string;
  carrier: string;
  origin: string;
  destination: string;
  currentStatus: string;
  progressPercent: number;
  currentLocation: string;
  eta: string;
  temperature?: string;
  milestones: { title: string; time: string; completed: boolean }[];
}

const MOCK_TRACKING_DATABASE: Record<string, TrackingRecord> = {
  "RIL-849201": {
    code: "RIL-849201",
    mode: "ocean",
    vesselOrFlight: "M/V Atlantic Voyager (IMO 9821045)",
    carrier: "RILFREIGHT Maritime Alliance",
    origin: "Shanghai Port (CNSHA)",
    destination: "Rotterdam Gateway (NLRTM)",
    currentStatus: "In Transit — Navigating Red Sea Corridor",
    progressPercent: 68,
    currentLocation: "21.4820° N, 38.0124° E (Speed: 19.4 knots)",
    eta: "Nov 14, 2026 — 08:30 CET",
    temperature: "21.2°C (Dry Freight Standard)",
    milestones: [
      {
        title: "Container Loaded at CNSHA Berth 4",
        time: "Oct 28, 04:15",
        completed: true,
      },
      {
        title: "Malacca Strait High-Speed Transit",
        time: "Nov 02, 11:40",
        completed: true,
      },
      {
        title: "Bab-el-Mandeb Secure Checkpoint",
        time: "Nov 06, 18:20",
        completed: true,
      },
      {
        title: "Suez Canal Priority Transit Queue",
        time: "In Progress",
        completed: false,
      },
      {
        title: "Rotterdam Maasvlakte Berth Arrival",
        time: "Nov 14, 08:30",
        completed: false,
      },
    ],
  },
  "AIR-309112": {
    code: "AIR-309112",
    mode: "air",
    vesselOrFlight: "Boeing 747-8F (Flight RIL-824)",
    carrier: "RILFREIGHT SkyCargo Worldwide",
    origin: "Tokyo Narita Hub (NRT)",
    destination: "Frankfurt Cargo City (FRA)",
    currentStatus: "Final Descent — Approaching Runway 25C",
    progressPercent: 92,
    currentLocation: "50.0379° N, 8.5622° E (Alt: 3,400 ft)",
    eta: "Today — 16:45 CET",
    temperature: "4.8°C (PharmaSec GDP Validated)",
    milestones: [
      {
        title: "Export Customs Release at Tokyo NRT",
        time: "Nov 08, 02:10",
        completed: true,
      },
      {
        title: "Main-Deck Biocontainer Staging",
        time: "Nov 08, 03:45",
        completed: true,
      },
      {
        title: "Trans-Polar Great Circle Transit",
        time: "Nov 08, 09:20",
        completed: true,
      },
      {
        title: "Frankfurt Air Traffic Control Contact",
        time: "Nov 08, 16:15",
        completed: true,
      },
      {
        title: "Direct Ramp Cross-Dock Transfer",
        time: "Estimated 17:15",
        completed: false,
      },
    ],
  },
  "RAI-552904": {
    code: "RAI-552904",
    mode: "rail",
    vesselOrFlight: "Heavy Intermodal Train #CPKC-9044",
    carrier: "RILFREIGHT Transcontinental Rail",
    origin: "Vancouver Roberts Bank (VAN)",
    destination: "Chicago Intermodal Yard (CHI)",
    currentStatus: "En Route — Continental Divide Trestle",
    progressPercent: 46,
    currentLocation: "51.4281° N, 116.3129° W (Speed: 52 mph)",
    eta: "Nov 11, 2026 — 22:00 CST",
    temperature: "Ambient Sensor Active (-2°C)",
    milestones: [
      {
        title: "Double-Stack Well Cars Loaded",
        time: "Nov 05, 14:00",
        completed: true,
      },
      {
        title: "Departed Fraser Valley Corridor",
        time: "Nov 06, 08:30",
        completed: true,
      },
      {
        title: "Kicking Horse Pass Mountain Curve",
        time: "Current Sector",
        completed: true,
      },
      {
        title: "Calgary Classification Sorting",
        time: "Nov 09, 06:00",
        completed: false,
      },
      {
        title: "Chicago Logistics Park Handover",
        time: "Nov 11, 22:00",
        completed: false,
      },
    ],
  },
};

export default function HomePage() {
  // ----------------------------------------------------
  // Hero Carousel State
  // ----------------------------------------------------
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isHeroHovered, setIsHeroHovered] = React.useState(false);

  // Auto advance hero carousel every 7 seconds when not hovered
  React.useEffect(() => {
    if (isHeroHovered) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [isHeroHovered]);

  const activeHero = HERO_SLIDES[currentSlide];

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  // ----------------------------------------------------
  // Live Tracking Search State
  // ----------------------------------------------------
  const [trackingCodeInput, setTrackingCodeInput] = React.useState("");
  const [activeTrackingResult, setActiveTrackingResult] =
    React.useState<TrackingRecord | null>(null);
  const [trackingError, setTrackingError] = React.useState<string | null>(null);
  const [isSearchingTracking, setIsSearchingTracking] = React.useState(false);

  const handleTrackingSearch = (queryCode?: string) => {
    const raw = queryCode || trackingCodeInput;
    const clean = raw.trim().toUpperCase();

    if (!clean) {
      setTrackingError(
        "Please enter a valid tracking number (e.g., RIL-849201).",
      );
      return;
    }

    setTrackingError(null);
    setIsSearchingTracking(true);

    setTimeout(() => {
      setIsSearchingTracking(false);
      if (MOCK_TRACKING_DATABASE[clean]) {
        setActiveTrackingResult(MOCK_TRACKING_DATABASE[clean]);
      } else {
        // Fallback dynamic tracking record for any valid alphanumeric format
        setActiveTrackingResult({
          code: clean,
          mode: clean.startsWith("AIR")
            ? "air"
            : clean.startsWith("RAI")
              ? "rail"
              : "ocean",
          vesselOrFlight: `RILFREIGHT Carrier #${clean.slice(-4)}`,
          carrier: "RILFREIGHT Integrated Logistics",
          origin: "Shenzhen Yantian Terminal (CNSZX)",
          destination: "Los Angeles Long Beach (USLAX)",
          currentStatus: "In Transit — High Seas Satellite Tracking Active",
          progressPercent: 54,
          currentLocation: "32.1402° N, 148.9102° W (Speed: 18.2 kts)",
          eta: "Nov 16, 2026 — 14:00 PST",
          temperature: "19.5°C Verified",
          milestones: [
            {
              title: "Consignment Handover & Scanned",
              time: "Nov 02, 10:00",
              completed: true,
            },
            {
              title: "Export Clearance & Terminal Loading",
              time: "Nov 03, 16:30",
              completed: true,
            },
            {
              title: "Mid-Pacific Transit Corridor",
              time: "Current Sector",
              completed: true,
            },
            {
              title: "Port Pilot Boarding & Berthing",
              time: "Nov 15, 20:00",
              completed: false,
            },
            {
              title: "Final Drayage Hub Delivery",
              time: "Nov 16, 14:00",
              completed: false,
            },
          ],
        });
      }
    }, 450);
  };

  // ----------------------------------------------------
  // Minimal Quote Form State (/ quote /)
  // ----------------------------------------------------
  const [quoteFormData, setQuoteFormData] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    deliverCity: "",
    departureCity: "",
    freightType: "Truck Freight",
    incoterms: "EXW",
    weight: "",
    height: "",
    fragile: false,
    express: false,
    insurance: false,
    packaging: false,
  });
  const [quoteSubmitted, setQuoteSubmitted] = React.useState(false);

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteSubmitted(true);
    setTimeout(() => setQuoteSubmitted(false), 5000);
  };

  // ----------------------------------------------------
  // Testimonials Carousel State
  // ----------------------------------------------------
  const [testimonialIndex, setTestimonialIndex] = React.useState(0);

  const prevTestimonial = () => {
    setTestimonialIndex((prev) => (prev === 0 ? REVIEWS.length - 1 : prev - 1));
  };
  const nextTestimonial = () => {
    setTestimonialIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#BA1C20] selection:text-white">
      {/* ====================================================
          1. STANDALONE NAVBAR (MANDATORY R2 DEDICATED TOP ROW)
          ==================================================== */}
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        {/* ====================================================
            2. HERO SECTION WITH 3-MODE INTERACTIVE CAROUSEL
            ==================================================== */}
        <section
          className="px-4 sm:px-6 lg:px-8 pt-4 pb-6 max-w-[1760px] mx-auto"
          aria-label="Transportation Services Hero"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
        >
          <div className="relative rounded-3xl md:rounded-[36px] overflow-hidden min-h-[600px] md:min-h-[760px] lg:min-h-[820px] flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 bg-[#0F313A] shadow-2xl">
            {/* Background Photographic Layer with Smooth Opacity Crossfade */}
            {HERO_SLIDES.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  idx === currentSlide
                    ? "opacity-100 z-0"
                    : "opacity-0 pointer-events-none -z-10"
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.headline}
                  fill
                  priority={idx === 0}
                  className="object-cover object-center scale-[1.02] transform transition-transform duration-10000"
                />
                {/* Multi-Stop Cinematic Vignette Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F313A]/95 via-[#0F313A]/60 to-[#0F313A]/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F313A]/90 via-transparent to-black/30" />
              </div>
            ))}

            {/* Central Headline & Value Narrative */}
            <div className="relative z-10 my-auto py-8 max-w-4xl">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase text-white tracking-tight leading-[1.06] mb-6 drop-shadow-md">
                {activeHero.headline}
              </h1>

              <p className="text-slate-200 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mb-8 drop-shadow">
                {activeHero.subtext}
              </p>

              {/* Single Prominent Action CTA with Secondary Red Arrow Button */}
              <div className="flex items-center">
                <Link
                  href="/contact"
                  className="group inline-flex items-center bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 rounded-full pl-7 pr-2 py-2 text-white font-semibold text-sm sm:text-base transition-all active:scale-95 shadow-lg"
                >
                  <span className="mr-4">{activeHero.ctaText}</span>
                  <span className="w-10 h-10 rounded-xl bg-[#BA1C20] text-white flex items-center justify-center group-hover:bg-[#9c171a] transition-all transform group-hover:rotate-45">
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Bottom Row on Mobile (< md): Navigation Arrows Only */}
            <div className="relative z-10 flex md:hidden items-center justify-end gap-3 self-end mt-auto pt-6">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous freight mode slide"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next freight mode slide"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Row on Tablet & Desktop (md+): Call Center + Track Shipment + Nav Controls */}
            <div className="relative z-10 mt-auto pt-8 hidden md:grid md:grid-cols-12 gap-4 lg:gap-6 items-stretch">
              {/* Left: Call Center / Contact Card (5 cols) */}
              <div className="md:col-span-5 bg-[#0F313A]/95 backdrop-blur-md text-white rounded-3xl p-6 lg:p-8 flex flex-col justify-center h-full min-h-[190px] lg:min-h-[200px]">
                <div className="grid grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-white mb-1.5">
                      Call Center
                    </h3>
                    <p className="text-slate-300 text-xs lg:text-sm mb-1">
                      24/7 Support
                    </p>
                    <p className="text-white text-sm lg:text-base font-semibold">
                      +1 800 555-LOGI
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-white mb-1.5">
                      Our Location
                    </h3>
                    <p className="text-slate-300 text-xs lg:text-sm mb-1">
                      USA, New York – 1060
                    </p>
                    <p className="text-white text-sm lg:text-base font-semibold">
                      Str. First Avenue 1
                    </p>
                  </div>
                </div>
              </div>

              {/* Middle: Track Your Shipment Card (5 cols) */}
              <div className="md:col-span-5 bg-[#F0F2F5] text-[#0F313A] rounded-3xl p-6 lg:p-8 flex flex-col justify-center h-full min-h-[190px] lg:min-h-[200px]">
                <h3 className="text-lg lg:text-xl font-bold text-[#0F313A] mb-1">
                  Track your shipment
                </h3>
                <p className="text-slate-600 text-xs mb-3 line-clamp-1">
                  Enter your container bill of lading, air waybill, or
                  multimodal booking reference.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTrackingSearch();
                  }}
                  className="relative flex items-center bg-white rounded-full pl-5 pr-1.5 py-1.5 border border-slate-300 focus-within:border-[#0F313A] transition-colors"
                >
                  <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    placeholder="Enter your airway bill container"
                    value={trackingCodeInput}
                    onChange={(e) => setTrackingCodeInput(e.target.value)}
                    className="w-full bg-transparent text-xs lg:text-sm text-[#0F313A] placeholder:text-slate-400 focus:outline-none py-1.5"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingTracking}
                    aria-label="Search shipment"
                    className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-[#0F313A] hover:bg-[#BA1C20] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>
                {trackingError && (
                  <p className="text-xs text-[#BA1C20] font-semibold mt-1.5">
                    {trackingError}
                  </p>
                )}
              </div>

              {/* Right: Left/Right Navigation Controls (2 cols) */}
              <div className="md:col-span-2 flex items-center justify-end gap-2.5 self-end pb-3">
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous freight mode slide"
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next freight mode slide"
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            3. MOBILE-EXCLUSIVE QUICK ACTIONS & TELEMETRY
            ==================================================== */}
        <section
          id="tracking"
          className="px-4 sm:px-6 lg:px-8 py-4 max-w-[1760px] mx-auto scroll-mt-24"
          aria-label="Quick Actions and Shipment Telemetry"
        >
          {/* On Mobile: Track Your Shipment is FIRST, Contact is SECOND. On Tablet/Desktop: Hidden. */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {/* 1st: Track Your Shipment Card */}
            <div className="bg-[#F0F2F5] text-[#0F313A] rounded-3xl p-6 sm:p-8 flex flex-col justify-center">
              <h3 className="text-xl font-bold text-[#0F313A] mb-2">
                Track your shipment
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm mb-4">
                Enter your container bill of lading, air waybill, or multimodal
                booking reference.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTrackingSearch();
                }}
                className="relative flex items-center bg-white rounded-full pl-5 pr-1.5 py-1.5 border border-slate-300 focus-within:border-[#0F313A] transition-colors"
              >
                <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
                <input
                  type="text"
                  placeholder="Enter your airway bill container"
                  value={trackingCodeInput}
                  onChange={(e) => setTrackingCodeInput(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#0F313A] placeholder:text-slate-400 focus:outline-none py-2"
                />
                <button
                  type="submit"
                  disabled={isSearchingTracking}
                  aria-label="Search shipment"
                  className="w-11 h-11 rounded-xl bg-[#0F313A] hover:bg-[#BA1C20] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </form>
              {trackingError && (
                <p className="text-xs text-[#BA1C20] font-semibold mt-2">
                  {trackingError}
                </p>
              )}
            </div>

            {/* 2nd: Call Center / Contact Card */}
            <div className="bg-[#0F313A] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1.5">
                    Call Center
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mb-1">
                    24/7 Support
                  </p>
                  <p className="text-white text-base font-semibold">
                    +1 800 555-LOGI
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1.5">
                    Our Location
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mb-1">
                    USA, New York – 1060
                  </p>
                  <p className="text-white text-base font-semibold">
                    Str. First Avenue 1
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Modal / Popover: Render Live Tracking Record when active */}
          {activeTrackingResult && (
            <div className="mt-6 bg-white border-2 border-[#0F313A] rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F313A] text-white flex items-center justify-center">
                    {activeTrackingResult.mode === "ocean" && (
                      <Ship className="w-5 h-5 text-[#BA1C20]" />
                    )}
                    {activeTrackingResult.mode === "air" && (
                      <Plane className="w-5 h-5 text-[#BA1C20]" />
                    )}
                    {activeTrackingResult.mode === "rail" && (
                      <Train className="w-5 h-5 text-[#BA1C20]" />
                    )}
                    {activeTrackingResult.mode === "road" && (
                      <Truck className="w-5 h-5 text-[#BA1C20]" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-[#0F313A] font-mono">
                        {activeTrackingResult.code}
                      </span>
                      <Badge variant="success" className="text-[10px]">
                        Active Signal
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {activeTrackingResult.carrier} •{" "}
                      {activeTrackingResult.vesselOrFlight}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-semibold uppercase">
                      Estimated Arrival
                    </span>
                    <span className="text-sm font-bold text-[#0F313A]">
                      {activeTrackingResult.eta}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTrackingResult(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Waypoints & Progress */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Origin Hub
                  </span>
                  <p className="text-sm font-bold text-[#0F313A]">
                    {activeTrackingResult.origin}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Current Coordinates
                  </span>
                  <p className="text-sm font-bold text-[#BA1C20]">
                    {activeTrackingResult.currentLocation}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeTrackingResult.currentStatus}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Destination Gateway
                  </span>
                  <p className="text-sm font-bold text-[#0F313A]">
                    {activeTrackingResult.destination}
                  </p>
                  {activeTrackingResult.temperature && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sensor: {activeTrackingResult.temperature}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Transit Progress</span>
                  <span className="text-[#0F313A] font-mono">
                    {activeTrackingResult.progressPercent}% Complete
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0F313A] h-full rounded-full transition-all duration-500 flex justify-end items-center pr-1"
                    style={{
                      width: `${activeTrackingResult.progressPercent}%`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#BA1C20]" />
                  </div>
                </div>
              </div>

              {/* Milestones Checklist */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Waypoint Telemetry Feed
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {activeTrackingResult.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        m.completed
                          ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 font-bold">
                        {m.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{m.title}</span>
                      </div>
                      <span className="font-mono text-[10px] block opacity-80">
                        {m.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ====================================================
            4. / services / SECTION WITH DOTTED WATERMARK
            ==================================================== */}
        <section
          id="services"
          className="px-4 sm:px-6 lg:px-8 py-20 max-w-[1760px] mx-auto relative overflow-hidden scroll-mt-24"
          aria-label="Core Transportation Services"
        >
          {/* Dotted World Map Background Watermark Pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-20 -z-10 flex items-center justify-center">
            <svg
              className="w-full h-full max-w-5xl"
              viewBox="0 0 1000 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <pattern
                id="world-dots"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.5" fill="#0F313A" />
              </pattern>
              <rect width="1000" height="500" fill="url(#world-dots)" />
              {/* Shipping Route Curves */}
              <path
                d="M150 200 Q 300 120 500 190 T 850 220"
                stroke="#BA1C20"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.8"
              />
              <path
                d="M200 350 Q 450 420 700 310 T 900 360"
                stroke="#BA1C20"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.7"
              />
            </svg>
          </div>

          {/* Section Header */}
          <div className="mb-14">
            <p className="text-xs uppercase font-extrabold tracking-widest text-slate-500 mb-3">
              / services /
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-[#0F313A] tracking-tight max-w-4xl leading-[1.08]">
              Transportation services which we provide to our customers
            </h2>
          </div>

          {/* 4-Column Illustration Grid Matching Reference Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 pb-12 mb-10">
            {/* 1. Expedited Air Freight */}
            <div className="group py-6 sm:py-0 sm:px-6 lg:px-8 flex flex-col justify-between min-h-[300px]">
              <div className="relative w-full aspect-[16/10] mb-6">
                <Image
                  src="/images/illustrations/illustration-plane.png"
                  alt="Expedited Air Cargo Illustration"
                  fill
                  className="object-contain object-left-bottom group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F313A] mb-2">
                  Expedited Air Cargo
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Priority transcontinental air freight with guaranteed delivery
                  windows and airport bypass.
                </p>
              </div>
            </div>

            {/* 2. Ocean Maritime Lines */}
            <div className="group py-6 sm:py-0 sm:px-6 lg:px-8 flex flex-col justify-between min-h-[300px]">
              <div className="relative w-full aspect-[16/10] mb-6">
                <Image
                  src="/images/illustrations/illustration-ship.png"
                  alt="Transoceanic Maritime Illustration"
                  fill
                  className="object-contain object-left-bottom group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F313A] mb-2">
                  Transoceanic Maritime
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  FCL &amp; LCL container bookings across global deepwater lanes
                  with automated customs clearance.
                </p>
              </div>
            </div>

            {/* 3. Overland Truckload */}
            <div className="group py-6 sm:py-0 sm:px-6 lg:px-8 flex flex-col justify-between min-h-[300px]">
              <div className="relative w-full aspect-[16/10] mb-6">
                <Image
                  src="/images/illustrations/illustration-truck.png"
                  alt="Overland Truckload Illustration"
                  fill
                  className="object-contain object-left-bottom group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F313A] mb-2">
                  Overland Truckload
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Dedicated long-haul and regional class-8 fleets equipped with
                  real-time GPS telemetry.
                </p>
              </div>
            </div>

            {/* 4. Intermodal Rail Pass */}
            <div className="group py-6 sm:py-0 sm:px-6 lg:px-8 flex flex-col justify-between min-h-[300px]">
              <div className="relative w-full aspect-[16/10] mb-6">
                <Image
                  src="/images/illustrations/illustration-train.png"
                  alt="Intermodal Rail Pass Illustration"
                  fill
                  className="object-contain object-left-bottom group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#0F313A] mb-2">
                  Intermodal Rail Pass
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Electrified transcontinental heavy rail corridors linking
                  seaports directly to inland logistics hubs.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row: Explanation Text & [ All services [↗] ] Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Comprehensive multimodal freight corridors combining consolidated
              LTL routing, dedicated full container truckloads, guaranteed
              final-mile distribution, and licensed customs brokerage across
              international gateways.
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-3 bg-white border border-slate-300 hover:border-[#0F313A] rounded-full pl-6 pr-1.5 py-1.5 text-xs sm:text-sm font-semibold text-[#0F313A] transition-all self-start md:self-auto cursor-pointer"
            >
              <span>All services</span>
              <span className="w-8 h-8 rounded-full bg-[#0F313A] text-white flex items-center justify-center group-hover:bg-[#BA1C20] transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* ====================================================
            5. / about us / SECTION WITH GIANT OUTLINED TYPOGRAPHY
            ==================================================== */}
        <section
          id="about"
          className="px-4 sm:px-6 lg:px-8 py-10 max-w-[1760px] mx-auto scroll-mt-24"
          aria-label="About RILFREIGHT and Operational Scale"
        >
          <div className="bg-[#0F313A] text-white rounded-3xl md:rounded-[36px] p-5 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden shadow-2xl">
            {/* 1. Category Tag at the Top */}
            <p className="text-xs uppercase font-extrabold tracking-widest text-[#BA1C20] mb-4">
              / about us /
            </p>

            {/* 2. Giant Counter Row (Bigger Text, No Divider Below) */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 mb-10 sm:mb-12">
              <div>
                <div
                  className="font-black tracking-tight leading-none text-transparent select-none"
                  style={{
                    WebkitTextStroke: "2.5px #BA1C20",
                    fontSize: "clamp(2.25rem, 8.5vw, 7.5rem)",
                  }}
                >
                  317.298.315
                </div>
              </div>

              <div className="max-w-xs text-slate-300 pb-2">
                <span className="text-sm font-bold uppercase tracking-wider text-white block mb-1">
                  Delivered tons of products
                </span>
                <p className="text-xs leading-relaxed text-slate-300">
                  Surgically coordinated across maritime sea routes, air
                  corridors, and rail classification yards with zero unverified
                  loss.
                </p>
              </div>
            </div>

            {/* 3. Company Narrative 2-Column Row (Text & Text) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14 items-start mb-10 sm:mb-12">
              {/* Left Column (Big Text) */}
              <div className="lg:col-span-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase leading-[1.08] tracking-tight text-white">
                  RILFREIGHT IS THE BEST TRANSPORTATION COMPANY IN OUR STATE
                  &amp; BEYOND
                </h2>
              </div>

              {/* Right Column (Detailed Sub-texts & Highlights) */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-6">
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  For more than two decades, RILFREIGHT has engineered an
                  uncompromising transcontinental logistics framework. By
                  bridging automated high-bay distribution hubs with real-time
                  IoT sensors and dedicated customs brokerage, we eliminate
                  friction across every link of your supply chain.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                  From temperature-controlled biopharma reefers to heavy-lift
                  multimodal flatcars, our certified dispatch engineers and
                  automated lane clearance ensure guaranteed delivery velocity
                  across North America and global corridors.
                </p>
                <div className="pt-2">
                  <Link
                    href="/about"
                    className="group inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-6 py-3 text-white font-semibold text-sm transition-all"
                  >
                    <span>More about company history</span>
                    <span className="w-7 h-7 rounded-full bg-[#BA1C20] text-white flex items-center justify-center group-hover:rotate-45 transition-transform">
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 4. Full-Width Landscape Feature Banner at the Bottom */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden min-h-[260px] sm:min-h-[320px] md:min-h-[380px] flex items-center md:items-end justify-start md:justify-end p-6 sm:p-8 md:p-10 border border-white/15 group">
              <Image
                src="/images/home-customer-handover.jpg"
                alt="Driving Your Journey Forward with RILFREIGHT"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Dark Gradient Overlay for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-black/85 via-black/50 to-black/30" />

              {/* Enlarge Overlay Headline with Full Responsive Formatting */}
              <div className="relative z-10 max-w-2xl text-left md:text-right">
                <h3 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight leading-[1.1] drop-shadow-lg">
                  DRIVING YOUR JOURNEY FORWARD WITH RELIABLE, EFFICIENT, AND
                  SEAMLESS TRANSPORTATION SOLUTIONS
                </h3>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            6. PARTNER LOGO MARQUEE & CONTINUOUS RUNNING TICKER
            ==================================================== */}
        <section
          className="pt-10 pb-0 bg-slate-50 overflow-hidden"
          aria-label="Partner Logos and Capabilities Ticker"
        >
          <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <p className="text-left text-[11px] font-extrabold uppercase tracking-widest text-[#BA1C20] mb-4">
              Trusted by Multinational Energy, Automotive &amp; Industrial
              Consortia
            </p>
            {/* Partner Logo Marquee - Scrolling Left to Right with Enlarged Typography */}
            <div className="w-full overflow-hidden whitespace-nowrap py-2">
              <div className="animate-marquee-right items-center">
                {/* Track 1 */}
                <div className="flex items-center space-x-12 sm:space-x-16 lg:space-x-20 pr-12 sm:pr-16 lg:pr-20 opacity-80">
                  <span className="font-black text-2xl sm:text-3xl tracking-tighter text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    MINIMIZE<span className="text-[#BA1C20]">.</span>
                  </span>
                  <span className="font-extrabold text-2xl sm:text-3xl tracking-widest text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    ND2<span className="text-[#BA1C20]">_</span>CORP
                  </span>
                  <span className="font-bold text-2xl sm:text-3xl tracking-wider text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    METRIKS
                  </span>
                  <span className="font-black text-2xl sm:text-3xl tracking-normal text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    QUO
                    <span className="text-sm font-semibold text-slate-500 ml-1">
                      LEGAL
                    </span>
                  </span>
                  <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    AGRIMAX
                  </span>
                  <span className="font-black text-2xl sm:text-3xl tracking-widest text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    VINTAGE
                  </span>
                </div>
                {/* Track 2 (Duplicate for seamless infinite loop) */}
                <div
                  className="flex items-center space-x-12 sm:space-x-16 lg:space-x-20 pr-12 sm:pr-16 lg:pr-20 opacity-80"
                  aria-hidden="true"
                >
                  <span className="font-black text-2xl sm:text-3xl tracking-tighter text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    MINIMIZE<span className="text-[#BA1C20]">.</span>
                  </span>
                  <span className="font-extrabold text-2xl sm:text-3xl tracking-widest text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    ND2<span className="text-[#BA1C20]">_</span>CORP
                  </span>
                  <span className="font-bold text-2xl sm:text-3xl tracking-wider text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    METRIKS
                  </span>
                  <span className="font-black text-2xl sm:text-3xl tracking-normal text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    QUO
                    <span className="text-sm font-semibold text-slate-500 ml-1">
                      LEGAL
                    </span>
                  </span>
                  <span className="font-extrabold text-2xl sm:text-3xl tracking-tight text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    AGRIMAX
                  </span>
                  <span className="font-black text-2xl sm:text-3xl tracking-widest text-slate-700 hover:text-[#0F313A] transition-colors cursor-default">
                    VINTAGE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous Running Ticker - Scrolling Right to Left (2x Font Size, No Dividers) */}
          <div className="w-full bg-[#0F313A] text-white py-5 sm:py-6 overflow-hidden whitespace-nowrap">
            <div className="animate-marquee-left items-center">
              {/* Track 1 */}
              <div className="flex items-center">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  THE BEST TRANSPORTATION CORPS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  FAST FREIGHT <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  RELIABLE LOGISTICS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  REAL-TIME IOT TELEMATICS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  ZERO-EMISSION HUBS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  TRANSCONTINENTAL RAIL CORRIDORS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  24/7 DISPATCH DESK{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  PHARMACEUTICAL COLD-CHAIN{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
              </div>
              {/* Track 2 (Duplicate for seamless infinite loop) */}
              <div className="flex items-center" aria-hidden="true">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  THE BEST TRANSPORTATION CORPS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  FAST FREIGHT <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  RELIABLE LOGISTICS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  REAL-TIME IOT TELEMATICS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  ZERO-EMISSION HUBS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  TRANSCONTINENTAL RAIL CORRIDORS{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  24/7 DISPATCH DESK{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase mx-6 sm:mx-8">
                  PHARMACEUTICAL COLD-CHAIN{" "}
                  <span className="text-[#BA1C20] ml-2">✦</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            7. / expertise / SECTION (MATCHING REFERENCE STRUCTURE)
            ==================================================== */}
        <section
          id="expertise"
          className="px-4 sm:px-6 lg:px-8 py-20 max-w-[1760px] mx-auto scroll-mt-24"
          aria-label="Expertise and Key Performance Indicators"
        >
          {/* Left-Aligned Plain Header */}
          <div className="mb-12 sm:mb-16">
            <p className="text-left text-xs font-extrabold uppercase tracking-widest text-[#BA1C20] mb-4">
              / expertise /
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-[#0F313A] tracking-tight leading-[1.08] max-w-4xl">
              EXPERTISE IN OUR
              <br />
              TRANSPORTATION SERVICES
            </h2>
          </div>

          {/* 3 Integrated Columns matching reference layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
            {/* Column 1 */}
            <div className="flex flex-col">
              <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#BA1C20] tracking-tight mb-4 font-mono">
                124 bil
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F313A] mb-3">
                Introduction of modern technologies
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Automated high-bay sorting algorithms, AI-powered storm
                avoidance rerouting, and biometric container telematics deployed
                across global corridors.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 mt-auto pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>Modern techniques &amp; robotics</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>Automated sortation facilities</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>Predictive maintenance telematics</span>
                </li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col">
              <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#BA1C20] tracking-tight mb-4 font-mono">
                98%
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F313A] mb-3">
                Timely delivery to the destination
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Precision dispatch scheduling with pre-arrival electronic
                customs filing and guaranteed priority berth clearance across
                marine and rail terminals.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 mt-auto pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>Modern trucks and rail corridors</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>Pre-cleared customs express lanes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>Dynamic multi-modal dispatch</span>
                </li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col">
              <div className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#BA1C20] tracking-tight mb-4 font-mono">
                585k
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F313A] mb-3">
                Cargo insurance and security
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Comprehensive all-risk cargo underwriting, tamper-evident
                cryptographic ePOD seals, and continuous 24/7 centralized
                dispatch surveillance.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 mt-auto pt-4 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>GPS tracking &amp; sensor telemetry</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>All-risk cargo liability coverage</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#BA1C20] font-bold">―</span>
                  <span>24/7 centralized security dispatch</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ====================================================
            8. / quote / MINIMAL REQUEST A QUOTE SECTION
            ==================================================== */}
        <section
          id="quote"
          className="px-4 sm:px-6 lg:px-8 py-10 max-w-[1760px] mx-auto scroll-mt-24"
          aria-label="Request a Freight Quote"
        >
          <div className="relative rounded-3xl md:rounded-[36px] overflow-hidden min-h-[720px] p-6 sm:p-10 md:p-12 lg:p-16 flex items-center">
            {/* Background Photographic Layer: Port Gantry Cranes at Sunset */}
            <Image
              src="/images/quote-port-cranes.jpg"
              alt="Container Port Gantry Cranes at Sunset"
              fill
              className="object-cover object-center"
            />
            {/* Subtle Gradient Overlay for visual depth & legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/70 pointer-events-none" />

            {/* 2-Column Layout Grid */}
            <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
              {/* Left Column: Minimal White Card (lg:col-span-7) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 md:p-12 border border-slate-100">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-8">
                  Request a quote
                </h2>

                {quoteSubmitted ? (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center animate-in fade-in duration-300">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <h3 className="text-base font-bold mb-1">
                      Quote Request Sent!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      Our dispatch engineers will prepare your customized rate
                      and reply within 30 minutes.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleQuoteSubmit} className="space-y-4">
                    {/* Row 1: Full name | Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Full name"
                        required
                        value={quoteFormData.fullName}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            fullName: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        required
                        value={quoteFormData.email}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            email: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                    </div>

                    {/* Row 2: Phone | Subject */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={quoteFormData.phone}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Subject"
                        value={quoteFormData.subject}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            subject: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                    </div>

                    {/* Row 3: Deliver City | City of departure */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Deliver City"
                        value={quoteFormData.deliverCity}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            deliverCity: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="City of departure"
                        value={quoteFormData.departureCity}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            departureCity: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                    </div>

                    {/* Row 4: Freight Type | Incoterms */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <fieldset className="rounded-2xl border border-slate-300 px-3 pb-1 pt-0">
                        <legend className="text-[11px] font-medium text-slate-500 px-1">
                          Freight Type
                        </legend>
                        <select
                          value={quoteFormData.freightType}
                          onChange={(e) =>
                            setQuoteFormData({
                              ...quoteFormData,
                              freightType: e.target.value,
                            })
                          }
                          className="w-full bg-transparent text-sm text-slate-800 focus:outline-none py-1.5 cursor-pointer"
                        >
                          <option value="Truck Freight">Truck Freight</option>
                          <option value="Ocean Freight">Ocean Freight</option>
                          <option value="Air Cargo">Air Cargo</option>
                          <option value="Rail Freight">Rail Freight</option>
                        </select>
                      </fieldset>
                      <fieldset className="rounded-2xl border border-slate-300 px-3 pb-1 pt-0">
                        <legend className="text-[11px] font-medium text-slate-500 px-1">
                          Incoterms
                        </legend>
                        <select
                          value={quoteFormData.incoterms}
                          onChange={(e) =>
                            setQuoteFormData({
                              ...quoteFormData,
                              incoterms: e.target.value,
                            })
                          }
                          className="w-full bg-transparent text-sm text-slate-800 focus:outline-none py-1.5 cursor-pointer"
                        >
                          <option value="EXW">EXW</option>
                          <option value="FOB">FOB</option>
                          <option value="CIF">CIF</option>
                          <option value="DDP">DDP</option>
                          <option value="FCA">FCA</option>
                        </select>
                      </fieldset>
                    </div>

                    {/* Row 5: Weight | Height */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Weight"
                        value={quoteFormData.weight}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            weight: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Height"
                        value={quoteFormData.height}
                        onChange={(e) =>
                          setQuoteFormData({
                            ...quoteFormData,
                            height: e.target.value,
                          })
                        }
                        className="w-full bg-white rounded-2xl px-4 py-3 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F313A] transition-colors"
                      />
                    </div>

                    {/* Row 6: Minimal Checkboxes */}
                    <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={quoteFormData.fragile}
                          onChange={(e) =>
                            setQuoteFormData({
                              ...quoteFormData,
                              fragile: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-[#BA1C20] focus:ring-0"
                        />
                        <span>Fragile</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={quoteFormData.express}
                          onChange={(e) =>
                            setQuoteFormData({
                              ...quoteFormData,
                              express: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-[#BA1C20] focus:ring-0"
                        />
                        <span>Express</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={quoteFormData.insurance}
                          onChange={(e) =>
                            setQuoteFormData({
                              ...quoteFormData,
                              insurance: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-[#BA1C20] focus:ring-0"
                        />
                        <span>Insurance</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={quoteFormData.packaging}
                          onChange={(e) =>
                            setQuoteFormData({
                              ...quoteFormData,
                              packaging: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-[#BA1C20] focus:ring-0"
                        />
                        <span>Packaging</span>
                      </label>
                    </div>

                    {/* Row 7: Request a Quote Button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        className="group inline-flex items-center gap-4 bg-white border border-slate-300 hover:border-[#BA1C20] rounded-2xl pl-6 pr-2 py-2 text-slate-900 font-bold text-sm transition-all cursor-pointer"
                      >
                        <span>Request a Quote</span>
                        <span className="w-10 h-10 rounded-xl bg-[#BA1C20] text-white flex items-center justify-center group-hover:bg-[#9c171a] transition-all transform group-hover:rotate-45">
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column: Tracking Your Cargo & Red Contact Box (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-8 lg:space-y-16">
                <div>
                  <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-white tracking-tight leading-[1.08] drop-shadow-md">
                    Tracking your cargo
                  </h3>
                  <p className="text-slate-200 text-sm sm:text-base leading-relaxed mt-4 max-w-md drop-shadow">
                    Real-time satellite AIS telemetry, automated port customs
                    clearance, and continuous milestone tracking across global
                    corridors.
                  </p>
                </div>

                {/* Red Contact Box */}
                <div className="bg-[#BA1C20] text-white rounded-3xl p-8 sm:p-10 max-w-md">
                  <h4 className="text-xl sm:text-2xl font-bold text-white mb-4">
                    Do you have any questions?
                  </h4>
                  <p className="text-white/80 text-xs uppercase tracking-wider mb-2">
                    Call us today
                  </p>
                  <a
                    href="tel:8001006781095"
                    className="text-2xl sm:text-3xl font-black text-white hover:text-white/90 transition-colors tracking-tight block font-mono"
                  >
                    800 100 678 10 95
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            11. CUSTOMER TESTIMONIALS & TRUST HANDOVER SECTION
            ==================================================== */}
        <section
          id="reviews"
          className="px-4 sm:px-6 lg:px-8 py-20 max-w-[1760px] mx-auto scroll-mt-24"
          aria-label="Client Testimonials and Verification"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Larger RIL FREIGHT (4 cols on tablet/desktop, enlarged on mobile) */}
            <div className="md:col-span-4 flex flex-col justify-center select-none py-4 w-full">
              <div
                className="font-black tracking-tighter leading-[0.85] text-transparent"
                style={{
                  WebkitTextStroke: "3px #0F313A",
                  fontSize: "clamp(5.5rem, 15vw, 11rem)",
                }}
              >
                RIL
              </div>
              <div
                className="font-black tracking-tight leading-[0.85] text-transparent mt-2 sm:mt-3"
                style={{
                  WebkitTextStroke: "2.5px #0F313A",
                  fontSize: "clamp(3.2rem, 9.5vw, 6.2rem)",
                }}
              >
                FREIGHT.
              </div>
            </div>

            {/* Right: Reviews with 8-column span on tablet/desktop (67% width) */}
            <div className="md:col-span-8 bg-white p-4 sm:p-8 flex flex-col justify-between">
              <div>
                {/* Logical Dynamic Star Rating (Supports 4/5 and 5/5) */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < REVIEWS[testimonialIndex].rating
                          ? "fill-[#BA1C20] text-[#BA1C20]"
                          : "fill-none text-slate-300 stroke-[1.5]"
                      }`}
                    />
                  ))}
                </div>

                {/* Giant Red Quote Symbol */}
                <div className="text-6xl text-[#BA1C20] font-serif leading-none select-none mb-2">
                  “
                </div>

                <blockquote className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F313A] leading-relaxed mb-8">
                  {REVIEWS[testimonialIndex].quote}
                </blockquote>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-extrabold text-[#0F313A]">
                    {REVIEWS[testimonialIndex].name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {REVIEWS[testimonialIndex].title} •{" "}
                    <span className="font-semibold text-slate-700">
                      {REVIEWS[testimonialIndex].company}
                    </span>
                  </p>
                </div>

                {/* Testimonial Nav Arrows (Clean, 01/03 counter removed) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevTestimonial}
                    aria-label="Previous Testimonial"
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={nextTestimonial}
                    aria-label="Next Testimonial"
                    className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            12. / blog / SECTION WITH 3 LOGISTICS ARTICLES
            ==================================================== */}
        <section
          id="blog"
          className="px-4 sm:px-6 lg:px-8 py-10 max-w-[1760px] mx-auto scroll-mt-24"
          aria-label="Industry Articles and News"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-[#0F313A] tracking-tight max-w-2xl leading-[1.1]">
                SEE LATEST ARTICLES FROM OUR COMPANY
              </h2>
            </div>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase text-[#0F313A] hover:text-[#BA1C20] transition-colors"
            >
              <span>View All Publications</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {/* Article 1 */}
            <article className="flex flex-col justify-between group">
              <div>
                {/* Date & Divider at the top */}
                <span className="text-xs font-medium text-slate-400">
                  Jul. 05/2026
                </span>
                <div className="w-full h-px bg-slate-300/80 mt-2 mb-5" />

                {/* Content UP */}
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#BA1C20] transition-colors leading-snug">
                  Digital communications in people&apos;s daily lives
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 mb-6 line-clamp-2">
                  How low-Earth satellite constellations enable continuous
                  telemetry across ocean passages and mountain rail corridors.
                </p>
              </div>

              {/* Image DOWN */}
              <div className="relative aspect-[4/4.5] rounded-[28px] overflow-hidden">
                <Image
                  src="/images/hero-ocean-megaship.jpg"
                  alt="Digital communications in people's daily lives"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-[#F0F2F5] text-[#BA1C20] text-xs font-semibold px-4 py-1.5 rounded-full">
                  Logistics
                </span>
              </div>
            </article>

            {/* Article 2 */}
            <article className="flex flex-col justify-between group">
              <div>
                {/* Date & Divider at the top */}
                <span className="text-xs font-medium text-slate-400">
                  Jul. 05/2026
                </span>
                <div className="w-full h-px bg-slate-300/80 mt-2 mb-5" />

                {/* Content UP */}
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#BA1C20] transition-colors leading-snug">
                  Creating new working conditions in the logistic
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 mb-6 line-clamp-2">
                  Examining how automated robotic AGVs and paperless
                  cryptographic ePODs are slashing facility dwell times.
                </p>
              </div>

              {/* Image DOWN */}
              <div className="relative aspect-[4/4.5] rounded-[28px] overflow-hidden">
                <Image
                  src="/images/road-service-hero.jpg"
                  alt="Creating new working conditions in the logistic"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-[#F0F2F5] text-[#BA1C20] text-xs font-semibold px-4 py-1.5 rounded-full">
                  Transport
                </span>
              </div>
            </article>

            {/* Article 3 */}
            <article className="flex flex-col justify-between group">
              <div>
                {/* Date & Divider at the top */}
                <span className="text-xs font-medium text-slate-400">
                  Jul. 05/2026
                </span>
                <div className="w-full h-px bg-slate-300/80 mt-2 mb-5" />

                {/* Content UP */}
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#BA1C20] transition-colors leading-snug">
                  Transportation services in Los Angeles region
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 mb-6 line-clamp-2">
                  Synchronizing deepwater gantry discharge with transcontinental
                  double-stack rail loops to decongest urban ports.
                </p>
              </div>

              {/* Image DOWN */}
              <div className="relative aspect-[4/4.5] rounded-[28px] overflow-hidden">
                <Image
                  src="/images/hero-air-freighter-runway.jpg"
                  alt="Transportation services in Los Angeles region"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-[#F0F2F5] text-[#BA1C20] text-xs font-semibold px-4 py-1.5 rounded-full">
                  Shipping
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* ====================================================
            UNIFIED MASTER DARK COMPONENT:
            1) Special Services for Our Customers
            2) "Have Any Questions? / Delivered on Time with No Hassle"
            3) Global Footer
            ==================================================== */}
        <div className="bg-[#0F313A] text-white rounded-t-[36px] md:rounded-t-[48px] mt-28 sm:mt-36 lg:mt-44 relative">
          {/* Part 1: Special Services - Flush with top edge, translated 15% outside on all screens */}
          <section
            id="special-services"
            className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 mt-0 pt-0 relative z-20 scroll-mt-32"
            aria-label="Special Services for Our Customers"
          >
            {/* Translates both cards 15% outside across mobile, tablet, and desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch -translate-y-[15%]">
              {/* Card 1: Custom Intermodal Rail Yard Photography */}
              <div className="rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[400px] sm:min-h-[440px] md:min-h-[480px] p-8 sm:p-12 group">
                <Image
                  src="/images/rail-intermodal-yard.jpg"
                  alt="Special service for our customers"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F313A] via-[#0F313A]/70 to-[#0F313A]/30" />
                <div className="relative z-10 max-w-xs sm:max-w-sm">
                  <div className="w-16 h-0.5 bg-[#BA1C20] mb-6" />
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
                    Special service for our customers
                  </h3>
                  <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                    Customized multimodal corridors, bonded warehousing, and
                    high-consequence temperature-controlled solutions.
                  </p>
                </div>
                <div className="relative z-10 pt-6">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 text-white font-semibold text-sm underline underline-offset-4 hover:opacity-80 transition-opacity"
                  >
                    <span>Discover</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Card 2: Sunset Vessel Photographic Card */}
              <div className="rounded-3xl relative overflow-hidden flex flex-col justify-end min-h-[400px] sm:min-h-[440px] md:min-h-[480px] p-8 sm:p-12 group">
                <Image
                  src="/images/special-service-ship.jpg"
                  alt="Logistic for different ways in our state & beyond"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="relative z-10 max-w-md">
                  <div className="w-16 h-0.5 bg-white/50 mb-6" />
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
                    Logistic for different ways in our state &amp; beyond
                  </h3>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-1.5 text-white font-semibold text-sm underline underline-offset-4 hover:opacity-80 transition-opacity"
                  >
                    <span>Discover</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Part 2: "Have Any Questions? Call Us" / Delivered on Time Callout */}
          <section
            className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 pb-10"
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

          {/* Part 3: Embedded Footer */}
          <Footer embedded={true} />
        </div>
      </main>
    </div>
  );
}
