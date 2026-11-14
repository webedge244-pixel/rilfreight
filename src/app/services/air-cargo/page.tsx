import { Metadata } from "next";
import { ServicePageTemplate } from "@/features/services/components/ServicePageTemplate";
import { AIR_CARGO_CONFIG } from "@/features/services/data/servicesData";

export const metadata: Metadata = {
  title: "Air Cargo Express | RILFREIGHT Aviation Logistics & Charters",
  description:
    "Expedited air cargo runway dispatch, widebody freighter allocations, priority tarmac handling, and dedicated private charters worldwide.",
};

export default function AirCargoPage() {
  return <ServicePageTemplate config={AIR_CARGO_CONFIG} />;
}
