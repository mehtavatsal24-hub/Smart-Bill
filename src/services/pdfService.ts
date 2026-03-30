import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InvoiceData, DocumentType, PDFSection, PDFLayoutSettings } from "../types";
import { format } from "date-fns";
import { CURRENCY_SYMBOLS } from "../constants";

const DEFAULT_LAYOUT: PDFLayoutSettings = {
  template: "classic",
  sectionOrder: ["header", "party_details", "items_table", "totals", "bank_details", "terms", "signature"],
  accentColor: "#1e1e1e",
};

export async function generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const { business, layoutSettings = DEFAULT_LAYOUT } = data;
  const hasLetterhead = !!business.letterhead;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Use dynamic margins if provided, otherwise fallback to defaults
  const headerHeight = layoutSettings.headerHeight || (hasLetterhead ? 65 : 25);
  const footerHeight = layoutSettings.footerHeight || (hasLetterhead ? 40 : 20);
  const SAFE_BOTTOM = footerHeight;
  let currentY = headerHeight;

  // Function to add letterhead to a page
  const addLetterhead = () => {
    if (business.letterhead) {
      try {
        let format = "JPEG";
        if (business.letterhead.startsWith("data:image/png")) format = "PNG";
        else if (business.letterhead.startsWith("data:image/webp")) format = "WEBP";
        doc.addImage(business.letterhead, format, 0, 0, 210, 297);
      } catch (e) {
        console.error("Failed to add letterhead to PDF", e);
      }
    }
  };

  // Initial letterhead
  addLetterhead();

  const sections: Record<PDFSection, (y: number) => number> = {
    header: (y) => {
      const { type } = data;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text(type.toUpperCase(), pageWidth / 2, y, { align: "center" });
      doc.setTextColor(0, 0, 0);

      if (!hasLetterhead) {
        if (business.logo) {
          try {
            let format = "PNG";
            if (business.logo.startsWith("data:image/jpeg") || business.logo.startsWith("data:image/jpg")) format = "JPEG";
            doc.addImage(business.logo, format, 15, 10, 25, 25);
          } catch (e) {}
        }
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(business.name, pageWidth - 15, 20, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const addressLines = doc.splitTextToSize(business.address, 80);
        doc.text(addressLines, pageWidth - 15, 26, { align: "right" });
        doc.text(`GSTIN: ${business.gstin}`, pageWidth - 15, 26 + (addressLines.length * 4), { align: "right" });
        doc.text(`Phone: ${business.phone}`, pageWidth - 15, 26 + (addressLines.length * 4) + 4, { align: "right" });
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 45, pageWidth - 15, 45);
        return Math.max(y + 8, 55);
      }
      return y + 8;
    },

    party_details: (y) => {
      const { customer, type, id, date, transport, poNumber } = data;
      const customerRows = [
        ["Customer:", customer.name],
        ["Address:", customer.address],
        customer.gstin ? ["GSTIN:", customer.gstin] : null,
        customer.email ? ["Email:", customer.email] : null,
        customer.contactPerson ? ["Contact:", customer.contactPerson] : null
      ].filter(Boolean) as string[][];

      autoTable(doc, {
        startY: y,
        body: customerRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 0 }, textColor: [0, 0, 0], font: "helvetica" },
        columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 1: { cellWidth: 75 } },
        margin: { left: 15 },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      const customerEndY = (doc as any).lastAutoTable.finalY;

      const docRows = [
        [type === DocumentType.QUOTATION ? "Quotation No:" : "Document No:", id],
        ["Date:", format(new Date(date), "dd/MM/yyyy")],
        transport ? ["Transport:", transport] : null,
        poNumber ? ["P.O Number:", poNumber] : null
      ].filter(Boolean) as string[][];

      autoTable(doc, {
        startY: y,
        body: docRows,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 0 }, textColor: [0, 0, 0], font: "helvetica" },
        columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
        margin: { left: 115 },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
        }
      });

      return Math.max(customerEndY, (doc as any).lastAutoTable.finalY) + 10;
    },

    items_table: (y) => {
      const { items, isExport, currency = "INR" } = data;
      const currencySymbol = currency === "INR" ? "Rs." : (CURRENCY_SYMBOLS[currency] || currency);
      const tableData = items.map((item, index) => [
        index + 1,
        item.description,
        item.hsn,
        item.isRegret ? "-" : `${item.quantity} ${item.unit || "NOS"}`,
        item.isRegret ? "REGRET" : `${isExport ? currencySymbol : "Rs."} ${item.rate.toLocaleString(isExport ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        item.isRegret ? "REGRET" : `${isExport ? currencySymbol : "Rs."} ${(item.quantity * item.rate).toLocaleString(isExport ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Description", "HSN", "Qty", `Rate (${currencySymbol})`, `Amount (${currencySymbol})`]],
        body: tableData,
        theme: layoutSettings.template === "minimal" ? "plain" : "striped",
        headStyles: { 
          fillColor: layoutSettings.template === "modern" ? [63, 63, 70] : [30, 30, 30],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'right', cellWidth: 38 },
          5: { halign: 'right', cellWidth: 42 },
        },
        didParseCell: (data) => {
          if (data.section === 'head') {
            if (data.column.index === 4 || data.column.index === 5) data.cell.styles.halign = 'right';
            else if (data.column.index === 0 || data.column.index === 2 || data.column.index === 3) data.cell.styles.halign = 'center';
          }
        },
        styles: { fontSize: 9, cellPadding: 2.5, font: "helvetica" },
        margin: { top: headerHeight - 5, bottom: SAFE_BOTTOM },
        didDrawPage: (d) => {
          if (hasLetterhead && d.pageNumber > 1) addLetterhead();
          if (d.pageNumber > 1) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(150, 150, 150);
            doc.text(`Continued from page ${d.pageNumber - 1}...`, 15, headerHeight - 10);
            doc.setTextColor(0, 0, 0);
          }
        },
        rowPageBreak: 'auto'
      });

      return (doc as any).lastAutoTable.finalY + 8;
    },

    totals: (y) => {
      const { items, discount = 0, discountRate = 0, isExport, currency = "INR", type, customer } = data;
      const subtotal = Math.round(items.reduce((acc, item) => acc + (item.isRegret ? 0 : item.quantity * item.rate), 0) * 100) / 100;
      const isQuotation = type === DocumentType.QUOTATION;
      const totalTax = isQuotation ? 0 : Math.round(items.reduce((acc, item) => acc + (item.isRegret ? 0 : (item.quantity * item.rate * item.taxRate) / 100), 0) * 100) / 100;
      const grandTotal = Math.max(0, Math.round((subtotal + totalTax - discount) * 100) / 100);
      const currencySymbol = currency === "INR" ? "Rs." : (CURRENCY_SYMBOLS[currency] || currency);

      const formatCurrency = (val: number) => {
        if (isExport) return `${currencySymbol} ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `Rs. ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      };

      const bizStateCode = business.gstin?.substring(0, 2);
      const custStateCode = customer.gstin?.substring(0, 2);
      const isValidBizState = bizStateCode && /^\d{2}$/.test(bizStateCode);
      const isValidCustState = custStateCode && /^\d{2}$/.test(custStateCode);
      const isInterState = !!(isValidBizState && isValidCustState && bizStateCode !== custStateCode) || isExport;

      if (y + 40 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        if (hasLetterhead) addLetterhead();
        y = headerHeight;
      }

      const totalsX = pageWidth - 85;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(252, 252, 252);
      
      const hasDiscount = discount > 0;
      let boxHeight = 12;
      if (!isQuotation) {
        boxHeight += 8;
        if (!isExport) boxHeight += isInterState ? 8 : 16;
      } else if (hasDiscount) boxHeight += 8;
      if (hasDiscount) boxHeight += 8;

      doc.rect(totalsX, y - 5, 70, boxHeight, "F");
      doc.rect(totalsX, y - 5, 70, boxHeight, "S");
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      let totalRowY = y + 1;
      
      if (!isQuotation) {
        doc.text(`Subtotal:`, totalsX + 5, totalRowY);
        doc.text(`${formatCurrency(subtotal)}`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
        if (!isExport) {
          if (isInterState) {
            doc.text(`IGST:`, totalsX + 5, totalRowY);
            doc.text(`${formatCurrency(totalTax)}`, pageWidth - 20, totalRowY, { align: "right" });
            totalRowY += 8;
          } else {
            doc.text(`CGST:`, totalsX + 5, totalRowY);
            doc.text(`${formatCurrency(totalTax / 2)}`, pageWidth - 20, totalRowY, { align: "right" });
            totalRowY += 8;
            doc.text(`SGST:`, totalsX + 5, totalRowY);
            doc.text(`${formatCurrency(totalTax / 2)}`, pageWidth - 20, totalRowY, { align: "right" });
            totalRowY += 8;
          }
        }
      } else if (hasDiscount) {
        doc.text(`Total:`, totalsX + 5, totalRowY);
        doc.text(`${formatCurrency(subtotal)}`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      }

      if (hasDiscount) {
        const discountLabel = discountRate > 0 ? `Discount (${discountRate}%):` : `Discount:`;
        doc.text(discountLabel, totalsX + 5, totalRowY);
        doc.text(`- ${formatCurrency(discount)}`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.line(totalsX + 2, totalRowY - 4, pageWidth - 17, totalRowY - 4);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Grand Total:`, totalsX + 5, totalRowY + 1);
      const finalTotalDisplay = isExport ? formatCurrency(grandTotal) : `INR ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(finalTotalDisplay, pageWidth - 20, totalRowY + 1, { align: "right" });

      return totalRowY + 12;
    },

    bank_details: (y) => {
      if (!business.bankName) return y;
      if (y + 22 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        if (hasLetterhead) addLetterhead();
        y = headerHeight;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("BANK DETAILS:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Bank: ${business.bankName}`, 15, y + 5);
      doc.text(`A/C: ${business.accountNumber}`, 15, y + 10);
      doc.text(`IFSC: ${business.ifscCode}`, 15, y + 15);
      return y + 20;
    },

    terms: (y) => {
      const { notes, terms } = data;
      
      if (!notes && !terms) return y;
      
      const body = [];
      if (notes && notes.trim()) {
        body.push(["NOTES / PAYMENT INSTRUCTIONS"]);
        body.push([notes]);
      }
      if (terms && terms.trim()) {
        body.push(["TERMS & CONDITIONS"]);
        body.push([terms]);
      }

      autoTable(doc, {
        startY: y,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3, textColor: [80, 80, 80], valign: 'top' },
        columnStyles: { 0: { fontStyle: 'normal' } },
        didParseCell: (data) => {
          if (data.cell.text[0] === "NOTES / PAYMENT INSTRUCTIONS" || data.cell.text[0] === "TERMS & CONDITIONS") {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.textColor = [50, 50, 50];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 15, right: 15, bottom: SAFE_BOTTOM },
        pageBreak: 'avoid'
      });
      return (doc as any).lastAutoTable.finalY + 8;
    },

    signature: (y) => {
      const sigHeight = business.signature ? 22 : 15;
      if (y + sigHeight + 10 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        if (hasLetterhead) addLetterhead();
        y = headerHeight + 5;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`For ${business.name}`, pageWidth - 15, y, { align: "right" });
      
      if (business.signature) {
        try {
          let format = "PNG";
          if (business.signature.startsWith("data:image/jpeg") || business.signature.startsWith("data:image/jpg")) format = "JPEG";
          doc.addImage(business.signature, format, pageWidth - 55, y + 2, 40, 15);
          y += 18;
        } catch (e) {}
      } else {
        y += 15;
      }
      doc.text("Authorized Signatory", pageWidth - 15, y, { align: "right" });
      return y + 10;
    }
  };

  // Execute sections in order
  layoutSettings.sectionOrder.forEach(sectionKey => {
    currentY = sections[sectionKey](currentY);
  });

  return doc;
}

export async function downloadInvoicePDF(data: InvoiceData): Promise<void> {
  const doc = await generateInvoicePDF(data);
  const { id, type } = data;
  const safeId = id.replace(/[\/\\]/g, "_").replace(/[^a-z0-9_\-]/gi, "_");
  const safeType = type.replace(/[^a-z0-9_\-]/gi, "_");
  doc.save(`${safeType}_${safeId}.pdf`);
}

