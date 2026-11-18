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
import { PageFooter } from "@/shared/components/page-footer";
import { useToast } from "@/shared/components/toast";
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
  const toast = useToast();
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
          if (val.trim().length < 2)
            return "Name must be at least 2 characters.";
          return undefined;

        case "email":
          if (!val.trim()) return "Email address is required.";
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
            return "Please provide a valid email address.";
          }
          return undefined;

        case "subject":
          if (!val.trim()) return "Subject is required.";
          if (val.trim().length < 3)
            return "Subject must be at least 3 characters.";
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
    [],
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
    [validateField],
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
      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || "Failed to send message.");
          }
          setIsSubmitted(true);
          toast.success("Your message has been sent to our dispatch team.");
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to deliver message.";
          toast.destructive(msg);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
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
        {/* 2. HERO BANNER: Full-width edge-to-edge container with giant CONTACTS and breadcrumb */}
        <section aria-labelledby="contact-header-title" className="w-full relative min-h-[340px] md:min-h-[420px] overflow-hidden group">
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
          <div className="relative z-10 max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex flex-col justify-between h-full min-h-[340px] md:min-h-[420px]">
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
        </section>

        {/* 3. TWO-COLUMN CONTENT & FORM SECTION */}
        <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
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
                Our global logistics coordinators, multimodal transport
                dispatchers, and customs clearance specialists are available
                around the clock to assist with your global freight needs.
              </p>

              {/* Contact Information Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                {/* Block 1: Call Center */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Call Center
                  </h3>
                  <div className="space-y-1 text-sm text-slate-700">
                    <p>
                      <a
                        href="https://wa.me/19204173547"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#BA1C20] transition-colors font-medium"
                      >
                        +1 (920) 417-3547
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
                      href="mailto:support@rilfreight.com"
                      className="text-sm text-slate-900 font-medium underline underline-offset-4 hover:text-[#BA1C20] transition-colors"
                    >
                      support@rilfreight.com
                    </a>
                  </p>
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
                      Thank you, <strong>{values.fullName}</strong>. Our
                      logistics dispatch team has received your message and will
                      get back to you shortly.
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
                        onChange={(e) =>
                          handleChange("fullName", e.target.value)
                        }
                        onBlur={() => handleBlur("fullName")}
                        className={cn(
                          "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all",
                          touched.fullName &&
                            errors.fullName &&
                            "border-[#BA1C20]",
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
                          touched.email && errors.email && "border-[#BA1C20]",
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
                        onChange={(e) =>
                          handleChange("subject", e.target.value)
                        }
                        onBlur={() => handleBlur("subject")}
                        className={cn(
                          "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all",
                          touched.subject &&
                            errors.subject &&
                            "border-[#BA1C20]",
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
                        onChange={(e) =>
                          handleChange("message", e.target.value)
                        }
                        onBlur={() => handleBlur("message")}
                        className={cn(
                          "w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-[#0F313A] focus:ring-1 focus:ring-[#0F313A] text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all resize-y",
                          touched.message &&
                            errors.message &&
                            "border-[#BA1C20]",
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
        </div>

        {/* 4. INTERACTIVE GRAYSCALE MAP SECTION (Full-width edge-to-edge) */}
        <section
          aria-label="Location Map"
          className="w-full relative h-[460px] md:h-[520px] overflow-hidden group"
        >
          {/* Grayscale Map Embed */}
          <iframe
            src="https://maps.google.com/maps?q=Riverside+Building,+County+Hall,+Westminster+Bridge+Rd,+London+SE1+7PB,+UK&t=&z=14&ie=UTF8&iwloc=&output=embed"
            className="w-full h-full border-0 filter grayscale contrast-95 opacity-90"
            loading="lazy"
            title="RILFREIGHT London Headquarters Map"
          />

          {/* Floating London Headquarters Card aligned inside page container */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 h-full">
              <div className="pointer-events-auto max-w-[280px] sm:max-w-xs bg-white rounded-2xl p-5 border border-slate-200/90 font-sans shadow-lg">
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  London Headquarters
                </h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Riverside Building, County Hall, Westminster Bridge Rd, London
                  SE1 7PB, UK
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
            </div>
          </div>
        </section>

        {/* 5. STANDARDIZED UNIFIED FOOTER (Exact Match with Homepage - 100% Full Width) */}
        <PageFooter />
      </main>
    </div>
  );
}
