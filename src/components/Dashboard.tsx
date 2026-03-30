import React, { useMemo } from "react";
import { 
  TrendingUp, 
  Users, 
  Truck, 
  FileText, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Bot,
  Edit2,
  Trash2,
  ExternalLink,
  Zap,
  Shield,
  Plus
} from "lucide-react";
import { Card, CardHeader, CardContent } from "./Card";
import { Button } from "./Button";
import { DocumentHistoryItem, PriceHistoryItem, SavedCustomer, SavedSupplier, DocumentType } from "../types";
import { AIChat } from "./AIChat";

interface DashboardProps {
  history: DocumentHistoryItem[];
  priceHistory: PriceHistoryItem[];
  customers: SavedCustomer[];
  suppliers: SavedSupplier[];
  industry?: string;
  letterhead?: string;
  onNavigate: (step: "dashboard" | "invoice" | "customers" | "suppliers" | "profile") => void;
  onOpenDocument: (doc: DocumentHistoryItem) => void;
  onDownloadPDF: (doc: DocumentHistoryItem) => void;
  onDeleteDocument: (timestamp: number) => void;
  onClearHistory: () => void;
  onViewAll: () => void;
}

import { motion } from "motion/react";

export const Dashboard = ({ 
  history, 
  priceHistory, 
  customers, 
  suppliers, 
  industry, 
  letterhead, 
  onNavigate, 
  onOpenDocument, 
  onDownloadPDF, 
  onDeleteDocument, 
  onClearHistory, 
  onViewAll
}: DashboardProps) => {
  const customerCount = useMemo(() => customers.length, [customers]);
  const supplierCount = useMemo(() => suppliers.length, [suppliers]);
  
  const totalSales = useMemo(() => history
    .filter(h => h.type === DocumentType.TAX_INVOICE)
    .reduce((acc, curr) => acc + curr.total, 0), [history]);
    
  const totalPurchases = useMemo(() => history
    .filter(h => h.type === DocumentType.PURCHASE_ORDER)
    .reduce((acc, curr) => acc + curr.total, 0), [history]);

  const recentDocs = useMemo(() => [...history]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10), [history]);



  const stats = useMemo(() => [
    { label: "Total Sales", value: `₹${totalSales.toLocaleString('en-IN')}`, icon: TrendingUp, color: "bg-emerald-500", lightColor: "bg-emerald-50", textColor: "text-emerald-600" },
    { label: "Total Purchases", value: `₹${totalPurchases.toLocaleString('en-IN')}`, icon: Truck, color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-600" },
    { label: "Customers", value: customerCount, icon: Users, color: "bg-purple-500", lightColor: "bg-purple-50", textColor: "text-purple-600", action: () => onNavigate("customers") },
    { label: "Suppliers", value: supplierCount, icon: Truck, color: "bg-orange-500", lightColor: "bg-orange-50", textColor: "text-orange-600", action: () => onNavigate("suppliers") },
  ], [totalSales, totalPurchases, customerCount, supplierCount, onNavigate]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card 
              className={`cursor-pointer group relative overflow-hidden h-full`}
              onClick={stat.action}
            >
              <CardContent className="p-4 sm:p-8">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.lightColor} rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`${stat.textColor} h-5 w-5 sm:h-6 sm:w-6`} />
                  </div>
                  {stat.action && <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />}
                </div>
                <p className="text-[10px] sm:text-sm font-bold text-zinc-500 uppercase tracking-widest mb-0.5 sm:mb-1">{stat.label}</p>
                <p className="text-xl sm:text-3xl font-black text-zinc-900 tracking-tight">{stat.value}</p>
                
                {/* Decorative background element */}
                <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.lightColor} opacity-20 rounded-full group-hover:scale-150 transition-transform duration-500`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardHeader 
              title="Recent Documents" 
              subtitle="Your latest invoices and orders"
              action={
                <div className="flex items-center gap-4">
                  {history.length > 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onViewAll}
                      className="text-brand-600 hover:text-brand-700 font-bold"
                    >
                      View All
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                  {history.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={onClearHistory}
                      className="text-zinc-400 hover:text-red-500 font-bold"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              }
            />
            <CardContent className="p-0">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Document</th>
                      <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Party</th>
                      <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-xs font-bold text-zinc-400 uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {recentDocs.length > 0 ? (
                      recentDocs.map((doc, index) => (
                        <tr 
                          key={`${doc.id}-${doc.timestamp}`} 
                          className="hover:bg-brand-50/30 transition-colors cursor-pointer group"
                          onClick={() => onDownloadPDF(doc)}
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.type === "Purchase Order" ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"}`}>
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-sm font-extrabold text-zinc-900 group-hover:text-brand-600 transition-colors">{doc.id}</p>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{doc.type}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-sm font-semibold text-zinc-600">{doc.customerName}</p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-sm font-medium text-zinc-500">{doc.date}</p>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <p className="text-sm font-black text-zinc-900">₹{doc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDownloadPDF(doc);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenDocument(doc);
                                  }}
                                  className="h-8 w-8 text-brand-600"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDocument(doc.timestamp);
                                  }}
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-zinc-400">
                            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                              <Clock className="h-8 w-8 opacity-20" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-base font-bold text-zinc-900">No documents yet</p>
                              <p className="text-sm">Start by creating your first invoice or order.</p>
                            </div>
                            <Button variant="primary" size="sm" onClick={() => onNavigate("invoice")} className="mt-2">
                              Create New Bill
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-zinc-100">
                {recentDocs.length > 0 ? (
                  recentDocs.map((doc) => (
                    <div 
                      key={`${doc.id}-${doc.timestamp}`}
                      className="p-4 active:bg-zinc-50 transition-colors"
                      onClick={() => onOpenDocument(doc)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.type === "Purchase Order" ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"}`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-zinc-900">{doc.id}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{doc.type}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-zinc-900">₹{doc.total.toLocaleString('en-IN')}</p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-zinc-600">{doc.customerName}</p>
                          <p className="text-xs text-zinc-400">{doc.date}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadPDF(doc);
                            }}
                            className="h-9 w-9"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDocument(doc);
                            }}
                            className="h-9 w-9 text-brand-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.timestamp);
                            }}
                            className="h-9 w-9 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm text-zinc-400 font-bold">No documents yet</p>
                    <Button variant="primary" size="sm" onClick={() => onNavigate("invoice")} className="mt-4 w-full">
                      Create New Bill
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-8"
        >
          <Card>
            <CardHeader title="Quick Actions" />
            <CardContent className="space-y-4">
              <Button 
                onClick={() => onNavigate("invoice")}
                className="w-full justify-between h-16 text-lg"
              >
                <div className="flex items-center gap-4">
                  <Zap className="h-6 w-6 fill-white" />
                  <span>New Invoice</span>
                </div>
                <ArrowUpRight className="h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => onNavigate("customers")}
                className="w-full justify-between h-14"
              >
                <div className="flex items-center gap-4">
                  <Users className="h-5 w-5 text-zinc-500" />
                  <span className="font-bold">Add Customer</span>
                </div>
                <Plus className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline"
                onClick={() => onNavigate("suppliers")}
                className="w-full justify-between h-14"
              >
                <div className="flex items-center gap-4">
                  <Truck className="h-5 w-5 text-zinc-500" />
                  <span className="font-bold">Add Supplier</span>
                </div>
                <Plus className="h-4 w-4" />
              </Button>
              
              <div className="pt-4 border-t border-zinc-100">
                <Card className="bg-brand-50 border-brand-100 shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                        <Bot className="text-white h-5 w-5" />
                      </div>
                      <p className="font-extrabold text-brand-900">AI Assistant</p>
                    </div>
                    <p className="text-xs text-brand-700 font-medium leading-relaxed mb-4">
                      Need help analyzing a bill or generating unique notes? Just ask!
                    </p>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="w-full bg-brand-900 hover:bg-black"
                      onClick={() => {
                        const btn = document.querySelector('.ai-chat-toggle') as HTMLButtonElement;
                        if (btn) btn.click();
                      }}
                    >
                      Open Chat
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <AIChat 
        history={history} 
        priceHistory={priceHistory} 
        customers={customers} 
        suppliers={suppliers} 
        industry={industry}
        letterhead={letterhead}
      />
    </div>
  );
};
