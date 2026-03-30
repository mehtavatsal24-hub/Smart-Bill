/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Plus, 
  FileText, 
  Settings, 
  Download, 
  Building2, 
  Package, 
  ChevronRight,
  History,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Users,
  Truck,
  Trash2,
  Clock,
  Zap,
  Bot,
  Shield,
  Scale,
  Loader2,
  LogIn,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import JSZip from "jszip";
import { 
  BusinessDetails, 
  CustomerDetails, 
  LineItem, 
  DocumentType, 
  InvoiceData,
  SavedCustomer,
  SavedSupplier,
  DocumentHistoryItem,
  PriceHistoryItem,
  AIDocumentAnalysis,
  PDFLayoutSettings,
  LastUsedNotesAndTerms
} from "./types";
import { validateGSTIN, validateEmail, validatePhone, validateRequired } from "./lib/validation";
import { DEFAULT_TERMS, DOCUMENT_TYPE_OPTIONS, CURRENCY_SYMBOLS, OWNER_EMAIL } from "./constants";
import { Input } from "./components/Input";
import { Button } from "./components/Button";
import { Card, CardHeader, CardContent } from "./components/Card";
import { LineItemRow } from "./components/LineItemRow";
import { VoiceInput } from "./components/VoiceInput";
import { DocumentUpload } from "./components/DocumentUpload";
import { CustomerSelector } from "./components/CustomerSelector";
import { Dashboard } from "./components/Dashboard";
import { PartyList } from "./components/PartyList";
import { generateInvoicePDF, downloadInvoicePDF } from "./services/pdfService";
import { generateInvoiceNotes, analyzeCustomerPatterns } from "./services/geminiService";
import { HistoryList } from "./components/HistoryList";
import { PDFCustomizer } from "./components/PDFCustomizer";
import { saveToCloud, loadFromCloud } from "./services/dbService";
import { isConfigValid, auth } from "./services/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { Auth } from "./components/Auth";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsAndConditions } from "./components/TermsAndConditions";
import { Modal } from "./components/Modal";

// Helper to sanitize keys for Firebase (no . # $ / [ ])
const sanitizeKey = (key: string) => {
  return key.replace(/[\.#\$\/\[\]]/g, '_');
};

// Helper to compress images before saving to state/localStorage
const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback to original if error
  });
};

// Helper to get user-specific storage keys
const getStorageKey = (key: string, userId?: string | null) => {
  if (userId) return `${userId}_${key}`;
  return `guest_${key}`;
};

export default function App() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // State
  const [step, setStep] = useState<"dashboard" | "invoice" | "customers" | "suppliers" | "profile" | "history" | "privacy" | "terms">("dashboard");
  const [business, setBusiness] = useState<BusinessDetails>({
    name: "",
    gstin: "",
    address: "",
    phone: "",
    email: "",
  });

  const [customer, setCustomer] = useState<CustomerDetails>({
    name: "",
    gstin: "",
    address: "",
    phone: "",
    email: "",
  });

  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([]);
  const [history, setHistory] = useState<DocumentHistoryItem[]>([]);
  const [businessErrors, setBusinessErrors] = useState<Record<string, string | undefined>>({});
  const [customerErrors, setCustomerErrors] = useState<Record<string, string | undefined>>({});
  const [docErrors, setDocErrors] = useState<Record<string, string | undefined>>({});
  const [lastUsedNumbers, setLastUsedNumbers] = useState<Record<string, number>>({});
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [lastExportTimestamp, setLastExportTimestamp] = useState<number>(0);
  const [layoutSettings, setLayoutSettings] = useState<PDFLayoutSettings>({
    template: "classic",
    sectionOrder: ["header", "party_details", "items_table", "totals", "bank_details", "terms", "signature"],
    accentColor: "#1e1e1e",
  });

  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", hsn: "", quantity: 1, unit: "NOS", rate: 0, taxRate: 18 }
  ]);

  const [docType, setDocType] = useState<DocumentType>(DocumentType.TAX_INVOICE);
  const [isExport, setIsExport] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [docId, setDocId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [discountRate, setDiscountRate] = useState(0);
  const [transport, setTransport] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [lastUsedNotesAndTerms, setLastUsedNotesAndTerms] = useState<LastUsedNotesAndTerms>({
    customer: {
      standard: { notes: "", terms: DEFAULT_TERMS },
      export: { notes: "", terms: DEFAULT_TERMS },
    },
    supplier: {
      standard: { notes: "", terms: DEFAULT_TERMS },
      export: { notes: "", terms: DEFAULT_TERMS },
    },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzingPatterns, setIsAnalyzingPatterns] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [suggestedNotes, setSuggestedNotes] = useState<{ notes: string; terms: string } | null>(null);
  const [loadedTimestamp, setLoadedTimestamp] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const hasErrors = useMemo(() => {
    const hasBusinessErrors = Object.values(businessErrors).some(e => e !== undefined);
    const hasCustomerErrors = Object.values(customerErrors).some(e => e !== undefined);
    const hasDocErrors = Object.values(docErrors).some(e => e !== undefined);
    
    // Check items
    const hasItemErrors = items.some(item => {
      if (!item.description) return true;
      if (item.quantity <= 0) return true;
      if (!item.isRegret && item.rate < 0) return true;
      return false;
    });

    return hasBusinessErrors || hasCustomerErrors || hasDocErrors || hasItemErrors;
  }, [businessErrors, customerErrors, docErrors, items]);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'confirm';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showModal = (config: Omit<typeof modalConfig, 'isOpen'>) => {
    setModalConfig({ ...config, isOpen: true });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (customer.name && history.length > 0) {
      const fetchPatterns = async () => {
        setIsAnalyzingPatterns(true);
        const patterns = await analyzeCustomerPatterns(customer.name, history);
        setSuggestedNotes(patterns);
        setIsAnalyzingPatterns(false);
      };
      fetchPatterns();
    } else {
      setSuggestedNotes(null);
    }
  }, [customer.name, history]);

  useEffect(() => {
    // Validate business profile
    setBusinessErrors({
      name: validateRequired(business.name, "Business Name"),
      gstin: validateGSTIN(business.gstin),
      phone: validatePhone(business.phone),
      email: validateEmail(business.email)
    });
  }, [business.name, business.gstin, business.phone, business.email]);

  useEffect(() => {
    // Validate customer details
    setCustomerErrors({
      name: validateRequired(customer.name, "Customer Name"),
      gstin: validateGSTIN(customer.gstin),
      phone: validatePhone(customer.phone),
      email: validateEmail(customer.email)
    });
  }, [customer.name, customer.gstin, customer.phone, customer.email]);

  useEffect(() => {
    // Validate document settings
    setDocErrors({
      docId: validateRequired(docId, "Document Number"),
      discountRate: (discountRate < 0 || discountRate > 100) ? "Discount must be between 0 and 100" : undefined
    });
  }, [docId, discountRate]);

  const getMostCommonNotesAndTerms = useCallback(() => {
    if (history.length === 0) return { notes: "", terms: DEFAULT_TERMS };
    
    const notesCount: Record<string, number> = {};
    const termsCount: Record<string, number> = {};
    
    history.forEach(h => {
      if (h.fullData?.notes) {
        notesCount[h.fullData.notes] = (notesCount[h.fullData.notes] || 0) + 1;
      }
      if (h.fullData?.terms) {
        termsCount[h.fullData.terms] = (termsCount[h.fullData.terms] || 0) + 1;
      }
    });
    
    const mostCommonNote = Object.keys(notesCount).reduce((a, b) => notesCount[a] > notesCount[b] ? a : b, "");
    const mostCommonTerms = Object.keys(termsCount).reduce((a, b) => termsCount[a] > termsCount[b] ? a : b, DEFAULT_TERMS);
    
    return { notes: mostCommonNote, terms: mostCommonTerms };
  }, [history]);

  // Safe LocalStorage helper
  const safeSave = (key: string, value: any, userId?: string | null) => {
    const fullKey = getStorageKey(key, userId);
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn(`QuotaExceededError for ${key}, attempting cleanup...`);
        
        // 1. Try to strip images from the current value if it's business_details
        let strippedValue = value;
        if (key === "business_details") {
          const { logo, letterhead, signature, ...rest } = value;
          strippedValue = rest;
        } else if (key === "document_history" && Array.isArray(value)) {
          // Keep only the last 10 items with fullData
          const len = value.length;
          strippedValue = value.map((item, index) => {
            if (index < len - 10) {
              const { fullData, ...rest } = item;
              return rest;
            }
            return item;
          });
        }

        try {
          if (strippedValue !== value) {
            localStorage.setItem(fullKey, JSON.stringify(strippedValue));
            console.warn(`Saved stripped version of ${key} due to quota limits.`);
            return;
          }
        } catch (innerError) {
          console.error("Failed to save even stripped version, clearing old history...");
        }

        // 2. If it still fails, try to clear OLD history items from localStorage for THIS user
        try {
          const historyKey = getStorageKey("document_history", userId);
          const historyData = localStorage.getItem(historyKey);
          if (historyData) {
            const historyArr = JSON.parse(historyData);
            if (Array.isArray(historyArr) && historyArr.length > 5) {
              // Keep only the last 5 items, and strip fullData from them too
              const newHistory = historyArr.slice(-5).map(item => {
                const { fullData, ...rest } = item;
                return rest;
              });
              localStorage.setItem(historyKey, JSON.stringify(newHistory));
              console.warn("Cleared old history to free up space.");
              
              // Try saving the original (or stripped) value again
              localStorage.setItem(fullKey, JSON.stringify(strippedValue));
              return;
            }
          }
        } catch (historyError) {
          console.error("Failed to clear history:", historyError);
        }

        showModal({
          title: "Storage Full",
          message: "Your browser's local storage is full. Some data might not be saved locally, but it will still be synced to the cloud if you're logged in.",
          type: "warning"
        });
      } else {
        console.error(`Failed to save to localStorage: ${key}`, e);
      }
    }
  };

  // Auth listener
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data isolation: Load user-specific data when user changes
  useEffect(() => {
    if (authLoading) return;

    const userId = user?.uid;
    setIsFirstLoad(true); // Prevent immediate save-back during load
    resetAllState(); // Clear all state before loading new user data

    const loadData = async () => {
      // 1. Load from localStorage as initial state (fallback)
      const businessData = localStorage.getItem(getStorageKey("business_details", userId));
      if (businessData) setBusiness(JSON.parse(businessData));

      const customersData = localStorage.getItem(getStorageKey("saved_customers", userId));
      if (customersData) setSavedCustomers(JSON.parse(customersData));

      const suppliersData = localStorage.getItem(getStorageKey("saved_suppliers", userId));
      if (suppliersData) setSavedSuppliers(JSON.parse(suppliersData));

      const historyData = localStorage.getItem(getStorageKey("document_history", userId));
      if (historyData) setHistory(JSON.parse(historyData));

      const lastUsedData = localStorage.getItem(getStorageKey("last_used_numbers", userId));
      if (lastUsedData) {
        try {
          const data = JSON.parse(lastUsedData);
          const sanitized: Record<string, number> = {};
          Object.entries(data).forEach(([key, val]) => {
            sanitized[sanitizeKey(key)] = val as number;
          });
          setLastUsedNumbers(sanitized);
        } catch (e) {
          setLastUsedNumbers({});
        }
      }

      const priceData = localStorage.getItem(getStorageKey("price_history", userId));
      if (priceData) setPriceHistory(JSON.parse(priceData));

      const lastExportData = localStorage.getItem(getStorageKey("last_export_timestamp", userId));
      if (lastExportData) setLastExportTimestamp(Number(lastExportData));

      const notesData = localStorage.getItem(getStorageKey("last_used_notes_and_terms", userId));
      if (notesData) setLastUsedNotesAndTerms(JSON.parse(notesData));

      const layoutData = localStorage.getItem(getStorageKey("pdf_layout_settings", userId));
      if (layoutData) {
        setLayoutSettings(JSON.parse(layoutData));
      } else {
        setLayoutSettings({
          template: "classic",
          sectionOrder: ["header", "party_details", "items_table", "totals", "bank_details", "terms", "signature"],
          accentColor: "#1e1e1e",
        });
      }

      // 2. If logged in, try to restore from cloud (priority)
      if (user && isConfigValid) {
        setIsCloudLoading(true);
        try {
          const cloudPath = `users/${user.uid}`;
          const cloudData = await loadFromCloud(cloudPath);
          
          if (cloudData) {
            // Overwrite with cloud data if it exists
            if (cloudData.business) {
              setBusiness(cloudData.business);
              localStorage.setItem(getStorageKey("business_details", user.uid), JSON.stringify(cloudData.business));
            }
            if (cloudData.savedCustomers) {
              setSavedCustomers(cloudData.savedCustomers);
              localStorage.setItem(getStorageKey("saved_customers", user.uid), JSON.stringify(cloudData.savedCustomers));
            }
            if (cloudData.savedSuppliers) {
              setSavedSuppliers(cloudData.savedSuppliers);
              localStorage.setItem(getStorageKey("saved_suppliers", user.uid), JSON.stringify(cloudData.savedSuppliers));
            }
            if (cloudData.history) {
              setHistory(cloudData.history);
              localStorage.setItem(getStorageKey("document_history", user.uid), JSON.stringify(cloudData.history));
            }
            if (cloudData.lastUsedNumbers) {
              setLastUsedNumbers(cloudData.lastUsedNumbers);
              localStorage.setItem(getStorageKey("last_used_numbers", user.uid), JSON.stringify(cloudData.lastUsedNumbers));
            }
            if (cloudData.priceHistory) {
              setPriceHistory(cloudData.priceHistory);
              localStorage.setItem(getStorageKey("price_history", user.uid), JSON.stringify(cloudData.priceHistory));
            }
            if (cloudData.pdf_layout_settings) {
              setLayoutSettings(cloudData.pdf_layout_settings);
              localStorage.setItem(getStorageKey("pdf_layout_settings", user.uid), JSON.stringify(cloudData.pdf_layout_settings));
            }
            if (cloudData.last_used_notes_and_terms) {
              setLastUsedNotesAndTerms(cloudData.last_used_notes_and_terms);
              localStorage.setItem(getStorageKey("last_used_notes_and_terms", user.uid), JSON.stringify(cloudData.last_used_notes_and_terms));
            }
          }
        } catch (error) {
          console.error("Cloud restore error:", error);
        } finally {
          setIsCloudLoading(false);
        }
      }

      // 3. Mark load as complete
      setIsFirstLoad(false);
    };

    loadData();
  }, [user, authLoading]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      resetAllState();
      setStep("dashboard");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Generate or get Sync ID
  const syncId = useMemo(() => {
    if (user) return user.uid;
    let id = localStorage.getItem(getStorageKey("sync_id", null));
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(getStorageKey("sync_id", null), id);
    }
    return id;
  }, [user]);

  const syncToCloudData = async () => {
    if (!syncId) return;
    setSyncStatus("syncing");
    try {
      // Sanitize lastUsedNumbers keys before syncing
      const sanitizedLastUsed: Record<string, number> = {};
      Object.entries(lastUsedNumbers).forEach(([key, val]) => {
        sanitizedLastUsed[sanitizeKey(key)] = val;
      });

      const data = {
        business,
        savedCustomers,
        savedSuppliers,
        history,
        lastUsedNumbers: sanitizedLastUsed,
        priceHistory,
        pdf_layout_settings: layoutSettings,
        last_used_notes_and_terms: lastUsedNotesAndTerms,
        updatedAt: new Date().toISOString()
      };
      
      // Save to user's private path
      await saveToCloud(`users/${syncId}`, data);
      
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    } catch (error) {
      console.error("Sync Error:", error);
      setSyncStatus("error");
    }
  };

  const restoreFromCloud = async () => {
    if (!syncId) return;
    
    showModal({
      title: "Restore from Cloud",
      message: "This will overwrite your local data with cloud data. Continue?",
      type: "confirm",
      onConfirm: async () => {
        closeModal();
        setSyncStatus("syncing");
        try {
          const data = await loadFromCloud(`users/${syncId}`);
          if (data) {
            if (data.business) setBusiness(data.business);
            if (data.savedCustomers) setSavedCustomers(data.savedCustomers);
            if (data.savedSuppliers) setSavedSuppliers(data.savedSuppliers);
            if (data.history) setHistory(data.history);
            if (data.lastUsedNumbers) setLastUsedNumbers(data.lastUsedNumbers);
            if (data.priceHistory) setPriceHistory(data.priceHistory);
            if (data.pdf_layout_settings) setLayoutSettings(data.pdf_layout_settings);
            if (data.last_used_notes_and_terms) setLastUsedNotesAndTerms(data.last_used_notes_and_terms);
            
            // Update localStorage too
            safeSave("business_details", data.business, user?.uid);
            safeSave("saved_customers", data.savedCustomers, user?.uid);
            safeSave("saved_suppliers", data.savedSuppliers, user?.uid);
            safeSave("document_history", data.history, user?.uid);
            safeSave("last_used_numbers", data.lastUsedNumbers, user?.uid);
            safeSave("price_history", data.priceHistory, user?.uid);
            safeSave("pdf_layout_settings", data.pdf_layout_settings, user?.uid);
            safeSave("last_used_notes_and_terms", data.last_used_notes_and_terms, user?.uid);
            
            setSyncStatus("success");
            showModal({
              title: "Success",
              message: "Data restored successfully!",
              type: "success"
            });
          } else {
            showModal({
              title: "No Data",
              message: "No data found in cloud for this ID.",
              type: "info"
            });
          }
          setTimeout(() => setSyncStatus("idle"), 3000);
        } catch (error) {
          console.error("Restore Error:", error);
          setSyncStatus("error");
          showModal({
            title: "Error",
            message: "Failed to restore data. Check your Firebase configuration.",
            type: "warning"
          });
        }
      }
    });
  };

  // Auto-sync logic
  useEffect(() => {
    if (isFirstLoad || isCloudLoading || !user || !isConfigValid) return;

    const timeoutId = setTimeout(() => {
      syncToCloudData();
    }, 3000); // Sync after 3 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [business, savedCustomers, savedSuppliers, history, lastUsedNumbers, priceHistory, layoutSettings, lastUsedNotesAndTerms, user, isConfigValid, isFirstLoad, isCloudLoading]);

  // Auto-restore logic on login is now integrated into the main user-change effect

  const resetSyncKeys = () => {
    showModal({
      title: "Reset Sync Keys",
      message: "This will reset your invoice numbering counters to fix sync errors. Your invoices will NOT be deleted. Continue?",
      type: "confirm",
      onConfirm: () => {
        setLastUsedNumbers({});
        localStorage.removeItem(getStorageKey("last_used_numbers", user?.uid));
        showModal({
          title: "Success",
          message: "Sync keys reset successfully. Please try syncing again.",
          type: "success"
        });
      }
    });
  };

  // Set isFirstLoad to false on mount is now handled by the user-change effect
  const getShortForm = (name: string) => {
    if (!name) return "DOC";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.map(w => w[0]).join('').toUpperCase();
  };

  // Helper for next number
  const getNextNumber = (type: DocumentType, bizName: string) => {
    const prefix = getShortForm(bizName);
    const typeCode = type === DocumentType.TAX_INVOICE ? "INV" : 
                    type === DocumentType.QUOTATION ? "QT" : 
                    type === DocumentType.PURCHASE_ORDER ? "PO" : "DC";
    
    const fullPrefix = `${prefix}/${typeCode}/`;
    const safeKey = sanitizeKey(fullPrefix);
    
    // Get max from history
    const historyNumbers = history
      .filter(h => h.id.startsWith(fullPrefix))
      .map(h => {
        const parts = h.id.split('/');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart) || 0;
      });
    
    const maxInHistory = historyNumbers.length > 0 ? Math.max(...historyNumbers) : 0;
    
    // Get max from lastUsedNumbers
    const maxUsed = lastUsedNumbers[safeKey] || 0;
    
    const nextNum = Math.max(maxInHistory, maxUsed) + 1;
    return nextNum.toString().padStart(3, '0');
  };

  // Auto-generate Doc ID
  useEffect(() => {
    if (!business.name || step !== "invoice") return;

    const prefix = getShortForm(business.name);
    const typeCode = docType === DocumentType.TAX_INVOICE ? "INV" : 
                    docType === DocumentType.QUOTATION ? "QT" : 
                    docType === DocumentType.PURCHASE_ORDER ? "PO" : "DC";
    const currentPrefix = `${prefix}/${typeCode}/`;

    // Only auto-generate if docId is empty OR if it's an auto-generated one for a different type/prefix
    const isAutoGenerated = (id: string) => {
      const parts = id.split('/');
      return parts.length === 3 && ["INV", "QT", "PO", "DC"].includes(parts[1]);
    };

    if (!docId || isAutoGenerated(docId)) {
      if (!docId.startsWith(currentPrefix)) {
        const nextNum = getNextNumber(docType, business.name);
        setDocId(`${currentPrefix}${nextNum}`);
      }
    }
  }, [business.name, docType, step, history, docId]);

  // Exchange Rate Logic
  useEffect(() => {
    if (isExport) {
      fetchExchangeRate();
    }
  }, [isExport, currency]);

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${currency}`);
      const data = await res.json();
      if (data.rates && data.rates["INR"]) {
        const rate = data.rates["INR"];
        setExchangeRate(rate);
        return rate;
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate", err);
    }
    return exchangeRate;
  };

  const convertRatesToForeign = (rateToUse?: number) => {
    const rate = rateToUse || exchangeRate;
    if (rate <= 0) return;
    setItems(prev => prev.map(item => ({
      ...item,
      rate: Math.round((item.rate / rate) * 100) / 100
    })));
  };

  const convertRatesToINR = (rateToUse?: number) => {
    const rate = rateToUse || exchangeRate;
    if (rate <= 0) return;
    setItems(prev => prev.map(item => ({
      ...item,
      rate: Math.round((item.rate * rate) * 100) / 100
    })));
  };

  // Reset all state to defaults (for data isolation)
  const resetAllState = useCallback(() => {
    setBusiness({
      name: "",
      gstin: "",
      address: "",
      phone: "",
      email: "",
      industry: "",
      logo: undefined,
      letterhead: undefined,
      signature: undefined,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
    });
    setCustomer({
      name: "",
      gstin: "",
      address: "",
      phone: "",
      email: "",
      contactPerson: "",
    });
    setSavedCustomers([]);
    setSavedSuppliers([]);
    setHistory([]);
    setLastUsedNumbers({});
    setPriceHistory([]);
    setLastExportTimestamp(0);
    setItems([{ id: "1", description: "", hsn: "", quantity: 1, unit: "NOS", rate: 0, taxRate: 18 }]);
    setDocType(DocumentType.TAX_INVOICE);
    setIsExport(false);
    setCurrency("USD");
    setExchangeRate(1);
    setDocId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDiscountRate(0);
    setTransport("");
    setPoNumber("");
    setNotes("");
    setTerms(DEFAULT_TERMS);
    setLastUsedNotesAndTerms({
      customer: {
        standard: { notes: "", terms: DEFAULT_TERMS },
        export: { notes: "", terms: DEFAULT_TERMS },
      },
      supplier: {
        standard: { notes: "", terms: DEFAULT_TERMS },
        export: { notes: "", terms: DEFAULT_TERMS },
      },
    });
    setLoadedTimestamp(null);
  }, []);

  const handleNewDocument = () => {
    setLoadedTimestamp(null);
    setItems([{ id: "1", description: "", hsn: "", quantity: 1, unit: "NOS", rate: 0, taxRate: 18 }]);
    setCustomer({
      name: "",
      gstin: "",
      address: "",
      phone: "",
      email: "",
      contactPerson: "",
    });
    setDocId("");
    setDiscountRate(0);
    setTransport("");
    setPoNumber("");
    
    // Apply remembered notes and terms
    const category = docType === DocumentType.PURCHASE_ORDER ? "supplier" : "customer";
    const subCategory = isExport ? "export" : "standard";
    const remembered = lastUsedNotesAndTerms[category][subCategory];
    setNotes(remembered.notes);
    setTerms(remembered.terms);
    
    setDocType(DocumentType.TAX_INVOICE);
    setStep("invoice");
    window.scrollTo(0, 0);
  };

  // Persistence
  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("business_details", business, user?.uid);
    }
  }, [business, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("saved_customers", savedCustomers, user?.uid);
    }
  }, [savedCustomers, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("saved_suppliers", savedSuppliers, user?.uid);
    }
  }, [savedSuppliers, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("document_history", history, user?.uid);
    }
  }, [history, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("last_used_numbers", lastUsedNumbers, user?.uid);
    }
  }, [lastUsedNumbers, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("price_history", priceHistory, user?.uid);
    }
  }, [priceHistory, isFirstLoad]);

  useEffect(() => {
    if (!isFirstLoad) {
      safeSave("last_export_timestamp", lastExportTimestamp, user?.uid);
    }
  }, [lastExportTimestamp, isFirstLoad]);

  // Calculations
  const handleBusinessChange = (updates: Partial<BusinessDetails>) => {
    setBusiness(prev => ({ ...prev, ...updates }));
  };

  const totals = useMemo(() => {
    const isQuotation = docType === DocumentType.QUOTATION;
    const isStandardExport = isExport;

    let subtotal = 0;
    let tax = 0;

    items.forEach(item => {
      if (item.isRegret) return;
      
      const itemAmount = item.quantity * item.rate;
      subtotal += itemAmount;
      
      if (!isQuotation && !isStandardExport) {
        tax += (itemAmount * item.taxRate) / 100;
      }
    });

    const totalBeforeDiscount = subtotal + tax;
    const discountAmount = (totalBeforeDiscount * discountRate) / 100;
    const total = Math.max(0, totalBeforeDiscount - discountAmount);
    const inrTotal = isExport ? total * exchangeRate : total;

    return { 
      subtotal, 
      tax, 
      total, 
      convertedTotal: total, 
      inrTotal, 
      discount: discountAmount, 
      discountRate 
    };
  }, [items, docType, isExport, exchangeRate, discountRate]);

  // Handlers
  const addItem = useCallback(() => {
    setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), description: "", hsn: "", quantity: 1, unit: "NOS", rate: 0, taxRate: 18 }]);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleAIAnalysis = useCallback((analysis: AIDocumentAnalysis, mergeSimilar: boolean = false) => {
    if (analysis.customer) {
      setCustomer(prev => ({
        ...prev,
        ...analysis.customer
      }));
    }

    if (analysis.products && analysis.products.length > 0) {
      let processedProducts = [...analysis.products];

      if (mergeSimilar) {
        const merged: Record<string, any> = {};
        processedProducts.forEach(p => {
          const name = (p.name || "").toLowerCase().trim();
          const unit = (p.unit || "NOS").toLowerCase().trim();
          const key = `${name}_${unit}`;
          if (merged[key]) {
            merged[key].quantity = (merged[key].quantity || 0) + (p.quantity || 0);
          } else {
            merged[key] = { ...p };
          }
        });
        processedProducts = Object.values(merged);
      }

      setItems(prevItems => {
        let currentItems = [...prevItems];
        
        processedProducts.forEach(suggestion => {
          // Suggested rate is already in the active currency from the document
          const suggestedRate = suggestion.rate || 0;
          
          const lastItem = currentItems[currentItems.length - 1];
          if (lastItem && lastItem.description === "") {
            // Update the last empty item
            currentItems[currentItems.length - 1] = {
              ...lastItem,
              description: suggestion.name || lastItem.description,
              hsn: suggestion.hsn || lastItem.hsn,
              taxRate: suggestion.suggestedTaxRate || lastItem.taxRate,
              quantity: suggestion.quantity || lastItem.quantity,
              unit: suggestion.unit || lastItem.unit || "NOS",
              rate: suggestedRate || lastItem.rate,
            };
          } else {
            // Add a new item
            currentItems.push({
              id: Math.random().toString(36).substr(2, 9),
              description: suggestion.name || "",
              hsn: suggestion.hsn || "",
              quantity: suggestion.quantity || 1,
              unit: suggestion.unit || "NOS",
              rate: suggestedRate,
              taxRate: suggestion.suggestedTaxRate || 18
            });
          }
        });
        
        return currentItems;
      });
    }
  }, []);

  const handleVoiceSuggestion = useCallback((suggestion: any) => {
    handleAIAnalysis({ products: [suggestion] });
  }, [handleAIAnalysis]);

  // Smart Notes & Terms logic: Update when docType, isExport, or customer changes for a NEW document
  useEffect(() => {
    if (step === "invoice" && !loadedTimestamp) {
      // If we have a customer name, try to use the most regular ones as default
      if (customer.name) {
        const common = getMostCommonNotesAndTerms();
        setNotes(common.notes);
        setTerms(common.terms);
      } else {
        // Fallback to category-based defaults if no customer selected yet
        const category = docType === DocumentType.PURCHASE_ORDER ? "supplier" : "customer";
        const subCategory = isExport ? "export" : "standard";
        const remembered = lastUsedNotesAndTerms[category][subCategory];
        setNotes(remembered.notes);
        setTerms(remembered.terms);
      }
    }
  }, [docType, isExport, step, loadedTimestamp, lastUsedNotesAndTerms, customer.name, getMostCommonNotesAndTerms]);

  const generatePDF = async () => {
    if (!business.name || !customer.name) {
      showModal({
        title: "Missing Details",
        message: "Please fill in business and customer details.",
        type: "warning"
      });
      return;
    }

    // Save customer/supplier if new or update if existing
    if (docType === DocumentType.PURCHASE_ORDER) {
      const exists = savedSuppliers.find(c => c.name.toLowerCase() === customer.name.toLowerCase());
      let updatedSuppliers;
      if (!exists) {
        updatedSuppliers = [...savedSuppliers, { ...customer, id: Math.random().toString(36).substr(2, 9) }];
      } else {
        updatedSuppliers = savedSuppliers.map(c => c.id === exists.id ? { ...customer, id: c.id } : c);
      }
      setSavedSuppliers(updatedSuppliers);
      safeSave("saved_suppliers", updatedSuppliers, user?.uid);
    } else {
      const exists = savedCustomers.find(c => c.name.toLowerCase() === customer.name.toLowerCase());
      let updatedCustomers;
      if (!exists) {
        updatedCustomers = [...savedCustomers, { ...customer, id: Math.random().toString(36).substr(2, 9) }];
      } else {
        updatedCustomers = savedCustomers.map(c => c.id === exists.id ? { ...customer, id: c.id } : c);
      }
      setSavedCustomers(updatedCustomers);
      safeSave("saved_customers", updatedCustomers, user?.uid);
    }

    setIsGenerating(true);
    try {
      let finalDocId = docId;
      // If we are revising a quotation, append (R) if not already present
      if (loadedTimestamp && docType === DocumentType.QUOTATION && !finalDocId.includes("(R)")) {
        finalDocId = `${finalDocId} (R)`;
        setDocId(finalDocId);
      }

      const data: InvoiceData = {
        id: finalDocId,
        type: docType,
        date,
        dueDate: date,
        business,
        customer,
        items,
        notes,
        terms,
        transport,
        poNumber,
        isExport,
        currency: isExport ? currency : "INR",
        exchangeRate: isExport ? exchangeRate : 1,
        discount: totals.discount,
        discountRate: discountRate,
        layoutSettings,
      };

      // Add to history (strip bulky letterhead/logo/signature to save space)
      const historyItem: DocumentHistoryItem = {
        id: finalDocId,
        timestamp: Date.now(),
        type: docType,
        date,
        customerName: customer.name,
        total: totals.convertedTotal,
        currency: isExport ? currency : "INR",
        fullData: {
          ...data,
          business: { 
            ...business, 
            letterhead: undefined,
            logo: undefined,
            signature: undefined
          }
        }
      };
      setHistory(prev => [...prev, historyItem]);

      // Update last used numbers
      const prefix = getShortForm(business.name);
      const typeCode = docType === DocumentType.TAX_INVOICE ? "INV" : 
                      docType === DocumentType.QUOTATION ? "QT" : 
                      docType === DocumentType.PURCHASE_ORDER ? "PO" : "DC";
      const fullPrefix = `${prefix}/${typeCode}/`;
      const safeKey = sanitizeKey(fullPrefix);
      const parts = finalDocId.split('/');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart) || 0;
      
      if (num > 0) {
        setLastUsedNumbers(prev => ({
          ...prev,
          [safeKey]: Math.max(prev[safeKey] || 0, num)
        }));
      }

      // Update price history
      const historyEntries: PriceHistoryItem[] = items
        .filter(item => item.description && item.rate > 0)
        .map(item => ({
          description: item.description,
          rate: item.rate,
          date,
          customerName: customer.name
        }));
      
      setPriceHistory(prev => [...historyEntries, ...prev].slice(0, 500)); // Keep last 500 entries

      // Update remembered notes and terms
      const category = docType === DocumentType.PURCHASE_ORDER ? "supplier" : "customer";
      const subCategory = isExport ? "export" : "standard";
      const newLastUsed = {
        ...lastUsedNotesAndTerms,
        [category]: {
          ...lastUsedNotesAndTerms[category],
          [subCategory]: { notes, terms }
        }
      };
      setLastUsedNotesAndTerms(newLastUsed);
      safeSave("last_used_notes_and_terms", newLastUsed, user?.uid);

      await downloadInvoicePDF(data);
      
      // Refresh Doc ID for next document will happen via useEffect
      setDocId(""); 
      setDiscountRate(0);
      setLoadedTimestamp(null);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showModal({
        title: "Generation Error",
        message: "Failed to generate PDF. Please check your business details and items.",
        type: "warning"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateChallan = async () => {
    if (docType !== DocumentType.TAX_INVOICE) return;
    
    setIsGenerating(true);
    try {
      const data: InvoiceData = {
        id: `DC-${docId.split('-')[1] || Date.now().toString().slice(-6)}`,
        type: DocumentType.DELIVERY_CHALLAN,
        date,
        dueDate: date,
        business,
        customer,
        items,
        notes,
        terms,
        transport,
        poNumber,
        layoutSettings,
      };
      await downloadInvoicePDF(data);
    } catch (error) {
      console.error("Challan Generation Error:", error);
      showModal({
        title: "Error",
        message: "Failed to generate Delivery Challan.",
        type: "warning"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const loadDocument = (doc: DocumentHistoryItem) => {
    if (!doc.fullData) {
      showModal({
        title: "Legacy Document",
        message: "Full data not available for this legacy document.",
        type: "info"
      });
      return;
    }
    const data = doc.fullData;
    setDocType(data.type);
    setDocId(data.id);
    setDate(data.date);
    setCustomer(data.customer);
    setItems(data.items);
    setNotes(data.notes);
    setTerms(data.terms || DEFAULT_TERMS);
    setTransport(data.transport || "");
    setPoNumber(data.poNumber || "");
    setDiscountRate(data.discountRate || 0);
    setLoadedTimestamp(doc.timestamp);
    setStep("invoice");
    window.scrollTo(0, 0);
  };

  const deleteDocument = (timestamp: number) => {
    if (!timestamp) {
      console.error("Cannot delete document: Missing timestamp");
      return;
    }
    showModal({
      title: "Delete Document",
      message: "Are you sure you want to delete this document? This will also remove it from your cloud backup.",
      type: "confirm",
      onConfirm: () => {
        setHistory(prev => prev.filter(h => String(h.timestamp) !== String(timestamp)));
        closeModal();
      }
    });
  };

  const downloadPDF = async (doc: DocumentHistoryItem) => {
    if (doc.fullData) {
      setIsGenerating(true);
      try {
        // Merge current business letterhead/logo if missing in saved data
        const dataToGenerate = {
          ...doc.fullData,
          business: {
            ...doc.fullData.business,
            letterhead: doc.fullData.business.letterhead || business.letterhead,
            logo: doc.fullData.business.logo || business.logo,
            signature: doc.fullData.business.signature || business.signature,
          },
          layoutSettings: doc.fullData.layoutSettings || layoutSettings,
        };
        await downloadInvoicePDF(dataToGenerate);
      } finally {
        setIsGenerating(false);
      }
    } else {
      showModal({
        title: "Data Missing",
        message: "Full data not available for this document.",
        type: "info"
      });
    }
  };

  const clearHistory = () => {
    showModal({
      title: "Clear History",
      message: "Are you sure you want to clear all document history? This cannot be undone.",
      type: "confirm",
      onConfirm: () => {
        setHistory([]);
        closeModal();
      }
    });
  };

  const clearAllLocalData = () => {
    showModal({
      title: "Clear All Local Data",
      message: "This will clear all locally saved data (Business Profile, Customers, Suppliers, History) for the current user. If you are logged in, your data will be restored from the cloud on next sync. Continue?",
      type: "confirm",
      onConfirm: () => {
        const keys = ["business_details", "saved_customers", "saved_suppliers", "document_history", "last_used_numbers", "price_history"];
        keys.forEach(k => localStorage.removeItem(getStorageKey(k, user?.uid)));
        
        // Reset state to defaults
        resetAllState();
        
        closeModal();
        showModal({
          title: "Success",
          message: "Local data cleared successfully.",
          type: "success"
        });
      }
    });
  };

  const exportData = async () => {
    const newDocs = history.filter(item => item.timestamp > lastExportTimestamp);
    
    if (newDocs.length === 0) {
      showModal({
        title: "No New Data",
        message: "There are no new documents created since the last export.",
        type: "info"
      });
      return;
    }

    showModal({
      title: "Exporting Data",
      message: `Preparing ${newDocs.length} documents for export. Please wait...`,
      type: "info"
    });

    try {
      const zip = new JSZip();
      const folder = zip.folder(`export-${new Date().toISOString().split('T')[0]}`);
      
      for (const item of newDocs) {
        if (item.fullData) {
          // Inject current business letterhead/logo/signature if missing in saved data
          const dataToGenerate = {
            ...item.fullData,
            business: {
              ...item.fullData.business,
              letterhead: item.fullData.business.letterhead || business.letterhead,
              logo: item.fullData.business.logo || business.logo,
              signature: item.fullData.business.signature || business.signature,
            },
            layoutSettings: item.fullData.layoutSettings || layoutSettings,
          };
          const doc = await generateInvoicePDF(dataToGenerate);
          const blob = doc.output('blob');
          const fileName = `${item.type.replace(/\s+/g, '_')}_${item.id}_${item.date}.pdf`;
          folder?.file(fileName, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `billing-app-export-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      const now = Date.now();
      setLastExportTimestamp(now);
      safeSave("last_export_timestamp", now, user?.uid);

      closeModal();
      showModal({
        title: "Success",
        message: `${newDocs.length} documents exported successfully.`,
        type: "success"
      });
    } catch (error) {
      console.error("Export error:", error);
      closeModal();
      showModal({
        title: "Export Failed",
        message: "An error occurred while generating the export. Please try again.",
        type: "warning"
      });
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.business) {
          setBusiness(data.business);
          safeSave("business_details", data.business, user?.uid);
        }
        if (data.history) {
          setHistory(data.history);
          safeSave("document_history", data.history, user?.uid);
        }
        if (data.priceHistory) {
          setPriceHistory(data.priceHistory);
          safeSave("price_history", data.priceHistory, user?.uid);
        }
        if (data.savedCustomers) {
          setSavedCustomers(data.savedCustomers);
          safeSave("saved_customers", data.savedCustomers, user?.uid);
        }
        if (data.savedSuppliers) {
          setSavedSuppliers(data.savedSuppliers);
          safeSave("saved_suppliers", data.savedSuppliers, user?.uid);
        }
        showModal({
          title: "Success",
          message: "Data imported successfully!",
          type: "success"
        });
      } catch (err) {
        showModal({
          title: "Import Error",
          message: "Failed to import data. Invalid file format.",
          type: "warning"
        });
      }
    };
    reader.readAsText(file);
  };

  const autoGenerateNotes = async () => {
    setIsGenerating(true);
    try {
      const newNotes = await generateInvoiceNotes(business.name || "General", items, business.letterhead);
      setNotes(newNotes);
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!user && isConfigValid) {
    return <Auth onSuccess={() => setStep("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 pb-20 selection:bg-brand-100 selection:text-brand-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => setStep("dashboard")}
          >
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg shadow-brand-500/30">
              <Zap className="text-white h-6 w-6 fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">SmartBill AI</h1>
              <p className="text-[10px] text-brand-600 font-bold uppercase tracking-widest hidden sm:block">Next-Gen Billing</p>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button 
                variant={step === "dashboard" ? "primary" : "ghost"} 
                size="sm"
                onClick={() => setStep("dashboard")}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button 
                variant={step === "history" ? "primary" : "ghost"} 
                size="sm"
                onClick={() => setStep("history")}
              >
                <Clock className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button 
                variant={step === "customers" ? "primary" : "ghost"} 
                size="sm"
                onClick={() => setStep("customers")}
              >
                <Users className="h-4 w-4 mr-2" />
                Customers
              </Button>
              <Button 
                variant={step === "suppliers" ? "primary" : "ghost"} 
                size="sm"
                onClick={() => setStep("suppliers")}
              >
                <Truck className="h-4 w-4 mr-2" />
                Suppliers
              </Button>
            </div>
            <Button 
              variant={step === "invoice" ? "primary" : "ghost"} 
              size="sm"
              onClick={handleNewDocument}
              className="bg-brand-600 text-white sm:bg-transparent sm:text-inherit"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Bill</span>
              <span className="sm:hidden">Bill</span>
            </Button>
            <Button 
              variant={step === "profile" ? "primary" : "ghost"} 
              size="sm"
              onClick={() => setStep("profile")}
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
        <AnimatePresence mode="wait">
          {step === "dashboard" ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <Dashboard 
                history={history} 
                priceHistory={priceHistory}
                customers={savedCustomers} 
                suppliers={savedSuppliers} 
                industry={business.industry}
                letterhead={business.letterhead}
                onNavigate={(s) => setStep(s)}
                onOpenDocument={loadDocument}
                onDownloadPDF={downloadPDF}
                onDeleteDocument={deleteDocument}
                onClearHistory={clearHistory}
                onViewAll={() => setStep("history")}
              />
            </motion.div>
          ) : step === "history" ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <HistoryList 
                history={history}
                onOpenDocument={loadDocument}
                onDownloadPDF={downloadPDF}
                onDeleteDocument={deleteDocument}
                onBack={() => setStep("dashboard")}
              />
            </motion.div>
          ) : step === "customers" ? (
            <motion.div
              key="customers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PartyList 
                title="Customers" 
                parties={savedCustomers} 
                onRemove={(id) => {
                  setSavedCustomers(prev => prev.filter(c => c.id !== id));
                }}
                onAdd={(party) => {
                  const updated = [...savedCustomers, party];
                  setSavedCustomers(updated);
                  safeSave("saved_customers", updated, user?.uid);
                }}
                onUpdate={(party) => {
                  const updated = savedCustomers.map(c => c.id === party.id ? party : c);
                  setSavedCustomers(updated);
                  safeSave("saved_customers", updated, user?.uid);
                }}
                type="customer"
              />
            </motion.div>
          ) : step === "suppliers" ? (
            <motion.div
              key="suppliers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <PartyList 
                title="Suppliers" 
                parties={savedSuppliers} 
                onRemove={(id) => {
                  setSavedSuppliers(prev => prev.filter(c => c.id !== id));
                }}
                onAdd={(party) => {
                  const updated = [...savedSuppliers, party];
                  setSavedSuppliers(updated);
                  safeSave("saved_suppliers", updated, user?.uid);
                }}
                onUpdate={(party) => {
                  const updated = savedSuppliers.map(s => s.id === party.id ? party : s);
                  setSavedSuppliers(updated);
                  safeSave("saved_suppliers", updated, user?.uid);
                }}
                type="supplier"
              />
            </motion.div>
          ) : step === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardHeader 
                  title="Business Profile" 
                  subtitle="Your details will be saved for all future invoices"
                />
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Business Name" 
                      value={business.name} 
                      onChange={(e) => handleBusinessChange({ name: e.target.value })}
                      placeholder="e.g. Acme Industrial Traders"
                      error={businessErrors.name}
                    />
                    <Input 
                      label="GSTIN" 
                      value={business.gstin} 
                      onChange={(e) => handleBusinessChange({ gstin: e.target.value })}
                      placeholder="27AAAAA0000A1Z5"
                      error={businessErrors.gstin}
                    />
                    <Input 
                      label="Industry / Business Type" 
                      value={business.industry || ""} 
                      onChange={(e) => handleBusinessChange({ industry: e.target.value })}
                      placeholder="e.g. Hardware, Electronics, Textiles, Services"
                    />
                    <div className="md:col-span-2">
                      <Input 
                        label="Address" 
                        value={business.address} 
                        onChange={(e) => handleBusinessChange({ address: e.target.value })}
                        placeholder="Full business address"
                      />
                    </div>
                    <Input 
                      label="Phone" 
                      value={business.phone} 
                      onChange={(e) => handleBusinessChange({ phone: e.target.value })}
                      error={businessErrors.phone}
                    />
                    <Input 
                      label="Email" 
                      value={business.email} 
                      onChange={(e) => handleBusinessChange({ email: e.target.value })}
                      error={businessErrors.email}
                    />
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Business Logo (Optional)</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            id="logo-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const compressed = await compressImage(reader.result as string, 400, 400, 0.7);
                                  handleBusinessChange({ logo: compressed });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label 
                            htmlFor="logo-upload"
                            className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-200 rounded-xl transition-colors cursor-pointer hover:bg-zinc-50`}
                          >
                            <Building2 className="h-5 w-5 text-zinc-400" />
                            <span className="text-sm font-semibold text-zinc-600">
                              {business.logo ? "Change Logo" : "Upload Logo"}
                            </span>
                          </label>
                        </div>
                        {business.logo && (
                          <div className="relative w-20 h-20 border border-zinc-200 rounded-lg overflow-hidden group bg-white">
                            <img src={business.logo} className="w-full h-full object-contain" alt="Logo Preview" />
                            <button 
                              onClick={() => handleBusinessChange({ logo: undefined })}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Company Letterhead (Optional)</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            id="letterhead-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const compressed = await compressImage(reader.result as string, 1200, 1600, 0.6);
                                  handleBusinessChange({ letterhead: compressed });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label 
                            htmlFor="letterhead-upload"
                            className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-200 rounded-xl transition-colors cursor-pointer hover:bg-zinc-50`}
                          >
                            <Building2 className="h-5 w-5 text-zinc-400" />
                            <span className="text-sm font-semibold text-zinc-600">
                              {business.letterhead ? "Change Letterhead Image" : "Upload Letterhead Image"}
                            </span>
                          </label>
                        </div>
                        {business.letterhead && (
                          <div className="relative w-20 h-20 border border-zinc-200 rounded-lg overflow-hidden group">
                            <img src={business.letterhead} className="w-full h-full object-cover" alt="Letterhead Preview" />
                            <button 
                              onClick={() => handleBusinessChange({ letterhead: undefined })}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2">Upload a full A4 size image (or header/footer) to be used as background.</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Authorized Signature (Optional)</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            id="signature-upload"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const compressed = await compressImage(reader.result as string, 400, 400, 0.7);
                                  handleBusinessChange({ signature: compressed });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label 
                            htmlFor="signature-upload"
                            className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-200 rounded-xl transition-colors cursor-pointer hover:bg-zinc-50`}
                          >
                            <FileText className="h-5 w-5 text-zinc-400" />
                            <span className="text-sm font-semibold text-zinc-600">
                              {business.signature ? "Change Signature" : "Upload Signature"}
                            </span>
                          </label>
                        </div>
                        {business.signature && (
                          <div className="relative w-20 h-20 border border-zinc-200 rounded-lg overflow-hidden group bg-white">
                            <img src={business.signature} className="w-full h-full object-contain" alt="Signature Preview" />
                            <button 
                              onClick={() => handleBusinessChange({ signature: undefined })}
                              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-2">Upload a clear image of your signature on a white background.</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-100">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Bank Details (Optional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input 
                        label="Bank Name" 
                        value={business.bankName} 
                        onChange={(e) => handleBusinessChange({ bankName: e.target.value })}
                      />
                      <Input 
                        label="Account Number" 
                        value={business.accountNumber} 
                        onChange={(e) => handleBusinessChange({ accountNumber: e.target.value })}
                      />
                      <Input 
                        label="IFSC Code" 
                        value={business.ifscCode} 
                        onChange={(e) => handleBusinessChange({ ifscCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-100">
                    <PDFCustomizer 
                      settings={layoutSettings}
                      onChange={(newSettings) => {
                        setLayoutSettings(newSettings);
                        safeSave("pdf_layout_settings", newSettings, user?.uid);
                      }}
                    />
                  </div>

                    <Button 
                      variant="outline" 
                      onClick={handleLogout}
                      className="w-full mb-6 border-red-100 text-red-600 hover:bg-red-50"
                    >
                      <LogIn className="mr-2 h-4 w-4 rotate-180" />
                      Sign Out
                    </Button>

                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4">Local Data Management</h4>
                    <div className="flex flex-wrap gap-4">
                      <Button variant="outline" onClick={exportData}>
                        <Download className="mr-2 h-4 w-4" />
                        Export All Data (Backup)
                      </Button>
                      <Button variant="ghost" onClick={clearAllLocalData} className="text-red-600 hover:bg-red-50" disabled={false}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear All Local Data
                      </Button>
                      <Button variant="ghost" onClick={resetSyncKeys} className="text-red-600 hover:bg-red-50" disabled={false}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reset Sync Keys
                      </Button>
                      <div className="relative">
                        <input 
                          type="file" 
                          id="import-data" 
                          className="hidden" 
                          accept=".json"
                          onChange={importData}
                        />
                        <label 
                          htmlFor="import-data"
                          className={`flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-semibold transition-colors hover:bg-zinc-50 cursor-pointer`}
                        >
                          <History className="h-4 w-4" />
                          Import Data (Restore)
                        </label>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-2">Export your data regularly to keep it safe for years. You can restore it anytime.</p>

                  <div className="pt-8 border-t border-zinc-100">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-4 text-center">Legal & Privacy</h4>
                    <div className="flex justify-center gap-6">
                      <button 
                        onClick={() => setStep("privacy")}
                        className="text-xs font-bold text-zinc-600 hover:text-brand-600 transition-colors flex items-center gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        Privacy Policy
                      </button>
                      <button 
                        onClick={() => setStep("terms")}
                        className="text-xs font-bold text-zinc-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
                      >
                        <Scale className="h-3 w-3" />
                        Terms & Conditions
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-400 text-center mt-4">
                      Compliant with Information Technology Act, 2000 and DPDP Act, 2023 of India.
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => {
                      setStep("invoice");
                    }}>
                      Save & Continue
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : step === "privacy" ? (
            <PrivacyPolicy onBack={() => setStep("profile")} />
          ) : step === "terms" ? (
            <TermsAndConditions onBack={() => setStep("profile")} />
          ) : (
            <motion.div
              key="invoice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Document Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Document Type</label>
                    <select 
                      className="w-full bg-transparent font-bold text-sm focus:outline-none disabled:opacity-50"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocumentType)}
                    >
                      {DOCUMENT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </CardContent>
                </Card>
                <Card className={docErrors.docId ? "border-red-500" : ""}>
                  <CardContent className="p-4">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">
                      {docType === DocumentType.QUOTATION ? "Quotation Number" : "Number"}
                    </label>
                    <input 
                      className="w-full bg-transparent font-bold text-sm focus:outline-none disabled:opacity-50"
                      value={docId ?? ""}
                      onChange={(e) => setDocId(e.target.value)}
                    />
                    {docErrors.docId && <p className="text-[10px] text-red-500 mt-1">{docErrors.docId}</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Date</label>
                    <input 
                      type="date"
                      className="w-full bg-transparent font-bold text-sm focus:outline-none disabled:opacity-50"
                      value={date ?? ""}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </CardContent>
                </Card>

                {(docType === DocumentType.TAX_INVOICE || 
                  docType === DocumentType.DELIVERY_CHALLAN || 
                  docType === DocumentType.PROFORMA_INVOICE) && (
                  <>
                    <Card>
                      <CardContent className="p-4">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Transport</label>
                        <input 
                          className="w-full bg-transparent font-bold text-sm focus:outline-none disabled:opacity-50"
                          value={transport ?? ""}
                          onChange={(e) => setTransport(e.target.value)}
                          placeholder="Vehicle No / Mode"
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">P.O Number</label>
                        <input 
                          className="w-full bg-transparent font-bold text-sm focus:outline-none disabled:opacity-50"
                          value={poNumber ?? ""}
                          onChange={(e) => setPoNumber(e.target.value)}
                          placeholder="Customer PO No"
                        />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Export Settings */}
              <Card>
                <CardContent className="p-4 flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="is-export"
                      checked={isExport}
                      onChange={(e) => setIsExport(e.target.checked)}
                      className="w-4 h-4 accent-zinc-900 rounded border-zinc-300 focus:ring-zinc-900 disabled:opacity-50"
                    />
                    <label htmlFor="is-export" className={`text-sm font-bold text-zinc-900 flex items-center gap-2 cursor-pointer`}>
                      <Package className="h-4 w-4 text-zinc-400" />
                      Export Document
                    </label>
                    {!isExport && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={async () => {
                          const rate = await fetchExchangeRate();
                          setIsExport(true);
                          convertRatesToForeign(rate);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-50 h-7 px-2"
                      >
                        Quick Convert to {currency}
                      </Button>
                    )}
                  </div>
                  
                  {isExport && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-wrap items-center gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Currency</label>
                        <select 
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="bg-zinc-100 px-3 py-1.5 rounded-lg text-sm font-bold focus:outline-none border border-zinc-200 disabled:opacity-50"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="AED">AED (د.إ)</option>
                          <option value="SAR">SAR (ر.س)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="AUD">AUD ($)</option>
                          <option value="CAD">CAD ($)</option>
                          <option value="SGD">SGD ($)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Exchange Rate (1 {currency} = )</label>
                        <div className="flex items-center bg-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
                          <input 
                            type="number"
                            step="0.000001"
                            value={exchangeRate ?? ""}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                            className="w-28 px-3 py-1.5 bg-transparent text-sm font-bold focus:outline-none disabled:opacity-50"
                          />
                          <span className="px-2 text-[10px] font-bold text-zinc-400 uppercase">INR</span>
                          <button 
                            onClick={fetchExchangeRate}
                            className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 transition-colors text-zinc-600 disabled:opacity-50"
                            title="Fetch Live Rate"
                          >
                            <Zap className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => convertRatesToForeign()}
                          className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-50"
                        >
                          Convert INR → {currency}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => convertRatesToINR()}
                          className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50"
                        >
                          Convert {currency} → INR
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>

              {/* Customer/Supplier Details */}
              <Card>
                <CardHeader 
                  title={docType === DocumentType.PURCHASE_ORDER ? "Supplier Details" : "Customer Details"} 
                  action={
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { 
                        showModal({
                          title: "Clear History",
                          message: "Clear customer history?",
                          type: "confirm",
                          onConfirm: () => {
                            setSavedCustomers([]);
                            closeModal();
                          }
                        });
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      Clear History
                    </Button>
                  }
                />
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomerSelector
                    customers={docType === DocumentType.PURCHASE_ORDER ? savedSuppliers : savedCustomers}
                    currentValue={customer.name}
                    onChange={(val) => setCustomer({ ...customer, name: val })}
                    onSelect={(selected) => setCustomer(selected)}
                    label={docType === DocumentType.PURCHASE_ORDER ? "Supplier Name" : "Customer Name"}
                    placeholder={docType === DocumentType.PURCHASE_ORDER ? "Search or enter supplier name" : "Search or enter customer name"}
                  />
                  <Input 
                    label={docType === DocumentType.PURCHASE_ORDER ? "Supplier GSTIN" : "Customer GSTIN"} 
                    value={customer.gstin}
                    onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
                    placeholder="Optional"
                    error={customerErrors.gstin}
                  />
                  {docType === DocumentType.QUOTATION && (
                    <Input 
                      label="To Mr/Ms" 
                      value={customer.contactPerson || ""}
                      onChange={(e) => setCustomer({ ...customer, contactPerson: e.target.value })}
                      placeholder="Contact person name"
                    />
                  )}
                  <Input 
                    label="Email" 
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="customer@example.com"
                    error={customerErrors.email}
                  />
                  <Input 
                    label="Phone" 
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="Phone number"
                    error={customerErrors.phone}
                  />
                  <div className="md:col-span-2">
                    <Input 
                      label={
                        docType === DocumentType.PURCHASE_ORDER 
                          ? "Supplier Address" 
                          : docType === DocumentType.QUOTATION 
                            ? "Customer Address" 
                            : "Billing Address"
                      } 
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader 
                  title="Line Items" 
                  action={
                    <div className="flex items-center gap-2">
                      <VoiceInput 
                        onSuggestion={handleVoiceSuggestion} 
                        onError={(msg) => showModal({ title: "Voice Input", message: msg, type: "warning" })}
                        industry={business.industry} 
                        letterhead={business.letterhead}
                      />
                      <DocumentUpload 
                        onAnalysisComplete={handleAIAnalysis} 
                        industry={business.industry}
                        history={history}
                        letterhead={business.letterhead}
                        businessName={business.name}
                      />
                    </div>
                  }
                />
                <CardContent className="p-0">
                  <div className="px-6">
                    {items.map((item) => (
                      <LineItemRow 
                        key={item.id} 
                        item={item} 
                        onUpdate={updateItem} 
                        onRemove={removeItem} 
                        priceHistory={priceHistory}
                        docType={docType}
                        isExport={isExport}
                        currency={currency}
                        exchangeRate={exchangeRate}
                        business={business}
                        customerName={customer.name}
                      />
                    ))}
                  </div>
                  <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={addItem} disabled={false}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase font-semibold">
                        {docType === DocumentType.QUOTATION ? "Total" : "Subtotal"}
                      </p>
                      <p className="text-lg font-bold">
                        {isExport ? CURRENCY_SYMBOLS[currency] || currency : "₹"}
                        {totals.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Totals & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader 
                    title="Notes & Terms" 
                    action={
                      <div className="flex items-center gap-2">
                        {isAnalyzingPatterns && (
                          <span className="text-[10px] text-zinc-400 animate-pulse">Analyzing patterns...</span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`${suggestedNotes ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" : "text-zinc-300 cursor-not-allowed"}`}
                          disabled={!suggestedNotes}
                          onClick={() => {
                            if (suggestedNotes) {
                              setNotes(suggestedNotes.notes);
                              setTerms(suggestedNotes.terms);
                              showModal({
                                title: "AI Pattern Applied",
                                message: `Applied notes and terms typically used for ${customer.name}.`,
                                type: "success"
                              });
                            }
                          }}
                        >
                          Apply Client Pattern
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-zinc-500"
                          onClick={() => {
                            const common = getMostCommonNotesAndTerms();
                            setNotes(common.notes);
                            setTerms(common.terms);
                            showModal({
                              title: "Standard Pattern Applied",
                              message: "Applied your most frequently used notes and terms.",
                              type: "success"
                            });
                          }}
                        >
                          Use Most Regular
                        </Button>
                      </div>
                    }
                  />
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Notes / Payment Instructions</label>
                      <textarea 
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-zinc-900/5 resize-none overflow-hidden disabled:opacity-50"
                        placeholder="Add any specific notes or payment instructions..."
                        value={notes ?? ""}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={(e: any) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Terms & Conditions</label>
                      <textarea 
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-zinc-900/5 resize-none overflow-hidden disabled:opacity-50"
                        placeholder="Add standard terms and conditions..."
                        value={terms ?? ""}
                        onChange={(e) => {
                          setTerms(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onInput={(e: any) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 text-white border-zinc-800">
                  <CardContent className="p-8 flex flex-col justify-between h-full">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center opacity-80 mb-2">
                        <span className="text-sm uppercase tracking-wider font-semibold">Discount (%)</span>
                        <div className={`flex items-center bg-white/10 rounded px-2 border ${docErrors.discountRate ? "border-red-500" : "border-white/10"} focus-within:border-white/30 transition-colors`}>
                          <input 
                            type="number"
                            className="bg-transparent border-none focus:outline-none text-right font-mono text-sm w-16 py-1 text-white disabled:opacity-50"
                            value={discountRate ?? ""}
                            onWheel={(e) => e.currentTarget.blur()}
                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                          <span className="text-xs ml-1 opacity-50">%</span>
                        </div>
                      </div>
                      {docErrors.discountRate && <p className="text-[10px] text-red-400 text-right">{docErrors.discountRate}</p>}
                      
                      {totals.discount > 0 && (
                        <div className="flex justify-between items-center opacity-60 text-xs mb-2">
                          <span className="uppercase tracking-wider">Discount Amount</span>
                          <span className="font-mono">
                            -{isExport ? CURRENCY_SYMBOLS[currency] || currency : "₹"}
                            {totals.discount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {docType !== DocumentType.QUOTATION && !isExport && (
                        <>
                          <div className="flex justify-between items-center opacity-60">
                            <span className="text-sm uppercase tracking-wider font-semibold">Subtotal</span>
                            <span className="font-mono">
                              {isExport ? CURRENCY_SYMBOLS[currency] || currency : "₹"}
                              {totals.subtotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center opacity-60">
                            <span className="text-sm uppercase tracking-wider font-semibold">Total Tax</span>
                            <span className="font-mono">
                              {isExport ? CURRENCY_SYMBOLS[currency] || currency : "₹"}
                              {totals.tax.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-px bg-white/10 my-4" />
                        </>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-lg uppercase tracking-wider font-bold">
                          {docType === DocumentType.QUOTATION ? "Total Amount" : "Grand Total"}
                        </span>
                        <div className="text-right">
                          <span className="text-3xl font-bold font-mono block">
                            {isExport ? CURRENCY_SYMBOLS[currency] || currency : "₹"}
                            {totals.convertedTotal.toFixed(2)}
                          </span>
                          {isExport && (
                            <span className="text-[10px] opacity-40 font-mono">
                              (₹{totals.inrTotal.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-8 bg-white text-zinc-900 hover:bg-zinc-100 h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={generatePDF}
                      isLoading={isGenerating}
                      disabled={hasErrors}
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Generate PDF
                    </Button>

                    {docType === DocumentType.TAX_INVOICE && (
                      <Button 
                        variant="outline"
                        className="w-full mt-3 border-white/20 text-white hover:bg-white/10 h-12"
                        onClick={generateChallan}
                        isLoading={isGenerating}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Challan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-zinc-100 mb-20 sm:mb-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-black text-zinc-900 tracking-tighter uppercase">Billing Pro</span>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={() => setStep("privacy")} className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest">Privacy Policy</button>
            <button onClick={() => setStep("terms")} className="text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest">Terms & Conditions</button>
          </div>

          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            © 2026 Billing Pro India. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Nav (Quick Actions) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 sm:hidden flex justify-around items-center z-40 pb-safe">
        <button 
          className={`flex flex-col items-center gap-1 ${step === "dashboard" ? "text-brand-600" : "text-zinc-400"}`}
          onClick={() => setStep("dashboard")}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1 ${step === "customers" ? "text-brand-600" : "text-zinc-400"}`}
          onClick={() => setStep("customers")}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Parties</span>
        </button>
        <button 
          className="w-14 h-14 bg-zinc-900 text-white rounded-full flex items-center justify-center -mt-10 shadow-xl shadow-zinc-900/20 border-4 border-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleNewDocument}
        >
          <Plus className="h-7 w-7" />
        </button>
        <button 
          className={`flex flex-col items-center gap-1 ${step === "history" ? "text-brand-600" : "text-zinc-400"}`}
          onClick={() => setStep("history")}
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">History</span>
        </button>
        <button 
          className={`flex flex-col items-center gap-1 ${step === "profile" ? "text-brand-600" : "text-zinc-400"}`}
          onClick={() => setStep("profile")}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </button>
      </div>

      {/* Custom Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </div>
  );
}
