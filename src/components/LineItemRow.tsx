import React, { useState, useEffect } from "react";
import { Trash2, History, Wand2, Loader2 } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";
import { LineItem, PriceHistoryItem, DocumentType, BusinessDetails } from "../types";
import { TAX_RATES, UNITS, CURRENCY_SYMBOLS } from "../constants";
import { ProductAutocomplete } from "./ProductAutocomplete";
import { expandTechnicalSpec } from "../services/technicalService";
import { validateHSN, validatePositiveNumber } from "../lib/validation";

interface LineItemRowProps {
  item: LineItem;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
  priceHistory?: PriceHistoryItem[];
  docType?: DocumentType;
  isExport?: boolean;
  currency?: string;
  exchangeRate?: number;
  business?: BusinessDetails;
  customerName?: string;
}

export const LineItemRow = ({ 
  item, 
  onUpdate, 
  onRemove, 
  priceHistory = [], 
  docType,
  isExport = false,
  currency = "INR",
  exchangeRate = 1,
  business,
  customerName
}: LineItemRowProps) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const isQuotation = docType === DocumentType.QUOTATION;
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;
  
  // Internal rate is in the active currency (INR if not export, foreign if export)
  const displayRate = item.rate;
  
  const amount = item.isRegret ? 0 : item.quantity * item.rate;
  const tax = (isQuotation || isExport || item.isRegret) ? 0 : (amount * item.taxRate) / 100;
  const total = amount + tax;
  
  const displayTotal = total;

  // Prioritize customer-specific history
  const customerSpecificHistory = priceHistory.filter(
    ph => ph.customerName === customerName && ph.description.toLowerCase() === item.description.toLowerCase() && item.description !== ""
  );
  
  const lastQuotedForCustomer = customerSpecificHistory.length > 0 ? customerSpecificHistory[0] : null;

  const globalLastQuoted = priceHistory.find(
    ph => ph.description.toLowerCase() === item.description.toLowerCase() && item.description !== ""
  );

  const lastQuoted = lastQuotedForCustomer || globalLastQuoted;
  const isCustomerSpecific = !!lastQuotedForCustomer;

  useEffect(() => {
    // Real-time validation
    const hsnError = validateHSN(item.hsn);
    const qtyError = validatePositiveNumber(item.quantity, "Quantity");
    const rateError = item.isRegret ? undefined : validatePositiveNumber(item.rate, "Rate");
    
    setErrors({
      hsn: hsnError,
      quantity: qtyError,
      rate: rateError
    });
  }, [item.hsn, item.quantity, item.rate, item.isRegret]);

  const handleExpand = async () => {
    if (!item.description || item.description.trim().length < 2) return;
    
    setIsExpanding(true);
    try {
      const expanded = await expandTechnicalSpec(item.description, business?.industry, business?.letterhead);
      onUpdate(item.id, { description: expanded });
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <div className={`grid grid-cols-12 gap-3 sm:gap-4 items-start py-4 sm:py-6 border-b border-zinc-100 last:border-0 group/row ${item.isRegret ? 'bg-red-50/30' : ''}`}>
      <div className="col-span-12 md:col-span-4">
        <div className="relative group">
          <ProductAutocomplete
            label="Description"
            value={item.description}
            onChange={(val) => onUpdate(item.id, { description: val })}
            onSelect={(suggestion) => onUpdate(item.id, { 
              description: suggestion.description,
              rate: suggestion.rate 
            })}
            priceHistory={priceHistory}
            placeholder="Product name..."
            customerName={customerName}
          />
          {item.description.length > 3 && (
            <button
              onClick={handleExpand}
              disabled={isExpanding}
              className="absolute right-10 top-[42px] p-1.5 text-zinc-300 hover:text-brand-600 transition-all disabled:opacity-50 z-10 hover:bg-brand-50 rounded-lg"
              title="Expand to technical spec"
            >
              {isExpanding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="col-span-4 md:col-span-1">
        <Input
          label="HSN/SAC"
          value={item.hsn}
          onChange={(e) => onUpdate(item.id, { hsn: e.target.value })}
          placeholder="HSN/SAC"
          disabled={item.isRegret}
          error={errors.hsn}
        />
      </div>
      <div className="col-span-4 md:col-span-1">
        <Input
          label="Qty"
          type="number"
          step="any"
          value={item.quantity === 0 ? "" : item.quantity}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onUpdate(item.id, { quantity: Math.round(val * 100) / 100 });
          }}
          disabled={item.isRegret}
          error={errors.quantity}
        />
      </div>
      <div className="col-span-4 md:col-span-1">
        <label className="block text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Unit</label>
        <select
          className="w-full px-3 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200 disabled:bg-zinc-50 disabled:text-zinc-400"
          value={item.unit ?? "NOS"}
          onChange={(e) => onUpdate(item.id, { unit: e.target.value })}
          disabled={item.isRegret}
        >
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>
      <div className={(isQuotation || isExport) ? "col-span-7 md:col-span-3" : "col-span-6 md:col-span-2"}>
        <div className="flex items-center justify-between mb-1.5 ml-1">
          <label className="block text-xs font-extrabold text-zinc-500 uppercase tracking-widest">Rate</label>
          <label className="flex items-center gap-1.5 cursor-pointer group/regret">
            <input 
              type="checkbox" 
              checked={item.isRegret ?? false}
              onChange={(e) => onUpdate(item.id, { isRegret: e.target.checked })}
              className="w-3 h-3 rounded border-zinc-300 text-red-600 focus:ring-red-500 transition-colors"
            />
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${item.isRegret ? 'text-red-600' : 'text-zinc-400 group-hover/regret:text-zinc-600'}`}>Regret</span>
          </label>
        </div>
        <Input
          prefix={isExport ? currencySymbol : "₹"}
          type="number"
          step="any"
          value={item.isRegret ? "" : (displayRate === 0 ? "" : Math.round(displayRate * 100) / 100)}
          onChange={(e) => {
            const val = parseFloat(e.target.value) || 0;
            onUpdate(item.id, { rate: Math.round(val * 100) / 100 });
          }}
          disabled={item.isRegret}
          placeholder={item.isRegret ? "REGRET" : "0.00"}
          error={errors.rate}
        />
        {!item.isRegret && lastQuoted && item.rate !== lastQuoted.rate && (
          <button 
            onClick={() => onUpdate(item.id, { rate: lastQuoted.rate })}
            className={`flex items-center gap-1 mt-1.5 ml-1 text-[10px] font-bold transition-colors ${isCustomerSpecific ? 'text-blue-600 hover:text-blue-800' : 'text-brand-600 hover:text-brand-800'}`}
          >
            <History className="h-3 w-3" />
            {isCustomerSpecific ? "Client Last: " : "Last: "}
            {isExport ? currencySymbol : "₹"}{lastQuoted.rate.toFixed(2)}
          </button>
        )}
      </div>
      {!isQuotation && !isExport && (
        <div className="col-span-3 md:col-span-1">
          <label className="block text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">Tax %</label>
          <select
            className="w-full px-3 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all duration-200 disabled:bg-zinc-50 disabled:text-zinc-400"
            value={item.taxRate ?? 0}
            onChange={(e) => onUpdate(item.id, { taxRate: parseInt(e.target.value) })}
            disabled={item.isRegret}
          >
            {TAX_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}%
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={(isQuotation || isExport) ? "col-span-5 md:col-span-2 text-right" : "col-span-3 md:col-span-1 text-right"}>
        <p className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest mb-1.5">Total</p>
        <p className={`text-sm font-black h-11 flex items-center justify-end ${item.isRegret ? 'text-red-600' : 'text-zinc-900'}`}>
          {item.isRegret ? (
            "REGRET"
          ) : (
            <>
              {isExport ? currencySymbol : "₹"}
              {displayTotal.toLocaleString(isExport ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </>
          )}
        </p>
      </div>
      <div className="col-span-12 md:col-span-1 flex justify-end md:pt-7 border-t md:border-t-0 border-zinc-50 pt-2 mt-2 md:mt-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onRemove(item.id)} 
          className="text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl md:opacity-0 group-hover/row:opacity-100 transition-opacity w-full md:w-auto justify-center"
        >
          <Trash2 className="h-4 w-4 mr-2 md:mr-0" />
          <span className="md:hidden font-bold text-xs uppercase tracking-widest">Remove Item</span>
        </Button>
      </div>
    </div>
  );
};
