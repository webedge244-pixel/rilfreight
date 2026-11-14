import { Metadata } from "next";
import { ServicePageTemplate } from "@/features/services/components/ServicePageTemplate";
import { LIFE_SCIENCES_CONFIG } from "@/features/services/data/servicesData";

export const metadata: Metadata = {
  title: "Life Sciences & Healthcare | RILFREIGHT GDP Pharmaceutical Logistics",
  description:
    "Good Distribution Practice certified biopharma transportation, clinical trial supply distribution, cryogenic shippers, and serialized security.",
};

export default function LifeSciencesPage() {
  return <ServicePageTemplate config={LIFE_SCIENCES_CONFIG} />;
}
