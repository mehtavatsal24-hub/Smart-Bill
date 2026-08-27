export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  taxLabel: string;
  states: string[];
}

export const COUNTRIES_DATA: CountryOption[] = [
  {
    code: "IN",
    name: "India",
    currency: "INR",
    currencySymbol: "₹",
    taxLabel: "GSTIN",
    states: [
      "Maharashtra",
      "Gujarat",
      "Delhi",
      "Karnataka",
      "Tamil Nadu",
      "Uttar Pradesh",
      "Rajasthan",
      "Telangana",
      "West Bengal",
      "Punjab",
      "Haryana",
      "Madhya Pradesh",
      "Kerala",
      "Bihar",
      "Andhra Pradesh",
      "Goa",
      "Assam",
      "Odisha",
      "Jharkhand",
      "Chhattisgarh",
      "Uttarakhand",
      "Himachal Pradesh",
      "Jammu & Kashmir",
      "Chandigarh",
      "Puducherry",
      "Tripura",
      "Meghalaya",
      "Manipur",
      "Nagaland",
      "Goa",
      "Arunachal Pradesh",
      "Sikkim",
      "Mizoram",
      "Ladakh",
      "Dadra and Nagar Haveli and Daman and Diu"
    ]
  },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    taxLabel: "EIN / Tax ID",
    states: [
      "California",
      "Texas",
      "New York",
      "Florida",
      "Illinois",
      "Pennsylvania",
      "Ohio",
      "Georgia",
      "North Carolina",
      "Michigan",
      "New Jersey",
      "Virginia",
      "Washington",
      "Massachusetts",
      "Arizona",
      "Indiana",
      "Tennessee",
      "Missouri",
      "Maryland",
      "Wisconsin",
      "Colorado",
      "Minnesota",
      "South Carolina",
      "Alabama",
      "Louisiana",
      "Kentucky",
      "Oregon",
      "Oklahoma",
      "Connecticut",
      "Utah",
      "Nevada"
    ]
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "AED",
    taxLabel: "TRN (Tax Reg No)",
    states: [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Ajman",
      "Ras Al Khaimah",
      "Fujairah",
      "Umm Al Quwain"
    ]
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    taxLabel: "VAT Reg No",
    states: [
      "England",
      "Scotland",
      "Wales",
      "Northern Ireland",
      "Greater London"
    ]
  },
  {
    code: "CA",
    name: "Canada",
    currency: "CAD",
    currencySymbol: "$",
    taxLabel: "Business Number (GST/HST)",
    states: [
      "Ontario",
      "Quebec",
      "British Columbia",
      "Alberta",
      "Manitoba",
      "Saskatchewan",
      "Nova Scotia",
      "New Brunswick",
      "Newfoundland and Labrador"
    ]
  },
  {
    code: "AU",
    name: "Australia",
    currency: "AUD",
    currencySymbol: "$",
    taxLabel: "ABN / ACN",
    states: [
      "New South Wales",
      "Victoria",
      "Queensland",
      "Western Australia",
      "South Australia",
      "Tasmania",
      "Australian Capital Territory",
      "Northern Territory"
    ]
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "SR",
    taxLabel: "VAT / CR Number",
    states: [
      "Riyadh",
      "Makkah / Jeddah",
      "Eastern Province (Dammam)",
      "Madinah",
      "Asir",
      "Tabuk"
    ]
  },
  {
    code: "SG",
    name: "Singapore",
    currency: "SGD",
    currencySymbol: "$",
    taxLabel: "UEN / GST Reg No",
    states: ["Central Region", "East Region", "North Region", "North-East Region", "West Region"]
  },
  {
    code: "DE",
    name: "Germany",
    currency: "EUR",
    currencySymbol: "€",
    taxLabel: "USt-IdNr (VAT ID)",
    states: ["Bavaria", "Baden-Württemberg", "North Rhine-Westphalia", "Hesse", "Berlin", "Hamburg", "Saxony"]
  },
  {
    code: "FR",
    name: "France",
    currency: "EUR",
    currencySymbol: "€",
    taxLabel: "TVA Intracommunautaire",
    states: ["Île-de-France (Paris)", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", "Occitanie", "Provence-Alpes-Côte d'Azur"]
  },
  {
    code: "IT",
    name: "Italy",
    currency: "EUR",
    currencySymbol: "€",
    taxLabel: "Partita IVA",
    states: ["Lombardy (Milan)", "Lazio (Rome)", "Veneto", "Emilia-Romagna", "Piedmont"]
  },
  {
    code: "ES",
    name: "Spain",
    currency: "EUR",
    currencySymbol: "€",
    taxLabel: "NIF / CIF",
    states: ["Madrid", "Catalonia (Barcelona)", "Andalusia", "Valencia", "Basque Country"]
  },
  {
    code: "NL",
    name: "Netherlands",
    currency: "EUR",
    currencySymbol: "€",
    taxLabel: "BTW-nummer",
    states: ["North Holland (Amsterdam)", "South Holland (Rotterdam)", "Utrecht", "North Brabant"]
  },
  {
    code: "JP",
    name: "Japan",
    currency: "JPY",
    currencySymbol: "¥",
    taxLabel: "Corporate Number / JCT",
    states: ["Tokyo", "Osaka", "Kanagawa", "Aichi", "Saitama", "Hyogo", "Fukuoka", "Hokkaido"]
  },
  {
    code: "CN",
    name: "China",
    currency: "CNY",
    currencySymbol: "¥",
    taxLabel: "Tax Identification Code",
    states: ["Guangdong", "Jiangsu", "Shandong", "Zhejiang", "Henan", "Shanghai", "Beijing"]
  },
  {
    code: "MY",
    name: "Malaysia",
    currency: "MYR",
    currencySymbol: "RM",
    taxLabel: "SST / TIN Number",
    states: ["Selangor", "Kuala Lumpur", "Johor", "Penang", "Perak", "Sabah", "Sarawak"]
  },
  {
    code: "QA",
    name: "Qatar",
    currency: "QAR",
    currencySymbol: "QR",
    taxLabel: "Tax Card / CR Number",
    states: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor"]
  },
  {
    code: "OM",
    name: "Oman",
    currency: "OMR",
    currencySymbol: "OMR",
    taxLabel: "VAT Card Number",
    states: ["Muscat", "Dhofar", "Al Batinah", "Ad Dakhiliyah"]
  },
  {
    code: "KW",
    name: "Kuwait",
    currency: "KWD",
    currencySymbol: "KD",
    taxLabel: "Civil ID / Commercial Reg",
    states: ["Capital (Kuwait City)", "Hawalli", "Farwaniya", "Ahmadi"]
  },
  {
    code: "ZA",
    name: "South Africa",
    currency: "ZAR",
    currencySymbol: "R",
    taxLabel: "VAT Registration Number",
    states: ["Gauteng (Johannesburg)", "Western Cape (Cape Town)", "KwaZulu-Natal (Durban)", "Eastern Cape"]
  },
  {
    code: "TH",
    name: "Thailand",
    currency: "THB",
    currencySymbol: "฿",
    taxLabel: "Tax ID / VAT Registration",
    states: ["Bangkok", "Nonthaburi", "Chiang Mai", "Chonburi (Pattaya)", "Phuket"]
  },
  {
    code: "VN",
    name: "Vietnam",
    currency: "VND",
    currencySymbol: "₫",
    taxLabel: "Tax Code (Mã số thuế)",
    states: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Binh Duong", "Dong Nai"]
  },
  {
    code: "PH",
    name: "Philippines",
    currency: "PHP",
    currencySymbol: "₱",
    taxLabel: "TIN Number",
    states: ["Metro Manila", "Cebu", "Davao", "Calabarzon", "Central Luzon"]
  },
  {
    code: "ID",
    name: "Indonesia",
    currency: "IDR",
    currencySymbol: "Rp",
    taxLabel: "NPWP (Tax ID)",
    states: ["Jakarta", "West Java (Bandung)", "East Java (Surabaya)", "Central Java", "Bali"]
  },
  {
    code: "NZ",
    name: "New Zealand",
    currency: "NZD",
    currencySymbol: "$",
    taxLabel: "GST Number",
    states: ["Auckland", "Wellington", "Canterbury (Christchurch)", "Waikato"]
  },
  {
    code: "SE",
    name: "Sweden",
    currency: "SEK",
    currencySymbol: "kr",
    taxLabel: "Momsregistreringsnummer",
    states: ["Stockholm", "Västra Götaland (Gothenburg)", "Skåne (Malmö)"]
  },
  {
    code: "CH",
    name: "Switzerland",
    currency: "CHF",
    currencySymbol: "CHF",
    taxLabel: "UID / MWST Number",
    states: ["Zurich", "Geneva", "Vaud (Lausanne)", "Bern", "Basel"]
  },
  {
    code: "BR",
    name: "Brazil",
    currency: "BRL",
    currencySymbol: "R$",
    taxLabel: "CNPJ / CPF",
    states: ["São Paulo", "Rio de Janeiro", "Minas Gerais", "Paraná", "Rio Grande do Sul"]
  },
  {
    code: "MX",
    name: "Mexico",
    currency: "MXN",
    currencySymbol: "$",
    taxLabel: "RFC Number",
    states: ["Mexico City", "Jalisco (Guadalajara)", "Nuevo León (Monterrey)", "State of Mexico"]
  }
];

export const INDUSTRY_OPTIONS: string[] = [
  "Flanges, Fittings & Piping Solutions",
  "Steel, Metals & Hardware",
  "Manufacturing & Industrial Machinery",
  "Trading & Wholesale Distribution",
  "Engineering & Construction",
  "Electricals & Electronics",
  "Textiles, Apparel & Garments",
  "Chemicals, Petrochemicals & Polymers",
  "Automotive & Spare Parts",
  "Information Technology & Software",
  "Logistics, Freight & Transport",
  "Agriculture & FMCG Products",
  "Healthcare & Pharmaceuticals",
  "Energy, Power & Solar",
  "Services & Management Consulting",
  "Import, Export & International Trade",
  "Food & Beverages",
  "Printing & Packaging",
  "Plumbing & Sanitaryware",
  "Jewellery & Precious Metals",
  "Real Estate & Building Materials",
  "Education & E-Learning",
  "Other / Custom Industry"
];

export const CURRENCY_LIST = [
  { code: "INR", label: "₹ INR - Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", label: "$ USD - US Dollar ($)", symbol: "$" },
  { code: "AED", label: "AED - UAE Dirham (AED)", symbol: "AED" },
  { code: "GBP", label: "£ GBP - British Pound (£)", symbol: "£" },
  { code: "EUR", label: "€ EUR - Euro (€)", symbol: "€" },
  { code: "CAD", label: "$ CAD - Canadian Dollar ($)", symbol: "$" },
  { code: "AUD", label: "$ AUD - Australian Dollar ($)", symbol: "$" },
  { code: "SAR", label: "SR SAR - Saudi Riyal (SR)", symbol: "SR" },
  { code: "SGD", label: "$ SGD - Singapore Dollar ($)", symbol: "$" },
  { code: "JPY", label: "¥ JPY - Japanese Yen (¥)", symbol: "¥" },
  { code: "CNY", label: "¥ CNY - Chinese Yuan (¥)", symbol: "¥" },
  { code: "QAR", label: "QR QAR - Qatari Riyal (QR)", symbol: "QR" },
  { code: "OMR", label: "OMR - Omani Rial (OMR)", symbol: "OMR" },
  { code: "KWD", label: "KD KWD - Kuwaiti Dinar (KD)", symbol: "KD" },
  { code: "ZAR", label: "R ZAR - South African Rand (R)", symbol: "R" },
  { code: "MYR", label: "RM MYR - Malaysian Ringgit (RM)", symbol: "RM" },
  { code: "THB", label: "฿ THB - Thai Baht (฿)", symbol: "฿" },
  { code: "VND", label: "₫ VND - Vietnamese Dong (₫)", symbol: "₫" },
  { code: "PHP", label: "₱ PHP - Philippine Peso (₱)", symbol: "₱" },
  { code: "IDR", label: "Rp IDR - Indonesian Rupiah (Rp)", symbol: "Rp" },
  { code: "NZD", label: "$ NZD - New Zealand Dollar ($)", symbol: "$" },
  { code: "SEK", label: "kr SEK - Swedish Krona (kr)", symbol: "kr" },
  { code: "CHF", label: "CHF - Swiss Franc (CHF)", symbol: "CHF" },
  { code: "BRL", label: "R$ BRL - Brazilian Real (R$)", symbol: "R$" },
  { code: "MXN", label: "$ MXN - Mexican Peso ($)", symbol: "$" },
];
