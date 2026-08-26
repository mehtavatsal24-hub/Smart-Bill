import React from "react";
import { Truck, Package } from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";
import { ChargeType, ChargeTaxTiming } from "../types";

interface FreightPackagingSectionProps {
  freightType: ChargeType;
  setFreightType: (val: ChargeType) => void;
  freightAmount: number;
  setFreightAmount: (val: number) => void;
  freightTaxTiming: ChargeTaxTiming;
  setFreightTaxTiming: (val: ChargeTaxTiming) => void;
  freightTaxRate: number;
  setFreightTaxRate: (val: number) => void;

  packagingType: ChargeType;
  setPackagingType: (val: ChargeType) => void;
  packagingAmount: number;
  setPackagingAmount: (val: number) => void;
  packagingTaxTiming: ChargeTaxTiming;
  setPackagingTaxTiming: (val: ChargeTaxTiming) => void;
  packagingTaxRate: number;
  setPackagingTaxRate: (val: number) => void;
}

export const FreightPackagingSection: React.FC<FreightPackagingSectionProps> = ({
  freightType,
  setFreightType,
  freightAmount,
  setFreightAmount,
  freightTaxTiming,
  setFreightTaxTiming,
  freightTaxRate,
  setFreightTaxRate,
  packagingType,
  setPackagingType,
  packagingAmount,
  setPackagingAmount,
  packagingTaxTiming,
  setPackagingTaxTiming,
  packagingTaxRate,
  setPackagingTaxRate,
}) => {
  return (
    <Card className="border-zinc-200 shadow-sm overflow-visible">
      <CardHeader
        title="Freight & Packaging Charges"
        subtitle="Configure freight, forwarding, and extra taxable/non-taxable charges"
      />
      <CardContent className="space-y-4">
        {/* Row 1: Freight Charge */}
        <div className="bg-zinc-50/70 border border-zinc-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-[200px]">
            <Truck className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">
              FREIGHT CHARGE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <select
              className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none shadow-sm cursor-pointer"
              value={freightType}
              onChange={(e) => setFreightType(e.target.value as ChargeType)}
            >
              <option value="none">Not Included</option>
              <option value="inclusive">Inclusive</option>
              <option value="extra">Extra Charge</option>
            </select>

            {freightType === "extra" && (
              <>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-zinc-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-32 pl-7 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none shadow-sm"
                    value={freightAmount || 0}
                    onChange={(e) => setFreightAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <select
                  className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none shadow-sm cursor-pointer"
                  value={freightTaxTiming}
                  onChange={(e) => setFreightTaxTiming(e.target.value as ChargeTaxTiming)}
                >
                  <option value="before_tax">Add Before Tax (Taxable)</option>
                  <option value="after_tax">Add After Tax (Non-Taxable)</option>
                </select>

                {freightTaxTiming === "before_tax" && (
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-24 pl-3 pr-7 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none shadow-sm"
                      value={freightTaxRate || 0}
                      onChange={(e) => setFreightTaxRate(parseFloat(e.target.value) || 0)}
                      placeholder="Tax %"
                    />
                    <span className="absolute right-3 text-xs font-bold text-zinc-400">%</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 2: Packaging & Forwarding */}
        <div className="bg-zinc-50/70 border border-zinc-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-[200px]">
            <Package className="h-4 w-4 text-zinc-500" />
            <span className="text-xs font-black text-zinc-800 uppercase tracking-wider">
              PACKAGING & FORWARDING
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <select
              className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none shadow-sm cursor-pointer"
              value={packagingType}
              onChange={(e) => setPackagingType(e.target.value as ChargeType)}
            >
              <option value="none">Not Included</option>
              <option value="inclusive">Inclusive</option>
              <option value="extra">Extra Charge</option>
            </select>

            {packagingType === "extra" && (
              <>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-zinc-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-32 pl-7 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none shadow-sm"
                    value={packagingAmount || 0}
                    onChange={(e) => setPackagingAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <select
                  className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none shadow-sm cursor-pointer"
                  value={packagingTaxTiming}
                  onChange={(e) => setPackagingTaxTiming(e.target.value as ChargeTaxTiming)}
                >
                  <option value="before_tax">Add Before Tax (Taxable)</option>
                  <option value="after_tax">Add After Tax (Non-Taxable)</option>
                </select>

                {packagingTaxTiming === "before_tax" && (
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-24 pl-3 pr-7 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none shadow-sm"
                      value={packagingTaxRate || 0}
                      onChange={(e) => setPackagingTaxRate(parseFloat(e.target.value) || 0)}
                      placeholder="Tax %"
                    />
                    <span className="absolute right-3 text-xs font-bold text-zinc-400">%</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
