import React, { useState } from "react";
import { 
  Search, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Calendar, 
  User, 
  ChevronLeft,
  Filter,
  Download,
  Edit2
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";
import { Button } from "./Button";
import { DocumentHistoryItem, DocumentType } from "../types";

interface HistoryListProps {
  history: DocumentHistoryItem[];
  onOpenDocument: (doc: DocumentHistoryItem) => void;
  onDownloadPDF: (doc: DocumentHistoryItem) => void;
  onDeleteDocument: (timestamp: number) => void;
  onBack: () => void;
}

export const HistoryList = ({ history, onOpenDocument, onDownloadPDF, onDeleteDocument, onBack }: HistoryListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("All");

  const filteredHistory = history
    .filter(doc => {
      const matchesSearch = 
        doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "All" || doc.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const documentTypes = ["All", ...Object.values(DocumentType)];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Document History</h2>
            <p className="text-sm text-zinc-500">View and manage all your created documents</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by ID or customer name..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
            value={searchTerm ?? ""}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <select
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all appearance-none"
            value={filterType ?? "All"}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {documentTypes.map((type, idx) => (
              <option key={`${type}-${idx}`} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((doc, idx) => (
                    <tr 
                      key={`${doc.id}-${doc.timestamp}`} 
                      className="hover:bg-zinc-50 transition-colors group cursor-pointer"
                      onClick={() => onDownloadPDF(doc)}
                      title="Click to view PDF"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${doc.type === "Purchase Order" ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{doc.id}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-semibold">{doc.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-zinc-400" />
                          <p className="text-sm text-zinc-600">{doc.customerName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-zinc-400" />
                          <p className="text-sm text-zinc-500">{doc.date}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-zinc-900">
                          {doc.currency && doc.currency !== "INR" ? doc.currency : "₹"}
                          {doc.total.toLocaleString(doc.currency && doc.currency !== "INR" ? 'en-US' : 'en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadPDF(doc);
                            }}
                            className="p-2 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="View PDF"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDocument(doc);
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-lg text-zinc-400 hover:text-indigo-600 transition-colors"
                            title="Edit / Revise"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.timestamp);
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <FileText className="h-8 w-8 opacity-20" />
                        <p className="text-sm font-medium">No documents found matching your search</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
