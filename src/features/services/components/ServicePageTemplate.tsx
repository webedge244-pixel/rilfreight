"use client";

import * as React from "react";
import { Navbar } from "@/shared/components/navbar";
import { PageFooter } from "@/shared/components/page-footer";
import { ServicePageConfig } from "../types";
import { ServiceHeroBanner } from "./ServiceHeroBanner";
import { ServiceStatementSection } from "./ServiceStatementSection";
import { ServiceMetricsGrid } from "./ServiceMetricsGrid";
import { ServiceCapabilitiesGrid } from "./ServiceCapabilitiesGrid";
import { ServiceWorkflowSteps } from "./ServiceWorkflowSteps";
import { ServiceLandscapeBanner } from "./ServiceLandscapeBanner";
import { ServiceFaqAccordion } from "./ServiceFaqAccordion";
import { ServiceCtaBanner } from "./ServiceCtaBanner";

interface ServicePageTemplateProps {
  config: ServicePageConfig;
}

export function ServicePageTemplate({ config }: ServicePageTemplateProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#BA1C20] selection:text-white">
      {/* 1. Main Navigation */}
      <Navbar />

      <main className="flex-1 w-full overflow-x-hidden">
        {/* 2. Hero Banner: Full-width edge-to-edge */}
        <ServiceHeroBanner
          title={config.heroTitle}
          heroImage={config.heroImage}
          heroImageAlt={config.heroImageAlt}
          breadcrumbTitle={config.breadcrumbTitle}
        />

        {/* 3. Section 1: Executive Statement + Primary CTA */}
        <ServiceStatementSection config={config.statement} />

        {/* 4. Section 2: 4-Column KPI Metrics Grid */}
        <ServiceMetricsGrid metrics={config.metrics} />

        {/* 5. Section 3: 6-Card Modular Capabilities Grid */}
        <ServiceCapabilitiesGrid config={config.capabilities} />

        {/* 6. Section 4: 4-Phase Corridor Pipeline Workflow */}
        <ServiceWorkflowSteps config={config.workflow} />

        {/* 7. Section 5: Full-Width Photographic Landscape Banner */}
        <ServiceLandscapeBanner config={config.landscapeBanner} />

        {/* 8. Section 6: Technical FAQ Accordion */}
        <ServiceFaqAccordion config={config.faqs} />

        {/* 9. Section 7: High-Conversion Pre-Footer Callout */}
        <ServiceCtaBanner config={config.ctaBanner} />

        {/* 10. Global Standard Page Footer */}
        <PageFooter />
      </main>
    </div>
  );
}
