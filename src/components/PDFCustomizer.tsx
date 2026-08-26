import React from "react";
import { PDFLayoutSettings, PDFSection, PDFTemplate } from "../types";
import { MoveUp, MoveDown, Layout, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PDFCustomizerProps {
  settings: PDFLayoutSettings;
  onChange: (settings: PDFLayoutSettings) => void;
}

const SECTION_LABELS: Record<PDFSection, string> = {
  header: "Header (Title & Business Info)",
  party_details: "Party Details (Customer & Doc Info)",
  items_table: "Items Table",
  totals: "Totals & Grand Total",
  bank_details: "Bank Details",
  terms: "Terms & Conditions",
  signature: "Signature Section",
};

const TEMPLATES: { id: PDFTemplate; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Standard professional layout" },
  { id: "modern", name: "Modern", description: "Clean with darker headers" },
  { id: "minimal", name: "Minimal", description: "Simple without stripes" },
];

export const PDFCustomizer: React.FC<PDFCustomizerProps> = ({ settings, onChange }) => {
  const moveSection = (index: number, direction: "up" | "down") => {
    const newOrder = [...settings.sectionOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    
    onChange({ ...settings, sectionOrder: newOrder });
  };

  const setTemplate = (template: PDFTemplate) => {
    onChange({ ...settings, template });
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Layout className="w-5 h-5 text-emerald-600" />
          PDF Layout Customization
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                "p-4 rounded-lg border text-left transition-all",
                settings.template === t.id
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-zinc-900">{t.name}</span>
                {settings.template === t.id && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs text-zinc-500">{t.description}</p>
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-8">
          <label className="text-sm font-medium text-zinc-700 block mb-2">
            Letterhead Margins (mm)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1">Header Height</label>
              <input 
                type="number" 
                value={settings.headerHeight || 65} 
                onChange={(e) => onChange({ ...settings, headerHeight: Number(e.target.value) })}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block mb-1">Footer Height</label>
              <input 
                type="number" 
                value={settings.footerHeight || 40} 
                onChange={(e) => onChange({ ...settings, footerHeight: Number(e.target.value) })}
                className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Adjust these if your letterhead header or footer is being overlapped by content.
          </p>
        </div>
      </div>
      
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> If you have uploaded a letterhead in Business Settings, 
          it will be used as the background for all pages, and the default business header will be hidden.
        </p>
      </div>
    </div>
  );
};
