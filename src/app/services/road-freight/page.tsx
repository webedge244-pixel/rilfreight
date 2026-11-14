import { Metadata } from "next";
import { ServicePageTemplate } from "@/features/services/components/ServicePageTemplate";
import { ROAD_FREIGHT_CONFIG } from "@/features/services/data/servicesData";

export const metadata: Metadata = {
  title: "Road Freight Transport | RILFREIGHT Highway Fleets & Truckload",
  description:
    "Dedicated full truckload runs, scheduled LTL networks, specialized heavy flatbeds, and instant paperless cryptographic proofs of delivery.",
};

export default function RoadFreightPage() {
  return <ServicePageTemplate config={ROAD_FREIGHT_CONFIG} />;
}
