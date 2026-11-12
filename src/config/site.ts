export const siteConfig = {
  name: "RILFREIGHT",
  description:
    "Enterprise-grade multi-modal shipment tracking and logistics management platform.",
  carrierCode: "RIL",
  colors: {
    primary: "#0F313A",
    secondary: "#BA1C20",
  },
  supportEmail: "operations@rilfreight.com",
  defaultOrigin: {
    name: "Port of Shanghai",
    code: "CNSHA",
    country: "China",
    coordinates: [121.5, 31.0] as [number, number],
  },
  defaultDestination: {
    name: "Port of Montreal",
    code: "CAMTR",
    country: "Canada",
    coordinates: [-73.55, 45.5] as [number, number],
  },
  navItems: [
    { label: "Track Shipment", href: "/" },
    { label: "Admin Console", href: "/admin/dashboard" },
  ],
};
