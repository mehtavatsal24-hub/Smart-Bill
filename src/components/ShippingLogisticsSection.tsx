import React from "react";
import { Truck } from "lucide-react";
import { Card, CardContent } from "./Card";
import { HistoryAutocompleteInput } from "./HistoryAutocompleteInput";
import { DocumentType } from "../types";

interface ShippingLogisticsSectionProps {
  docType?: DocumentType;
  preCarriageBy: string;
  setPreCarriageBy: (val: string) => void;
  placeOfReceipt: string;
  setPlaceOfReceipt: (val: string) => void;
  vehicleNo: string;
  setVehicleNo: (val: string) => void;
  finalDestination: string;
  setFinalDestination: (val: string) => void;
  poDate?: string;
  setPoDate?: (val: string) => void;
  buyerClientDetails: string;
  setBuyerClientDetails: (val: string) => void;
  despatchedThrough?: string;
  setDespatchedThrough?: (val: string) => void;
  destination?: string;
  setDestination?: (val: string) => void;
  noOfPackages?: string;
  setNoOfPackages?: (val: string) => void;
  dispatchRef?: string;
  setDispatchRef?: (val: string) => void;
  transportationReason?: string;
  setTransportationReason?: (val: string) => void;
}

export const ShippingLogisticsSection: React.FC<ShippingLogisticsSectionProps> = ({
  docType,
  preCarriageBy,
  setPreCarriageBy,
  placeOfReceipt,
  setPlaceOfReceipt,
  vehicleNo,
  setVehicleNo,
  finalDestination,
  setFinalDestination,
  poDate,
  setPoDate,
  buyerClientDetails,
  setBuyerClientDetails,
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
}) => {
  return (
    <Card className="border-zinc-200 shadow-sm overflow-visible">
      <div className="px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-zinc-700" />
          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
            SHIPPING & LOGISTICS INFORMATION
          </h3>
        </div>
      </div>
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HistoryAutocompleteInput
            label="PRE-CARRIAGE BY / DISPATCH MODE"
            value={preCarriageBy}
            onChange={setPreCarriageBy}
            placeholder="e.g. Road / Train / Courier"
            historyKey="pre_carriage_by"
            defaultOptions={["Road", "Train", "Air", "Sea", "Courier", "Hand Delivery"]}
          />
          <HistoryAutocompleteInput
            label="PLACE OF RECEIPT"
            value={placeOfReceipt}
            onChange={setPlaceOfReceipt}
            placeholder="e.g. Factory gate / Warehouse / Mumbai"
            historyKey="place_of_receipt"
            defaultOptions={["Factory Gate", "Warehouse #1", "Mumbai Port", "Delhi ICD"]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HistoryAutocompleteInput
            label="VEHICLE / TRANSPORT NO."
            value={vehicleNo}
            onChange={setVehicleNo}
            placeholder="e.g. MH-12-AB-1234 / Truck"
            historyKey="vehicle_no"
            defaultOptions={["MH-12-AB-1234", "MH-04-CD-5678", "VRL Logistics"]}
          />
          <HistoryAutocompleteInput
            label="FINAL DESTINATION"
            value={finalDestination}
            onChange={setFinalDestination}
            placeholder="e.g. Pune, Maharashtra"
            historyKey="final_destination"
            defaultOptions={["Pune, Maharashtra", "Delhi", "Bangalore, Karnataka", "Ahmedabad"]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <HistoryAutocompleteInput
            label="BUYER / CLIENT DETAILS"
            type="textarea"
            rows={1}
            value={buyerClientDetails}
            onChange={setBuyerClientDetails}
            placeholder="Buyer / Client details if different from default customer address"
            historyKey="buyer_client_details"
          />
        </div>
      </CardContent>
    </Card>
  );
};
