import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, X, MessageSquare, Zap } from "lucide-react";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Markdown from "react-markdown";
import { DocumentHistoryItem, PriceHistoryItem, SavedCustomer, SavedSupplier } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  history: DocumentHistoryItem[];
  priceHistory: PriceHistoryItem[];
  customers: SavedCustomer[];
  suppliers: SavedSupplier[];
  industry?: string;
  letterhead?: string;
}

export const AIChat = ({ history, priceHistory, customers, suppliers, industry, letterhead }: AIChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hello! I'm your ${industry || "business"} assistant. I remember all your previous quotations, prices, and parties. How can I help you today?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `
        You are an expert ${industry || "business"} assistant. 
        The business is in the ${industry || "general trading"} industry.
        You have access to the following data:
        
        DOCUMENT HISTORY:
        ${JSON.stringify(history.map(h => ({ id: h.id, type: h.type, date: h.date, party: h.customerName, total: h.total })), null, 2)}
        
        PRICE HISTORY (Last quoted prices for products):
        ${JSON.stringify(priceHistory, null, 2)}
        
        CUSTOMERS:
        ${JSON.stringify(customers.map(c => ({ name: c.name, gstin: c.gstin })), null, 2)}
        
        SUPPLIERS:
        ${JSON.stringify(suppliers.map(s => ({ name: s.name, gstin: s.gstin })), null, 2)}
        
        INSTRUCTIONS:
        1. Answer user questions accurately based on the provided data.
        2. IMPORTANT: Only documents of type "Tax Invoice" should be counted as "Sales". "Quotation", "Delivery Challan", and "Proforma Invoice" are preliminary documents and do NOT count towards total sales.
        3. "Purchase Order" documents count as "Purchases".
        4. When asked about prices or lists of items, use a clear and professional list format (bullet points or numbered lists) instead of tables.
        5. Be highly professional, concise, and analytical. Do not use overly enthusiastic language.
        6. Format your responses beautifully using Markdown (bolding, lists).
        7. If you cannot find a specific item, suggest checking the exact spelling or offer to show the most recent items from history.
        8. Keep responses focused on the data and business context.
        9. You have been provided with the user's company letterhead (if available). Use it to understand their branding, contact details, and professional style.
      `;

      // Filter out the initial greeting from the messages sent to the API
      const apiMessages = messages.slice(1).map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

      const contents: any[] = [...apiMessages];
      
      const currentMessageParts: any[] = [];
      if (letterhead && messages.length === 1) {
        // Only send letterhead on the first message to provide context
        currentMessageParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: letterhead.split(",")[1] || letterhead,
          }
        });
        currentMessageParts.push({ text: `[SYSTEM CONTEXT: This is the user's company letterhead for your reference] ${userMessage}` });
      } else {
        currentMessageParts.push({ text: userMessage });
      }

      contents.push({ role: "user", parts: currentMessageParts });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      const aiResponse = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="ai-chat-toggle fixed bottom-6 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95 z-50"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[90vw] max-w-[400px] h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden z-[60] animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-3 bg-white border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 p-1.5 rounded-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-zinc-900">{industry || "Business"} Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setMessages([{ role: "assistant", content: "Chat cleared. How can I help you now?" }])}
            className="text-xs font-medium text-zinc-500 px-3 py-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            Clear
          </button>
          <button onClick={() => setIsOpen(false)} className="hover:bg-zinc-100 p-1.5 rounded-lg transition-colors text-zinc-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
        {messages.map((m, i) => (
          <div key={i} className={`px-6 py-6 ${m.role === "assistant" ? "bg-zinc-50/50 border-y border-zinc-100/50" : ""}`}>
            <div className="flex gap-4 max-w-3xl mx-auto">
              <div className="flex-shrink-0 mt-1">
                {m.role === "user" ? (
                  <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200">
                    <User className="h-4 w-4 text-zinc-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-hidden">
                <div className="font-medium text-[10px] uppercase tracking-wider text-zinc-400">
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="text-zinc-700 text-sm leading-relaxed">
                  {m.role === "assistant" ? (
                    <div className="markdown-body">
                      <Markdown>{m.content}</Markdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="px-6 py-6 bg-zinc-50/50 border-y border-zinc-100/50">
            <div className="flex gap-4 max-w-3xl mx-auto">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center shadow-sm">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="font-medium text-[10px] uppercase tracking-wider text-zinc-400">Assistant</div>
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-zinc-100">
        <div className="relative max-w-3xl mx-auto">
          <textarea
            value={input ?? ""}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message Assistant..."
            className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2 bg-zinc-900 text-white rounded-lg disabled:opacity-50 hover:bg-zinc-800 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-zinc-400">Assistant can make mistakes. Check important info.</span>
        </div>
      </div>
    </div>
  );
};
