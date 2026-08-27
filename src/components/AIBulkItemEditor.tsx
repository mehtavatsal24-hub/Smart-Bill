import React, { useState } from "react";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { LineItem } from "../types";
import { GoogleGenAI, Type } from "@google/genai";
import { generateGeminiContent } from "../services/geminiService";

interface AIBulkItemEditorProps {
  items: LineItem[];
  setItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
  showModal?: (modal: { title: string; message: string; type?: "info" | "warning" | "error" }) => void;
}

export const AIBulkItemEditor: React.FC<AIBulkItemEditorProps> = ({
  items,
  setItems,
  showModal,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const applyAITransform = async (userInstruction: string) => {
    if (!userInstruction.trim()) return;

    setLoading(true);
    try {
      // Local quick execution for known fast prompts
      const lower = userInstruction.toLowerCase();
      if (lower.includes("assign box #1 to all")) {
        setItems((prev) => prev.map((item) => ({ ...item, boxNo: "Box #1" })));
        setPrompt("");
        setLoading(false);
        return;
      }
      if (lower.includes("set qty packed to 100")) {
        setItems((prev) => prev.map((item) => ({ ...item, qtyPacked: 100 })));
        setPrompt("");
        setLoading(false);
        return;
      }
      if (lower.includes("set box range 1-5")) {
        setItems((prev) =>
          prev.map((item, idx) => ({ ...item, boxNo: `Box #${(idx % 5) + 1}` }))
        );
        setPrompt("");
        setLoading(false);
        return;
      }
      if (lower.includes("increase all rates by 10%")) {
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            rate: Math.round(item.rate * 1.1 * 100) / 100,
          }))
        );
        setPrompt("");
        setLoading(false);
        return;
      }
      if (lower.includes("apply 18% tax") || lower.includes("set tax rate 18%")) {
        setItems((prev) => prev.map((item) => ({ ...item, taxRate: 18 })));
        setPrompt("");
        setLoading(false);
        return;
      }

      // Gemini AI execution for general custom prompts
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "undefined" || apiKey === "") {
        showModal({
          title: "API Key Required",
          message: "Please add your Gemini API Key in .env to use custom AI line item editing.",
          type: "warning",
        });
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const systemPrompt = `You are an AI assistant for a billing & invoice application.
The user wants to update or add line items in their current invoice table.
Current Items: ${JSON.stringify(items, null, 2)}

User Instruction: "${userInstruction}"

Return a JSON array of items with schema:
[
  {
    "id": "string",
    "description": "string",
    "hsn": "string",
    "quantity": number,
    "unit": "string",
    "rate": number,
    "taxRate": number,
    "heatNo": "string (optional)",
    "qtyPacked": number (optional),
    "remarks": "string (optional)",
    "boxNo": "string (optional)"
  }
]
Modify existing items or generate new line items according to the instruction. Preserve existing IDs where applicable. Ensure numbers are numbers. Return only valid JSON array.`;

      const response = await generateGeminiContent(ai, {
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING },
                hsn: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                rate: { type: Type.NUMBER },
                taxRate: { type: Type.NUMBER },
                heatNo: { type: Type.STRING },
                qtyPacked: { type: Type.NUMBER },
                remarks: { type: Type.STRING },
                boxNo: { type: Type.STRING },
              },
              required: ["description", "quantity", "rate"],
            },
          },
        },
      });

      const rawText = response.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((item, idx) => ({
            id: item.id || `ai-${Date.now()}-${idx}`,
            description: item.description || "",
            hsn: item.hsn || "",
            quantity: Number(item.quantity) || 1,
            unit: item.unit || "NOS",
            rate: Number(item.rate) || 0,
            taxRate: Number(item.taxRate) ?? 18,
            heatNo: item.heatNo || "",
            qtyPacked: item.qtyPacked ? Number(item.qtyPacked) : undefined,
            remarks: item.remarks || "",
            boxNo: item.boxNo || "",
          }));
          setItems(formatted);
          setPrompt("");
        }
      }
    } catch (err: any) {
      console.error("AI Bulk Edit Error:", err);
      showModal({
        title: "AI Editor Error",
        message: err.message || "Failed to process AI bulk prompt.",
        type: "warning",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Add 2 Packing Items",
    "Assign Box #1 to all",
    "Set Qty Packed to 100",
    "Set Box Range 1-5",
    "Increase all rates by 10%",
    "Apply 18% tax to all rows",
  ];

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 text-white rounded-3xl p-6 shadow-xl border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500/20 text-brand-400 rounded-xl flex items-center justify-center border border-brand-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
              AI BULK LINE ITEM EDITOR
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium">
              Add new line items, batch adjust rates & quantities, apply taxes, or transform rows via AI
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest bg-brand-500/20 text-brand-300 px-3 py-1 rounded-full border border-brand-500/30 flex items-center gap-1.5">
          <Zap className="h-3 w-3 fill-brand-400" /> SMART AI ACTIVE
        </span>
      </div>

      <div className="relative flex items-center">
        <textarea
          rows={2}
          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 pr-32 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none font-medium"
          placeholder="Say e.g.: 'Add 3 items: Item A Qty 50 Rate 1200, Item B Qty 100 Rate 450...', 'Increase all rates by 10%', 'Apply 18% tax to all rows'..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              applyAITransform(prompt);
            }
          }}
        />
        <button
          type="button"
          disabled={loading || !prompt.trim()}
          onClick={() => applyAITransform(prompt)}
          className="absolute right-3 bottom-3 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-brand-900/50 transition-all disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> APPLY AI
            </>
          )}
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mr-1">
          QUICK PROMPTS:
        </span>
        {quickPrompts.map((qp) => (
          <button
            key={qp}
            type="button"
            onClick={() => {
              setPrompt(qp);
              applyAITransform(qp);
            }}
            className="text-[11px] font-bold bg-zinc-800/90 hover:bg-brand-600/30 hover:text-brand-300 text-zinc-300 px-3 py-1 rounded-xl border border-zinc-700 hover:border-brand-500/50 transition-all cursor-pointer shadow-sm"
          >
            {qp}
          </button>
        ))}
      </div>
    </div>
  );
};
