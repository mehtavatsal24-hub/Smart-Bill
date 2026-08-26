import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, X, History } from "lucide-react";

interface HistoryAutocompleteInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  historyKey: string;
  defaultOptions?: string[];
  type?: "text" | "textarea";
  rows?: number;
  className?: string;
}

export const HistoryAutocompleteInput: React.FC<HistoryAutocompleteInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  historyKey,
  defaultOptions = [],
  type = "text",
  rows = 2,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [savedHistory, setSavedHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const storageKey = `smartbill_history_${historyKey}`;

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      let list: string[] = stored ? JSON.parse(stored) : [];
      const combined = Array.from(new Set([...list, ...defaultOptions])).filter(Boolean);
      setSavedHistory(combined);
    } catch (e) {
      setSavedHistory(defaultOptions);
    }
  }, [storageKey]);

  // Check positioning relative to screen bottom when opening
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 210px space below, open upward
      if (spaceBelow < 210 && rect.top > 210) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  // Save value to history
  const saveValueToHistory = (valToSave: string) => {
    const trimmed = valToSave.trim();
    if (!trimmed) return;

    try {
      const existing = savedHistory.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...existing].slice(0, 30);
      setSavedHistory(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const removeItem = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedHistory.filter((item) => item !== itemToRemove);
    setSavedHistory(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {}
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredHistory = savedHistory.filter((item) =>
    item.toLowerCase().includes((value || "").toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {type === "textarea" ? (
          <textarea
            className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all resize-none pr-8"
            value={value ?? ""}
            rows={rows}
            placeholder={placeholder}
            onFocus={handleOpen}
            onChange={(e) => {
              onChange(e.target.value);
              handleOpen();
            }}
            onBlur={() => {
              if (value) saveValueToHistory(value);
            }}
          />
        ) : (
          <input
            type="text"
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all pr-8"
            value={value ?? ""}
            placeholder={placeholder}
            onFocus={handleOpen}
            onChange={(e) => {
              onChange(e.target.value);
              handleOpen();
            }}
            onBlur={() => {
              if (value) saveValueToHistory(value);
            }}
          />
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
          className="absolute right-2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && filteredHistory.length > 0 && (
        <div
          className={`absolute z-[100] left-0 right-0 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden divide-y divide-zinc-100 animate-in fade-in duration-150`}
        >
          <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-100">
            <span className="flex items-center gap-1.5">
              <History className="h-3 w-3 text-brand-600" /> Recent Entries
            </span>
            <span className="bg-zinc-200 text-zinc-600 px-1.5 py-0.2 rounded-full font-extrabold text-[9px]">
              {filteredHistory.length}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-zinc-50 scrollbar-thin scrollbar-thumb-zinc-200">
            {filteredHistory.map((item, i) => (
              <div
                key={i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item);
                  saveValueToHistory(item);
                  setIsOpen(false);
                }}
                className="px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-brand-50 hover:text-brand-900 cursor-pointer flex items-center justify-between group transition-colors"
              >
                <span className="truncate pr-2">{item}</span>
                <button
                  type="button"
                  onClick={(e) => removeItem(item, e)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 p-1 transition-opacity rounded-md hover:bg-white/80"
                  title="Remove from history"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
