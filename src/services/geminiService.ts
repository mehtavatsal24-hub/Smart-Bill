import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AIProductSuggestion, AIDocumentAnalysis, DocumentHistoryItem, PriceHistoryItem } from "../types";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

let aiInstance: GoogleGenAI | null = null;

export const GEMINI_MODEL_FALLBACKS = [
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash"
];

export async function generateGeminiContent(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  let lastError: any = null;

  for (const modelName of GEMINI_MODEL_FALLBACKS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const rawMsg = typeof err === "string" ? err : (err?.message || JSON.stringify(err));
      // If error is 404/not found/no longer available, try next model in fallback list
      if (rawMsg.includes("404") || rawMsg.includes("not found") || rawMsg.includes("no longer available") || rawMsg.includes("models/")) {
        console.warn(`Gemini model ${modelName} unavailable (404), trying fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function formatGeminiError(error: any): string {
  if (!error) return "An unknown error occurred.";
  const rawMessage = typeof error === "string" ? error : (error.message || JSON.stringify(error));

  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error) {
      const code = parsed.error.code;
      const msg = parsed.error.message || "";
      if (code === 403 || msg.includes("403") || msg.includes("blocked") || msg.includes("disabled")) {
        return "Gemini API Access Error (403): The API Key being used does not have the Generative Language API enabled. Please get a free Gemini API key from https://aistudio.google.com/app/apikey and set VITE_GEMINI_API_KEY in your .env file.";
      }
      if (code === 400 || msg.includes("API key not valid")) {
        return "Invalid Gemini API Key. Please check your VITE_GEMINI_API_KEY in your .env file or get a valid key at https://aistudio.google.com/app/apikey.";
      }
      return `Gemini API Error (${code}): ${msg}`;
    }
  } catch (e) {
    // String is not JSON
  }

  if (rawMessage.includes("403") || rawMessage.includes("generativelanguage.googleapis.com") || rawMessage.includes("blocked")) {
    return "Gemini API Access Error (403): The API Key being used does not have the Generative Language API enabled. Please get a free Gemini API key from https://aistudio.google.com/app/apikey and set VITE_GEMINI_API_KEY in your .env file.";
  }

  if (rawMessage.includes("GEMINI_API_KEY is not defined")) {
    return "GEMINI_API_KEY is missing. Please set VITE_GEMINI_API_KEY in your .env file.";
  }

  return rawMessage;
}

export function getAI() {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function analyzeLetterhead(base64Image: string): Promise<{ headerHeight: number; footerHeight: number }> {
  try {
    const ai = getAI();
    const response = await generateGeminiContent(ai, {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
          {
            text: `Analyze this company letterhead image. 
            Estimate the height (in millimeters) of the header area (where logo/company info is) 
            and the footer area (where address/bank info is at the bottom).
            Assume the image represents a standard A4 page (210mm x 297mm).
            Return as a JSON object with 'headerHeight' and 'footerHeight' (numeric values).
            Be conservative - if the header is large, give more space. 
            Default to 60 for header and 30 for footer if unsure, but try to be precise based on the visual content.`,
          }
        ]
      }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headerHeight: { type: Type.NUMBER },
            footerHeight: { type: Type.NUMBER },
          },
          required: ["headerHeight", "footerHeight"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing letterhead:", error);
    return { headerHeight: 65, footerHeight: 40 };
  }
}

export async function analyzeDocument(
  file: File, 
  industry?: string,
  history?: DocumentHistoryItem[],
  letterhead?: string,
  businessName?: string
): Promise<AIDocumentAnalysis> {
  try {
    const ai = getAI();
    const rawMimeType = file.type || "";
    const extension = (file.name || "").split('.').pop()?.toLowerCase() || "";

    const isPdf = rawMimeType === "application/pdf" || rawMimeType === "application/x-pdf" || extension === "pdf";
    const isImage = rawMimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "tiff"].includes(extension);
    const isExcel = rawMimeType.includes("spreadsheet") || rawMimeType.includes("excel") || rawMimeType === "text/csv" || ["xlsx", "xls", "csv"].includes(extension);
    const isWord = rawMimeType.includes("word") || ["docx", "doc"].includes(extension);

    const contextPrompt = industry ? `The business is in the ${industry} industry. ` : "";
    const historyContext = history && history.length > 0 
      ? `Recent products sold: ${history.slice(-10).map(h => h.fullData?.items.map(i => i.description).join(", ")).join(", ")}. `
      : "";
    const userContext = businessName ? `The user's company is "${businessName}". ` : "";

    let prompt = `${contextPrompt}${historyContext}${userContext}Analyze this document (Inquiry, Purchase Order, Invoice, or any business document). 
      1. Extract ALL product/service line items found. 
         - Map table columns correctly: Look for "Description", "Specifications", "Item", "Quantity", "Qty", "Rate", "Price", "Unit", "HSN", "Tax", "GST".
         - Be extremely precise with product names. If a description is spread across multiple lines or rows (common in hardware/technical docs), JOIN them into a single coherent description.
         - For each product, provide: Name (full technical description), Category, Likely HSN/SAC Code (strictly 4 digits), Standard GST Rate (0, 5, 12, 18, or 28), Quantity (default 1), Rate (default 0), Unit (e.g., NOS, PCS, KG, MTR, BOX, SET).
         - Capture ALL items, do not skip any.
      2. Extract the RECIPIENT/CUSTOMER details. 
         - This is the party the document is addressed to (e.g., "Bill To", "Ship To", "Consignee").
         - DO NOT extract the user's company "${businessName || "the sender"}" as the customer.
         - Extract: Name, GSTIN, Address, Phone, Email.
      
      Return as a JSON object with 'products' (array) and 'customer' (object).
      
      \n\nNUMBER & DATA INTEGRITY:\n- Handle non-English decimal formats (e.g., 1.500,00 vs 1,500.00). \n- If a "Total" or "Amount" column exists, use it to cross-verify the Rate * Quantity calculations.\n- Ignore generic footer text, bank details, or terms and conditions when extracting products.`;

    const parts: any[] = [];
    
    if (letterhead) {
      const letterheadMime = letterhead.split(";")[0]?.split(":")[1] || "image/jpeg";
      parts.push({
        inlineData: {
          mimeType: letterheadMime,
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context. \n\n${prompt}`;
    }

    if (isImage || isPdf) {
      const base64 = await fileToBase64(file);
      const docMimeType = isPdf 
        ? "application/pdf" 
        : (rawMimeType.startsWith("image/") && rawMimeType !== "image/" 
          ? rawMimeType 
          : `image/${extension === "jpg" ? "jpeg" : extension || "jpeg"}`);

      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: docMimeType,
          data: base64.split(",")[1] || base64,
        },
      });
    } else if (isExcel) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      let excelContent = "";
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        excelContent += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
      });
      
      parts.push({ text: `Excel Content (Multiple Sheets):\n${excelContent}\n\n${prompt}` });
    } else if (isWord) {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        parts.push({ text: `Word Content: ${result.value}\n\n${prompt}` });
      } catch (e) {
        const textContent = await file.text();
        parts.push({ text: `Document Content: ${textContent}\n\n${prompt}` });
      }
    } else {
      try {
        const textContent = await file.text();
        if (textContent && textContent.trim()) {
          parts.push({ text: `Document Content: ${textContent}\n\n${prompt}` });
        } else {
          throw new Error("Unsupported file type or empty file");
        }
      } catch (e) {
        throw new Error("Unsupported file type");
      }
    }

    const response = await generateGeminiContent(ai, {
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  hsn: { type: Type.STRING },
                  suggestedTaxRate: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  rate: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
                required: ["name", "category", "hsn", "suggestedTaxRate"],
              },
            },
            customer: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                gstin: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
              },
            },
          },
          required: ["products"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    const analysis = JSON.parse(response.text) as AIDocumentAnalysis;
    
    // Final cleanup of product names to remove AI-added suffixes
    if (analysis.products) {
      analysis.products = analysis.products.map(p => ({
        ...p,
        name: (p.name || "")
          .replace(/\s*\(\d+\)$/, '')
          .replace(/\s*\(Duplicate Item\)$/i, '')
          .replace(/\s*\(repeat\)$/i, '')
          .trim()
      }));
    }

    return analysis;
  } catch (error: any) {
    console.error("Error analyzing document:", error);
    throw error;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export async function analyzeProductImage(
  base64Image: string, 
  industry?: string,
  history?: DocumentHistoryItem[],
  letterhead?: string,
  businessName?: string
): Promise<AIDocumentAnalysis> {
  try {
    const ai = getAI();
    const contextPrompt = industry ? `The business is in the ${industry} industry. ` : "";
    const historyContext = history && history.length > 0 
      ? `Recent products sold: ${history.slice(-10).map(h => h.fullData?.items.map(i => i.description).join(", ")).join(", ")}. `
      : "";
    const userContext = businessName ? `The user's company is "${businessName}". ` : "";

    const parts: any[] = [];
    let prompt = `${contextPrompt}${historyContext}${userContext}Analyze this image (Inquiry, PO, Invoice, product photo, or handwritten list). 
      1. Extract ALL product/service line items found. 
         - Map columns: Look for "Description", "Specifications", "Item", "Quantity", "Rate", "Price", "Unit", "HSN", "GST".
         - Be extremely precise. If a description spans multiple lines, JOIN them.
         - For each product, provide: Name (full description), Category, Likely HSN/SAC Code (4 digits), Standard GST Rate (0, 5, 12, 18, or 28), Quantity (default 1), Rate (default 0), Unit (e.g., NOS, PCS, KG, MTR).
         - Capture ALL items without skipping.
      2. Extract the RECIPIENT/CUSTOMER details if visible. 
         - Look for "Bill To", "Ship To", "Consignee", or recipient labels. 
         - DO NOT extract the user's company "${businessName || "the sender"}" as the customer.
         - Extract: Name, GSTIN, Address, Phone, Email.
      
      Return as a JSON object with 'products' (array) and 'customer' (object).
      
      \n\nNUMBER INTEGRITY:\n- Correctly interpret decimal vs thousands separators. \n- Rate should be numeric (e.g., 1500.00).`;

    if (letterhead) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context. \n\n${prompt}`;
    }

    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image.split(",")[1] || base64Image,
      },
    });
    parts.push({ text: prompt });

    const response = await generateGeminiContent(ai, {
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  hsn: { type: Type.STRING },
                  suggestedTaxRate: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  rate: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
                required: ["name", "category", "hsn", "suggestedTaxRate"],
              },
            },
            customer: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                gstin: { type: Type.STRING },
                address: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
              },
            },
          },
          required: ["products"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    const analysis = JSON.parse(response.text) as AIDocumentAnalysis;
    
    // Final cleanup of product names to remove AI-added suffixes
    if (analysis.products) {
      analysis.products = analysis.products.map(p => ({
        ...p,
        name: (p.name || "")
          .replace(/\s*\(\d+\)$/, '')
          .replace(/\s*\(Duplicate Item\)$/i, '')
          .replace(/\s*\(repeat\)$/i, '')
          .trim()
      }));
    }

    return analysis;
  } catch (error) {
    console.error("Error analyzing image:", error);
    return { products: [] };
  }
}

export async function processVoiceInput(
  transcript: string, 
  industry?: string,
  letterhead?: string
): Promise<Partial<AIProductSuggestion> | null> {
  try {
    const ai = getAI();
    const contextPrompt = industry ? `The business is in the ${industry} industry. ` : "";
    const parts: any[] = [];
    let prompt = `${contextPrompt}Extract product/service details from this voice transcript: "${transcript}". 
      The transcript could be from any industry (e.g., hardware, electronics, apparel, food, services, etc.).
      Identify: Product Name, Likely HSN/SAC Code (4 digits), and GST Rate. Return as JSON. 
      IMPORTANT: Do NOT append suffixes like '(repeat)' or '(Duplicate)' to the product names.`;

    if (letterhead) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context. \n\n${prompt}`;
    }
    parts.push({ text: prompt });

    const response = await generateGeminiContent(ai, {
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            hsn: { type: Type.STRING },
            suggestedTaxRate: { type: Type.NUMBER },
          },
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error processing voice:", error);
    return null;
  }
}

export async function generateInvoiceNotes(businessName: string, items: any[], letterhead?: string): Promise<string> {
  try {
    const ai = getAI();
    const itemDescriptions = items.map(i => i.description).filter(Boolean).join(", ");
    const parts: any[] = [];
    let prompt = `Generate a unique, professional 2-line invoice note for ${businessName}. 
      Context: They are selling ${itemDescriptions || "general goods"}. 
      Make it warm, professional, and unique to this specific transaction. 
      Do not use generic templates.`;

    if (letterhead) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context to generate a note that matches their style. \n\n${prompt}`;
    }
    parts.push({ text: prompt });

    const response = await generateGeminiContent(ai, {
      contents: [{ parts }],
    });
    return response.text.trim();
  } catch (error) {
    return "Thank you for choosing us! We appreciate your business and look forward to serving you again.";
  }
}

export async function getDynamicSuggestions(
  businessName: string, 
  currentItems: string[], 
  industry?: string,
  history?: DocumentHistoryItem[],
  letterhead?: string
): Promise<string[]> {
  try {
    const ai = getAI();
    const contextPrompt = industry ? `The business is in the ${industry} industry. ` : "";
    const historyContext = history && history.length > 0 
      ? `Recent products sold: ${history.slice(-10).map(h => h.fullData?.items.map(i => i.description).join(", ")).join(", ")}. `
      : "";

    const parts: any[] = [];
    let prompt = `${contextPrompt}${historyContext}Based on the business name "${businessName}" and current items [${currentItems.join(", ")}], 
      suggest 5 unique and relevant product or service descriptions that this business might sell. 
      The suggestions should be appropriate for the business's industry and context.
      Return as a simple JSON array of strings.`;

    if (letterhead) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context. \n\n${prompt}`;
    }
    parts.push({ text: prompt });

    const response = await generateGeminiContent(ai, {
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return [];
  }
}

export async function analyzeCustomerPatterns(
  customerName: string,
  history: DocumentHistoryItem[]
): Promise<{ notes: string; terms: string } | null> {
  try {
    const ai = getAI();
    const customerHistory = history.filter(h => h.customerName === customerName);
    if (customerHistory.length === 0) return null;

    const historyData = customerHistory.map(h => ({
      notes: h.fullData?.notes,
      terms: h.fullData?.terms,
      date: h.date
    }));

    const response = await generateGeminiContent(ai, {
      contents: [{
        parts: [{
          text: `Analyze the notes and terms used for customer "${customerName}" in the following history: ${JSON.stringify(historyData)}. 
          Identify the most common or most relevant notes and terms for this customer. 
          Return as a JSON object with 'notes' and 'terms' (string) fields. 
          If there are multiple patterns, pick the most recent dominant one.`
        }]
      }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            notes: { type: Type.STRING },
            terms: { type: Type.STRING },
          },
          required: ["notes", "terms"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing customer patterns:", error);
    return null;
  }
}
