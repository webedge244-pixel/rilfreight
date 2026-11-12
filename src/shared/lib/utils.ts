import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names safely without style conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats an ISO date string or Date object into a readable display string.
 */
export function formatDate(
  date: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * Calculates the progress percentage (0 - 100) between two timestamps.
 */
export function calculateProgressPercentage(
  startTimestamp: number,
  endTimestamp: number,
  currentTimestamp: number = Date.now()
): number {
  if (startTimestamp >= endTimestamp) return 100;
  if (currentTimestamp <= startTimestamp) return 0;
  if (currentTimestamp >= endTimestamp) return 100;
  const elapsed = currentTimestamp - startTimestamp;
  const total = endTimestamp - startTimestamp;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
