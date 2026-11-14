import * as React from "react";
import { ServiceMetric } from "../types";

interface ServiceMetricsGridProps {
  metrics: ServiceMetric[];
}

export function ServiceMetricsGrid({ metrics }: ServiceMetricsGridProps) {
  return (
    <section className="w-full bg-slate-50/70 border-y border-slate-200/80">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col space-y-3 relative sm:border-l sm:border-slate-200/80 sm:pl-6 first:border-l-0 first:pl-0"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl lg:text-7xl font-mono font-black text-[#BA1C20] tracking-tight leading-none">
                  {metric.value}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#0F313A]">
                {metric.label}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                — {metric.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
