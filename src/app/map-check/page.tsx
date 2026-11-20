"use client";

import TimelineRouteMap from "@/features/tracking/components/TimelineRouteMap";
import type { TrackingMilestone } from "@/shared/types";

const PAST = "2026-11-10T08:00:00.000Z";
const EARLIER = "2026-11-09T08:00:00.000Z";
const LATER = "2026-11-25T08:00:00.000Z";

const chicago: [number, number] = [-87.6298, 41.8781];
const toronto: [number, number] = [-79.3832, 43.6532];
const xian: [number, number] = [108.9398, 34.3416];
const duisburg: [number, number] = [6.7623, 51.4344];

const roadMilestones: TrackingMilestone[] = [
  {
    id: "road-1",
    code: "DISP",
    title: "Dispatched from Freight Terminal",
    description: "Departed Chicago terminal",
    locationName: "Chicago Freight Terminal",
    locationCode: "USCHI",
    timestamp: EARLIER,
    isCompleted: true,
    coordinates: chicago,
  },
  {
    id: "road-2",
    code: "INTR",
    title: "In Transit — Commercial Highway Corridor",
    description: "Commercial vehicle in transit",
    locationName: "Interstate / Commercial Highway Route",
    timestamp: PAST,
    isCompleted: true,
  },
  {
    id: "road-3",
    code: "ARRI",
    title: "Arrived at Regional Freight Hub",
    description: "Arrived at Toronto depot",
    locationName: "Toronto Distribution Hub",
    locationCode: "CATOR",
    timestamp: PAST,
    isCompleted: true,
    coordinates: toronto,
  },
  {
    id: "road-4",
    code: "CUSR",
    title: "Cross-Border Commercial Customs Cleared",
    description: "Customs cleared",
    locationName: "Toronto Border Customs Station",
    locationCode: "CATOR",
    timestamp: PAST,
    isCompleted: true,
    isHoldGate: true,
    coordinates: toronto,
  },
  {
    id: "road-5",
    code: "OFD",
    title: "Out for Final Delivery",
    description: "Loaded onto local delivery tractor",
    locationName: "Toronto Metropolitan Delivery Zone",
    timestamp: PAST,
    isCompleted: true,
    coordinates: toronto,
  },
  {
    id: "road-6",
    code: "DLV",
    title: "Delivered & Consignment Signed",
    description: "Delivery completed",
    locationName: "Toronto Consignee Receiving Dock",
    locationCode: "CATOR",
    timestamp: PAST,
    isCompleted: true,
    coordinates: toronto,
  },
];

const railMilestones: TrackingMilestone[] = [
  {
    id: "rail-1",
    code: "RAMP_IN",
    title: "Ramp-In at Intermodal Yard",
    description: "Entered Xi'an rail terminal",
    locationName: "Xi'an Intermodal Yard",
    locationCode: "CNXAY",
    timestamp: EARLIER,
    isCompleted: true,
    coordinates: xian,
  },
  {
    id: "rail-2",
    code: "MOUNTED",
    title: "Mounted on Railcar",
    description: "Container mounted",
    locationName: "Xi'an Intermodal Yard",
    locationCode: "CNXAY",
    timestamp: EARLIER,
    isCompleted: true,
    coordinates: xian,
  },
  {
    id: "rail-3",
    code: "TRAIN_DEP",
    title: "Intermodal Train Departed",
    description: "Train dispatched",
    locationName: "Xi'an Intermodal Yard",
    locationCode: "CNXAY",
    timestamp: EARLIER,
    isCompleted: true,
    coordinates: xian,
  },
  {
    id: "rail-4",
    code: "INTERCHANGE",
    title: "Corridor Rail Gateway Interchange",
    description: "Switched through classification yard",
    locationName: "Corridor Rail Gateway Interchange",
    timestamp: PAST,
    isCompleted: true,
  },
  {
    id: "rail-5",
    code: "RAMP_OUT",
    title: "Arrived at Destination Rail Ramp",
    description: "Container grounded",
    locationName: "Duisburg Rail Yard",
    locationCode: "DEDUI",
    timestamp: LATER,
    isCompleted: false,
    coordinates: duisburg,
  },
  {
    id: "rail-6",
    code: "CUSR",
    title: "Cross-Border Rail Customs Cleared",
    description: "Awaiting customs release",
    locationName: "Duisburg Rail Customs Yard",
    locationCode: "DEDUI",
    timestamp: LATER,
    isCompleted: false,
    isHoldGate: true,
    coordinates: duisburg,
  },
  {
    id: "rail-7",
    code: "FINAL_DLV",
    title: "Final Drayage Delivery",
    description: "Drayed to consignee",
    locationName: "Duisburg Consignee Facility",
    locationCode: "DEDUI",
    timestamp: LATER,
    isCompleted: false,
    coordinates: duisburg,
  },
];

export default function MapCheckPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 space-y-8">
      <section>
        <h1 className="mb-2 text-lg font-bold">Road — completed checkpoints only</h1>
        <TimelineRouteMap
          mode="road"
          milestones={roadMilestones}
          origin={{
            name: "Chicago Freight Terminal",
            code: "USCHI",
            country: "United States",
            coordinates: chicago,
          }}
          destination={{
            name: "Toronto Distribution Hub",
            code: "CATOR",
            country: "Canada",
            coordinates: toronto,
          }}
          routeCoordinates={[chicago, [-83.5, 42.8], toronto]}
          height="420px"
        />
      </section>

      <section>
        <h1 className="mb-2 text-lg font-bold">Rail — paused at customs hold</h1>
        <TimelineRouteMap
          mode="rail"
          milestones={railMilestones}
          origin={{
            name: "Xi'an Intermodal Yard",
            code: "CNXAY",
            country: "China",
            coordinates: xian,
          }}
          destination={{
            name: "Duisburg Rail Yard",
            code: "DEDUI",
            country: "Germany",
            coordinates: duisburg,
          }}
          routeCoordinates={[xian, [76.9, 43.2], duisburg]}
          paused
          pausedCoordinates={duisburg}
          height="420px"
        />
      </section>
    </main>
  );
}
