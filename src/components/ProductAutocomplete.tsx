import React, { useState, useRef, useEffect } from "react";
import { Search, History } from "lucide-react";
import { PriceHistoryItem } from "../types";

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: PriceHistoryItem) => void;
  priceHistory: PriceHistoryItem[];
  placeholder?: string;
  label?: string;
  customerName?: string;
}

export const ProductAutocomplete = ({
  value,
  onChange,
  onSelect,
  priceHistory,
  placeholder,
  label,
  customerName
}: ProductAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PriceHistoryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  useEffect(() => {
    if (value.trim() === "") {
      setSuggestions([]);
      return;
    }

    const filtered = priceHistory.filter(item =>
      item.description.toLowerCase().includes(value.toLowerCase())
    );
    
    // Prioritize customer-specific entries
    const customerSpecific = filtered.filter(item => item.customerName === customerName);
    const others = filtered.filter(item => item.customerName !== customerName);

    // Remove duplicates by description, keeping the most recent one (which is first in the list)
    const getUnique = (list: PriceHistoryItem[]) => {
      return list.reduce((acc, current) => {
        const x = acc.find(item => item.description.toLowerCase() === current.description.toLowerCase());
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, [] as PriceHistoryItem[]);
    };

    const uniqueCustomer = getUnique(customerSpecific);
    const uniqueOthers = getUnique(others);

    // Combine, prioritizing customer specific
    const combined = [...uniqueCustomer, ...uniqueOthers];

    setSuggestions(combined.slice(0, 8));
    setActiveIndex(-1);
  }, [value, priceHistory, customerName]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelect(suggestions[activeIndex]);
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <textarea
          ref={textareaRef}
          className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 placeholder:text-zinc-300 placeholder:font-medium resize-none min-h-[46px] overflow-hidden hover:border-zinc-300"
          value={value ?? ""}
          rows={1}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onInput={adjustHeight}
          onFocus={() => {
            setIsOpen(true);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <div className="absolute right-4 top-3.5 text-zinc-300 group-focus-within:text-brand-500 transition-colors">
          <Search className="h-4 w-4" />
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl shadow-brand-500/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 max-h-60 overflow-y-auto" ref={listRef}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left rounded-xl transition-all group ${
                  index === activeIndex ? "bg-brand-50 text-brand-700" : "hover:bg-zinc-50"
                }`}
                onClick={() => {
                  onSelect(suggestion);
                  setIsOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-900 group-hover:text-brand-700 transition-colors">{suggestion.description}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      Last: ₹{suggestion.rate}
                    </span>
                    {suggestion.customerName === customerName && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">
                        This Client
                      </span>
                    )}
                  </div>
                </div>
                <History className="h-3.5 w-3.5 text-zinc-300 group-hover:text-brand-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
