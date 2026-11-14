"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DEMO_EMAIL_TEMPLATES } from "@/shared/lib/demoData";
import { listenToPlatformUsers } from "@/shared/lib/firebase";
import type { PlatformUser } from "@/features/admin/types";

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
  const [registeredUsers, setRegisteredUsers] = React.useState<PlatformUser[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [sentSuccessRecipient, setSentSuccessRecipient] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);

  // Subscribe to live registered clients from Firestore
  React.useEffect(() => {
    const unsubscribe = listenToPlatformUsers(
      (live) => {
        setRegisteredUsers(live || []);
      },
      (err) => {
        console.error("Failed to load registered users for email composer:", err);
      }
    );
    return () => unsubscribe();
  }, []);

  // When a template is chosen, populate subject and body
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = DEMO_EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setErrorMessage(null);
      setInfoMessage(`Loaded "${template.name}" template. Review details before dispatching.`);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      setErrorMessage("Please enter a recipient, subject, and message body.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setSentSuccessRecipient(null);

    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to dispatch email via Resend.");
      }

      setSentSuccessRecipient(recipient.trim());
      setRecipient("");
      setSelectedTemplateId("");
      setSubject("");
      setBody("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Success Notification (Solid Green, No Border) */}
      {sentSuccessRecipient && (
        <div className="mb-6 p-4 rounded-2xl bg-[#0D5C46] text-white shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 border-0">
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span className="text-sm font-semibold">
              Email successfully dispatched to <strong className="font-mono text-emerald-200">{sentSuccessRecipient}</strong> from <strong>support@rilfreight.com</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSentSuccessRecipient(null)}
            className="text-xs font-mono uppercase bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg shrink-0 ml-4 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Destructive / Error Notification (Solid Red, No Border) */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-[#BA1C20] text-white shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 border-0">
          <div className="flex items-center gap-3 min-w-0">
            <AlertCircle className="w-5 h-5 text-white/90 shrink-0" />
            <span className="text-sm font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-mono uppercase bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg shrink-0 ml-4 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Information Notification (Solid Primary Teal, No Border) */}
      {infoMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-[#0F313A] text-white shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 border-0">
          <div className="flex items-center gap-3 min-w-0">
            <Info className="w-5 h-5 text-teal-300 shrink-0" />
            <span className="text-sm font-semibold">{infoMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setInfoMessage(null)}
            className="text-xs font-mono uppercase bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg shrink-0 ml-4 transition-colors"
          >
            Dismiss
          </button>
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
                value={registeredUsers.some((u) => u.email === recipient) ? recipient : ""}
                onChange={(e) => {
                  if (e.target.value) setRecipient(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
              >
                <option value="">
                  {registeredUsers.length === 0
                    ? "— No registered clients in database —"
                    : "— Or pick from registered clients —"}
                </option>
                {registeredUsers.map((u) => (
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
                setSentSuccessRecipient(null);
                setErrorMessage(null);
                setInfoMessage("Email composer form cleared.");
              }}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#BA1C20] hover:bg-[#9c171a] disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <span>Send Email</span>
              )}
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
