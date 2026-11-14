import { Metadata } from "next";
import { ServicePageTemplate } from "@/features/services/components/ServicePageTemplate";
import { INTERMODAL_RAIL_CONFIG } from "@/features/services/data/servicesData";

export const metadata: Metadata = {
  title: "Intermodal Rail Freight | RILFREIGHT Heavy Rail Corridors",
  description:
    "Transcontinental double stack container rail loops lowering freight emissions by 75 percent with direct on dock marine terminal connections.",
};

export default function IntermodalRailPage() {
  return <ServicePageTemplate config={INTERMODAL_RAIL_CONFIG} />;
}
