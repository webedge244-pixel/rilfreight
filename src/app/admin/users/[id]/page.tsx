"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import {
  listenToPlatformUserRecord,
  updatePlatformUserRecord,
  deletePlatformUserRecord,
  linkShipmentToUser,
  unlinkShipmentFromUser,
  listenToShipments,
} from "@/shared/lib/firebase";
import { DEMO_USERS } from "@/shared/lib/demoData";
import type { PlatformUser } from "@/features/admin/types";
import type { Shipment, TransportMode } from "@/shared/types";
import {
  Search,
  Plus,
  Share2,
  Trash2,
  X,
  Check,
  Copy,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Ship,
  Plane,
  Train,
  Truck,
  ArrowLeft,
  Package,
} from "lucide-react";

function getModeIcon(mode?: TransportMode) {
  switch (mode) {
    case "ocean":
      return <Ship className="w-3.5 h-3.5 text-[#0284c7]" />;
    case "air":
      return <Plane className="w-3.5 h-3.5 text-[#8b5cf6]" />;
    case "rail":
      return <Train className="w-3.5 h-3.5 text-[#f59e0b]" />;
    case "road":
      return <Truck className="w-3.5 h-3.5 text-[#10b981]" />;
    default:
      return <Package className="w-3.5 h-3.5 text-slate-400" />;
  }
}

export default function UserDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-8 text-sm text-slate-400">
          Loading client profile...
        </div>
      }
    >
      <UserDetailContent />
    </React.Suspense>
  );
}

function UserDetailContent() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = React.useState<PlatformUser | null>(null);
  const [shipments, setShipments] = React.useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Link shipment state
  const [shipmentSearchQuery, setShipmentSearchQuery] = React.useState("");
  const [isLinkingShipment, setIsLinkingShipment] = React.useState(false);

  // Share tracking modal state
  const [sharingTrackingCode, setSharingTrackingCode] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Delete confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Subscribe to User record in Firestore
  React.useEffect(() => {
    if (!userId) return;

    const unsubscribe = listenToPlatformUserRecord(
      userId,
      (liveUser) => {
        if (liveUser) {
          setUser(liveUser);
        } else {
          // Fallback to demo users
          const demo = DEMO_USERS.find((u) => u.id === userId) || null;
          setUser(demo);
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("Error listening to user record, checking demo data:", error);
        const demo = DEMO_USERS.find((u) => u.id === userId) || null;
        setUser(demo);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // 2. Subscribe to Shipments in Firestore for autocomplete & details
  React.useEffect(() => {
    const unsubscribe = listenToShipments(
      100,
      (liveShipments) => {
        setShipments(liveShipments);
      },
      (err) => {
        console.warn("Failed to listen to shipments for user details:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Toggle Email Updates
  const handleToggleEmailUpdates = async () => {
    if (!user) return;
    const nextState = !user.emailUpdatesEnabled;
    try {
      await updatePlatformUserRecord(user.id, { emailUpdatesEnabled: nextState });
      setUser((prev) => (prev ? { ...prev, emailUpdatesEnabled: nextState } : null));
      showToast(`Milestone updates ${nextState ? "enabled" : "disabled"}.`);
    } catch (err) {
      console.error("Failed to toggle email updates:", err);
      showToast("Failed to update notification settings.", "error");
    }
  };

  // Link Shipment Handler
  const handleLinkShipment = async (shipmentIdOrCode: string) => {
    if (!user) return;
    setIsLinkingShipment(true);
    try {
      await linkShipmentToUser(user.id, shipmentIdOrCode);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              linkedShipmentIds: Array.from(new Set([...prev.linkedShipmentIds, shipmentIdOrCode])),
            }
          : null
      );
      setShipmentSearchQuery("");
      showToast(`Shipment ${shipmentIdOrCode} linked successfully.`);
    } catch (err) {
      console.error("Failed to link shipment:", err);
      showToast("Could not link shipment.", "error");
    } finally {
      setIsLinkingShipment(false);
    }
  };

  // Unlink Shipment Handler
  const handleUnlinkShipment = async (shipmentIdOrCode: string) => {
    if (!user) return;
    try {
      await unlinkShipmentFromUser(user.id, shipmentIdOrCode);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              linkedShipmentIds: prev.linkedShipmentIds.filter((s) => s !== shipmentIdOrCode),
            }
          : null
      );
      showToast(`Shipment ${shipmentIdOrCode} unlinked.`);
    } catch (err) {
      console.error("Failed to unlink shipment:", err);
      showToast("Could not unlink shipment.", "error");
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deletePlatformUserRecord(user.id);
      router.replace("/admin/users");
    } catch (err) {
      console.error("Failed to delete user:", err);
      showToast("Could not delete client record.", "error");
      setIsDeleting(false);
    }
  };

  // Generate Tracking Link for User
  const getDirectTrackingUrl = (trackingCode: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/tracking/${encodeURIComponent(trackingCode)}?uid=${encodeURIComponent(userId)}`;
  };

  // Copy Link Handler
  const handleCopyLink = (url: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Available shipments for linking dropdown
  const filteredShipmentsToLink = React.useMemo(() => {
    const q = shipmentSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return shipments
      .filter(
        (s) =>
          s.trackingCode.toLowerCase().includes(q) ||
          s.destinationName.toLowerCase().includes(q) ||
          s.destinationCountry.toLowerCase().includes(q) ||
          s.originName.toLowerCase().includes(q) ||
          (s.containerNumber && s.containerNumber.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [shipments, shipmentSearchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8 text-sm text-slate-400">
        Loading client profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <h1 className="text-xl font-bold text-black dark:text-white">Client Not Found</h1>
        <p className="text-xs text-slate-400">
          The requested client record does not exist or has been removed.
        </p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Clients</span>
        </Link>
      </div>
    );
  }

  const isConnected = user.connectionStatus === "connected";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            "fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all",
            toastMessage.type === "success"
              ? "bg-slate-900 dark:bg-white text-white dark:text-black"
              : "bg-[#BA1C20] text-white"
          )}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Return Navigation */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clients List</span>
        </Link>
      </div>

      {/* Client Profile Overview Header */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-300 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">
              {user.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
              {user.company ? (
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {user.company}
                </span>
              ) : (
                <span className="font-mono">Individual Client</span>
              )}
              <span>•</span>
              <span className="font-mono">{user.email}</span>
              {user.phone && (
                <>
                  <span>•</span>
                  <span>{user.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Send Email */}
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/email?recipient=${encodeURIComponent(user.email)}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wider text-black dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>Send Email</span>
          </Link>
        </div>
      </div>

      {/* Grid: Reordered for Mobile & Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card 1: Connection Status & Notifications (Mobile: 1st, Desktop: Left top) */}
        <div className="lg:col-span-4 order-1 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Connection Status
          </h2>

          <div>
            {/* Text Only Badge, Zero Dots, Zero Animations */}
            <span
              className={cn(
                "inline-block px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider",
                isConnected
                  ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"
                  : "text-slate-500 bg-slate-200/60 dark:text-slate-400 dark:bg-slate-800"
              )}
            >
              {isConnected ? "Connected" : "Pending"}
            </span>

            {isConnected && user.firstConnectedAt ? (
              <p className="text-xs text-slate-400 mt-2 font-mono">
                First accessed tracking on{" "}
                {new Date(user.firstConnectedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                Client has not yet opened their personalized tracking link.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-black dark:text-white">
                  Milestone Alerts
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Automated email dispatch
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleEmailUpdates}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
                  user.emailUpdatesEnabled
                    ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                )}
              >
                {user.emailUpdatesEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Linked Shipments & Cargo (Mobile: 2nd, Desktop: Right column spanning) */}
        <div className="lg:col-span-8 lg:row-span-2 order-2 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 sm:p-7 space-y-6">
          {/* 1 & 2: Heading & Subtitle */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
                Linked Shipments &amp; Cargo
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Shipments accessible to this client on the public tracking portal.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {user.linkedShipmentIds.length} Linked
            </span>
          </div>

          {/* 3: Search Input with Absolute Floating Dropdown (Only appears when typing) */}
          <div className="relative space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Search &amp; Attach Additional Waybill
            </label>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={shipmentSearchQuery}
                onChange={(e) => setShipmentSearchQuery(e.target.value)}
                placeholder="Type tracking code (RIL-), city, or destination..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 border border-slate-200 dark:border-slate-700"
              />
              {shipmentSearchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setShipmentSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Absolute Dropdown Overlay */}
            {shipmentSearchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-20 bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-100">
                {filteredShipmentsToLink.map((s) => {
                  const isAlreadyLinked = user.linkedShipmentIds.includes(s.trackingCode);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          {getModeIcon(s.mode)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-mono font-bold text-black dark:text-white block truncate">
                            {s.trackingCode}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                            {s.originName} &rarr; {s.destinationName}
                          </span>
                        </div>
                      </div>

                      {isAlreadyLinked ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                          Attached
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isLinkingShipment}
                          onClick={() => handleLinkShipment(s.trackingCode)}
                          className="px-3 py-1 rounded-lg bg-[#0F313A] dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0"
                        >
                          Attach
                        </button>
                      )}
                    </div>
                  );
                })}

                {filteredShipmentsToLink.length === 0 && (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No shipments found matching &ldquo;{shipmentSearchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4: Already Connected Shipments List */}
          <div className="space-y-3 pt-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Connected Cargo ({user.linkedShipmentIds.length})
            </label>

            <div className="space-y-2.5">
              {user.linkedShipmentIds.length > 0 ? (
                user.linkedShipmentIds.map((code) => {
                  const match = shipments.find((s) => s.trackingCode === code);
                  return (
                    <div
                      key={code}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                          {getModeIcon(match?.mode)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-black dark:text-white">
                              {code}
                            </span>
                            {match && (
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                {match.mode}
                              </span>
                            )}
                          </div>
                          {match ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                              {match.originName} &rarr; {match.destinationName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                              External / Historical Waybill
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setSharingTrackingCode(code)}
                          className="p-2 rounded-xl text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Share tracking link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUnlinkShipment(code)}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-[#BA1C20] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No shipments linked to this client yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Manage Client Record (Mobile: 3rd / LAST, Desktop: Left bottom) */}
        <div className="lg:col-span-4 order-3 bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Manage Client Record
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Permanently delete this client and unlink all associated waybills.
          </p>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-[#BA1C20] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Client</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: SHARE TRACKING CODE (WHATSAPP, COPY, EMAIL) */}
      {/* ───────────────────────────────────────────────────────── */}
      {sharingTrackingCode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-black dark:text-white">
                  Share Tracking Access
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {sharingTrackingCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharingTrackingCode(null)}
                className="text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Generated Direct URL */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Personalized Tracking URL
              </label>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 break-all text-xs font-mono text-slate-700 dark:text-slate-300">
                {getDirectTrackingUrl(sharingTrackingCode)}
              </div>
            </div>

            {/* Sharing Channels */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCopyLink(getDirectTrackingUrl(sharingTrackingCode))}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-black dark:text-white transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Tracking Link"}</span>
              </button>

              <a
                href={`https://wa.me/${(user.phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hello ${user.name}, you can track your live shipment (${sharingTrackingCode}) at: ${getDirectTrackingUrl(
                    sharingTrackingCode
                  )}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>

              <Link
                href={`/admin/email?recipient=${encodeURIComponent(user.email)}&subject=${encodeURIComponent(
                  `Your Tracking Link for Shipment ${sharingTrackingCode}`
                )}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F313A] dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Operations Email</span>
              </Link>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSharingTrackingCode(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: DELETE CLIENT CONFIRMATION */}
      {/* ───────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <h2 className="text-base font-bold text-black dark:text-white">
              Delete Client {user.name}?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will permanently delete this client profile from the database and unlink all associated waybills.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
