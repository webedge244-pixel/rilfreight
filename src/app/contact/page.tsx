"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Navigation,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { Navbar } from "@/shared/components/navbar";
import { Footer } from "@/shared/components/footer";
import { cn } from "@/shared/lib/utils";

interface FormValues {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  subject?: string;
  message?: string;
}

export default function ContactPage() {
  const [values, setValues] = React.useState<FormValues>({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  // Field validation
  const validateField = React.useCallback(
    (field: keyof FormValues, val: string): string | undefined => {
      switch (field) {
        case "fullName":
          if (!val.trim()) return "Full name is required.";
          if (val.trim().length < 2) return "Name must be at least 2 characters.";
          return undefined;

        case "email":
          if (!val.trim()) return "Email address is required.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
            return "Please provide a valid email address.";
          }
          return undefined;

        case "subject":
          if (!val.trim()) return "Subject is required.";
          if (val.trim().length < 3) return "Subject must be at least 3 characters.";
          return undefined;

        case "message":
          if (!val.trim()) return "Message is required.";
          if (val.trim().length < 10) {
            return "Message should be at least 10 characters long.";
          }
          return undefined;

        default:
          return undefined;
      }
    },
    []
  );

  const validateAll = React.useCallback(
    (data: FormValues): FormErrors => {
      const newErrors: FormErrors = {};
      (Object.keys(data) as (keyof FormValues)[]).forEach((key) => {
        const err = validateField(key, data[key]);
        if (err) newErrors[key] = err;
      });
      return newErrors;
    },
    [validateField]
  );

  const handleChange = (field: keyof FormValues, val: string) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (touched[field]) {
      const err = validateField(field, val);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: keyof FormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, values[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {
      fullName: true,
      email: true,
      subject: true,
      message: true,
    };
    setTouched(allTouched);

    const formErrors = validateAll(values);
    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 700);
    }
  };

  const handleReset = () => {
    setValues({
      fullName: "",
      email: "",
      subject: "",
      message: "",
    });
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#BA1C20] selection:text-white">
      {/* 1. MAIN NAVIGATION */}
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-16 md:space-y-24">
        {/* 2. HERO BANNER: Clean rounded container with giant CONTACTS and breadcrumb */}
        <section aria-labelledby="contact-header-title">
          <div className="relative w-full min-h-[340px] md:min-h-[420px] rounded-[32px] md:rounded-[36px] overflow-hidden group">
            {/* Background Logistics Photography */}
            <Image
              src="/images/home-multimodal-connectivity.jpg"
              alt="RILFREIGHT Multimodal Logistics and Shipping Terminal"
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
                  id="contact-header-title"
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight uppercase leading-none select-none"
                >
                  CONTACTS
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
                  <span className="text-slate-800">Contacts</span>
                </nav>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TWO-COLUMN CONTENT & FORM SECTION */}
        <section
          aria-labelledby="contact-heading"
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start"
        >
          {/* LEFT COLUMN: Headings, Subtitle & 4 Contact Details */}
          <div className="lg:col-span-6 space-y-6">
            <h2
              id="contact-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-[#0F313A] tracking-tight leading-tight"
            >
              WE ARE ALWAYS READY TO HELP YOU AND ANSWER YOUR QUESTIONS
            </h2>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Our global logistics coordinators, multimodal transport dispatchers,
                and customs clearance specialists are available around the clock
                to assist with your global freight needs.
              </p>

              {/* 4 Contact Information Blocks in a 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                {/* Block 1: Call Center */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Call Center
                  </h3>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <a
                        href="tel:+180010097520"
                        className="hover:text-[#BA1C20] transition-colors"
                      >
                        + 1-800 100 975 20 34
                      </a>
                    </p>
                    <p>
                      <a
                        href="tel:+112318002345"
                        className="hover:text-[#BA1C20] transition-colors"
                      >
                        + (123) 1800-234-5678
                      </a>
                    </p>
                  </div>
                </div>

                {/* Block 2: Our Location */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Our Location
                  </h3>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>USA, New York – 1060</p>
                    <p>Str. First Avenue 1</p>
                  </div>
                </div>

                {/* Block 3: Email */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Email
                  </h3>
                  <p>
                    <a
                      href="mailto:dispatch@rilfreight.com"
                      className="text-sm text-slate-900 font-medium underline underline-offset-4 hover:text-[#BA1C20] transition-colors"
                    >
                      dispatch@rilfreight.com
                    </a>
                  </p>
                </div>

                {/* Block 4: Social Network */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Social network
                  </h3>
                  <div className="flex items-center gap-4 text-slate-700 pt-1">
                    {/* Facebook */}
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="hover:text-[#BA1C20] transition-colors"
                    >
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                      </svg>
                    </a>

                    {/* X (Twitter) */}
                    <a
                      href="https://x.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="X (formerly Twitter)"
                      className="hover:text-[#BA1C20] transition-colors"
                    >
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>

                    {/* LinkedIn */}
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="hover:text-[#BA1C20] transition-colors"
                    >
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                      </svg>
                    </a>

                    {/* YouTube */}
                    <a
                      href="https://youtube.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                      className="hover:text-[#BA1C20] transition-colors"
                    >
                      <svg
                        className="w-4 h-4 fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          {/* RIGHT COLUMN: "Send a message" Form Card */}
          <div className="lg:col-span-6">
            <div className="border border-slate-200/90 rounded-[32px] p-8 sm:p-10 md:p-12 bg-white">
              {isSubmitted ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="py-10 flex flex-col items-center text-center space-y-4 animate-in fade-in duration-300"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#0F313A]">
                    Message Sent Successfully
                  </h3>
                  <p className="text-slate-600 text-sm max-w-sm">
                    Thank you, <strong>{values.fullName}</strong>. Our logistics
                    dispatch team has received your message and will get back to
                    you shortly.
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 hover:border-[#0F313A] text-slate-800 font-bold text-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Send another message</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-4"
                  aria-label="Send a message form"
                >
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
                    Send a message
                  </h3>

                  {/* Field 1: Full name */}
                  <div>
                    <label htmlFor="fullName" className="sr-only">
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Full name"
                      value={values.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      onBlur={() => handleBlur("fullName")}
                      className={cn(
                        "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all",
                        touched.fullName && errors.fullName && "border-[#BA1C20]"
                      )}
                    />
                    {touched.fullName && errors.fullName && (
                      <p className="text-xs text-[#BA1C20] mt-1.5 ml-1">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Field 2: Email */}
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Email"
                      value={values.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      className={cn(
                        "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all",
                        touched.email && errors.email && "border-[#BA1C20]"
                      )}
                    />
                    {touched.email && errors.email && (
                      <p className="text-xs text-[#BA1C20] mt-1.5 ml-1">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Field 3: Subject */}
                  <div>
                    <label htmlFor="subject" className="sr-only">
                      Subject
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder="Subject"
                      value={values.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      onBlur={() => handleBlur("subject")}
                      className={cn(
                        "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all",
                        touched.subject && errors.subject && "border-[#BA1C20]"
                      )}
                    />
                    {touched.subject && errors.subject && (
                      <p className="text-xs text-[#BA1C20] mt-1.5 ml-1">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  {/* Field 4: Message */}
                  <div>
                    <label htmlFor="message" className="sr-only">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      placeholder="Message"
                      value={values.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      onBlur={() => handleBlur("message")}
                      className={cn(
                        "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all resize-y",
                        touched.message && errors.message && "border-[#BA1C20]"
                      )}
                    />
                    {touched.message && errors.message && (
                      <p className="text-xs text-[#BA1C20] mt-1.5 ml-1">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Reference Style Action Button: Light pill with dark arrow square */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-between gap-4 rounded-full border border-slate-300 hover:border-[#0F313A] pl-6 pr-1.5 py-1.5 bg-white text-slate-900 font-bold transition-all group disabled:opacity-60"
                    >
                      <span className="text-sm">
                        {isSubmitting ? "Sending..." : "Send a message"}
                      </span>
                      <span className="w-10 h-10 rounded-xl bg-[#0F313A] group-hover:bg-[#BA1C20] text-white flex items-center justify-center transition-colors">
                        <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 4. INTERACTIVE GRAYSCALE MAP SECTION */}
        <section
          aria-label="Location Map"
          className="relative w-full h-[460px] md:h-[520px] rounded-[32px] md:rounded-[36px] overflow-hidden border border-slate-200 group"
        >
          {/* Grayscale Map Embed */}
          <iframe
            src="https://maps.google.com/maps?q=Riverside+Building,+County+Hall,+Westminster+Bridge+Rd,+London+SE1+7PB,+UK&t=&z=14&ie=UTF8&iwloc=&output=embed"
            className="w-full h-full border-0 filter grayscale contrast-95 opacity-90"
            loading="lazy"
            title="RILFREIGHT London Headquarters Map"
          />

          {/* Floating London Headquarters Card (matching frame_0030.jpg) */}
          <div className="absolute top-5 sm:top-6 left-5 sm:left-6 z-10 max-w-[280px] sm:max-w-xs bg-white rounded-2xl p-5 border border-slate-200/90 font-sans">
            <h4 className="text-base font-bold text-slate-900 leading-snug">
              London Headquarters
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Riverside Building, County Hall, Westminster Bridge Rd, London SE1 7PB, UK
            </p>

            <div className="flex items-center gap-1.5 text-xs text-slate-700 mt-2 font-medium">
              <span className="font-bold text-slate-900">4.9</span>
              <span className="text-amber-500">★</span>
              <span className="text-slate-400">(2,840 reviews)</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <a
                href="https://www.google.com/maps/search/?api=1&query=Riverside+Building,+County+Hall,+Westminster+Bridge+Rd,+London+SE1+7PB"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F313A] hover:bg-[#15434f] text-white text-xs font-semibold transition-colors"
              >
                <span>Open in Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="https://www.google.com/maps/dir/?api=1&destination=Riverside+Building,+County+Hall,+Westminster+Bridge+Rd,+London+SE1+7PB"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Directions to London Headquarters"
                className="w-8 h-8 rounded-lg border border-slate-200 hover:border-[#0F313A] text-slate-700 flex items-center justify-center transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-[#0F313A]" />
              </a>
            </div>
          </div>
        </section>
        </div>

        {/* 5. STANDARDIZED UNIFIED FOOTER (Exact Match with Homepage - 100% Full Width) */}
        <div className="w-full bg-[#0F313A] text-white rounded-t-[36px] md:rounded-t-[48px] mt-24 sm:mt-28 lg:mt-32 relative">
          {/* Customer Hotline Callout */}
          <section
            className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16 pb-10"
            aria-label="Customer Hotline Callout"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12 border-b border-white/10">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  Have any questions?<br />
                  <span className="text-[#BA1C20]">Call us +1 800 555-RILF</span>
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
