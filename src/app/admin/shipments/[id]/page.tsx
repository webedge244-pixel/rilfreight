"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  listenToShipmentRecord,
  replaceShipmentRecord,
  deleteShipmentRecord,
} from "@/shared/lib/firebase";
import {
  releaseShipmentGate,
  evaluateShipmentProgression,
} from "@/features/tracking/services/trackingService";
import {
  deriveShipmentStatus,
  regulateMilestones,
  synchronizeWaypoints,
  approveMilestoneHold,
  advanceMilestoneImmediately,
  cascadeMilestoneGaps,
  swapMilestonesWithTimestampInheritance,
  toLocalDatetimeInput as toLocalInput,
  fromLocalDatetimeInput as fromLocalInput,
  computeProgressPercent,
} from "@/shared/lib/shipmentLogic";
import { useToast } from "@/shared/components/toast";
import type {
  Shipment,
  ShipmentStatus,
  TransportMode,
  TrackingMilestone,
} from "@/shared/types";
import {
  Trash2,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  ArrowDown,
  ArrowUp,
  X,
  Pencil,
  Plus,
  Trash,
  Save,
  Copy,
  CopyPlus,
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
  },
);

/** Auto-adjusts milestone timestamps and completion status to fit between departure and estimated delivery */
function autoRegulateMilestoneTimestamps(
  milestones: TrackingMilestone[],
  departureLocalStr: string,
  deliveryLocalStr: string,
): TrackingMilestone[] {
  return regulateMilestones(milestones, departureLocalStr, deliveryLocalStr, {
    outputFormat: "local",
  });
}

export default function ShipmentDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-sm text-slate-400">Loading shipment...</div>
      }
    >
      <ShipmentDetailContent />
    </React.Suspense>
  );
}

function ShipmentDetailContent() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [isActionPending, setIsActionPending] = React.useState<boolean>(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = React.useState<boolean>(false);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [copiedTrackingCode, setCopiedTrackingCode] =
    React.useState<boolean>(false);

  const handleCopyTrackingCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedTrackingCode(true);
      toast.success(`Tracking code ${code} copied to clipboard`);
      setTimeout(() => setCopiedTrackingCode(false), 2000);
    }
  };

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
          "Unable to reach the shipment database. Check the connection and try again.",
        );
        setIsLoading(false);
      },
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
    [shipment],
  );

  // ── Actions ────────────────────────────────────────────

  const handleResume = async () => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    try {
      const released = releaseShipmentGate(shipment);
      await replaceShipmentRecord(shipment.id, released);
      setShipment(released);
    } catch (error) {
      console.error("Failed to release hold gate:", error);
      setActionError("Could not release the hold gate. Please try again.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    try {
      const updated = approveMilestoneHold(shipment, milestoneId);
      await replaceShipmentRecord(shipment.id, updated);
      setShipment(updated);
      toast.success("Milestone cleared! Remaining timeline recalculated.");
    } catch (error) {
      console.error("Failed to approve milestone hold:", error);
      setActionError("Could not release hold on milestone. Please try again.");
    } finally {
      setIsActionPending(false);
    }
  };

  const handleAdvanceMilestone = async (milestoneId: string) => {
    if (!shipment) return;

    setIsActionPending(true);
    setActionError(null);

    try {
      const updated = advanceMilestoneImmediately(shipment, milestoneId);
      await replaceShipmentRecord(shipment.id, updated);
      setShipment(updated);
      toast.success("Checkpoint completed! Next checkpoint started & timeline recalculated.");
    } catch (error) {
      console.error("Failed to advance milestone:", error);
      setActionError("Could not advance milestone. Please try again.");
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

  const [editMilestones, setEditMilestones] = React.useState<
    TrackingMilestone[]
  >([]);
  const snapshotMilestonesRef = React.useRef<TrackingMilestone[]>([]);
  const baselineMilestoneRef = React.useRef<{
    index: number;
    value: string;
  } | null>(null);
  const baselineDepartureRef = React.useRef<string | null>(null);
  const baselineDeliveryRef = React.useRef<string | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    if (type === "error") {
      toast.destructive(text);
    } else {
      toast.success(text);
    }
  };

  const handleStartEdit = () => {
    if (!shipment) return;

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

    const initialMilestones = (shipment.milestones || []).map((m) => ({
      ...m,
      timestamp: toLocalInput(m.timestamp),
    }));
    setEditMilestones(initialMilestones);
    snapshotMilestonesRef.current = initialMilestones;
    setIsEditing(true);
  };

  const handleMilestoneChange = (
    index: number,
    field: keyof TrackingMilestone,
    value: TrackingMilestone[keyof TrackingMilestone],
  ) => {
    setEditMilestones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const commitMilestoneTimestampShift = (index: number) => {
    const currentStr = editMilestones[index]?.timestamp;
    const baseline = baselineMilestoneRef.current;
    const previousList =
      snapshotMilestonesRef.current.length === editMilestones.length
        ? snapshotMilestonesRef.current
        : editMilestones;
    const prevStr =
      baseline && baseline.index === index
        ? baseline.value
        : previousList[index]?.timestamp;

    if (!currentStr || currentStr === prevStr) {
      baselineMilestoneRef.current = null;
      return;
    }

    // Cascade dynamic adjacent time gaps to all downstream milestones
    const updated = cascadeMilestoneGaps(previousList, index, currentStr, {
      outputFormat: "local",
    });

    setEditMilestones(updated);
    snapshotMilestonesRef.current = updated;

    const lastMs = updated[updated.length - 1]?.timestamp;
    if (lastMs) {
      setEditFormData((fd) => ({
        ...fd,
        ...(index === 0 ? { departureDate: currentStr } : {}),
        estimatedDeliveryDate: lastMs,
      }));
    }

    baselineMilestoneRef.current = null;
  };

  // Reactive Delivery Date change: shifts Departure Date and refactors all milestones
  const applyDeliveryShift = (newDeliveryStr: string) => {
    if (!newDeliveryStr) {
      setEditFormData((prev) => ({
        ...prev,
        estimatedDeliveryDate: newDeliveryStr,
      }));
      return;
    }

    const newDelMs = new Date(
      fromLocalInput(newDeliveryStr) || newDeliveryStr,
    ).getTime();
    if (Number.isNaN(newDelMs)) {
      setEditFormData((prev) => ({
        ...prev,
        estimatedDeliveryDate: newDeliveryStr,
      }));
      return;
    }

    const curDepMs = new Date(
      fromLocalInput(editFormData.departureDate) || editFormData.departureDate,
    ).getTime();
    const curDelMs = new Date(
      fromLocalInput(editFormData.estimatedDeliveryDate) ||
        editFormData.estimatedDeliveryDate,
    ).getTime();

    let durationMs = 14 * 24 * 3600 * 1000;
    if (
      !Number.isNaN(curDepMs) &&
      !Number.isNaN(curDelMs) &&
      curDelMs > curDepMs
    ) {
      durationMs = curDelMs - curDepMs;
    }

    const newDepMs = newDelMs - durationMs;
    const newDepStr = toLocalInput(new Date(newDepMs));
    const isFuture = newDelMs > Date.now();

    setEditFormData((prev) => ({
      ...prev,
      estimatedDeliveryDate: newDeliveryStr,
      departureDate: newDepStr,
      status:
        isFuture && prev.status === "delivered" ? "in_transit" : prev.status,
      actualDeliveryDate: isFuture ? "" : prev.actualDeliveryDate,
    }));

    setEditMilestones((prev) => {
      const regulated = autoRegulateMilestoneTimestamps(
        prev,
        newDepStr,
        newDeliveryStr,
      );
      snapshotMilestonesRef.current = regulated;
      return regulated;
    });
  };

  // Reactive Departure Date change: delivery date unchanged unless logic error (departure >= delivery)
  const applyDepartureShift = (newDepartureStr: string) => {
    if (!newDepartureStr) {
      setEditFormData((prev) => ({ ...prev, departureDate: newDepartureStr }));
      return;
    }

    const newDepMs = new Date(
      fromLocalInput(newDepartureStr) || newDepartureStr,
    ).getTime();
    if (Number.isNaN(newDepMs)) {
      setEditFormData((prev) => ({ ...prev, departureDate: newDepartureStr }));
      return;
    }

    const curDelMs = new Date(
      fromLocalInput(editFormData.estimatedDeliveryDate) ||
        editFormData.estimatedDeliveryDate,
    ).getTime();
    let effectiveDelStr = editFormData.estimatedDeliveryDate;
    let effectiveDelMs = curDelMs;

    // Date logic self-correction: if departure >= delivery, push delivery forward
    if (Number.isNaN(curDelMs) || newDepMs >= curDelMs) {
      const curDepMs = new Date(
        fromLocalInput(editFormData.departureDate) ||
          editFormData.departureDate,
      ).getTime();
      let durationMs = 7 * 24 * 3600 * 1000;
      if (
        !Number.isNaN(curDepMs) &&
        !Number.isNaN(curDelMs) &&
        curDelMs > curDepMs
      ) {
        durationMs = curDelMs - curDepMs;
      }
      effectiveDelMs = newDepMs + durationMs;
      effectiveDelStr = toLocalInput(new Date(effectiveDelMs));
    }

    const isFuture = effectiveDelMs > Date.now();

    setEditFormData((prev) => ({
      ...prev,
      departureDate: newDepartureStr,
      estimatedDeliveryDate: effectiveDelStr,
      status:
        isFuture && prev.status === "delivered" ? "in_transit" : prev.status,
      actualDeliveryDate: isFuture ? "" : prev.actualDeliveryDate,
    }));

    setEditMilestones((prev) => {
      const regulated = autoRegulateMilestoneTimestamps(
        prev,
        newDepartureStr,
        effectiveDelStr,
      );
      snapshotMilestonesRef.current = regulated;
      return regulated;
    });
  };

  const handleAddMilestone = () => {
    const prevList = editMilestones;
    const lastItem = prevList[prevList.length - 1];
    const lastMs = lastItem
      ? new Date(
          fromLocalInput(lastItem.timestamp) || lastItem.timestamp,
        ).getTime()
      : Date.now();
    const fallbackMs = !Number.isNaN(lastMs)
      ? lastMs + 3600 * 1000
      : Date.now();

    const newMs: TrackingMilestone = {
      id: `ms-manual-${Date.now()}`,
      code: "CHECKPOINT",
      title: "Transit Checkpoint",
      description:
        "Shipment reached an operational waypoint in the route schedule.",
      locationName: shipment?.destinationName || "Transit Hub",
      timestamp: toLocalInput(new Date(fallbackMs)),
      isCompleted: false,
      isHoldGate: false,
    };
    setEditMilestones((prev) => {
      const updated = [...prev, newMs];
      snapshotMilestonesRef.current = updated;
      setEditFormData((fd) => ({
        ...fd,
        estimatedDeliveryDate: newMs.timestamp,
      }));
      return updated;
    });
  };

  const handleRemoveMilestone = (index: number) => {
    setEditMilestones((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      snapshotMilestonesRef.current = updated;
      const lastMs = updated[updated.length - 1]?.timestamp;
      if (lastMs) {
        setEditFormData((fd) => ({
          ...fd,
          estimatedDeliveryDate: lastMs,
        }));
      }
      return updated;
    });
  };

  const handleMoveMilestone = (fromIndex: number, toIndex: number) => {
    if (
      toIndex < 0 ||
      toIndex >= editMilestones.length ||
      fromIndex === toIndex
    )
      return;
    setEditMilestones((prev) => {
      const updated = swapMilestonesWithTimestampInheritance(
        prev,
        fromIndex,
        toIndex,
      );
      snapshotMilestonesRef.current = updated;
      return updated;
    });
  };

  const handleSaveShipment = async () => {
    if (!shipment) return;
    setIsSaving(true);
    setActionError(null);

    try {
      const now = new Date();
      const depDate = new Date(
        fromLocalInput(editFormData.departureDate) || shipment.departureDate,
      );
      const estDelDate = new Date(
        fromLocalInput(editFormData.estimatedDeliveryDate) ||
          shipment.estimatedDeliveryDate,
      );
      const nowMs = now.getTime();

      // Determine status fresh from schedule like /new with zero stale past status
      const determinedStatus = deriveShipmentStatus(depDate, estDelDate, {
        now: nowMs,
      });

      // Timeline checkpoints: Wipe out past completion and re-evaluate strictly from timestamps
      const formattedMilestones: TrackingMilestone[] = editMilestones.map(
        (m) => {
          const rawTime = fromLocalInput(m.timestamp) || m.timestamp;
          const mTime = new Date(rawTime).getTime();
          const hasPassed = !Number.isNaN(mTime) && mTime <= nowMs;
          return {
            ...m,
            timestamp: rawTime,
            isCompleted: hasPassed,
            status: hasPassed ? "completed" : "pending",
            isHoldGate: hasPassed ? false : Boolean(m.isHoldGate),
          };
        },
      );

      const updatedWaypoints = synchronizeWaypoints(
        shipment.waypoints || [],
        depDate,
        estDelDate,
        { now: nowMs },
      );

      const updatedShipment: Shipment = {
        ...shipment,
        mode: editFormData.mode,
        status: determinedStatus,
        departureDate: depDate.toISOString(),
        estimatedDeliveryDate: estDelDate.toISOString(),
        actualDeliveryDate:
          determinedStatus === "delivered"
            ? fromLocalInput(editFormData.actualDeliveryDate) ||
              now.toISOString()
            : null,
        isPaused: false,
        pausedReason: null,
        pausedLocationName: null,
        pausedAtTimestamp: null,
        pausedCoordinates: null,
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
        volumeCbm: editFormData.volumeCbm
          ? Number(editFormData.volumeCbm)
          : null,
        goodsDescription: editFormData.goodsDescription,
        clientName: editFormData.clientName?.trim() || null,
        waypoints: updatedWaypoints,
        milestones: formattedMilestones,
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore using existing tracking code & ID
      await replaceShipmentRecord(shipment.id, updatedShipment);
      setShipment(updatedShipment);

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
      <div className="space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-[280px] sm:h-[360px] rounded-2xl bg-slate-900 flex items-center justify-center">
          <span className="text-sm text-slate-400 font-semibold font-mono">
            Initializing Vector Route Map...
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 md:col-span-2" />
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900" />
        </div>
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
          No shipment exists with ID:{" "}
          <span className="font-mono">{shipmentId}</span>
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
      {/* Unified Top Header Card */}
      <div
        className={cn(
          "rounded-3xl p-6 mb-6 border-0 shadow-none transition-colors",
          shipment.isPaused
            ? "bg-amber-500/10 dark:bg-amber-950/30"
            : "bg-slate-50 dark:bg-slate-900/50",
        )}
      >
        {/* Top Navigation Row: Back Link on Left, Destructive Delete on Right */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/admin/shipments"
            className="inline-block text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
          >
            ← Back to Shipments
          </Link>

          <div className="flex items-center gap-8">
            <Link
              href={`/admin/new?cloneFrom=${shipment.id}`}
              className="inline-flex items-center gap-1.5 text-[#0F313A] dark:text-white hover:opacity-80 text-sm font-bold uppercase tracking-wider underline underline-offset-4 transition-opacity"
              title="Clone this shipment"
            >
              <CopyPlus className="w-4 h-4" />
              <span>clone this shipment</span>
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
        </div>

        {/* Header Details & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-black dark:text-white font-mono">
                {shipment.trackingCode}
              </h1>
              <button
                type="button"
                onClick={() => handleCopyTrackingCode(shipment.trackingCode)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
                title="Copy Tracking Code"
                aria-label="Copy tracking code"
              >
                {copiedTrackingCode ? (
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {/* Red customs_hold tag removed per user requirement */}
              {!shipment.isPaused && shipment.status !== "customs_hold" && (
                <span
                  className={cn(
                    "inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                    statusColor(shipment.status),
                  )}
                >
                  {formatStatus(shipment.status)}
                </span>
              )}
              <span className="text-sm text-slate-400 capitalize">
                {shipment.mode} freight
              </span>
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

            {shipment.status !== "delivered" && shipment.isPaused && (
              <button
                type="button"
                onClick={handleResume}
                disabled={isActionPending}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
              >
                <PlayCircle className="w-4 h-4" />
                <span>
                  {isActionPending ? "Resuming..." : "Resume Tracking"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Integrated On Hold Section (No separate card, no borders) */}
        {shipment.isPaused && (
          <div className="mt-4 pt-4 border-t border-amber-500/20 dark:border-amber-500/10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              On Hold
            </span>
            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-1">
              A milestone requires administrative approval before shipment
              progression can continue. Scroll down to the milestones section
              below to review and approve.
            </p>
          </div>
        )}
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
                Modify cargo specifications, route schedule, milestone
                checkpoints, or dispatch client updates.
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
                      setEditFormData((prev) => ({
                        ...prev,
                        departureDate: val,
                      }));
                      if (val && !Number.isNaN(new Date(val).getTime())) {
                        applyDepartureShift(val);
                      }
                    }}
                    onBlur={() => {
                      if (editFormData.departureDate) {
                        applyDepartureShift(editFormData.departureDate);
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
                      setEditFormData((prev) => ({
                        ...prev,
                        estimatedDeliveryDate: val,
                      }));
                      if (val && !Number.isNaN(new Date(val).getTime())) {
                        applyDeliveryShift(val);
                      }
                    }}
                    onBlur={() => {
                      if (editFormData.estimatedDeliveryDate) {
                        applyDeliveryShift(editFormData.estimatedDeliveryDate);
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
            <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-6">
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
          </div>

          {/* Card 5: Full Milestones Timeline Editor (Full Width) */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0F313A] dark:text-white">
                  Milestone Checkpoints
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Update milestone titles, locations, timestamps, completion
                  states, and pause gates.
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Checkpoint #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveMilestone(index, index - 1)}
                          className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move milestone up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === editMilestones.length - 1}
                          onClick={() => handleMoveMilestone(index, index + 1)}
                          className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Move milestone down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(ms.isHoldGate)}
                          onChange={(e) =>
                            handleMilestoneChange(
                              index,
                              "isHoldGate",
                              e.target.checked,
                            )
                          }
                          className="w-3.5 h-3.5 rounded text-amber-500"
                        />
                        <span className="font-semibold">Hold Gate</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(index)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#BA1C20] hover:bg-[#BA1C20]/10 transition-colors flex items-center justify-center"
                        title="Delete milestone"
                        aria-label="Delete milestone"
                      >
                        <X className="w-4 h-4" />
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
                            e.target.value,
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
                        onFocus={() => {
                          baselineMilestoneRef.current = {
                            index,
                            value: ms.timestamp,
                          };
                        }}
                        onChange={(e) =>
                          handleMilestoneChange(
                            index,
                            "timestamp",
                            e.target.value,
                          )
                        }
                        onBlur={() => commitMilestoneTimestampShift(index)}
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
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom-left Add Milestone Button */}
            <div className="flex items-center justify-start pt-1">
              <button
                type="button"
                onClick={handleAddMilestone}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-black dark:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
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
          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Route Progress */}
            <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl overflow-hidden flex flex-col">
              <div className="p-6 pb-3">
                <h2 className="text-sm font-semibold text-black dark:text-white mb-4">
                  Route Progress
                </h2>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-sm text-slate-500">
                    {shipment.originCode}
                  </span>
                  <span className="text-2xl font-black text-black dark:text-white">
                    {progressPercent}%
                  </span>
                  <span className="font-mono text-sm text-slate-500">
                    {shipment.destinationCode}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0F313A] dark:bg-white transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Live Route Map (Snug under progress bar and flexes to fill container height) */}
              <div className="w-full flex-1 min-h-[380px]">
                <LiveTrackingMap
                  shipment={shipment}
                  height="100%"
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
                <ManifestRow
                  label="Conveyance"
                  value={shipment.conveyanceName}
                />
                {shipment.conveyanceIdentifier && (
                  <ManifestRow
                    label="Identifier"
                    value={shipment.conveyanceIdentifier}
                    mono
                  />
                )}
                {shipment.voyageNumber && (
                  <ManifestRow
                    label="Voyage"
                    value={shipment.voyageNumber}
                    mono
                  />
                )}
                <ManifestRow
                  label="Reference"
                  value={shipment.consignmentReference}
                  mono
                />
                {shipment.containerNumber && (
                  <ManifestRow
                    label="Container"
                    value={shipment.containerNumber}
                    mono
                  />
                )}
                {shipment.sealNumber && (
                  <ManifestRow label="Seal" value={shipment.sealNumber} mono />
                )}
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <ManifestRow
                  label="Departure"
                  value={new Date(shipment.departureDate).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                />
                <ManifestRow
                  label="Est. Delivery"
                  value={new Date(
                    shipment.estimatedDeliveryDate,
                  ).toLocaleDateString("en-US", {
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
                    value={new Date(
                      shipment.actualDeliveryDate,
                    ).toLocaleDateString("en-US", {
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
                <ManifestRow
                  label="Gross Weight"
                  value={`${shipment.grossWeightKg.toLocaleString()} kg`}
                />
                {shipment.volumeCbm && (
                  <ManifestRow
                    label="Volume"
                    value={`${shipment.volumeCbm} CBM`}
                  />
                )}
                <div className="h-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <span className="block text-xs text-slate-400 mb-1">
                    Goods
                  </span>
                  <span className="text-sm text-black dark:text-white">
                    {shipment.goodsDescription}
                  </span>
                </div>
                {shipment.clientName && (
                  <>
                    <div className="h-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <span className="block text-xs text-slate-400 mb-1">
                        Consignee
                      </span>
                      <span className="text-sm text-black dark:text-white">
                        {shipment.clientName}
                      </span>
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
                {(() => {
                  const nowMs = Date.now();
                  const activeMilestoneIndex = shipment.milestones.findIndex(
                    (m) => !m.isCompleted,
                  );

                  return shipment.milestones.map((ms, i) => {
                    const mTime = new Date(ms.timestamp).getTime();
                    const hasReachedTime = !isNaN(mTime) && mTime <= nowMs;
                    const isCurrentActive = i === activeMilestoneIndex;
                    // Hold gate is pending approval ONLY for the currently active milestone if it has reached its scheduled time or shipment is paused
                    const isPendingHold =
                      isCurrentActive &&
                      Boolean(ms.isHoldGate) &&
                      !ms.isCompleted &&
                      (hasReachedTime || Boolean(shipment.isPaused));
                    // Active playing milestone: currently active, not held, shipment not paused, and not delivered
                    const isActivePlaying =
                      isCurrentActive &&
                      !isPendingHold &&
                      !shipment.isPaused &&
                      shipment.status !== "delivered";

                    return (
                      <div
                        key={ms.id}
                        className={cn(
                          "flex gap-4 p-3 transition-colors rounded-none border-0 shadow-none",
                          isPendingHold
                            ? "bg-amber-500/10 dark:bg-amber-950/30"
                            : "",
                        )}
                      >
                        {/* Timeline Indicator */}
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full shrink-0 mt-1",
                              ms.isCompleted
                                ? "bg-[#0F313A] dark:bg-white"
                                : isPendingHold
                                  ? "bg-amber-500"
                                  : "bg-slate-300 dark:bg-slate-600",
                            )}
                          />
                          {i < shipment.milestones.length - 1 && (
                            <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 my-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="pb-3 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={cn(
                                "font-mono text-xs font-bold uppercase tracking-wider",
                                ms.isCompleted
                                  ? "text-[#0F313A] dark:text-white"
                                  : isPendingHold
                                    ? "text-amber-700 dark:text-amber-400"
                                    : "text-slate-400",
                              )}
                            >
                              {ms.code}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                ms.isCompleted
                                  ? "text-black dark:text-white"
                                  : isPendingHold
                                    ? "text-amber-900 dark:text-amber-200"
                                    : "text-slate-400",
                              )}
                            >
                              {ms.title}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "text-xs mt-0.5",
                              isPendingHold
                                ? "text-amber-800/80 dark:text-amber-300/80"
                                : "text-slate-400",
                            )}
                          >
                            {ms.description}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-0.5",
                              isPendingHold
                                ? "text-amber-800/70 dark:text-amber-300/70"
                                : "text-slate-400",
                            )}
                          >
                            {ms.locationName} ·{" "}
                            {new Date(ms.timestamp).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>

                          {/* Action Button for Admin Hold Gate Approval */}
                          {isPendingHold && (
                            <div className="mt-2.5">
                              <button
                                type="button"
                                onClick={() => handleApproveMilestone(ms.id)}
                                disabled={isActionPending}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve &amp; Continue</span>
                              </button>
                            </div>
                          )}

                          {/* Action Button for the Next In-Line Milestone to be Completed */}
                          {isActivePlaying && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAdvanceMilestone(ms.id)}
                                disabled={isActionPending}
                                className="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-[#0F313A] dark:hover:border-white flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#0F313A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                                title={
                                  ms.isHoldGate
                                    ? "Mark checkpoint complete & hold"
                                    : "Mark checkpoint complete & move to next"
                                }
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {ms.isHoldGate
                                  ? "Mark complete & hold"
                                  : "Mark as Completed"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
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
                      wp.isCompleted ? "opacity-100" : "opacity-50",
                    )}
                  >
                    <div>
                      <span className="text-sm font-semibold text-black dark:text-white block">
                        {wp.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {wp.country}
                      </span>
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
              This will permanently delete the shipment from the registry and
              immediately unlink it from all connected client accounts.
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

function ManifestRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span
        className={cn(
          "text-sm text-black dark:text-white text-right",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}
