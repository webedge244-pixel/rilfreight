"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  listenToShipmentRecord,
  replaceShipmentRecord,
  updateShipmentRecord,
  deleteShipmentRecord,
  listPlatformUsers,
} from "@/shared/lib/firebase";
import {
  releaseShipmentGate,
  triggerShipmentException,
  evaluateShipmentProgression,
} from "@/features/tracking/services/trackingService";
import type {
  Shipment,
  ShipmentStatus,
  TransportMode,
  TrackingMilestone,
} from "@/shared/types";
import type { PlatformUser } from "@/features/admin/types";
import {
  Trash2,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Pencil,
  Plus,
  Trash,
  Save,
  ArrowLeft,
} from "lucide-react";

// SSR-safe dynamic import for the MapLibre GL vector map
const LiveTrackingMap = dynamic(
  () => import("@/features/tracking/components/LiveTrackingMapLibre"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] sm:h-[360px] rounded-2xl bg-slate-900 flex items-center justify-center">
        <span className="text-sm text-slate-300 font-semibold">
          Loading Vector Route Map...
        </span>
      </div>
    ),
  }
);

/**
 * Preset operational reasons for a hold gate.
 */
const EXCEPTION_PRESETS = [
  "Customs Inspection Hold Gate",
  "Port Congestion Dwell Hold",
  "Severe Typhoon Warning — Vessel Anchored",
  "Mechanical Conveyance Inspection",
  "Border Transit Security Verification",
];

/**
 * Computes progress along the scheduled window.
 * Kept outside the component so the clock read is not evaluated during render.
 */
function computeProgressPercent(shipment: Shipment): number {
  const start = new Date(shipment.departureDate).getTime();
  const end = new Date(shipment.estimatedDeliveryDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

/**
 * Human readable label for where a shipment currently sits.
 */
function currentLocationLabel(shipment: Shipment): string {
  const completed = (shipment.waypoints || []).filter((w) => w.isCompleted);
  const last = completed[completed.length - 1];
  return last?.name || shipment.originName || "In transit";
}

/** Converts an ISO/UTC timestamp to local YYYY-MM-DDTHH:mm for datetime-local inputs */
function toLocalInput(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return "";
  if (typeof isoOrDate === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoOrDate)) {
    return isoOrDate;
  }
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

/** Converts datetime-local input string back to ISO 8601 UTC string for Firestore */
function fromLocalInput(localStr: string | null | undefined): string | null {
  if (!localStr || !localStr.trim()) return null;
  const d = new Date(localStr);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Auto-adjusts milestone timestamps and completion status to fit between departure and estimated delivery */
function autoRegulateMilestoneTimestamps(
  milestones: TrackingMilestone[],
  departureLocalStr: string,
  deliveryLocalStr: string
): TrackingMilestone[] {
  if (!milestones || milestones.length === 0) return [];
  const depMs = new Date(departureLocalStr).getTime();
  const delMs = new Date(deliveryLocalStr).getTime();
  if (isNaN(depMs) || isNaN(delMs) || delMs <= depMs) return milestones;

  const total = milestones.length;
  const now = Date.now();

  return milestones.map((m, idx) => {
    const ratio = total > 1 ? idx / (total - 1) : 0;
    const targetMs = Math.round(depMs + ratio * (delMs - depMs));
    const isPast = targetMs <= now;
    const isCompleted = isPast && !m.isHoldGate;

    return {
      ...m,
      timestamp: toLocalInput(new Date(targetMs)),
      isCompleted,
    };
  });
}

export default function ShipmentDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading shipment...</div>}>
      <ShipmentDetailContent />
    </React.Suspense>
  );
}

function ShipmentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isActionPending, setIsActionPending] = React.useState<boolean>(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [showExceptionForm, setShowExceptionForm] = React.useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [exceptionStatusType, setExceptionStatusType] =
    React.useState<ShipmentStatus>("customs_hold");
  const [exceptionReasonPreset, setExceptionReasonPreset] =
    React.useState<string>(EXCEPTION_PRESETS[0]);
  const [customExceptionReason, setCustomExceptionReason] = React.useState("");

  // Live listener — the record is pushed to the client whenever it changes.
  React.useEffect(() => {
    const unsubscribe = listenToShipmentRecord(
      shipmentId,
      (live) => {
        if (live) {
          const { updatedShipment } = evaluateShipmentProgression(live);
          setShipment(updatedShipment);
        } else {
          setShipment(null);
        }
        setIsLoading(false);
        setLoadError(null);
      },
      (error) => {
        console.error(`Failed to subscribe to shipment ${shipmentId}:`, error);
        setLoadError(
          "Unable to reach the shipment database. Check the connection and try again."
        );
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [shipmentId]);

  const statusColor = (status: string) => {
    switch (status) {
      case "in_transit":
        return "text-[#0F313A] bg-[#0F313A]/10 dark:text-teal-300 dark:bg-teal-900/30";
      case "delivered":
        return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
      case "customs_hold":
      case "weather_delay":
        return "text-[#BA1C20] bg-[#BA1C20]/10";
      default:
        return "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
    }
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const progressPercent = React.useMemo(
    () => (shipment ? computeProgressPercent(shipment) : 0),
    [shipment]
  );

  // ── Actions ────────────────────────────────────────────

  const handleResume = async () => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    try {
      const released = releaseShipmentGate(shipment);
      await replaceShipmentRecord(shipment.id, released);
      setShowExceptionForm(false);
    } catch (error) {
      console.error("Failed to release hold gate:", error);
      setActionError("Could not release the hold gate. Please try again.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handlePause = async () => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    const reason = customExceptionReason.trim() || exceptionReasonPreset;

    try {
      const paused = triggerShipmentException(
        shipment,
        reason,
        exceptionStatusType
      );

      await replaceShipmentRecord(shipment.id, {
        ...paused,
        pausedLocationName: currentLocationLabel(shipment),
      });

      setShowExceptionForm(false);
      setCustomExceptionReason("");
    } catch (error) {
      console.error("Failed to trigger exception:", error);
      setActionError("Could not place the shipment on hold. Please try again.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDeleteShipment = async () => {
    if (!shipment) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteShipmentRecord(shipment.id);
      router.push("/admin/shipments");
    } catch (err) {
      console.error("Failed to delete shipment:", err);
      setActionError("Failed to delete shipment. Please try again.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ── Editing States & Handlers ────────────────────────────
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const [editFormData, setEditFormData] = React.useState({
    mode: "ocean" as TransportMode,
    status: "in_transit" as ShipmentStatus,
    departureDate: "",
    estimatedDeliveryDate: "",
    actualDeliveryDate: "",
    isPaused: false,
    pausedReason: "",
    pausedLocationName: "",
    originName: "",
    originCode: "",
    originCountry: "",
    destinationName: "",
    destinationCode: "",
    destinationCountry: "",
    conveyanceName: "",
    conveyanceIdentifier: "",
    voyageNumber: "",
    consignmentReference: "",
    containerNumber: "",
    sealNumber: "",
    totalPieces: 0,
    grossWeightKg: 0,
    volumeCbm: 0,
    goodsDescription: "",
    clientName: "",
  });

  const [editMilestones, setEditMilestones] = React.useState<TrackingMilestone[]>([]);
  const [editMessage, setEditMessage] = React.useState<string>("");
  const [sendNotificationEmail, setSendNotificationEmail] = React.useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = React.useState<string>("");
  const [registeredUsers, setRegisteredUsers] = React.useState<PlatformUser[]>([]);

  // Load registered users for client matching
  React.useEffect(() => {
    listPlatformUsers(100)
      .then((users) => setRegisteredUsers(users))
      .catch((err) => console.warn("Failed to load registered users:", err));
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleStartEdit = () => {
    if (!shipment) return;

    // Match client email
    let defaultEmail = "";
    if (shipment.linkedUserIds && shipment.linkedUserIds.length > 0) {
      const match = registeredUsers.find((u) => shipment.linkedUserIds?.includes(u.id));
      if (match?.email) defaultEmail = match.email;
    }
    if (!defaultEmail && shipment.clientName) {
      const match = registeredUsers.find(
        (u) =>
          u.name.toLowerCase() === shipment.clientName?.toLowerCase() ||
          u.company?.toLowerCase() === shipment.clientName?.toLowerCase()
      );
      if (match?.email) defaultEmail = match.email;
    }
    if (!defaultEmail) {
      const match = registeredUsers.find(
        (u) =>
          u.linkedShipmentIds &&
          (u.linkedShipmentIds.includes(shipment.id) ||
            u.linkedShipmentIds.includes(shipment.trackingCode))
      );
      if (match?.email) defaultEmail = match.email;
    }

    setEditFormData({
      mode: shipment.mode,
      status: shipment.status,
      departureDate: toLocalInput(shipment.departureDate),
      estimatedDeliveryDate: toLocalInput(shipment.estimatedDeliveryDate),
      actualDeliveryDate: toLocalInput(shipment.actualDeliveryDate),
      isPaused: shipment.isPaused || false,
      pausedReason: shipment.pausedReason || "",
      pausedLocationName: shipment.pausedLocationName || "",
      originName: shipment.originName || "",
      originCode: shipment.originCode || "",
      originCountry: shipment.originCountry || "",
      destinationName: shipment.destinationName || "",
      destinationCode: shipment.destinationCode || "",
      destinationCountry: shipment.destinationCountry || "",
      conveyanceName: shipment.conveyanceName || "",
      conveyanceIdentifier: shipment.conveyanceIdentifier || "",
      voyageNumber: shipment.voyageNumber || "",
      consignmentReference: shipment.consignmentReference || "",
      containerNumber: shipment.containerNumber || "",
      sealNumber: shipment.sealNumber || "",
      totalPieces: shipment.totalPieces || 0,
      grossWeightKg: shipment.grossWeightKg || 0,
      volumeCbm: shipment.volumeCbm || 0,
      goodsDescription: shipment.goodsDescription || "",
      clientName: shipment.clientName || "",
    });

    setEditMilestones(
      (shipment.milestones || []).map((m) => ({
        ...m,
        timestamp: toLocalInput(m.timestamp),
      }))
    );
    setEditMessage("");
    setSendNotificationEmail(Boolean(defaultEmail));
    setRecipientEmail(defaultEmail);
    setIsEditing(true);
  };

  const handleMilestoneChange = (
    index: number,
    field: keyof TrackingMilestone,
    value: any
  ) => {
    setEditMilestones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddMilestone = () => {
    const newMs: TrackingMilestone = {
      id: `ms-manual-${Date.now()}`,
      code: "CHECKPOINT",
      title: "Transit Checkpoint",
      description: "Shipment reached an operational waypoint in the route schedule.",
      locationName: shipment?.destinationName || "Transit Hub",
      timestamp: new Date().toISOString().slice(0, 16),
      isCompleted: true,
      isHoldGate: false,
    };
    setEditMilestones((prev) => [...prev, newMs]);
  };

  const handleRemoveMilestone = (index: number) => {
    setEditMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveShipment = async () => {
    if (!shipment) return;
    setIsSaving(true);
    setActionError(null);

    try {
      const now = new Date();
      const depDate = new Date(fromLocalInput(editFormData.departureDate) || shipment.departureDate);
      const estDelDate = new Date(fromLocalInput(editFormData.estimatedDeliveryDate) || shipment.estimatedDeliveryDate);
      const depMs = depDate.getTime();
      const delMs = estDelDate.getTime();
      const nowMs = now.getTime();

      // Determine status from schedule like /new (unless actively paused on hold)
      let determinedStatus: ShipmentStatus = editFormData.status;
      if (!editFormData.isPaused) {
        if (delMs <= nowMs) {
          determinedStatus = "delivered";
        } else if (depMs <= nowMs) {
          determinedStatus = "in_transit";
        } else {
          determinedStatus = "pending";
        }
      }

      // Timeline checkpoints: timestamps that have passed are marked completed
      const formattedMilestones: TrackingMilestone[] = editMilestones.map((m) => {
        const rawTime = fromLocalInput(m.timestamp) || m.timestamp;
        const mTime = new Date(rawTime).getTime();
        const hasPassed = !isNaN(mTime) && mTime <= nowMs;
        return {
          ...m,
          timestamp: rawTime,
          isCompleted: hasPassed && !m.isHoldGate,
          isHoldGate: Boolean(m.isHoldGate),
        };
      });

      // If an operational edit message was entered, record as a status update milestone
      if (editMessage.trim()) {
        formattedMilestones.push({
          id: `ms-update-${Date.now()}`,
          code: "OPS_NOTICE",
          title: "Operational Status Notice",
          description: editMessage.trim(),
          locationName:
            editFormData.pausedLocationName ||
            editFormData.destinationName ||
            "Operations Control",
          timestamp: new Date().toISOString(),
          isCompleted: true,
          isHoldGate: editFormData.isPaused,
        });
      }

      const progressRatio = delMs > depMs ? Math.min(1, Math.max(0, (nowMs - depMs) / (delMs - depMs))) : 0;
      const updatedWaypoints = (shipment.waypoints || []).map((wp, idx, arr) => {
        const wpRatio = arr.length > 1 ? idx / (arr.length - 1) : 0;
        return { ...wp, isCompleted: progressRatio >= wpRatio && progressRatio > 0 };
      });

      const updatedShipment: Shipment = {
        ...shipment,
        mode: editFormData.mode,
        status: determinedStatus,
        departureDate: depDate.toISOString(),
        estimatedDeliveryDate: estDelDate.toISOString(),
        actualDeliveryDate: determinedStatus === "delivered" ? (fromLocalInput(editFormData.actualDeliveryDate) || new Date().toISOString()) : null,
        isPaused: editFormData.isPaused,
        pausedReason: editFormData.isPaused ? editFormData.pausedReason.trim() || null : null,
        pausedLocationName: editFormData.isPaused ? editFormData.pausedLocationName.trim() || null : null,
        pausedAtTimestamp: editFormData.isPaused ? shipment.pausedAtTimestamp || new Date().toISOString() : null,
        pausedCoordinates: editFormData.isPaused ? shipment.pausedCoordinates || null : null,
        originName: editFormData.originName,
        originCode: editFormData.originCode,
        originCountry: editFormData.originCountry,
        destinationName: editFormData.destinationName,
        destinationCode: editFormData.destinationCode,
        destinationCountry: editFormData.destinationCountry,
        conveyanceName: editFormData.conveyanceName,
        conveyanceIdentifier: editFormData.conveyanceIdentifier?.trim() || null,
        voyageNumber: editFormData.voyageNumber?.trim() || null,
        consignmentReference: editFormData.consignmentReference,
        containerNumber: editFormData.containerNumber?.trim() || null,
        sealNumber: editFormData.sealNumber?.trim() || null,
        totalPieces: Number(editFormData.totalPieces) || 0,
        grossWeightKg: Number(editFormData.grossWeightKg) || 0,
        volumeCbm: editFormData.volumeCbm ? Number(editFormData.volumeCbm) : null,
        goodsDescription: editFormData.goodsDescription,
        clientName: editFormData.clientName?.trim() || null,
        waypoints: updatedWaypoints,
        milestones: formattedMilestones,
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore using existing tracking code & ID
      await replaceShipmentRecord(shipment.id, updatedShipment);
      setShipment(updatedShipment);

      // Fire-and-forget email dispatch in background so saving never hangs
      if (sendNotificationEmail && recipientEmail.trim()) {
        const emailSubject = `Shipment Update: ${shipment.trackingCode} (${formatStatus(
          updatedShipment.status
        )})`;
        const emailBody = editMessage.trim()
          ? `Dear Client,\n\nAn operational update has been recorded for your shipment ${shipment.trackingCode}:\n\n"${editMessage.trim()}"\n\nCurrent Status: ${formatStatus(
              updatedShipment.status
            )}\nOrigin: ${updatedShipment.originName} (${updatedShipment.originCode})\nDestination: ${
              updatedShipment.destinationName
            } (${updatedShipment.destinationCode})\nEstimated Delivery: ${new Date(
              updatedShipment.estimatedDeliveryDate
            ).toLocaleDateString()}\n\nYou may view full real-time tracking anytime on your client portal.\n\nBest regards,\nRIL Freight Operations Team`
          : `Dear Client,\n\nYour shipment ${shipment.trackingCode} details have been updated in our system.\n\nCurrent Status: ${formatStatus(
              updatedShipment.status
            )}\nEstimated Delivery: ${new Date(
              updatedShipment.estimatedDeliveryDate
            ).toLocaleDateString()}\n\nBest regards,\nRIL Freight Operations Team`;

        void fetch("/api/admin/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail.trim(),
            subject: emailSubject,
            body: emailBody,
          }),
        }).catch((emailErr) => {
          console.warn("Background email notification error:", emailErr);
        });
      }

      showToast("Shipment updated successfully!", "success");
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Failed to update shipment:", err);
      setActionError("Failed to update shipment details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render states ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-slate-400">
        Loading shipment record...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm font-semibold text-[#BA1C20]">{loadError}</p>
        <Link
          href="/admin/shipments"
          className="inline-block mt-4 text-sm font-bold uppercase tracking-wider text-[#BA1C20] hover:underline"
        >
          Back to Shipments
        </Link>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">
          Shipment Not Found
        </h1>
        <p className="text-sm text-slate-400">
          No shipment exists with ID: <span className="font-mono">{shipmentId}</span>
        </p>
        <Link
          href="/admin/shipments"
          className="text-sm font-bold uppercase tracking-wider text-[#BA1C20] hover:underline"
        >
          Back to Shipments
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            "fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all border-0",
            toastMessage.type === "success"
              ? "bg-[#0D5C46] text-white"
              : "bg-[#BA1C20] text-white"
          )}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white/90" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Row: Back Link on Left, Destructive Delete on Right */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link
          href="/admin/shipments"
          className="inline-block text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
        >
          ← Back to Shipments
        </Link>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="p-2 rounded-xl bg-[#BA1C20] hover:bg-[#9c171a] text-white transition-colors border-0 shadow-sm"
          title="Delete Shipment"
          aria-label="Delete Shipment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-mono">
            {shipment.trackingCode}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={cn(
              "inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
              statusColor(shipment.status)
            )}>
              {formatStatus(shipment.status)}
            </span>
            <span className="text-sm text-slate-400 capitalize">{shipment.mode} freight</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#0F313A] dark:bg-white text-white dark:text-black hover:opacity-90 text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
              title="Edit Shipment & Milestones"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Shipment</span>
            </button>
          )}

          {shipment.status !== "delivered" && (
            shipment.isPaused ? (
              <button
                type="button"
                onClick={handleResume}
                disabled={isActionPending}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                <span>{isActionPending ? "Resuming..." : "Resume Tracking"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowExceptionForm((open) => !open)}
                disabled={isActionPending}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Pause / Hold Gate</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Action Error */}
      {actionError && (
        <p role="alert" className="mb-6 text-sm font-semibold text-[#BA1C20]">
          {actionError}
        </p>
      )}

      {isEditing ? (
        /* ════════════════════════════════════════════════════════════
           EDIT SHIPMENT CONSOLE (Aligned to new/page.tsx design philosophy)
           ════════════════════════════════════════════════════════════ */
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Top Save & Cancel Bar */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#BA1C20] block mb-1">
                Editing Shipment Details
              </span>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-white font-mono">
                {shipment.trackingCode}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Modify cargo specifications, route schedule, milestone checkpoints, or dispatch client updates.
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShipment}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#0F313A] dark:bg-white text-white dark:text-black hover:opacity-90 text-sm font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>

          {/* Grid Layout of Edit Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Operational Status & Schedule */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                Status &amp; Schedule
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Shipment Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value as ShipmentStatus,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  >
                    <option value="in_transit">In Transit</option>
                    <option value="customs_hold">Customs Hold</option>
                    <option value="weather_delay">Weather Delay</option>
                    <option value="docked">Docked</option>
                    <option value="out_for_delivery">Out For Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="pending">Pending</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Transport Mode
                  </label>
                  <select
                    value={editFormData.mode}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        mode: e.target.value as TransportMode,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white capitalize focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  >
                    <option value="ocean">Ocean Freight</option>
                    <option value="air">Air Cargo</option>
                    <option value="rail">Intermodal Rail</option>
                    <option value="road">Road Freight</option>
                  </select>
                </div>
              </div>

              {/* Pause Gate Toggle */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-black dark:text-white block">
                      Hold Gate Active (Paused)
                    </span>
                    <span className="text-xs text-slate-400">
                      Freezes automatic vessel movement on public tracker
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editFormData.isPaused}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        isPaused: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-[#BA1C20] focus:ring-[#BA1C20]"
                  />
                </div>

                {editFormData.isPaused && (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Hold Gate Reason
                    </label>
                    <input
                      type="text"
                      value={editFormData.pausedReason}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          pausedReason: e.target.value,
                        })
                      }
                      placeholder="e.g. Customs Inspection Hold Gate"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#BA1C20]"
                    />
                  </div>
                )}
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Departure Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.departureDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const delMs = new Date(editFormData.estimatedDeliveryDate).getTime();
                      const isFutureDelivery = !isNaN(delMs) && delMs > Date.now();
                      setEditFormData((prev) => ({
                        ...prev,
                        departureDate: val,
                        status: isFutureDelivery && prev.status === "delivered" ? "in_transit" : prev.status,
                        actualDeliveryDate: isFutureDelivery ? "" : prev.actualDeliveryDate,
                      }));
                      if (val && editFormData.estimatedDeliveryDate) {
                        setEditMilestones((prev) =>
                          autoRegulateMilestoneTimestamps(
                            prev,
                            val,
                            editFormData.estimatedDeliveryDate
                          )
                        );
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Estimated Delivery Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.estimatedDeliveryDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newDeliveryMs = new Date(val).getTime();
                      const isFuture = !isNaN(newDeliveryMs) && newDeliveryMs > Date.now();
                      setEditFormData((prev) => ({
                        ...prev,
                        estimatedDeliveryDate: val,
                        status: isFuture && prev.status === "delivered" ? "in_transit" : prev.status,
                        actualDeliveryDate: isFuture ? "" : prev.actualDeliveryDate,
                      }));
                      if (val && editFormData.departureDate) {
                        setEditMilestones((prev) =>
                          autoRegulateMilestoneTimestamps(
                            prev,
                            editFormData.departureDate,
                            val
                          )
                        );
                      }
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Cargo Manifest Particulars */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                Cargo Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Conveyance Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.conveyanceName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        conveyanceName: e.target.value,
                      })
                    }
                    placeholder="e.g. M/V RIL PACIFIC"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Conveyance Identifier (IMO / Reg)
                  </label>
                  <input
                    type="text"
                    value={editFormData.conveyanceIdentifier}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        conveyanceIdentifier: e.target.value,
                      })
                    }
                    placeholder="e.g. IMO 9811000"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Voyage / Flight No
                  </label>
                  <input
                    type="text"
                    value={editFormData.voyageNumber}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        voyageNumber: e.target.value,
                      })
                    }
                    placeholder="e.g. 2611E"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Consignment Ref (B/L / AWB)
                  </label>
                  <input
                    type="text"
                    value={editFormData.consignmentReference}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        consignmentReference: e.target.value,
                      })
                    }
                    placeholder="e.g. RILU-8492019"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Container Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.containerNumber}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        containerNumber: e.target.value,
                      })
                    }
                    placeholder="e.g. RILU 849201-9"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Seal Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.sealNumber}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        sealNumber: e.target.value,
                      })
                    }
                    placeholder="e.g. RIL-99201"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Gross Weight (KG)
                  </label>
                  <input
                    type="number"
                    value={editFormData.grossWeightKg}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        grossWeightKg: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Total Pieces
                  </label>
                  <input
                    type="number"
                    value={editFormData.totalPieces}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        totalPieces: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Goods Description
                </label>
                <input
                  type="text"
                  value={editFormData.goodsDescription}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      goodsDescription: e.target.value,
                    })
                  }
                  placeholder="Describe cargo contents and packaging..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Client / Consignee Name
                </label>
                <input
                  type="text"
                  value={editFormData.clientName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      clientName: e.target.value,
                    })
                  }
                  placeholder="e.g. Global Tech Automation Ltd."
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                />
              </div>
            </div>

            {/* Card 3: Route Corridor */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                Origin &amp; Destination
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Origin Facility / Port Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.originName}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          originName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Code (LOCODE)
                    </label>
                    <input
                      type="text"
                      value={editFormData.originCode}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          originCode: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Destination Facility / Port Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.destinationName}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          destinationName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Code (LOCODE)
                    </label>
                    <input
                      type="text"
                      value={editFormData.destinationCode}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          destinationCode: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Client Notification Message */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                  Client Notification
                </h2>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Via support@rilfreight.com
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Operational Update Message (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    placeholder="e.g. Customs inspection cleared. Shipment scheduled for dispatch to destination port..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-black dark:text-white block">
                        Email Client Update
                      </span>
                      <span className="text-xs text-slate-400">
                        Dispatch email update to linked client via Resend
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={sendNotificationEmail}
                      onChange={(e) => setSendNotificationEmail(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0F313A] focus:ring-[#0F313A]"
                    />
                  </div>

                  {sendNotificationEmail && (
                    <div className="pt-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Client Recipient Email
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="client@company.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Full Milestones Timeline Editor (Full Width) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                  Milestone Checkpoints
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Update milestone titles, locations, timestamps, completion states, and pause gates.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-black dark:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="space-y-4">
              {editMilestones.map((ms, index) => (
                <div
                  key={ms.id || index}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Checkpoint #{index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ms.isCompleted}
                          onChange={(e) =>
                            handleMilestoneChange(
                              index,
                              "isCompleted",
                              e.target.checked
                            )
                          }
                          className="w-3.5 h-3.5 rounded text-[#0F313A]"
                        />
                        <span className="font-semibold">Completed</span>
                      </label>

                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(ms.isHoldGate)}
                          onChange={(e) =>
                            handleMilestoneChange(
                              index,
                              "isHoldGate",
                              e.target.checked
                            )
                          }
                          className="w-3.5 h-3.5 rounded text-amber-500"
                        />
                        <span className="font-semibold">Hold Gate</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(index)}
                        className="p-1 rounded-lg text-slate-400 hover:text-[#BA1C20] hover:bg-[#BA1C20]/10 transition-colors"
                        title="Remove milestone"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Code
                      </label>
                      <input
                        type="text"
                        value={ms.code}
                        onChange={(e) =>
                          handleMilestoneChange(index, "code", e.target.value)
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={ms.title}
                        onChange={(e) =>
                          handleMilestoneChange(index, "title", e.target.value)
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-semibold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Location Name
                      </label>
                      <input
                        type="text"
                        value={ms.locationName}
                        onChange={(e) =>
                          handleMilestoneChange(
                            index,
                            "locationName",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                        Timestamp
                      </label>
                      <input
                        type="datetime-local"
                        value={ms.timestamp}
                        onChange={(e) =>
                          handleMilestoneChange(
                            index,
                            "timestamp",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={ms.description}
                      onChange={(e) =>
                        handleMilestoneChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShipment}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#0F313A] dark:bg-white text-white dark:text-black hover:opacity-90 text-sm font-bold uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ════════════════════════════════════════════════════════════
           REGULAR SHIPMENT DETAIL VIEW
           ════════════════════════════════════════════════════════════ */
        <>
          {/* Hold Gate Form */}
          {showExceptionForm && !shipment.isPaused && (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-black dark:text-white">
                  Place Shipment On Hold
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  The live position is frozen and the hold reason is published to the tracking timeline.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Exception Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExceptionStatusType("customs_hold")}
                    className={cn(
                      "p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-colors",
                      exceptionStatusType === "customs_hold"
                        ? "bg-[#0F313A] text-white"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    Customs Hold Gate
                  </button>
                  <button
                    type="button"
                    onClick={() => setExceptionStatusType("weather_delay")}
                    className={cn(
                      "p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-colors",
                      exceptionStatusType === "weather_delay"
                        ? "bg-[#BA1C20] text-white"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    Weather / Route Delay
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Preset Reason
                </label>
                <select
                  value={exceptionReasonPreset}
                  onChange={(e) => setExceptionReasonPreset(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                >
                  {EXCEPTION_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Custom Operational Note (Optional)
                </label>
                <textarea
                  value={customExceptionReason}
                  onChange={(e) => setCustomExceptionReason(e.target.value)}
                  placeholder="Specify custom reason or operational instructions..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExceptionForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={isActionPending}
                  className="px-6 py-2.5 rounded-xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isActionPending ? "Applying..." : "Confirm & Place On Hold"}
                </button>
              </div>
            </div>
          )}

          {/* Paused Banner */}
          {shipment.isPaused && shipment.pausedReason && (
            <div className="bg-[#F9BC15]/15 border border-[#F9BC15]/30 rounded-2xl px-5 py-4 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#BA1C20]">On Hold</span>
              <p className="text-sm text-black dark:text-white mt-1">
                {shipment.pausedReason}
              </p>
              {shipment.pausedLocationName && (
                <p className="text-xs text-slate-400 mt-1">
                  Location: {shipment.pausedLocationName}
                </p>
              )}
            </div>
          )}

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

            {/* Route Progress */}
            <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl overflow-hidden flex flex-col justify-between">
              <div className="p-6">
                <h2 className="text-sm font-semibold text-black dark:text-white mb-4">
                  Route Progress
                </h2>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-sm text-slate-500">{shipment.originCode}</span>
                  <span className="text-2xl font-black text-black dark:text-white">{progressPercent}%</span>
                  <span className="font-mono text-sm text-slate-500">{shipment.destinationCode}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0F313A] dark:bg-white transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Live Route Map (Edge-to-edge flush with container) */}
              <div className="w-full">
                <LiveTrackingMap
                  shipment={shipment}
                  height="380px"
                  className="rounded-3xl border-0"
                />
              </div>
            </div>

            {/* Cargo Manifest */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
              <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
                Cargo Manifest
              </h2>
              <div className="space-y-4">
                <ManifestRow label="Conveyance" value={shipment.conveyanceName} />
                {shipment.conveyanceIdentifier && (
                  <ManifestRow label="Identifier" value={shipment.conveyanceIdentifier} mono />
                )}
                {shipment.voyageNumber && (
                  <ManifestRow label="Voyage" value={shipment.voyageNumber} mono />
                )}
                <ManifestRow label="Reference" value={shipment.consignmentReference} mono />
                {shipment.containerNumber && (
                  <ManifestRow label="Container" value={shipment.containerNumber} mono />
                )}
                {shipment.sealNumber && (
                  <ManifestRow label="Seal" value={shipment.sealNumber} mono />
                )}
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <ManifestRow
                  label="Departure"
                  value={new Date(shipment.departureDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
                <ManifestRow
                  label="Est. Delivery"
                  value={new Date(shipment.estimatedDeliveryDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
                {shipment.actualDeliveryDate && (
                  <ManifestRow
                    label="Actual Delivery"
                    value={new Date(shipment.actualDeliveryDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                )}
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <ManifestRow label="Pieces" value={`${shipment.totalPieces}`} />
                <ManifestRow label="Gross Weight" value={`${shipment.grossWeightKg.toLocaleString()} kg`} />
                {shipment.volumeCbm && (
                  <ManifestRow label="Volume" value={`${shipment.volumeCbm} CBM`} />
                )}
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <span className="block text-xs text-slate-400 mb-1">Goods</span>
                  <span className="text-sm text-black dark:text-white">{shipment.goodsDescription}</span>
                </div>
                {shipment.clientName && (
                  <>
                    <div className="h-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <span className="block text-xs text-slate-400 mb-1">Consignee</span>
                      <span className="text-sm text-black dark:text-white">{shipment.clientName}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Milestones Timeline */}
            <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
              <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
                Milestones
              </h2>
              <div className="space-y-0">
                {shipment.milestones.map((ms, i) => (
                  <div key={ms.id} className="flex gap-4">
                    {/* Timeline Indicator */}
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-3 h-3 rounded-full shrink-0 mt-1",
                        ms.isCompleted ? "bg-[#0F313A] dark:bg-white" : "bg-slate-300 dark:bg-slate-600"
                      )} />
                      {i < shipment.milestones.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-5">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "font-mono text-xs font-bold uppercase tracking-wider",
                          ms.isCompleted ? "text-[#0F313A] dark:text-white" : "text-slate-400"
                        )}>
                          {ms.code}
                        </span>
                        <span className={cn(
                          "text-sm font-semibold",
                          ms.isCompleted ? "text-black dark:text-white" : "text-slate-400"
                        )}>
                          {ms.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{ms.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ms.locationName} · {new Date(ms.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Waypoints */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
              <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
                Waypoints
              </h2>
              <div className="space-y-3">
                {shipment.waypoints.map((wp) => (
                  <div
                    key={wp.id}
                    className={cn(
                      "flex items-center justify-between py-2",
                      wp.isCompleted ? "opacity-100" : "opacity-50"
                    )}
                  >
                    <div>
                      <span className="text-sm font-semibold text-black dark:text-white block">{wp.name}</span>
                      <span className="text-xs text-slate-400">{wp.country}</span>
                    </div>
                    {wp.isCompleted && (
                      <span className="text-xs font-bold text-[#0F313A] dark:text-white uppercase tracking-wider">
                        Passed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Shipment Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-black dark:text-white">
              Delete Shipment {shipment.trackingCode}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will permanently delete the shipment from the registry and immediately unlink it from all connected client accounts.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteShipment}
                className="px-4 py-2 rounded-xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Everywhere"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Manifest Row
// ──────────────────────────────────────────────

function ManifestRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className={cn("text-sm text-black dark:text-white text-right", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}
