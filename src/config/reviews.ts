export interface Review {
  id: string;
  quote: string;
  name: string;
  title: string;
  company: string;
  rating: 4 | 5;
}

export const REVIEWS: Review[] = [
  {
    id: "rev-1",
    quote:
      "RILFREIGHT has fundamentally transformed our international supply chain with flawless cross-border consistency and unprecedented real-time container telematics across Europe and Asia.",
    name: "Adrian Mitchel",
    title: "Vice President of Global Operations",
    company: "SolarInc Energy Technologies",
    rating: 5,
  },
  {
    id: "rev-2",
    quote:
      "Transitioning our automotive components to RILFREIGHT's intermodal rail corridors lowered our quarterly shipping expenditures by 34% while cutting freight carbon emissions in half.",
    name: "Marcus Vance",
    title: "Head of Transcontinental Procurement",
    company: "Metriks Automotive Solutions",
    rating: 5,
  },
  {
    id: "rev-3",
    quote:
      "Their ocean freight lane coordination from Shanghai to Rotterdam was remarkably reliable. Occasional weather rerouting was communicated within minutes with zero cargo disruption.",
    name: "Dr. Elena Rostova",
    title: "Chief Supply Chain Officer",
    company: "Agrimax Bio-Pharma Corp",
    rating: 4,
  },
  {
    id: "rev-4",
    quote:
      "Exceptional cross-docking velocity at Frankfurt Cargo City. Customs clearance pre-filing shaved 18 hours off our standard European airport tarmac turnaround.",
    name: "Julian Becker",
    title: "Director of Aviation Logistics",
    company: "Skyline Aeroparts GmbH",
    rating: 5,
  },
  {
    id: "rev-5",
    quote:
      "Very solid intermodal rail transport across North America. The automated electronic POD signatures gave our accounting department immediate delivery confirmation.",
    name: "Sarah Jenkins",
    title: "Logistics Operations Lead",
    company: "Apex Precision Tools",
    rating: 4,
  },
  {
    id: "rev-6",
    quote:
      "When global shipping container shortages peaked, RILFREIGHT secured priority vessel allocations for our urgent industrial machinery consignments without rate gouging.",
    name: "Tariq Al-Mansoor",
    title: "Managing Director",
    company: "Gulf Engineering Consortia",
    rating: 5,
  },
  {
    id: "rev-7",
    quote:
      "Reliable refrigerated cold-chain reefer monitoring. Sensor telemetry was accessible directly through their client tracking portal throughout the 14-day Atlantic passage.",
    name: "Camille Dupont",
    title: "Quality Assurance Specialist",
    company: "BioVance Pharmaceuticals",
    rating: 4,
  },
  {
    id: "rev-8",
    quote:
      "The automated customs clearance and pre-arrival notification system eliminated terminal dwell penalties across our major US West Coast port entries.",
    name: "Nathaniel Brooks",
    title: "Global Freight Controller",
    company: "Pacific Rim Retail Group",
    rating: 5,
  },
  {
    id: "rev-9",
    quote:
      "Great heavy-haul flatbed trucking coordination for oversized manufacturing transformers. Handled multi-state highway permits and escort vehicles seamlessly.",
    name: "Ingrid Holm",
    title: "Head of Infrastructure Freight",
    company: "Nordic Power Distribution",
    rating: 5,
  },
  {
    id: "rev-10",
    quote:
      "Consistent LTL consolidation schedules and responsive customer dispatch engineers. Tracking alerts are proactive and accurate.",
    name: "Mateo Rossi",
    title: "Supply Chain Manager",
    company: "Veloce Component Systems",
    rating: 4,
  },
  {
    id: "rev-11",
    quote:
      "Our cross-border shipments between the US, Canada, and Mexico have never experienced a border inspection hold since moving all bonded freight to RILFREIGHT.",
    name: "Carla Mendez",
    title: "Transborder Operations VP",
    company: "Sonora Industrial Networks",
    rating: 5,
  },
  {
    id: "rev-12",
    quote:
      "Dependable air freight charter for time-critical maritime replacement engines. Delivered directly to dockside berth ahead of scheduled vessel departure.",
    name: "Henrik Lindqvist",
    title: "Technical Fleet Superintendent",
    company: "Baltic Maritime Lines",
    rating: 4,
  },
];
