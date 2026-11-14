import type { AdminNavLink, EmailTemplate } from "./types";

export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { label: "DASHBOARD", href: "/admin/dashboard" },
  { label: "SHIPMENTS", href: "/admin/shipments" },
  { label: "NEW SHIPMENT", href: "/admin/new" },
  { label: "USERS", href: "/admin/users" },
  { label: "SEND EMAIL", href: "/admin/email" },
];

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-001",
    name: "Shipment Delay Notice",
    subject: "Update: Your Shipment {{trackingCode}} Has Been Delayed",
    body: "Dear {{recipientName}},\n\nWe are writing to inform you that your shipment {{trackingCode}} has experienced a delay due to {{reason}}.\n\nRevised estimated delivery: {{newETA}}\n\nWe sincerely apologize for any inconvenience and will keep you updated on the progress.\n\nBest regards,\nRILFREIGHT Operations",
  },
  {
    id: "tpl-002",
    name: "Customs Clearance Update",
    subject: "Customs Update: Shipment {{trackingCode}}",
    body: "Dear {{recipientName}},\n\nYour shipment {{trackingCode}} is currently undergoing customs clearance at {{location}}.\n\nExpected clearance time: {{clearanceETA}}\n\nNo action is required from your side at this time. We will notify you once the shipment clears customs.\n\nBest regards,\nRILFREIGHT Operations",
  },
  {
    id: "tpl-003",
    name: "Delivery Confirmation",
    subject: "Delivered: Your Shipment {{trackingCode}} Has Arrived",
    body: "Dear {{recipientName}},\n\nWe are pleased to confirm that your shipment {{trackingCode}} has been successfully delivered to {{destination}}.\n\nDelivered on: {{deliveryDate}}\nReceived by: {{receiverName}}\n\nThank you for choosing RILFREIGHT.\n\nBest regards,\nRILFREIGHT Operations",
  },
  {
    id: "tpl-004",
    name: "General Notification",
    subject: "RILFREIGHT — Important Update",
    body: "Dear {{recipientName}},\n\n{{messageBody}}\n\nIf you have any questions, please do not hesitate to contact us at operations@rilfreight.com.\n\nBest regards,\nRILFREIGHT Operations",
  },
];
