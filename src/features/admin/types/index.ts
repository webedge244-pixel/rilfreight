/**
 * Admin-specific TypeScript types.
 * These extend the shared types for admin dashboard, user management, and email features.
 */

import type { Shipment, ShipmentStatus, TransportMode } from "@/shared/types";

/**
 * Admin user profile.
 */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "dispatcher" | "viewer";
}

/**
 * Platform user (customer / client) registered on the tracking portal.
 */
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  country?: string;
  linkedShipmentIds: string[];
  status: "active" | "inactive";
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Dashboard KPI summary data.
 */
export interface DashboardKPIs {
  totalShipments: number;
  inTransit: number;
  onHold: number;
  delivered: number;
  totalUsers: number;
  shipmentsThisMonth: number;
  deliveriesThisMonth: number;
  oceanShipments: number;
  airShipments: number;
  railShipments: number;
  roadShipments: number;
  oceanOnHold: number;
  airOnHold: number;
  railOnHold: number;
  roadOnHold: number;
}

/**
 * Monthly volume data for trend charts.
 */
export interface MonthlyVolume {
  month: string;
  shipments: number;
  deliveries: number;
}

/**
 * Composed email message.
 */
export interface EmailMessage {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed";
  sentAt?: string;
  createdAt: string;
}

/**
 * Email template for quick composition.
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

/**
 * Platform settings configuration.
 */
export interface PlatformSettings {
  carrierCode: string;
  companyName: string;
  supportEmail: string;
  defaultOriginCode: string;
  defaultDestinationCode: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
}

/**
 * Admin nav link definition.
 */
export interface AdminNavLink {
  label: string;
  href: string;
}
