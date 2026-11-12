"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { DEMO_USERS } from "@/shared/lib/demoData";

type StatusFilter = "all" | "active" | "inactive";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const filteredUsers = DEMO_USERS.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.company && user.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.country && user.country.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeCount = DEMO_USERS.filter((u) => u.status === "active").length;
  const totalShipmentsLinked = DEMO_USERS.reduce((acc, u) => acc + u.linkedShipmentIds.length, 0);

  return (
    <div>
      {/* Top Stats Bar */}
      <div className="flex items-center justify-end gap-8 mb-6">
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-black text-black dark:text-white">
            {DEMO_USERS.length}
          </span>
          <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
            Total Clients
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl sm:text-3xl font-black text-[#0F313A] dark:text-teal-400">
            {activeCount}
          </span>
          <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
            Active Now
          </span>
        </div>
        <div className="text-right hidden md:block">
          <span className="text-2xl sm:text-3xl font-black text-black dark:text-white">
            {totalShipmentsLinked}
          </span>
          <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
            Active Dispatches
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search client by name, company, email, or country..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
        />

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { label: "All Users", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ] as const
          ).map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
                statusFilter === filter.value
                  ? "bg-[#0F313A] text-white dark:bg-white dark:text-black"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <p className="text-xs text-slate-400 mb-4 font-mono">
        Showing {filteredUsers.length} of {DEMO_USERS.length} registered accounts
      </p>

      {/* Users Data Table */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-5 lg:p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Client / Company
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Contact
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4 hidden md:table-cell">
                Country
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Linked Shipments
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 pr-4">
                Status
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hidden lg:table-cell">
                Last Login
              </th>
              <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Client / Company */}
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-black dark:text-white block">
                        {user.name}
                      </span>
                      {user.company && (
                        <span className="text-xs text-slate-400 block font-normal">
                          {user.company}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Contact Email & Phone */}
                <td className="py-4 pr-4">
                  <span className="text-sm font-mono text-slate-700 dark:text-slate-300 block">
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {user.phone}
                    </span>
                  )}
                </td>

                {/* Country */}
                <td className="py-4 pr-4 hidden md:table-cell">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {user.country || "—"}
                  </span>
                </td>

                {/* Linked Shipments */}
                <td className="py-4 pr-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-200/70 dark:bg-slate-800 text-black dark:text-white">
                    {user.linkedShipmentIds.length} active
                  </span>
                </td>

                {/* Status */}
                <td className="py-4 pr-4">
                  <span
                    className={cn(
                      "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                      user.status === "active"
                        ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"
                        : "text-slate-500 bg-slate-200/60 dark:text-slate-400 dark:bg-slate-800"
                    )}
                  >
                    {user.status}
                  </span>
                </td>

                {/* Last Login */}
                <td className="py-4 pr-4 hidden lg:table-cell">
                  <span className="text-xs text-slate-400 font-mono">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </span>
                </td>

                {/* Action */}
                <td className="py-4 text-right">
                  <Link
                    href={`/admin/email?recipient=${encodeURIComponent(user.email)}`}
                    className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#BA1C20] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors text-slate-700 dark:text-slate-300"
                  >
                    Email
                  </Link>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                  No registered users match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
