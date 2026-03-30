import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { AIProductSuggestion, AIDocumentAnalysis, DocumentHistoryItem, PriceHistoryItem } from "../types";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
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
    const mimeType = file.type;
    let content: any;
    
    const contextPrompt = industry ? `The business is in the ${industry} industry. ` : "";
    const historyContext = history && history.length > 0 
      ? `Recent products sold: ${history.slice(-10).map(h => h.fullData?.items.map(i => i.description).join(", ")).join(", ")}. `
      : "";
    const userContext = businessName ? `The user's company is "${businessName}". ` : "";

    let prompt = `${contextPrompt}${historyContext}${userContext}Analyze this document (Inquiry, Purchase Order, Invoice, or any business document from any industry). 
      1. Extract ALL product/service line items found. 
         - Be extremely precise with product names, specifications, and sizes, regardless of the industry (e.g., hardware, electronics, apparel, food, services, etc.).
         - For each product, provide: Name, Category, Likely HSN/SAC Code (strictly 4 digits), Standard GST Rate (0, 5, 12, 18, or 28), Quantity (if visible, default 1), Rate (if visible, default 0), Unit (e.g., NOS, PCS, KG, MTR, BOX, SET, LTR).
         - If the same product appears in multiple lines, extract them as separate entries (the app will handle merging if requested).
         - Ensure you capture the full description including dimensions, grades, or any technical specifications.
      2. Extract the RECIPIENT/CUSTOMER details. 
         - Look for labels like "To:", "Bill To:", "Customer:", "Consignee:", "Ship To:", or "Client:". 
         - This is the party the document is addressed to, NOT the company in the main header/logo.
         - If the document is a Quotation or Invoice, the customer is the one being billed/quoted.
         - If the document is a Purchase Order, the customer is the one issuing the order (usually the sender).
         - IMPORTANT: Do NOT extract the user's own company ("${businessName || "the sender"}") as the customer if another party is mentioned as the recipient.
         - Extract: Name, GSTIN, Address, Phone, Email.
      
      Return as a JSON object with 'products' (array) and 'customer' (object).
      
      \n\nIMPORTANT NUMBER HANDLING:\n- Handle large numbers correctly. \n- Be careful with thousands separators vs decimal points. Some documents use '.' as thousands separator (e.g., 1.500,00 means 1500), while others use ',' (e.g., 1,500.00 means 1500). \n- Always return the rate as a clean numeric value (e.g., 1500.00).\n- Do NOT append suffixes like '(Duplicate Item)', '(repeat)', '(1)', '(2)', etc. to the product names.`;

    const parts: any[] = [];
    
    if (letterhead) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context. \n\n${prompt}`;
    }

    if (mimeType.startsWith("image/") || mimeType === "application/pdf") {
      const base64 = await fileToBase64(file);
      parts.push({
        inlineData: {
          mimeType: mimeType === "application/pdf" ? "application/pdf" : "image/jpeg",
          data: base64.split(",")[1] || base64,
        },
      });
      parts.push({ text: prompt });
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mimeType === "application/vnd.ms-excel") {
      // Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      parts.push({ text: `Excel Content: ${JSON.stringify(json)}\n\n${prompt}` });
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // Word
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      parts.push({ text: `Word Content: ${result.value}\n\n${prompt}` });
    } else {
      throw new Error("Unsupported file type");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

    return JSON.parse(response.text) as AIDocumentAnalysis;
  } catch (error) {
    console.error("Error analyzing document:", error);
    return { products: [] };
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
    let prompt = `${contextPrompt}${historyContext}${userContext}Analyze this image. It could be a business document (Inquiry, PO, Invoice), a product on a shelf, a single item, or a handwritten list from any industry (e.g., hardware, electronics, apparel, food, services, etc.). 
      1. Extract ALL product/service line items found. 
         - Be extremely precise with product names, specifications, and sizes.
         - For each product, provide: Name, Category, Likely HSN/SAC Code (strictly 4 digits), Standard GST Rate (0, 5, 12, 18, or 28), Quantity (if visible, default 1), Rate (if visible, default 0), Unit (e.g., NOS, PCS, KG, MTR, BOX, SET, LTR).
         - If the same product appears in multiple lines, extract them as separate entries (the app will handle merging if requested).
         - Ensure you capture the full description including dimensions, grades, or any technical specifications.
      2. Extract the RECIPIENT/CUSTOMER details if visible. 
         - Look for labels like "To:", "Bill To:", "Customer:", "Consignee:", or "Client:". 
         - This is the party the document is addressed to, NOT the company in the main header/logo.
         - IMPORTANT: Do NOT extract the user's own company ("${businessName || "the sender"}") as the customer if another party is mentioned as the recipient.
         - Extract: Name, GSTIN, Address, Phone, Email.
      
      Return as a JSON object with 'products' (array) and 'customer' (object).`;

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

    return JSON.parse(response.text) as AIDocumentAnalysis;
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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



