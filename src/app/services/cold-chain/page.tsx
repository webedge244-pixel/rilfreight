import { Metadata } from "next";
import { ServicePageTemplate } from "@/features/services/components/ServicePageTemplate";
import { COLD_CHAIN_CONFIG } from "@/features/services/data/servicesData";

export const metadata: Metadata = {
  title: "Cold Chain Logistics | RILFREIGHT Temperature Controlled Solutions",
  description:
    "Multi zone refrigerated containers, calibrated IoT telemetry loggers, deep frozen and chilled logistics safeguarding food and perishable cargo.",
};

export default function ColdChainPage() {
  return <ServicePageTemplate config={COLD_CHAIN_CONFIG} />;
}
