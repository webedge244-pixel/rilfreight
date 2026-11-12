"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/features/admin/components/adminSidebar";
import { AdminMobileNav } from "@/features/admin/components/adminMobileNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#F0F2F5] dark:bg-[#07090A]" />}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </React.Suspense>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
        {children}
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#F0F2F5] dark:bg-[#07090A] p-2.5 sm:p-3 lg:p-4 flex flex-col gap-2.5 sm:gap-3 lg:gap-0">
      {/* Standalone Floating Top Bar Island (Mobile only, < lg) */}
      <div className="lg:hidden shrink-0">
        <AdminMobileNav />
      </div>

      {/* Floating Canvas Framework: Sidebar Island (Desktop) & Main Workspace Island separated by physical gap */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4 min-h-0 h-full">
        {/* Floating Sidebar Island (Desktop) */}
        <AdminSidebar />

        {/* Floating Main Workspace Island (No border, contrast-separated, halved border radius) */}
        <div className="flex-1 h-full min-w-0 rounded-xl bg-white dark:bg-[#121619] flex flex-col overflow-hidden">
          {/* Scrollable Page Content with Custom Minimalist Scrollbar */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
