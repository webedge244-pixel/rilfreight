"use client";

import * as React from "react";
import { Plus, Minus } from "lucide-react";
import { ServiceFaqConfig } from "../types";

interface ServiceFaqAccordionProps {
  config: ServiceFaqConfig;
}

export function ServiceFaqAccordion({ config }: ServiceFaqAccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section aria-labelledby="service-faq-heading" className="w-full bg-[#F8FAFC]">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-10">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <span className="text-[#BA1C20] font-black text-xs sm:text-sm uppercase tracking-widest select-none">
            {config.badge}
          </span>
          <h2
            id="service-faq-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F313A] tracking-tight uppercase leading-[1.08]"
          >
            {config.headline}
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* FAQ Accordion matching Track Your Shipments */}
        <div className="max-w-4xl">
          {config.items.map((item, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={item.question}
                className="border-b border-slate-200 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 py-6 sm:py-7 text-left group cursor-pointer"
                >
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-[#0F313A] group-hover:text-[#BA1C20] transition-colors pr-4">
                    {item.question}
                  </h3>
                  <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#F0F2F5] group-hover:bg-[#0F313A] group-hover:text-white text-[#0F313A] flex items-center justify-center shrink-0 transition-all">
                    {isOpen ? (
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
                    ) : (
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
                    )}
                  </span>
                </button>

                {/* Expandable Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-125 opacity-100 pb-6" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl pr-14">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
