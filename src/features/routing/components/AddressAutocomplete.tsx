"use client";

import * as React from "react";
import { searchLocations } from "@/server/data/locations";
import type { LocationData, TransportMode } from "@/shared/types";
import { cn } from "@/shared/lib/utils";

export interface AddressAutocompleteProps {
  label: string;
  value: string;
  codeValue?: string;
  mode: TransportMode;
  placeholder?: string;
  onSelect: (location: {
    name: string;
    code?: string;
    city?: string;
    country: string;
    countryCode?: string;
    coordinates: [number, number];
  }) => void;
  onChangeText: (text: string) => void;
  className?: string;
  /** Overrides the styling of the location-code badge. */
  codeBadgeClassName?: string;
  /** Overrides the styling of the field label. */
  labelClassName?: string;
}

export default function AddressAutocomplete({
  label,
  value,
  codeValue,
  mode,
  placeholder,
  onSelect,
  onChangeText,
  className = "",
  codeBadgeClassName,
  labelClassName,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState<LocationData[]>([]);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.trim().length >= 1) {
        const matches = searchLocations(value, mode, 8);
        setResults(matches);
      } else {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [value, mode]);

  // Click outside listener
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown") setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = results[highlightedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (loc: LocationData) => {
    onSelect({
      name: loc.name,
      code: loc.code,
      city: loc.city,
      country: loc.country,
      countryCode: loc.countryCode,
      coordinates: loc.coordinates,
    });
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="flex items-center justify-between mb-2">
        <label
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-wider text-slate-400",
            labelClassName
          )}
        >
          {label}
        </label>
        {codeValue && (
          <span
            className={cn(
              "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#0F313A] dark:text-slate-300",
              codeBadgeClassName
            )}
          >
            {codeValue}
          </span>
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChangeText(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => {
          if (value.trim().length >= 1) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-sm text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F313A] dark:focus:ring-white/30"
      />

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-auto rounded-xl bg-white dark:bg-slate-800 shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-700/50">
          {results.map((loc, idx) => (
            <li
              key={loc.code || `res-${idx}`}
              onClick={() => handleSelect(loc)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={cn(
                "px-3.5 py-2.5 cursor-pointer text-xs transition-colors flex items-center justify-between",
                highlightedIndex === idx
                  ? "bg-slate-100 dark:bg-slate-700/80 text-black dark:text-white"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/40"
              )}
            >
              <div>
                <p className="font-semibold">{loc.name}</p>
                <p className="text-[11px] text-slate-400">
                  {loc.city ? `${loc.city}, ` : ""}{loc.country}
                </p>
              </div>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                {loc.code}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
