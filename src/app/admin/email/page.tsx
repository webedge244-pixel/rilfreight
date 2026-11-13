"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { DEMO_USERS, DEMO_EMAIL_TEMPLATES } from "@/shared/lib/demoData";

export default function EmailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading composer...</div>}>
      <EmailComposerContent />
    </React.Suspense>
  );
}

function EmailComposerContent() {
  const searchParams = useSearchParams();
  const prefilledRecipient = searchParams.get("recipient") || "";

  const [recipient, setRecipient] = React.useState(prefilledRecipient);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sentSuccess, setSentSuccess] = React.useState(false);

  // When a template is chosen, populate subject and body
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = DEMO_EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !subject || !body) {
      alert("Please enter a recipient, subject, and message body.");
      return;
    }

    // Demo send logic
    console.log("Dispatching Email:", { recipient, subject, body });
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setRecipient("");
      setSelectedTemplateId("");
      setSubject("");
      setBody("");
    }, 3000);
  };

  return (
    <div className="max-w-4xl">
      {/* Success Banner */}
      {sentSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center justify-between">
          <span>Email successfully dispatched to {recipient}. (Demo mode — Firebase/Resend will send in production)</span>
          <span className="text-xs font-mono uppercase bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded">Sent</span>
        </div>
      )}

      {/* Main Composer Bento Card */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 lg:p-8">
        <form onSubmit={handleSend} className="space-y-6">
          {/* Quick Recipient Select or Custom Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registered Client Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Select Registered Client
              </label>
              <select
                value={DEMO_USERS.some((u) => u.email === recipient) ? recipient : ""}
                onChange={(e) => {
                  if (e.target.value) setRecipient(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              >
                <option value="">— Or pick from registered users —</option>
                {DEMO_USERS.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.name} ({u.company || u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Load Template (Optional)
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              >
                <option value="">— Select an operational template —</option>
                {DEMO_EMAIL_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipient Email Address (Manual Input) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Recipient Email Address
            </label>
            <input
              type="email"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. consignee@clientcorp.com"
              className="w-full font-mono px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
            />
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Clearance Notification: Shipment RIL-8492-3019-CA"
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm font-semibold text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Message Body
            </label>
            <textarea
              required
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Compose operational message, carrier advisory, or milestone confirmation..."
              className="w-full font-mono text-xs sm:text-sm px-4 py-3 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30 resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setRecipient("");
                setSelectedTemplateId("");
                setSubject("");
                setBody("");
              }}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Clear Form
            </button>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] text-white text-sm font-bold uppercase tracking-wider transition-colors active:scale-[0.98]"
            >
              Send Email
            </button>
          </div>
        </form>
      </div>

      {/* Available Templates Quick Reference */}
      <div className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Quick Template Directory
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DEMO_EMAIL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleTemplateChange(tpl.id)}
              className="text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 transition-colors"
            >
              <span className="block text-sm font-bold text-black dark:text-white mb-1">
                {tpl.name}
              </span>
              <span className="block text-xs text-slate-400 font-mono truncate">
                {tpl.subject}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
