"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import {
  listenToPlatformUsers,
  createPlatformUserRecord,
  updatePlatformUserRecord,
  listenToShipments,
} from "@/shared/lib/firebase";
import { DEMO_USERS } from "@/shared/lib/demoData";
import type { PlatformUser } from "@/features/admin/types";
import type { Shipment } from "@/shared/types";
import {
  Search,
  Plus,
  Share2,
  X,
  Check,
  Copy,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type StatusFilter = "all" | "connected" | "pending";

export default function UsersPage() {
  const [users, setUsers] = React.useState<PlatformUser[]>([]);
  const [shipments, setShipments] = React.useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filter dropdown state
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [newUserForm, setNewUserForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    emailUpdatesEnabled: true,
  });
  const [isSubmittingUser, setIsSubmittingUser] = React.useState(false);

  // Share tracking modal state
  const [sharingData, setSharingData] = React.useState<{ user: PlatformUser; trackingCode: string } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // 1. Subscribe to Platform Users in Firestore with fallback
  React.useEffect(() => {
    const unsubscribe = listenToPlatformUsers(
      (liveUsers) => {
        if (liveUsers && liveUsers.length > 0) {
          setUsers(liveUsers);
        } else {
          setUsers(DEMO_USERS);
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("Firestore listenToPlatformUsers fallback to DEMO_USERS:", error);
        setUsers(DEMO_USERS);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Shipments in Firestore to support quick share
  React.useEffect(() => {
    const unsubscribe = listenToShipments(
      100,
      (liveShipments) => {
        setShipments(liveShipments);
      },
      (err) => {
        console.warn("Failed to listen to shipments for quick share:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered Users List
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.company && user.company.toLowerCase().includes(q)) ||
        (user.phone && user.phone.includes(q)) ||
        (user.linkedShipmentIds && user.linkedShipmentIds.some((s) => s.toLowerCase().includes(q)));

      let matchesStatus = true;
      if (statusFilter === "connected") {
        matchesStatus = user.connectionStatus === "connected";
      } else if (statusFilter === "pending") {
        matchesStatus = user.connectionStatus !== "connected";
      }

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  // Counts
  const counts = React.useMemo(() => {
    const total = users.length;
    const connected = users.filter((u) => u.connectionStatus === "connected").length;
    const pending = total - connected;
    return { total, connected, pending };
  }, [users]);

  // Toast helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Add User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) {
      showToast("Name and email are required.", "error");
      return;
    }

    setIsSubmittingUser(true);
    try {
      await createPlatformUserRecord({
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        phone: newUserForm.phone.trim() || undefined,
        company: newUserForm.company.trim() || undefined,
        connectionStatus: "pending",
        emailUpdatesEnabled: newUserForm.emailUpdatesEnabled,
        linkedShipmentIds: [],
        status: "active",
      });

      showToast(`Client ${newUserForm.name} created successfully.`);
      setIsAddUserOpen(false);
      setNewUserForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        emailUpdatesEnabled: true,
      });
    } catch (err) {
      console.error("Failed to create user:", err);
      showToast("Failed to create client in Firestore.", "error");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Toggle Email Updates
  const handleToggleEmailUpdates = async (user: PlatformUser) => {
    const nextState = !user.emailUpdatesEnabled;
    try {
      await updatePlatformUserRecord(user.id, { emailUpdatesEnabled: nextState });
      showToast(
        `Milestone updates ${nextState ? "enabled" : "disabled"} for ${user.name}.`
      );
    } catch (err) {
      console.error("Failed to toggle email updates:", err);
      showToast("Failed to update notification settings.", "error");
    }
  };

  // Generate Tracking Link for User
  const getDirectTrackingUrl = (trackingCode: string, userId: string) => {
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

  return (
    <div className="space-y-6">
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

      {/* Unified Action Toolbar: Search + Filter + Add Client */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, email, company, or tracking code..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 border-0"
          />
        </div>

        {/* Unified Filter Button & Dropdown Menu */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0",
              isFilterOpen || statusFilter !== "all"
                ? "bg-[#0F313A] text-white dark:bg-white dark:text-black shadow-sm"
                : "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
            {statusFilter !== "all" && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none bg-[#BA1C20] text-white">
                1
              </span>
            )}
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform duration-150", isFilterOpen && "rotate-180")}
            />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-2xl z-30 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 border border-slate-100 dark:border-slate-800">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Connection Status
              </div>
              {(
                [
                  { label: "All Clients", value: "all", count: counts.total },
                  { label: "Connected", value: "connected", count: counts.connected },
                  { label: "Pending", value: "pending", count: counts.pending },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setIsFilterOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between",
                    statusFilter === opt.value
                      ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] font-mono opacity-70">({opt.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Client Button */}
        <button
          type="button"
          onClick={() => setIsAddUserOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F313A] dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. MOBILE CARDS VIEW (< md) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => {
          const firstTrackingCode = user.linkedShipmentIds && user.linkedShipmentIds.length > 0
            ? user.linkedShipmentIds[0]
            : null;

          return (
            <div
              key={user.id}
              className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 space-y-3 border border-slate-100 dark:border-slate-800/60"
            >
              {/* Client & Company */}
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-2.5 min-w-0 flex-1 group"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-black dark:text-white block truncate group-hover:text-[#BA1C20] transition-colors">
                      {user.name}
                    </span>
                    {user.company ? (
                      <span className="text-xs text-slate-400 block truncate">
                        {user.company}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 block font-mono">
                        Individual Client
                      </span>
                    )}
                  </div>
                </Link>

                {/* Milestone Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleEmailUpdates(user)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0",
                    user.emailUpdatesEnabled
                      ? "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      : "bg-slate-200/40 dark:bg-slate-800/40 text-slate-400"
                  )}
                  title="Toggle automated email milestones"
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      user.emailUpdatesEnabled ? "bg-[#0F313A] dark:bg-white" : "bg-slate-300 dark:bg-slate-600"
                    )}
                  />
                  <span>{user.emailUpdatesEnabled ? "Emails On" : "Emails Off"}</span>
                </button>
              </div>

              {/* Contact Info */}
              <Link
                href={`/admin/users/${user.id}`}
                className="block pt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-400"
              >
                <span className="font-mono block truncate">{user.email}</span>
                {user.phone && <span className="block truncate">{user.phone}</span>}
              </Link>

              {/* Bottom Row Actions */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1">
                  {firstTrackingCode && (
                    <button
                      type="button"
                      onClick={() => setSharingData({ user, trackingCode: firstTrackingCode })}
                      className="p-2 rounded-xl text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Share tracking link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <Link
                    href={`/admin/email?recipient=${encodeURIComponent(user.email)}`}
                    className="p-2 rounded-xl text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Send Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && !isLoading && (
          <div className="py-12 text-center text-sm text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
            No registered clients match your search criteria.
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. DESKTOP TABLE VIEW (>= md) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-5 lg:p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Client / Company
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Contact Info
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Milestone Emails
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const firstTrackingCode = user.linkedShipmentIds && user.linkedShipmentIds.length > 0
                ? user.linkedShipmentIds[0]
                : null;

              return (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Client & Company */}
                  <td className="py-4 pr-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-black dark:text-white block group-hover:text-[#BA1C20] transition-colors">
                          {user.name}
                        </span>
                        {user.company ? (
                          <span className="text-xs text-slate-400 block font-normal">
                            {user.company}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Individual Client
                          </span>
                        )}
                      </div>
                    </Link>
                  </td>

                  {/* Contact Email & Phone */}
                  <td className="py-4 pr-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="block group"
                    >
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300 block group-hover:text-black dark:group-hover:text-white transition-colors">
                        {user.email}
                      </span>
                      {user.phone ? (
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {user.phone}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          No phone on file
                        </span>
                      )}
                    </Link>
                  </td>

                  {/* Milestone Updates Toggle */}
                  <td className="py-4 pr-4">
                    <button
                      type="button"
                      onClick={() => handleToggleEmailUpdates(user)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                        user.emailUpdatesEnabled
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                      title="Click to toggle automated email milestone updates"
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          user.emailUpdatesEnabled ? "bg-[#0F313A] dark:bg-white" : "bg-slate-300 dark:bg-slate-600"
                        )}
                      />
                      <span>{user.emailUpdatesEnabled ? "Enabled" : "Disabled"}</span>
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {firstTrackingCode && (
                        <button
                          type="button"
                          onClick={() =>
                            setSharingData({
                              user,
                              trackingCode: firstTrackingCode,
                            })
                          }
                          className="p-1.5 rounded-lg text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                          title="Share tracking link"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}

                      <Link
                        href={`/admin/email?recipient=${encodeURIComponent(user.email)}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                  No registered clients match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: ADD NEW CLIENT (NO PASSWORDS) */}
      {/* ───────────────────────────────────────────────────────── */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-black dark:text-white">
                Add New Client
              </h2>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="e.g. Marcus Chen"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 border-0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="e.g. m.chen@company.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 border-0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="text"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="e.g. +1 (604) 555-0142"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 border-0"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Company / Organization (Optional)
                </label>
                <input
                  type="text"
                  value={newUserForm.company}
                  onChange={(e) => setNewUserForm({ ...newUserForm, company: e.target.value })}
                  placeholder="e.g. Global Trade Group"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 border-0"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Send milestone updates via email
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setNewUserForm({
                      ...newUserForm,
                      emailUpdatesEnabled: !newUserForm.emailUpdatesEnabled,
                    })
                  }
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors",
                    newUserForm.emailUpdatesEnabled
                      ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}
                >
                  {newUserForm.emailUpdatesEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2.5 rounded-xl bg-[#0F313A] dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmittingUser ? "Creating..." : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL: SHARE TRACKING CODE (WHATSAPP, COPY, EMAIL) */}
      {/* ───────────────────────────────────────────────────────── */}
      {sharingData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-black dark:text-white">
                  Share Tracking Access
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Client: {sharingData.user.name} ({sharingData.trackingCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharingData(null)}
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
                {getDirectTrackingUrl(sharingData.trackingCode, sharingData.user.id)}
              </div>
            </div>

            {/* Sharing Channels */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyLink(getDirectTrackingUrl(sharingData.trackingCode, sharingData.user.id))
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-black dark:text-white transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Link Copied to Clipboard!" : "Copy Tracking Link"}</span>
              </button>

              <a
                href={`https://wa.me/${(sharingData.user.phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hello ${sharingData.user.name}, you can track your live shipment (${sharingData.trackingCode}) at: ${getDirectTrackingUrl(
                    sharingData.trackingCode,
                    sharingData.user.id
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
                href={`/admin/email?recipient=${encodeURIComponent(sharingData.user.email)}&subject=${encodeURIComponent(
                  `Your Tracking Link for Shipment ${sharingData.trackingCode}`
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
                onClick={() => setSharingData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
