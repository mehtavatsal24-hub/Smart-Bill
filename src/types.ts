export enum DocumentType {
  TAX_INVOICE = "Tax Invoice",
  DELIVERY_CHALLAN = "Delivery Challan",
  PROFORMA_INVOICE = "Proforma Invoice",
  QUOTATION = "Quotation",
  PURCHASE_ORDER = "Purchase Order",
  PACKING_LIST = "Packing List",
}

export interface BusinessDetails {
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  industry?: string;
  logo?: string; // base64
  letterhead?: string; // base64
  signature?: string; // base64
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankBranchSwift?: string;
  enabledBankDocTypes?: string[];
  printMode?: "plain" | "preprinted";
  layoutSettings?: PDFLayoutSettings;
}

export type PDFSection = 
  | "header" 
  | "party_details" 
  | "items_table" 
  | "totals" 
  | "bank_details" 
  | "terms" 
  | "signature";

export type PDFTemplate = "classic" | "modern" | "minimal";

export interface PDFLayoutSettings {
  template: PDFTemplate;
  sectionOrder: PDFSection[];
  accentColor?: string;
  fontFamily?: string;
  headerHeight?: number; // in mm
  footerHeight?: number; // in mm
}

export interface CustomerDetails {
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  contactPerson?: string;
}

export interface SavedCustomer extends CustomerDetails {
  id: string;
  isExport?: boolean;
  currency?: string;
}

export interface SavedSupplier extends CustomerDetails {
  id: string;
  isExport?: boolean;
  currency?: string;
}

export interface DocumentHistoryItem {
  id: string;
  timestamp: number;
  type: DocumentType;
  date: string;
  customerName: string;
  total: number;
  inrTotal?: number;
  currency?: string;
  editCount?: number;
  fullData?: InvoiceData;
}

export interface LineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  unit?: string;
  rate: number;
  taxRate: number; // percentage
  isRegret?: boolean;
  heatNo?: string;
  qtyPacked?: number;
  remarks?: string;
  boxNo?: string;
}

export type ChargeType = "inclusive" | "extra" | "none";
export type ChargeTaxTiming = "before_tax" | "after_tax";

export interface InvoiceData {
  id: string;
  type: DocumentType;
  date: string;
  dueDate: string;
  business: BusinessDetails;
  customer: CustomerDetails;
  items: LineItem[];
  notes: string;
  terms: string;
  termsList?: string[];
  showNotes?: boolean;
  showTerms?: boolean;
  transport?: string;
  poNumber?: string;
  poDate?: string;
  validUntilDate?: string;
  modeOfPayment?: string;
  paymentTermsDays?: number;
  paymentTermsUnit?: "Days" | "Months" | "Years";
  paymentTermsCustom?: string;
  despatchedThrough?: string;
  destination?: string;
  noOfPackages?: string;
  dispatchRef?: string;
  transportationReason?: string;
  showChallanPrices?: boolean;
  advancePercentage?: number;
  applyTax?: boolean;
  applyIgst?: boolean;
  consigneeName?: string;
  consigneeGstin?: string;
  consigneeAddress?: string;

  // Shipping & Logistics Information
  preCarriageBy?: string;
  placeOfReceipt?: string;
  vehicleNo?: string;
  finalDestination?: string;
  buyerClientDetails?: string;

  // Freight & Packaging Charges
  freightType?: ChargeType;
  freightAmount?: number;
  freightTaxTiming?: ChargeTaxTiming;
  freightTaxRate?: number;

  packagingType?: ChargeType;
  packagingAmount?: number;
  packagingTaxTiming?: ChargeTaxTiming;
  packagingTaxRate?: number;

  isExport?: boolean;
  currency?: string;
  exchangeRate?: number;
  discount?: number;
  discountRate?: number;
  layoutSettings?: PDFLayoutSettings;
}

export interface AIProductSuggestion {
  name: string;
  category: string;
  hsn: string;
  suggestedTaxRate: number;
  quantity?: number;
  rate?: number;
  unit?: string;
}

export interface AIDocumentAnalysis {
  products: AIProductSuggestion[];
  customer?: Partial<CustomerDetails>;
}

export interface PriceHistoryItem {
  description: string;
  rate: number;
  date: string;
  customerName: string;
}

export interface RememberedNotes {
  notes: string;
  terms: string;
}

export interface LastUsedNotesAndTerms {
  customer: {
    standard: RememberedNotes;
    export: RememberedNotes;
  };
  supplier: {
    standard: RememberedNotes;
    export: RememberedNotes;
  };
}
