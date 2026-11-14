import * as React from "react";
import { ServiceWorkflowConfig } from "../types";

interface ServiceWorkflowStepsProps {
  config: ServiceWorkflowConfig;
}

export function ServiceWorkflowSteps({ config }: ServiceWorkflowStepsProps) {
  return (
    <section className="w-full bg-[#0F313A] text-white">
      <div className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 space-y-12 md:space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <span className="text-[#BA1C20] font-black text-xs sm:text-sm uppercase tracking-widest select-none">
            {config.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase leading-[1.1]">
            {config.headline}
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
          {config.steps.map((step, idx) => (
            <div
              key={step.step}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 hover:bg-white/10 transition-colors relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="w-12 h-12 rounded-2xl bg-[#BA1C20] text-white font-mono font-black text-xl flex items-center justify-center shadow-md">
                    {step.step}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phase {idx + 1}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 text-xs font-mono text-slate-400">
                Stage {step.step} of 04
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
