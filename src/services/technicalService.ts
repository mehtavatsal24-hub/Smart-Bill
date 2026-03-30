import { GoogleGenAI } from "@google/genai";

const BASE_SYSTEM_INSTRUCTION = `You are a technical specification expansion assistant.
Your task is to convert incomplete customer product descriptions into fully detailed, quotation-ready technical descriptions using correct industry standards.

Rules:
1. Expand short inputs into full technical format.
2. Use correct terminology for the specific industry.
3. If essential data is missing, return the input as is.
4. Format output cleanly for quotation line item use.
5. Do NOT invent specifications that are unsafe or non-standard.

Output format should be professional and standard-compliant for the industry.`;

export async function expandTechnicalSpec(input: string, industry?: string, letterhead?: string): Promise<string> {
  if (!input || input.trim().length < 2) return input;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const industryContext = industry ? `The business is in the ${industry} industry. ` : "The business is in a general industrial/trading sector. ";
    
    const parts: any[] = [];
    let prompt = `Expand this product description into a full technical specification: "${input}"`;

    if (letterhead) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: letterhead.split(",")[1] || letterhead,
        },
      });
      prompt = `The attached image is the user's company letterhead. Use it to understand the company's branding and context to expand the specification in a way that matches their standards. \n\n${prompt}`;
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts }],
      config: {
        systemInstruction: `${BASE_SYSTEM_INSTRUCTION}\n\nContext: ${industryContext}`,
        temperature: 0.1, // Low temperature for precision
      },
    });

    const result = response.text?.trim() || input;
    
    if (result.startsWith("CLARIFICATION_REQUIRED:")) {
      return input;
    }
    
    return result;
  } catch (error) {
    console.error("Error expanding technical spec:", error);
    return input;
  }
}
