import { Metadata } from "next";
import { ServicePageTemplate } from "@/features/services/components/ServicePageTemplate";
import { OCEAN_FREIGHT_CONFIG } from "@/features/services/data/servicesData";

export const metadata: Metadata = {
  title: "Ocean Freight Services | RILFREIGHT Global Maritime Logistics",
  description:
    "Transoceanic container shipping, full container load allocations, LCL consolidations, and licensed customs brokerage across 180 deepwater ports.",
};

export default function OceanFreightPage() {
  return <ServicePageTemplate config={OCEAN_FREIGHT_CONFIG} />;
}
