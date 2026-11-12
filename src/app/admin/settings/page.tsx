"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DEMO_SETTINGS } from "@/shared/lib/demoData";
import { useTheme } from "@/shared/context/ThemeContext";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = React.useState(DEMO_SETTINGS);
  const [savedNotice, setSavedNotice] = React.useState(false);

  const handleChange = (field: keyof typeof DEMO_SETTINGS, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saved Settings:", settings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-4xl">
      {/* Save Success Banner */}
      {savedNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center justify-between">
          <span>Configuration saved successfully. (Demo mode — Firebase will persist in production)</span>
          <span className="text-xs font-mono uppercase bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded">Saved</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 0: Appearance & Theme */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 lg:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                Appearance & Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize the visual interface. Starts in Light mode by default.
              </p>
            </div>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Active: {theme}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                theme === "light"
                  ? "bg-white border-[#0F313A] shadow-sm ring-2 ring-[#0F313A]"
                  : "bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  theme === "light"
                    ? "bg-[#0F313A] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-black dark:text-white block">
                  Light Mode
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                  Clean canvas with high contrast
                </span>
              </div>
            </button>

            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                theme === "dark"
                  ? "bg-slate-900 border-[#BA1C20] shadow-sm ring-2 ring-[#BA1C20]"
                  : "bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  theme === "dark"
                    ? "bg-[#BA1C20] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}
              >
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-black dark:text-white block">
                  Dark Mode
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                  Nautical midnight palette
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Section 1: Carrier & Identity */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
            Carrier & Alliance Identity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Carrier Code (Prefix)
              </label>
              <input
                type="text"
                value={settings.carrierCode}
                onChange={(e) => handleChange("carrierCode", e.target.value)}
                className="w-full font-mono font-bold px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Used for generated AWB & B/L numbers (e.g. RIL-849201)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Company Display Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="w-full font-semibold px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Operations Support Email
              </label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleChange("supportEmail", e.target.value)}
                className="w-full font-mono px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Default Logistics Corridors */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
            Default Maritime & Aviation Corridors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Default Origin Terminal / UN/LOCODE
              </label>
              <input
                type="text"
                value={settings.defaultOriginCode}
                onChange={(e) => handleChange("defaultOriginCode", e.target.value)}
                className="w-full font-mono uppercase px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: CNSHA (Port of Shanghai Yangshan)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Default Destination Terminal / UN/LOCODE
              </label>
              <input
                type="text"
                value={settings.defaultDestinationCode}
                onChange={(e) => handleChange("defaultDestinationCode", e.target.value)}
                className="w-full font-mono uppercase px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: CAMTR (Port of Montreal Gateway)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Notification & Automation Policies */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 lg:p-8">
          <h2 className="text-sm font-semibold text-black dark:text-white mb-5">
            Automation & Notification Policies
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
              <div>
                <span className="font-semibold text-sm text-black dark:text-white block">
                  Automated Milestone Evaluation
                </span>
                <span className="text-xs text-slate-400 block font-normal">
                  Automatically mark waypoints as Completed based on live elapsed schedule time
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => handleChange("notificationsEnabled", e.target.checked)}
                className="w-5 h-5 accent-[#BA1C20] rounded cursor-pointer"
              />
            </label>

            <div className="h-px bg-slate-200 dark:bg-slate-700" />

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
              <div>
                <span className="font-semibold text-sm text-black dark:text-white block">
                  Email Alerts on Exceptions & Holds
                </span>
                <span className="text-xs text-slate-400 block font-normal">
                  Notify dispatchers when a shipment is manually paused for customs hold or weather delay
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => handleChange("emailNotifications", e.target.checked)}
                className="w-5 h-5 accent-[#BA1C20] rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-sm font-bold uppercase tracking-wider transition-colors active:scale-[0.98]"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
