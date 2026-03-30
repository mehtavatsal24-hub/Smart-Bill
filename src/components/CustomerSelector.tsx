import React, { useState, useEffect, useRef } from "react";
import { Search, UserPlus, Check, ChevronDown } from "lucide-react";
import { SavedCustomer, CustomerDetails } from "../types";
import { Input } from "./Input";
import { Button } from "./Button";

interface CustomerSelectorProps {
  customers: SavedCustomer[];
  onSelect: (customer: CustomerDetails) => void;
  currentValue: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const CustomerSelector = ({ 
  customers, 
  onSelect, 
  currentValue, 
  onChange,
  label = "Customer Name",
  placeholder = "Search or enter new company name",
  disabled = false
}: CustomerSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(currentValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(currentValue);
  }, [currentValue]);

  const filteredCustomers = customers.filter((c) => {
    if (!searchTerm || searchTerm === currentValue) return true;
    return c.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Input
        label={label}
        value={currentValue}
        onChange={(e) => {
          onChange(e.target.value);
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        placeholder={placeholder}
        className="pr-10"
        disabled={disabled}
      />
      <div className="absolute right-3 top-[34px] text-zinc-400">
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {!disabled && isOpen && (filteredCustomers.length > 0 || searchTerm.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-60 overflow-auto py-1">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                className="w-full px-4 py-2 text-left hover:bg-zinc-50 flex items-center justify-between group"
                onClick={() => {
                  onSelect(customer);
                  setIsOpen(false);
                }}
              >
                <div>
                  <p className="text-sm font-bold text-zinc-900">{customer.name}</p>
                  <p className="text-xs text-zinc-500">{customer.gstin || "No GSTIN"}</p>
                </div>
                <Check className="h-4 w-4 text-zinc-400 opacity-0 group-hover:opacity-100" />
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-zinc-500 mb-2">No matching customer found</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                <UserPlus className="h-3 w-3 mr-2" />
                Add as New Customer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
