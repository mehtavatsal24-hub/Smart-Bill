import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Plus, Trash2, Edit3, Check, FileText } from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";
import { DEFAULT_TERMS } from "../constants";

interface NotesAndTermsSectionProps {
  customerName: string;
  notes: string;
  setNotes: (val: string) => void;
  showNotes: boolean;
  setShowNotes: (val: boolean) => void;
  terms: string;
  setTerms: (val: string) => void;
  showTerms: boolean;
  setShowTerms: (val: boolean) => void;
  onApplyClientPattern?: () => void;
  onUseRegularPattern?: () => void;
  suggestedNotes?: any;
  isAnalyzingPatterns?: boolean;
}

export const NotesAndTermsSection: React.FC<NotesAndTermsSectionProps> = ({
  customerName,
  notes,
  setNotes,
  showNotes,
  setShowNotes,
  terms,
  setTerms,
  showTerms,
  setShowTerms,
  onApplyClientPattern,
  onUseRegularPattern,
  suggestedNotes,
  isAnalyzingPatterns,
}) => {
  const [newTermInput, setNewTermInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isRawMode, setIsRawMode] = useState(false);

  // Parse numbered terms string into array
  const termsList: string[] = React.useMemo(() => {
    if (!terms) return [];
    return terms
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
  }, [terms]);

  // Sync terms list back to single formatted string
  const updateTermsList = (newList: string[]) => {
    const formatted = newList.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
    setTerms(formatted);

    // Save to customer memory if customerName exists
    if (customerName && customerName.trim()) {
      try {
        const memKey = `smartbill_cust_terms_${customerName.trim().toLowerCase()}`;
        localStorage.setItem(
          memKey,
          JSON.stringify({ notes, terms: formatted })
        );
      } catch (e) {}
    }
  };

  // Customer memory recall when customerName changes
  useEffect(() => {
    if (!customerName || !customerName.trim()) return;
    try {
      const memKey = `smartbill_cust_terms_${customerName.trim().toLowerCase()}`;
      const saved = localStorage.getItem(memKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.notes && !notes) setNotes(parsed.notes);
        if (parsed.terms && !terms) setTerms(parsed.terms);
      }
    } catch (e) {}
  }, [customerName]);

  const handleAddTerm = () => {
    if (!newTermInput.trim()) return;
    const updated = [...termsList, newTermInput.trim()];
    updateTermsList(updated);
    setNewTermInput("");
  };

  const handleRemoveTerm = (index: number) => {
    const updated = termsList.filter((_, idx) => idx !== index);
    updateTermsList(updated);
  };

  const handleStartEdit = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditingText(currentText);
  };

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return;
    const updated = [...termsList];
    updated[index] = editingText.trim();
    updateTermsList(updated);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleClearAll = () => {
    setTerms("");
  };

  return (
    <Card className="border-zinc-200 shadow-sm overflow-visible">
      <CardHeader
        title="Notes & Terms"
        subtitle="Manage payment notes, conditions, and per-customer memory"
      />
      <CardContent className="space-y-6">
        {/* Notes / Payment Instructions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-extrabold text-zinc-700 uppercase tracking-wider">
              NOTES / PAYMENT INSTRUCTIONS
            </label>
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                showNotes
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "bg-zinc-100 text-zinc-500 border border-zinc-200"
              }`}
            >
              {showNotes ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>{showNotes ? "Show in PDF" : "Hidden in PDF"}</span>
            </button>
          </div>
          <textarea
            rows={3}
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all resize-none"
            placeholder="Add any specific notes or payment instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="border-t border-zinc-100 pt-4"></div>

        {/* Terms & Conditions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <label className="block text-xs font-extrabold text-zinc-700 uppercase tracking-wider">
                TERMS & CONDITIONS
              </label>
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  showTerms
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                }`}
              >
                {showTerms ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>{showTerms ? "Show" : "Hide"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRawMode(!isRawMode)}
                className="text-[11px] font-bold text-zinc-400 hover:text-zinc-700 underline"
              >
                {isRawMode ? "Interactive Mode" : "Raw Text"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
            >
              CLEAR ALL
            </button>
          </div>

          {isRawMode ? (
            <textarea
              rows={6}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          ) : (
            <div className="space-y-3">
              {/* Insert extra terms box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 transition-all"
                  placeholder="Insert extra terms..."
                  value={newTermInput}
                  onChange={(e) => setNewTermInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTerm();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTerm}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* Terms List */}
              <div className="bg-zinc-50/50 border border-zinc-100 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
                {termsList.length === 0 ? (
                  <div className="p-4 text-center text-xs font-semibold text-zinc-400">
                    No terms added yet. Add custom conditions above.
                  </div>
                ) : (
                  termsList.map((termItem, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-white transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-xs font-extrabold text-zinc-900 min-w-[20px]">
                          {idx + 1}.
                        </span>
                        {editingIndex === idx ? (
                          <input
                            type="text"
                            className="flex-1 px-3 py-1 bg-white border border-brand-300 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(idx);
                            }}
                          />
                        ) : (
                          <span className="text-xs font-semibold text-zinc-800 leading-relaxed">
                            {termItem}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {editingIndex === idx ? (
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(idx)}
                            className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Save
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(idx, termItem)}
                            className="text-xs font-bold text-brand-600 hover:text-brand-800"
                          >
                            Edit
                          </button>
                        )}
                        <span className="text-zinc-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTerm(idx)}
                          className="text-xs font-bold text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
