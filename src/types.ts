export enum DocumentType {
  TAX_INVOICE = "Tax Invoice",
  DELIVERY_CHALLAN = "Delivery Challan",
  PROFORMA_INVOICE = "Proforma Invoice",
  QUOTATION = "Quotation",
  PURCHASE_ORDER = "Purchase Order",
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
}

export interface SavedSupplier extends CustomerDetails {
  id: string;
}

export interface DocumentHistoryItem {
  id: string;
  timestamp: number;
  type: DocumentType;
  date: string;
  customerName: string;
  total: number;
  currency?: string;
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
}

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
  transport?: string;
  poNumber?: string;
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
