import React from "react";
import { 
  Package, 
  Percent, 
  MapPin, 
  Calendar, 
  Truck, 
  FileText, 
  CheckSquare, 
  DollarSign, 
  Eye, 
  EyeOff,
  Globe
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";
import { DocumentType } from "../types";
import { DOCUMENT_TYPE_OPTIONS } from "../constants";
import { HistoryAutocompleteInput } from "./HistoryAutocompleteInput";

interface DocumentReferenceDetailsProps {
  docType: DocumentType;
  setDocType: (type: DocumentType) => void;
  docId: string;
  setDocId: (val: string) => void;
  date: string;
  setDate: (val: string) => void;
  
  // Tax & Export Controls
  isExport: boolean;
  setIsExport: (val: boolean) => void;
  applyTax: boolean;
  setApplyTax: (val: boolean) => void;
  applyIgst: boolean;
  setApplyIgst: (val: boolean) => void;
  
  // Reference & Payment Fields
  modeOfPayment: string;
  setModeOfPayment: (val: string) => void;
  poNumber: string;
  setPoNumber: (val: string) => void;
  poDate: string;
  setPoDate: (val: string) => void;
  validUntilDate: string;
  setValidUntilDate: (val: string) => void;
  
  // Payment Terms Duration
  paymentTermsDays: number;
  setPaymentTermsDays: (val: number) => void;
  paymentTermsUnit: "Days" | "Months" | "Years";
  setPaymentTermsUnit: (val: "Days" | "Months" | "Years") => void;
  paymentTermsCustom: string;
  setPaymentTermsCustom: (val: string) => void;
  calculatedDueDate: string;
  
  // Dispatch & Transport
  despatchedThrough: string;
  setDespatchedThrough: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
  noOfPackages: string;
  setNoOfPackages: (val: string) => void;
  dispatchRef: string;
  setDispatchRef: (val: string) => void;
  transportationReason: string;
  setTransportationReason: (val: string) => void;
  showChallanPrices: boolean;
  setShowChallanPrices: (val: boolean) => void;
  advancePercentage: number;
  setAdvancePercentage: (val: number) => void;

  // Consignee Details (Ship To)
  consigneeName: string;
  setConsigneeName: (val: string) => void;
  consigneeGstin: string;
  setConsigneeGstin: (val: string) => void;
  consigneeAddress: string;
  setConsigneeAddress: (val: string) => void;
}

export const DocumentReferenceDetails: React.FC<DocumentReferenceDetailsProps> = ({
  docType,
  setDocType,
  docId,
  setDocId,
  date,
  setDate,
  isExport,
  setIsExport,
  applyTax,
  setApplyTax,
  applyIgst,
  setApplyIgst,
  modeOfPayment,
  setModeOfPayment,
  poNumber,
  setPoNumber,
  poDate,
  setPoDate,
  validUntilDate,
  setValidUntilDate,
  paymentTermsDays,
  setPaymentTermsDays,
  paymentTermsUnit,
  setPaymentTermsUnit,
  paymentTermsCustom,
  setPaymentTermsCustom,
  calculatedDueDate,
  despatchedThrough,
  setDespatchedThrough,
  destination,
  setDestination,
  noOfPackages,
  setNoOfPackages,
  dispatchRef,
  setDispatchRef,
  transportationReason,
  setTransportationReason,
  showChallanPrices,
  setShowChallanPrices,
  advancePercentage,
  setAdvancePercentage,
  consigneeName,
  setConsigneeName,
  consigneeGstin,
  setConsigneeGstin,
  consigneeAddress,
  setConsigneeAddress,
}) => {
  const isTaxInvoice = docType === DocumentType.TAX_INVOICE;
  const isPurchaseOrder = docType === DocumentType.PURCHASE_ORDER;
  const isChallan = docType === DocumentType.DELIVERY_CHALLAN;
  const isProforma = docType === DocumentType.PROFORMA_INVOICE;
  const isQuotation = docType === DocumentType.QUOTATION;
  const isPackingList = docType === DocumentType.PACKING_LIST;

  return (
    <Card className="border-zinc-200 shadow-sm overflow-hidden">
      <CardHeader 
        title="Document & Reference Details" 
        subtitle="Configure document type, export status, number, dates, and references"
      />
      <CardContent className="space-y-6">
        {/* Top Control Bar */}
        <div className="bg-zinc-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsExport(!isExport)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors border ${
                isExport
                  ? "bg-brand-600 text-white border-brand-500 shadow-sm"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              <input
                type="checkbox"
                checked={isExport}
                onChange={(e) => setIsExport(e.target.checked)}
                className="rounded accent-white h-3.5 w-3.5 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <Globe className="h-4 w-4" />
              <span>Export Document</span>
            </button>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <label className="flex items-center gap-2 cursor-pointer hover:text-brand-300 transition-colors">
              <input
                type="checkbox"
                checked={applyTax}
                onChange={(e) => setApplyTax(e.target.checked)}
                className="rounded accent-brand-500 h-4 w-4"
              />
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" /> Apply Tax (GST)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-brand-300 transition-colors">
              <input
                type="checkbox"
                checked={applyIgst}
                onChange={(e) => setApplyIgst(e.target.checked)}
                className="rounded accent-brand-500 h-4 w-4"
              />
              <span>Apply IGST (Inter-State)</span>
            </label>
          </div>
        </div>

        {/* Dynamic Fields Grid */}
        <div className="space-y-4">
          {/* Row 1: Document Type, ID, Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                DOCUMENT TYPE
              </label>
              <select
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all cursor-pointer"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                {isQuotation ? "QUOTATION NUMBER" : "DOCUMENT / INVOICE NUMBER"}
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all"
                value={docId ?? ""}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="e.g. AF&FPL/INV/002"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                {isQuotation ? "QUOTATION DATE" : "DOCUMENT DATE"}
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all cursor-pointer"
                value={date ?? ""}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Delivery Challan Specific Row 2 */}
          {isChallan && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HistoryAutocompleteInput
                label="NUMBER OF PACKAGES / BUNDLES"
                value={noOfPackages}
                onChange={setNoOfPackages}
                placeholder="e.g. 5 Boxes / 2 Wooden Crates"
                historyKey="no_of_packages"
                defaultOptions={["5 Boxes", "2 Wooden Crates", "10 Cartons", "1 Pallet", "Loose"]}
              />
              <HistoryAutocompleteInput
                label="DISPATCH REF / WAYBILL / LR NO."
                value={dispatchRef}
                onChange={setDispatchRef}
                placeholder="e.g. LR-987654 / WB-102"
                historyKey="dispatch_ref"
                defaultOptions={["LR-987654", "WB-102", "WAYBILL-001"]}
              />
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  REASON FOR TRANSPORTATION
                </label>
                <select
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all"
                  value={transportationReason}
                  onChange={(e) => setTransportationReason(e.target.value)}
                >
                  <option value="Supply">Supply</option>
                  <option value="Job Work">Job Work</option>
                  <option value="Exhibition">Exhibition</option>
                  <option value="Export">Export</option>
                  <option value="Removal for repair">Removal for repair</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Quotation Specific Row 2 */}
          {isQuotation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  VALID UNTIL / EXPIRY DATE
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all"
                  value={validUntilDate ?? ""}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                />
              </div>

              {/* Payment terms selector */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  PAYMENT TERMS
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    className="w-24 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    value={paymentTermsDays ?? 0}
                    onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 0)}
                    placeholder="30"
                  />
                  <select
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    value={paymentTermsUnit}
                    onChange={(e) => setPaymentTermsUnit(e.target.value as "Days" | "Months" | "Years")}
                  >
                    <option value="Days">Days</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tax Invoice / Proforma / Purchase Order / Delivery Challan / Packing List Rows */}
          {!isQuotation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Mode of Payment (Tax Invoice, Proforma, Purchase Order) */}
              {(isTaxInvoice || isProforma || isPurchaseOrder) && (
                <HistoryAutocompleteInput
                  label="MODE OF PAYMENT"
                  value={modeOfPayment}
                  onChange={setModeOfPayment}
                  placeholder="e.g. Bank Transfer / NEFT / RTGS / UPI / Cash"
                  historyKey="mode_of_payment"
                  defaultOptions={[
                    "Bank Transfer / NEFT / RTGS",
                    "UPI / GPay / PhonePe",
                    "Cash",
                    "Cheque",
                    "Credit Card / Debit Card",
                    "Letter of Credit (LC)",
                  ]}
                />
              )}

              {/* Buyer's Ref / P.O. Number */}
              <HistoryAutocompleteInput
                label="BUYER'S REF / P.O. NUMBER"
                value={poNumber}
                onChange={setPoNumber}
                placeholder="e.g. GTI-01 dt. 1-Jul-2017"
                historyKey="po_number"
                defaultOptions={["PO-1001", "GTI-01 dt. 1-Jul-2017", "VERBAL CONFIRMATION"]}
              />

              {/* Buyer's Order Date */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  BUYER'S ORDER DATE
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all cursor-pointer"
                  value={poDate ?? ""}
                  onChange={(e) => setPoDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Transport / Payment Terms / Destination Row for Invoices & Challan */}
          {(isTaxInvoice || isProforma || isPurchaseOrder || isChallan) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Payment terms */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    PAYMENT TERMS
                  </label>
                  {calculatedDueDate && (
                    <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Due: {calculatedDueDate}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    className="w-24 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    value={paymentTermsDays ?? 0}
                    onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 0)}
                    placeholder="30"
                  />
                  <select
                    className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    value={paymentTermsUnit}
                    onChange={(e) => setPaymentTermsUnit(e.target.value as "Days" | "Months" | "Years")}
                  >
                    <option value="Days">Days</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                  </select>
                </div>
              </div>

              {/* Despatched Through / Vehicle */}
              <HistoryAutocompleteInput
                label="DESPATCHED THROUGH / VEHICLE / TRANSPORT"
                value={despatchedThrough}
                onChange={setDespatchedThrough}
                placeholder="e.g. By Road / MH-04-AB-1234 / VRL Logistics"
                historyKey="despatched_through"
                defaultOptions={[
                  "By Road / Transport",
                  "MH-04-AB-1234",
                  "VRL Logistics",
                  "By Air Cargo",
                  "By Courier",
                  "Hand Delivery",
                ]}
              />

              {/* Destination / Final Destination */}
              <HistoryAutocompleteInput
                label="DESTINATION / FINAL DESTINATION"
                value={destination}
                onChange={setDestination}
                placeholder="e.g. Delhi, Code : 07"
                historyKey="destination"
                defaultOptions={[
                  "Delhi, Code : 07",
                  "Mumbai, Code : 27",
                  "Bangalore, Code : 29",
                  "Ahmedabad, Code : 24",
                  "Hyderabad, Code : 36",
                ]}
              />
            </div>
          )}

          {/* Proforma Advance (%) Row */}
          {isProforma && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  ADVANCE (%)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900/5"
                    value={advancePercentage ?? 0}
                    onChange={(e) => setAdvancePercentage(parseFloat(e.target.value) || 0)}
                  />
                  <Percent className="absolute right-3 h-4 w-4 text-zinc-400" />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Challan Hide/Show Prices Toggle */}
          {isChallan && (
            <div className="bg-brand-50/60 border border-brand-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center text-brand-700">
                  {showChallanPrices ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-zinc-900">
                    Show Item Prices & Amounts in Delivery Challan
                  </p>
                  <p className="text-xs text-zinc-500 font-medium">
                    When turned off, unit rates, taxes, subtotal, and total prices are hidden on the Delivery Challan document.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showChallanPrices}
                  onChange={(e) => setShowChallanPrices(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
          )}
        </div>

        {/* Consignee Details Sub-Section (SHIP TO) */}
        <div className="pt-6 border-t border-zinc-100">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-zinc-500" />
            <h4 className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider">
              CONSIGNEE DETAILS (SHIP TO)
            </h4>
            <span className="text-[10px] text-zinc-400 font-medium italic">
              (Fill if different from Customer / Billed To details)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <HistoryAutocompleteInput
              label="CONSIGNEE NAME"
              value={consigneeName}
              onChange={setConsigneeName}
              placeholder="e.g. Acme Warehousing Ltd"
              historyKey="consignee_name"
              defaultOptions={["Acme Warehousing Ltd", "Apex Logistics Hub", "Central Depot"]}
            />
            <HistoryAutocompleteInput
              label="CONSIGNEE GSTIN"
              value={consigneeGstin}
              onChange={setConsigneeGstin}
              placeholder="e.g. 27AAAAA0000A1Z5"
              historyKey="consignee_gstin"
            />
            <HistoryAutocompleteInput
              label="CONSIGNEE ADDRESS"
              type="textarea"
              rows={1}
              value={consigneeAddress}
              onChange={setConsigneeAddress}
              placeholder="e.g. Plot 12, Industrial Area, Sector 5, Pune - 411026"
              historyKey="consignee_address"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
