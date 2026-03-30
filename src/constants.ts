import { DocumentType } from "./types";

export const DEFAULT_TERMS = "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within due date.\n3. Subject to local jurisdiction.";

export const DOCUMENT_TYPE_OPTIONS = Object.values(DocumentType);

export const TAX_RATES = [0, 5, 12, 18, 28];

export const UNITS = [
  "NOS",
  "KGS",
  "TONS",
  "MTR",
  "SQM",
  "SQF",
  "PCS",
  "SET",
  "BOX",
  "PKT",
  "LTR",
  "BAG",
  "DRM",
  "ROL",
  "CAN",
  "HRS",
  "DAY",
  "JOB",
  "SRV"
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  "INR": "₹",
  "USD": "$",
  "EUR": "€",
  "GBP": "£",
  "AED": "د.إ",
  "SAR": "﷼",
  "JPY": "¥",
  "SGD": "S$",
  "AUD": "A$",
  "CAD": "C$",
  "CNY": "¥"
};

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const OWNER_EMAIL = "mehtavatsal24@gmail.com";
