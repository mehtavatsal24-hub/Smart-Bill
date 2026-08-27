import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { InvoiceData, DocumentType, PDFLayoutSettings } from "../types";

// ==========================================
// 1. LOCALIZATION & BOX HELPERS (INLINE)
// ==========================================

function getCountryConfig(countryName: string = "India") {
  const c = (countryName || "").toLowerCase();
  if (c.includes("uae") || c.includes("emirates") || c.includes("dubai")) {
    return { taxLabel: "TRN", currency: "AED" };
  }
  if (c.includes("usa") || c.includes("united states") || c.includes("america")) {
    return { taxLabel: "EIN / Tax ID", currency: "USD" };
  }
  if (c.includes("uk") || c.includes("kingdom") || c.includes("britain")) {
    return { taxLabel: "VAT Reg No", currency: "GBP" };
  }
  return { taxLabel: "GSTIN", currency: "INR" };
}

function getTaxName(countryName: string = "India") {
  const c = (countryName || "").toLowerCase();
  if (c.includes("uae") || c.includes("uk") || c.includes("europe")) return "VAT";
  return "GST";
}

function getUniquePhysicalBoxesCount(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  const boxes = new Set(items.map((i) => i.boxNo).filter(Boolean));
  return boxes.size;
}

// ==========================================
// 2. UTILITY FUNCTIONS & CURRENCY HELPERS
// ==========================================

function hexToRgb(hex: string): [number, number, number] {
  if (!hex) return [30, 30, 30];
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return [30, 30, 30];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function normalizeDocType(dt: any): string {
  if (!dt) return "";
  const s = String(dt).trim().toLowerCase().replace(/_/g, " ");
  if (s === "tax invoice" || s === "taxinvoice" || s === "invoice") return "invoice";
  if (s === "proforma invoice" || s === "proformainvoice") return "proforma invoice";
  if (s === "quotation") return "quotation";
  if (s === "purchase order" || s === "purchaseorder") return "purchase order";
  if (s === "packing list" || s === "packinglist") return "packing list";
  if (s === "cost sheet" || s === "costsheet") return "cost sheet";
  return s;
}

export function getPdfCurrencySymbol(currencyCode: string = "INR"): string {
  switch (currencyCode) {
    case "INR":
      return "Rs.";
    case "USD":
      return "$";
    case "EUR":
      return "EUR";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "A$";
    case "AED":
      return "AED";
    case "SGD":
      return "S$";
    case "JPY":
      return "¥";
    default:
      return currencyCode;
  }
}

/**
 * Draws key-value header cell with word-wrapping logic.
 */
export const drawHeaderField = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  cellWidth: number,
  padding: number = 2
): number => {
  const contentWidth = cellWidth - padding * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(15, 23, 42);
  const labelText = `${label}: `;
  const labelWidth = doc.getTextWidth(labelText);

  const remainingFirstLineWidth = Math.max(10, contentWidth - labelWidth);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  const words = (value || "").trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = doc.getTextWidth(testLine);
    const maxAllowedWidth = lines.length === 0 ? remainingFirstLineWidth : contentWidth;

    if (testWidth <= maxAllowedWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);

  const lineHeight = 3.8;
  let currentY = y + padding + 2.5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(labelText, x + padding, currentY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  if (lines.length > 0) {
    doc.text(lines[0], x + padding + labelWidth, currentY);
    for (let i = 1; i < lines.length; i++) {
      currentY += lineHeight;
      doc.text(lines[i], x + padding, currentY);
    }
  }

  const totalHeight = (lines.length > 1 ? (lines.length - 1) * lineHeight : 0) + padding * 2 + 4;
  return Math.max(totalHeight, 10);
};

// ==========================================
// 3. NUMBER TO WORDS (INDIAN & INTERNATIONAL)
// ==========================================

export function numberToWords(amount: number, currency: string = "INR"): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion", "Trillion"];

  if (amount === 0) return "Zero";

  function convertChunk(num: number): string {
    let str = "";
    if (num >= 100) {
      str += units[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    }
    if (num > 0) {
      str += units[num] + " ";
    }
    return str.trim();
  }

  const isINR = currency === "INR";
  const wholePart = Math.floor(amount);
  const decimalPart = Math.round((amount - wholePart) * 100);

  let result = "";

  if (isINR) {
    const formatIndian = (num: number): string => {
      if (num === 0) return "";
      let res = "";
      if (num >= 10000000) {
        res += formatIndian(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
      }
      if (num >= 100000) {
        res += formatIndian(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
      }
      if (num >= 1000) {
        res += formatIndian(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
      }
      if (num > 0) {
        res += convertChunk(num);
      }
      return res.trim();
    };
    result = formatIndian(wholePart);
  } else {
    let scaleIdx = 0;
    let tempNum = wholePart;
    while (tempNum > 0) {
      const chunk = tempNum % 1000;
      if (chunk > 0) {
        result = convertChunk(chunk) + " " + scales[scaleIdx] + " " + result;
      }
      tempNum = Math.floor(tempNum / 1000);
      scaleIdx++;
    }
  }

  result = result.trim() || "Zero";
  const currencyName = isINR ? "Rupees" : (currency === "USD" ? "Dollars" : currency);
  const subCurrencyName = isINR ? "Paise" : "Cents";

  if (decimalPart > 0) {
    return `${currencyName} ${result} and ${convertChunk(decimalPart)} ${subCurrencyName} Only`;
  }
  return `${currencyName} ${result} Only`;
}

// ==========================================
// 4. MAIN PDF GENERATOR ENGINE
// ==========================================

const DEFAULT_LAYOUT: PDFLayoutSettings = {
  template: "classic",
  sectionOrder: ["header", "party_details", "items_table", "totals", "bank_details", "incoterms", "terms", "signature"],
  accentColor: "#1e1e1e",
};

export async function generateInvoicePDF(data: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const { business, layoutSettings = DEFAULT_LAYOUT } = data;
  const hasLetterhead = !!(business.letterhead && business.letterhead.trim().length > 10);
  const hideForPreprinted = !!layoutSettings.hideForPreprintedLetterhead;
  const needsLetterheadSpace = hasLetterhead || hideForPreprinted;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const defaultHeader = needsLetterheadSpace ? 65 : 25;
  const defaultFooter = needsLetterheadSpace ? 35 : 20;

  const headerHeight = (typeof layoutSettings.headerHeight === "number" && layoutSettings.headerHeight > 0)
    ? layoutSettings.headerHeight
    : defaultHeader;

  const footerHeight = (typeof layoutSettings.footerHeight === "number" && layoutSettings.footerHeight > 0)
    ? layoutSettings.footerHeight
    : defaultFooter;

  const SAFE_BOTTOM = footerHeight;
  let currentY = headerHeight;

  // Helper to format all dates cleanly as dd/MM/yyyy (e.g., 26/08/2026) across all document types
  const formatDateClean = (dStr: any) => {
    if (!dStr || dStr === "-") return "";
    try {
      const parsed = new Date(dStr);
      if (isNaN(parsed.getTime())) return dStr;
      return format(parsed, "dd/MM/yyyy");
    } catch (e) {
      return dStr;
    }
  };

  // Add letterhead background if provided
  const addLetterhead = () => {
    if (hideForPreprinted) return;
    if (business.letterhead) {
      try {
        let formatType = "JPEG";
        if (business.letterhead.startsWith("data:image/png")) formatType = "PNG";
        else if (business.letterhead.startsWith("data:image/webp")) formatType = "WEBP";
        doc.addImage(business.letterhead, formatType, 0, 0, 210, 297);
      } catch (e) {
        console.error("Failed to add letterhead", e);
      }
    }
  };

  const originalAddPage = doc.addPage.bind(doc);
  (doc as any).addPage = function (...args: any[]) {
    originalAddPage(...args);
    if (hasLetterhead && !hideForPreprinted) addLetterhead();
    return this;
  };

  if (hasLetterhead && !hideForPreprinted) addLetterhead();

  const { items = [], discount = 0, isExport, currency = "INR", type, customer } = data;
  const dataAny = data as any;

  const sections: Record<string, (y: number) => number> = {
    // -------------------------------------------------------------
    // SECTION: HEADER (Company Name, Logo, Address, Tax Number)
    // -------------------------------------------------------------
    header: (y) => {
      if (hasLetterhead || hideForPreprinted) return y;

      const startY = 10;
      let curY = startY;
      const leftX = 15;
      const rightX = pageWidth - 15;
      const contentWidth = rightX - leftX;

      let logoWidth = 0;
      let logoHeight = 0;
      let logoBottomY = curY;

      if (business.logo) {
        try {
          let formatType = "PNG";
          if (business.logo.startsWith("data:image/jpeg") || business.logo.startsWith("data:image/jpg")) formatType = "JPEG";
          const imgProps = doc.getImageProperties(business.logo);
          const aspect = imgProps.width / imgProps.height;
          const maxW = 42;
          const maxH = 20;

          if (aspect > maxW / maxH) {
            logoWidth = maxW;
            logoHeight = maxW / aspect;
          } else {
            logoHeight = maxH;
            logoWidth = maxH * aspect;
          }

          doc.addImage(business.logo, formatType, rightX - logoWidth, curY, logoWidth, logoHeight);
          logoBottomY = curY + logoHeight;
        } catch (e) {
          logoWidth = 0;
          logoHeight = 0;
        }
      }

      const maxLeftWidth = logoWidth > 0 ? contentWidth - logoWidth - 8 : contentWidth;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      const companyTitle = (business.name || "YOUR BUSINESS NAME").toUpperCase();
      const titleLines = doc.splitTextToSize(companyTitle, maxLeftWidth);
      doc.text(titleLines, leftX, curY + 5);
      curY += titleLines.length * 6.5 + 1;

      if (business.industry) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const tagLines = doc.splitTextToSize(business.industry, maxLeftWidth);
        doc.text(tagLines, leftX, curY + 2);
        curY += tagLines.length * 3.8 + 2;
      } else {
        curY += 2;
      }

      const colGap = 4;
      const addrWidth = logoWidth > 0 ? Math.floor(maxLeftWidth * 0.52) : 95;
      const contactWidth = maxLeftWidth - addrWidth - colGap;
      const contactX = leftX + addrWidth + colGap;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      let leftY = curY;
      if (business.address) {
        const addressLines = doc.splitTextToSize(business.address, addrWidth);
        doc.text(addressLines, leftX, leftY);
        leftY += addressLines.length * 3.8;
      }

      let rightY = curY;
      const bizTaxLabel = getCountryConfig(business.country || dataAny.countryOfOrigin || "India").taxLabel;
      const contactLines: string[] = [];
      if (business.phone) contactLines.push(`Tel : ${business.phone}`);
      if (business.email) contactLines.push(`Email : ${business.email}`);
      if (business.gstin) contactLines.push(`${bizTaxLabel} : ${business.gstin}`);

      contactLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, contactWidth);
        doc.text(wrapped, contactX, rightY);
        rightY += wrapped.length * 3.8;
      });

      const headerBottomY = Math.max(leftY, rightY, logoBottomY) + 4;

      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.6);
      doc.line(leftX, headerBottomY, rightX, headerBottomY);

      doc.setLineWidth(0.2);
      doc.line(leftX, headerBottomY + 0.8, rightX, headerBottomY + 0.8);

      return Math.max(headerBottomY + 4, headerHeight);
    },

    // -------------------------------------------------------------
    // SECTION: PARTY DETAILS (Buyer, Consignee & Document Metadata)
    // -------------------------------------------------------------
    party_details: (y) => {
      const leftMargin = 15;
      const rightMargin = 15;
      const totalWidth = pageWidth - leftMargin - rightMargin; // 180mm

      // Branching: Quotation, Purchase Order, Delivery Challan use Image 2 reference layout
      if (type !== DocumentType.TAX_INVOICE && type !== DocumentType.PROFORMA_INVOICE && type !== DocumentType.PACKING_LIST) {
        // 1. Title Banner Bar
        const docTitle = type === DocumentType.QUOTATION 
          ? "QUOTATION" 
          : (type === DocumentType.PURCHASE_ORDER 
            ? "PURCHASE ORDER" 
            : "DELIVERY CHALLAN");

        autoTable(doc, {
          startY: y,
          head: [[docTitle]],
          theme: 'grid',
          headStyles: {
            fillColor: [242, 245, 250],
            textColor: [30, 30, 30],
            fontSize: 9.5,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 2.5,
            lineWidth: 0.2,
            lineColor: [180, 185, 195],
          },
          margin: { left: leftMargin, right: rightMargin, top: headerHeight },
        });

        const topRefStartY = (doc as any).lastAutoTable.finalY;

        // 2. Top Document Reference Row(s)
        const docLabel = type === DocumentType.QUOTATION 
          ? "Quotation No. -" 
          : (type === DocumentType.PURCHASE_ORDER 
            ? "P.O. No. -" 
            : "Challan No. -");

        const dateLabel = type === DocumentType.QUOTATION 
          ? "Quotation Date -" 
          : (type === DocumentType.PURCHASE_ORDER 
            ? "P.O. Date -" 
            : "Date -");

        const dateFormatted = data.date ? formatDateClean(data.date) : "";

        const topRefRows: string[][] = [
          [`${docLabel} ${data.id}`, `${dateLabel} ${dateFormatted}`]
        ];

        const paymentTermsText = data.paymentTermsCustom || (data.paymentTermsDays ? `${data.paymentTermsDays} ${data.paymentTermsUnit || "Days"}` : "") || dataAny.paymentTerms;
        const dueOrValid = type === DocumentType.QUOTATION 
          ? (data.validUntilDate ? formatDateClean(data.validUntilDate) : "") 
          : formatDateClean(data.dueDate);

        if (paymentTermsText && paymentTermsText.trim() && paymentTermsText !== "-") {
          if (dueOrValid && dueOrValid.trim() && dueOrValid !== "-") {
            const validLabel = type === DocumentType.QUOTATION ? "Valid Until -" : "Terms / Due Date -";
            topRefRows.push([`Payment Terms - ${paymentTermsText}`, `${validLabel} ${dueOrValid}`]);
          } else {
            topRefRows.push([`Payment Terms - ${paymentTermsText}`, ""]);
          }
        } else if (dueOrValid && dueOrValid.trim() && dueOrValid !== "-") {
          const validLabel = type === DocumentType.QUOTATION ? "Valid Until -" : "Terms / Due Date -";
          topRefRows.push([`${validLabel} ${dueOrValid}`, ""]);
        }

        autoTable(doc, {
          startY: topRefStartY,
          body: topRefRows,
          theme: 'grid',
          styles: {
            fontSize: 7.5,
            cellPadding: 2.2,
            textColor: [30, 30, 30],
            font: "helvetica",
            lineWidth: 0.2,
            lineColor: [180, 185, 195],
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 90 },
            1: { cellWidth: 90 }
          },
          didParseCell: (dataCell) => {
            const rawRow = dataCell.row.raw as string[];
            if (rawRow && rawRow[1] === "" && dataCell.column.index === 0) {
              dataCell.cell.colSpan = 2;
            }
          },
          margin: { left: leftMargin, right: rightMargin, top: headerHeight }
        });

        const bottomBlockStartY = (doc as any).lastAutoTable.finalY;

        // 3. Bottom 2 Equal Columns (90mm Left Vendor, 90mm Right Customer)
        const vendorRows: string[][] = [
          ["VENDOR DETAILS", ""],
          ["M/S -", business.name || "-"],
        ];
        if (business.address) vendorRows.push(["Address -", business.address]);
        if (business.phone) vendorRows.push(["Phone -", business.phone]);
        if (business.email) vendorRows.push(["E-Mail -", business.email]);
        if (business.gstin) vendorRows.push(["GSTIN/UIN -", business.gstin]);
        if (business.country || business.state) vendorRows.push(["State -", business.state || business.country || ""]);

        const customerRows: string[][] = [
          ["CUSTOMER DETAILS", ""],
          ["M/S -", customer.name || "-"],
        ];
        if (customer.address) customerRows.push(["Address -", customer.address]);
        if (customer.phone) customerRows.push(["Phone -", customer.phone]);
        if (customer.email) customerRows.push(["E-Mail -", customer.email]);
        if (customer.gstin) customerRows.push(["GSTIN/UIN -", customer.gstin]);
        customerRows.push(["Place of Supply -", "India"]);
        if (data.consigneeName) customerRows.push(["Shipped To (Consignee) -", data.consigneeName]);
        if (data.consigneeAddress) customerRows.push(["Ship Addr -", data.consigneeAddress]);

        // Render Vendor Column (x = 15 to x = 105)
        autoTable(doc, {
          startY: bottomBlockStartY,
          body: vendorRows,
          theme: 'plain',
          styles: {
            fontSize: 7.5,
            cellPadding: { top: 0.8, bottom: 0.8, left: 2.5, right: 2.5 },
            textColor: [20, 20, 20],
            font: "helvetica"
          },
          columnStyles: {
            0: { cellWidth: 90, fontStyle: 'normal' }
          },
          didParseCell: (dataCell) => {
            if (dataCell.cell.raw === "VENDOR DETAILS") {
              dataCell.cell.styles.fillColor = [242, 245, 250];
              dataCell.cell.styles.fontStyle = 'bold';
              dataCell.cell.styles.textColor = [30, 30, 30];
              dataCell.cell.styles.fontSize = 7.5;
              dataCell.cell.styles.cellPadding = { top: 2.0, bottom: 2.0, left: 2.5, right: 2.5 };
              dataCell.cell.colSpan = 2;
            }
          },
          didDrawCell: (dataCell) => {
            if (dataCell.cell.raw === "VENDOR DETAILS") {
              doc.setDrawColor(180, 185, 195);
              doc.setLineWidth(0.2);
              doc.line(dataCell.cell.x, dataCell.cell.y, dataCell.cell.x + 90, dataCell.cell.y);
              doc.line(dataCell.cell.x, dataCell.cell.y + dataCell.cell.height, dataCell.cell.x + 90, dataCell.cell.y + dataCell.cell.height);
            } else if (dataCell.section === 'body' && Array.isArray(dataCell.row.raw)) {
              const label = String(dataCell.row.raw[0] || "");
              const val = String(dataCell.row.raw[1] || "");
              if (label && label !== "VENDOR DETAILS") {
                doc.setFillColor(255, 255, 255);
                doc.rect(dataCell.cell.x + 0.1, dataCell.cell.y + 0.1, dataCell.cell.width - 0.2, dataCell.cell.height - 0.2, 'F');

                const paddingX = dataCell.cell.x + 2.5;
                const availW = dataCell.cell.width - 5;
                const posY = dataCell.cell.y + (dataCell.cell.height / 2) + 0.9;

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);
                doc.text(label, paddingX, posY);

                const labelW = doc.getTextWidth(label);
                const isBoldVal = (label === "M/S -");

                doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);

                const valWrapped = doc.splitTextToSize(val, availW - labelW - 1.5);
                if (valWrapped.length <= 1) {
                  doc.text(` ${val}`, paddingX + labelW, posY);
                } else {
                  doc.text(` ${valWrapped[0]}`, paddingX + labelW, posY);
                  for (let lineIdx = 1; lineIdx < valWrapped.length; lineIdx++) {
                    doc.text(valWrapped[lineIdx], paddingX + labelW + 1.5, posY + (lineIdx * 3.5));
                  }
                }
              }
            }
          },
          margin: { left: leftMargin, right: pageWidth - leftMargin - 90, top: headerHeight }
        });

        const leftFinalY = (doc as any).lastAutoTable.finalY;

        // Render Customer Column (x = 105 to x = 195)
        autoTable(doc, {
          startY: bottomBlockStartY,
          body: customerRows,
          theme: 'plain',
          styles: {
            fontSize: 7.5,
            cellPadding: { top: 0.8, bottom: 0.8, left: 2.5, right: 2.5 },
            textColor: [20, 20, 20],
            font: "helvetica"
          },
          columnStyles: {
            0: { cellWidth: 90, fontStyle: 'normal' }
          },
          didParseCell: (dataCell) => {
            if (dataCell.cell.raw === "CUSTOMER DETAILS") {
              dataCell.cell.styles.fillColor = [242, 245, 250];
              dataCell.cell.styles.fontStyle = 'bold';
              dataCell.cell.styles.textColor = [30, 30, 30];
              dataCell.cell.styles.fontSize = 7.5;
              dataCell.cell.styles.cellPadding = { top: 2.0, bottom: 2.0, left: 2.5, right: 2.5 };
              dataCell.cell.colSpan = 2;
            }
          },
          didDrawCell: (dataCell) => {
            if (dataCell.cell.raw === "CUSTOMER DETAILS") {
              doc.setDrawColor(180, 185, 195);
              doc.setLineWidth(0.2);
              doc.line(dataCell.cell.x, dataCell.cell.y, dataCell.cell.x + 90, dataCell.cell.y);
              doc.line(dataCell.cell.x, dataCell.cell.y + dataCell.cell.height, dataCell.cell.x + 90, dataCell.cell.y + dataCell.cell.height);
            } else if (dataCell.section === 'body' && Array.isArray(dataCell.row.raw)) {
              const label = String(dataCell.row.raw[0] || "");
              const val = String(dataCell.row.raw[1] || "");
              if (label && label !== "CUSTOMER DETAILS") {
                doc.setFillColor(255, 255, 255);
                doc.rect(dataCell.cell.x + 0.1, dataCell.cell.y + 0.1, dataCell.cell.width - 0.2, dataCell.cell.height - 0.2, 'F');

                const paddingX = dataCell.cell.x + 2.5;
                const availW = dataCell.cell.width - 5;
                const posY = dataCell.cell.y + (dataCell.cell.height / 2) + 0.9;

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);
                doc.text(label, paddingX, posY);

                const labelW = doc.getTextWidth(label);
                const isBoldVal = (label === "M/S -" || label === "Shipped To (Consignee) -");

                doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);

                const valWrapped = doc.splitTextToSize(val, availW - labelW - 1.5);
                if (valWrapped.length <= 1) {
                  doc.text(` ${val}`, paddingX + labelW, posY);
                } else {
                  doc.text(` ${valWrapped[0]}`, paddingX + labelW, posY);
                  for (let lineIdx = 1; lineIdx < valWrapped.length; lineIdx++) {
                    doc.text(valWrapped[lineIdx], paddingX + labelW + 1.5, posY + (lineIdx * 3.5));
                  }
                }
              }
            }
          },
          margin: { left: leftMargin + 90, right: rightMargin, top: headerHeight }
        });

        const rightFinalY = (doc as any).lastAutoTable.finalY;
        const finalSectionY = Math.max(leftFinalY, rightFinalY);

        // Outer border box matching exact height + vertical divider line down the middle (x = 105)
        doc.setDrawColor(180, 185, 195);
        doc.setLineWidth(0.3);
        doc.rect(leftMargin, topRefStartY, totalWidth, finalSectionY - topRefStartY);
        doc.line(leftMargin + 90, bottomBlockStartY, leftMargin + 90, finalSectionY);

        return finalSectionY + 8;
      }

      // --- TAX INVOICE / PROFORMA INVOICE / PACKING LIST LAYOUT ---
      const leftColWidth = 95;
      const rightColWidth = totalWidth - leftColWidth; // 85mm

      // 1. Title Header Bar
      autoTable(doc, {
        startY: y,
        head: [[type.toUpperCase()]],
        theme: 'grid',
        headStyles: {
          fillColor: [242, 245, 250],
          textColor: [30, 30, 30],
          fontSize: 9.5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2.5,
          lineWidth: 0.2,
          lineColor: [180, 185, 195],
        },
        margin: { left: leftMargin, right: rightMargin, top: headerHeight },
      });

      const blockStartY = (doc as any).lastAutoTable.finalY;

      // 2. Prepare Left Column Rows with Bold Labels & Bold Names (NO inner horizontal lines & NO gap!)
      const leftRows: string[][] = [
        ["VENDOR DETAILS", ""],
        ["M/S -", business.name || "-"],
      ];

      if (business.address) leftRows.push(["Address -", business.address]);
      if (business.email) leftRows.push(["E-Mail -", business.email]);
      if (business.phone) leftRows.push(["Phone -", business.phone]);
      if (business.gstin) leftRows.push(["GSTIN -", business.gstin]);
      if (business.country && !business.gstin) leftRows.push(["State -", business.state || business.country]);

      leftRows.push(["BUYER & CONSIGNEE DETAILS", ""]);
      leftRows.push(["Billed To (Buyer) -", customer.name || "-"]);
      if (customer.address) leftRows.push(["Buyer Addr -", customer.address]);
      if (customer.gstin) leftRows.push(["Buyer GSTIN -", customer.gstin]);
      if (customer.contactPerson) leftRows.push(["Contact Person -", customer.contactPerson]);
      if (data.consigneeName) leftRows.push(["Shipped To (Consignee) -", data.consigneeName]);
      if (data.consigneeAddress) leftRows.push(["Ship Addr -", data.consigneeAddress]);
      if (data.consigneeGstin) leftRows.push(["Consignee GSTIN -", data.consigneeGstin]);
      if (dataAny.buyerClientDetails) leftRows.push(["Buyer Details -", dataAny.buyerClientDetails]);

      autoTable(doc, {
        startY: blockStartY,
        body: leftRows,
        theme: 'plain',
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 0.8, bottom: 0.8, left: 2.5, right: 2.5 },
          textColor: [20, 20, 20],
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: leftColWidth, fontStyle: 'normal' }
        },
        didParseCell: (dataCell) => {
          if (dataCell.cell.raw === "VENDOR DETAILS" || dataCell.cell.raw === "BUYER & CONSIGNEE DETAILS") {
            dataCell.cell.styles.fillColor = [242, 245, 250];
            dataCell.cell.styles.fontStyle = 'bold';
            dataCell.cell.styles.textColor = [30, 30, 30];
            dataCell.cell.styles.fontSize = 7.5;
            dataCell.cell.styles.cellPadding = { top: 2.0, bottom: 2.0, left: 2.5, right: 2.5 };
            dataCell.cell.colSpan = 2;
          }
        },
        didDrawCell: (dataCell) => {
          if (dataCell.cell.raw === "VENDOR DETAILS" || dataCell.cell.raw === "BUYER & CONSIGNEE DETAILS") {
            doc.setDrawColor(180, 185, 195);
            doc.setLineWidth(0.2);
            doc.line(dataCell.cell.x, dataCell.cell.y, dataCell.cell.x + leftColWidth, dataCell.cell.y);
            doc.line(dataCell.cell.x, dataCell.cell.y + dataCell.cell.height, dataCell.cell.x + leftColWidth, dataCell.cell.y + dataCell.cell.height);
          } else if (dataCell.section === 'body' && Array.isArray(dataCell.row.raw)) {
            const label = String(dataCell.row.raw[0] || "");
            const val = String(dataCell.row.raw[1] || "");
            if (label && label !== "VENDOR DETAILS" && label !== "BUYER & CONSIGNEE DETAILS") {
              doc.setFillColor(255, 255, 255);
              doc.rect(dataCell.cell.x + 0.1, dataCell.cell.y + 0.1, dataCell.cell.width - 0.2, dataCell.cell.height - 0.2, 'F');

              const paddingX = dataCell.cell.x + 2.5;
              const availW = dataCell.cell.width - 5;
              const posY = dataCell.cell.y + (dataCell.cell.height / 2) + 0.9;

              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(30, 30, 30);
              doc.text(label, paddingX, posY);

              const labelW = doc.getTextWidth(label);
              const isBoldVal = (label === "M/S -" || label === "Billed To (Buyer) -" || label === "Shipped To (Consignee) -");

              doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(30, 30, 30);

              const valWrapped = doc.splitTextToSize(val, availW - labelW - 1.5);
              if (valWrapped.length <= 1) {
                doc.text(` ${val}`, paddingX + labelW, posY);
              } else {
                doc.text(` ${valWrapped[0]}`, paddingX + labelW, posY);
                for (let lineIdx = 1; lineIdx < valWrapped.length; lineIdx++) {
                  doc.text(valWrapped[lineIdx], paddingX + labelW + 1.5, posY + (lineIdx * 3.5));
                }
              }
            }
          }
        },
        margin: { left: leftMargin, right: pageWidth - leftMargin - leftColWidth, top: headerHeight },
      });

      const leftFinalY = (doc as any).lastAutoTable.finalY;

      // 3. Build Right Column Pairs (Strict Row-by-Row Filtering - ONLY Non-Empty Values!)
      const docLabel = "Invoice No. -";
      const dateFormatted = data.date ? formatDateClean(data.date) : "";

      const pairRow1: Array<{ k: string; v: string }> = [
        { k: `${docLabel}`, v: data.id }
      ];
      if (dateFormatted) pairRow1.push({ k: "Dated -", v: dateFormatted });

      const pairRow2: Array<{ k: string; v: string }> = [];
      if (data.dispatchRef && data.dispatchRef.trim() && data.dispatchRef !== "-") {
        pairRow2.push({ k: "Delivery Note -", v: data.dispatchRef });
      }
      if (data.modeOfPayment && data.modeOfPayment.trim() && data.modeOfPayment !== "-") {
        pairRow2.push({ k: "Mode of Payment -", v: data.modeOfPayment });
      }

      const pairRow3: Array<{ k: string; v: string }> = [];
      if (data.poNumber && data.poNumber.trim() && data.poNumber !== "-") {
        pairRow3.push({ k: "Order No. -", v: data.poNumber });
      }
      if (data.poDate && data.poDate.trim() && data.poDate !== "-") {
        pairRow3.push({ k: "Order Date -", v: formatDateClean(data.poDate) });
      }

      const pairRow4: Array<{ k: string; v: string }> = [];
      const paymentTermsText = data.paymentTermsCustom || (data.paymentTermsDays ? `${data.paymentTermsDays} ${data.paymentTermsUnit || "Days"}` : "") || dataAny.paymentTerms;
      if (paymentTermsText && paymentTermsText.trim() && paymentTermsText !== "-") {
        pairRow4.push({ k: "Payment Terms -", v: paymentTermsText });
      }

      const dueOrValidDate = data.validUntilDate || data.dueDate;
      if (dueOrValidDate && dueOrValidDate.trim() && dueOrValidDate !== "-") {
        pairRow4.push({ k: "Terms / Due Date -", v: formatDateClean(dueOrValidDate) });
      }

      const pairRow5: Array<{ k: string; v: string }> = [];
      const dispatchViaText = data.despatchedThrough || data.transport || dataAny.vehicleNo;
      if (dispatchViaText && dispatchViaText.trim() && dispatchViaText !== "-") {
        pairRow5.push({ k: "Dispatch Via -", v: dispatchViaText });
      }

      const destText = data.destination || dataAny.finalDestination;
      if (destText && destText.trim() && destText !== "-") {
        pairRow5.push({ k: "Destination -", v: destText });
      }

      const pairRow6: Array<{ k: string; v: string }> = [];
      if (data.preCarriageBy && data.preCarriageBy.trim() && data.preCarriageBy !== "-") {
        pairRow6.push({ k: "Dispatch Mode -", v: data.preCarriageBy });
      }
      if (data.placeOfReceipt && data.placeOfReceipt.trim() && data.placeOfReceipt !== "-") {
        pairRow6.push({ k: "Place of Receipt -", v: data.placeOfReceipt });
      }

      const pairRow7: Array<{ k: string; v: string }> = [];
      if (data.noOfPackages && data.noOfPackages.trim() && data.noOfPackages !== "-") {
        pairRow7.push({ k: "No. of Packages -", v: data.noOfPackages });
      }
      if (data.transportationReason && data.transportationReason.trim() && data.transportationReason !== "-" && data.transportationReason !== "Supply") {
        pairRow7.push({ k: "Reason -", v: data.transportationReason });
      }

      const allRows: Array<Array<{ k: string; v: string }>> = [
        pairRow1, pairRow2, pairRow3, pairRow4, pairRow5, pairRow6, pairRow7
      ].filter(r => r.length > 0);

      // 2-Column inline table format
      const rightTableBody: any[][] = allRows.map(row => {
        if (row.length === 2) {
          return [row[0], row[1]];
        } else {
          return [row[0], null];
        }
      });

      const totalLeftHeight = leftFinalY - blockStartY;
      const numRightRows = Math.max(1, rightTableBody.length);
      const calculatedMinHeight = totalLeftHeight / numRightRows;

      autoTable(doc, {
        startY: blockStartY,
        body: rightTableBody,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          minCellHeight: calculatedMinHeight,
          valign: 'middle',
          cellPadding: { top: 1.5, bottom: 1.5, left: 2.5, right: 2.5 },
          textColor: [20, 20, 20],
          font: "helvetica",
          lineWidth: 0.2,
          lineColor: [180, 185, 195]
        },
        columnStyles: {
          0: { cellWidth: rightColWidth / 2 },
          1: { cellWidth: rightColWidth / 2 },
        },
        didParseCell: (dataCell) => {
          const rawRow = dataCell.row.raw as any[];
          if (rawRow && rawRow[1] === null && dataCell.column.index === 0) {
            dataCell.cell.colSpan = 2;
          }
        },
        didDrawCell: (dataCell) => {
          if (dataCell.section === 'body') {
            const rawItem = dataCell.cell.raw as { k: string; v: string } | null;
            if (rawItem && rawItem.k) {
              // Fill cell background white to clear default text rendering
              doc.setFillColor(255, 255, 255);
              doc.rect(dataCell.cell.x + 0.1, dataCell.cell.y + 0.1, dataCell.cell.width - 0.2, dataCell.cell.height - 0.2, 'F');

              const paddingX = dataCell.cell.x + 2.5;
              const availW = dataCell.cell.width - 5;
              const keyText = rawItem.k; // e.g., "Invoice No. -"
              const valText = String(rawItem.v || ""); // e.g., "JI/INV/019"

              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              const keyWidth = doc.getTextWidth(keyText);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              const valWidth = doc.getTextWidth(` ${valText}`);

              // Case A: Key + Value fit on 1 single line adjacent to each other
              if ((keyWidth + valWidth) <= availW) {
                const centerY = dataCell.cell.y + (dataCell.cell.height / 2) + 0.9;
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42);
                doc.text(keyText, paddingX, centerY);

                doc.setFont("helvetica", "normal");
                doc.setTextColor(30, 41, 59);
                doc.text(` ${valText}`, paddingX + keyWidth, centerY);
              } else {
                // Case B: Text wraps inside cell
                const remainingLine1W = Math.max(10, availW - keyWidth);
                const words = valText.trim().split(/\s+/);
                let line1Val = "";
                let line2Val = "";

                for (let i = 0; i < words.length; i++) {
                  const testLine = line1Val ? `${line1Val} ${words[i]}` : words[i];
                  doc.setFont("helvetica", "normal");
                  if (doc.getTextWidth(` ${testLine}`) <= remainingLine1W) {
                    line1Val = testLine;
                  } else {
                    line2Val = words.slice(i).join(" ");
                    break;
                  }
                }

                if (line1Val) {
                  const line1Y = dataCell.cell.y + (dataCell.cell.height / 2) - 1.2;
                  const line2Y = dataCell.cell.y + (dataCell.cell.height / 2) + 2.5;

                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(15, 23, 42);
                  doc.text(keyText, paddingX, line1Y);

                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(30, 41, 59);
                  doc.text(` ${line1Val}`, paddingX + keyWidth, line1Y);

                  if (line2Val) {
                    const wrappedLine2 = doc.splitTextToSize(line2Val, availW);
                    doc.text(wrappedLine2[0] || "", paddingX, line2Y);
                  }
                } else {
                  // Key takes line 1, Value takes line 2
                  const line1Y = dataCell.cell.y + (dataCell.cell.height / 2) - 1.2;
                  const line2Y = dataCell.cell.y + (dataCell.cell.height / 2) + 2.5;

                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(15, 23, 42);
                  doc.text(keyText, paddingX, line1Y);

                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(30, 41, 59);
                  const wrappedVal = doc.splitTextToSize(valText, availW);
                  doc.text(wrappedVal[0] || "", paddingX, line2Y);
                }
              }
            }
          }
        },
        margin: { left: leftMargin + leftColWidth, right: rightMargin, top: headerHeight },
      });

      const rightFinalY = (doc as any).lastAutoTable.finalY;
      const finalSectionY = Math.max(leftFinalY, rightFinalY);

      // Outer border box matching exact height + vertical divider line between left and right columns
      doc.setDrawColor(180, 185, 195);
      doc.setLineWidth(0.3);
      doc.rect(leftMargin, blockStartY, totalWidth, finalSectionY - blockStartY);
      doc.line(leftMargin + leftColWidth, blockStartY, leftMargin + leftColWidth, finalSectionY);

      return finalSectionY + 8;
    },

    // -------------------------------------------------------------
    // SECTION: ITEMS TABLE (Line Items, HSN, Quantity, Rates)
    // -------------------------------------------------------------
    items_table: (y) => {
      const activeSymbol = getPdfCurrencySymbol(currency);
      const isPackingList = type === DocumentType.PACKING_LIST;
      const isChallan = type === DocumentType.DELIVERY_CHALLAN;
      const showChallanPrices = data.showChallanPrices !== false;

      let headers: string[] = [];
      if (isPackingList) {
        headers = ["S.N.", "Description of Goods", "HSN/SAC", "Box No.", "Heat / Lot No.", "Qty Packed", "Total Qty", "Unit"];
      } else if (isChallan) {
        headers = showChallanPrices 
          ? ["S.N.", "Description of Goods", "HSN/SAC", "Qty", "Unit", `Rate (${activeSymbol})`, `Amount (${activeSymbol})`]
          : ["S.N.", "Description of Goods", "HSN/SAC", "Qty", "Unit"];
      } else {
        headers = ["S.N.", "Description of Goods", "HSN/SAC", "Qty", "Unit", `Rate (${activeSymbol})`, `Tax %`, `Amount (${activeSymbol})`];
      }

      const tableRows = items.map((item, index) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const amount = qty * rate;

        if (isPackingList) {
          return [
            (index + 1).toString(),
            item.description,
            item.hsn || "-",
            item.boxNo || "-",
            item.heatNo || "-",
            (item.qtyPacked || qty).toString(),
            qty.toString(),
            item.unit || "NOS",
          ];
        } else if (isChallan) {
          if (showChallanPrices) {
            return [
              (index + 1).toString(),
              item.description,
              item.hsn || "-",
              qty.toString(),
              item.unit || "NOS",
              rate.toFixed(2),
              amount.toFixed(2),
            ];
          } else {
            return [
              (index + 1).toString(),
              item.description,
              item.hsn || "-",
              qty.toString(),
              item.unit || "NOS",
            ];
          }
        } else {
          return [
            (index + 1).toString(),
            item.description,
            item.hsn || "-",
            qty.toString(),
            item.unit || "NOS",
            rate.toFixed(2),
            `${taxRate}%`,
            amount.toFixed(2),
          ];
        }
      });

      autoTable(doc, {
        startY: y,
        head: [headers],
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [242, 245, 250],
          textColor: [30, 30, 30],
          fontSize: 8,
          fontStyle: "bold",
          halign: "center",
          lineWidth: 0.2,
          lineColor: [180, 185, 195],
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [40, 40, 40],
          lineWidth: 0.2,
          lineColor: [180, 185, 195],
        },
        columnStyles: isPackingList ? {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left" },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "center", cellWidth: 25 },
          5: { halign: "right", cellWidth: 20 },
          6: { halign: "right", cellWidth: 20 },
          7: { halign: "center", cellWidth: 15 },
        } : (isChallan && !showChallanPrices) ? {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "left" },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "right", cellWidth: 25 },
          4: { halign: "center", cellWidth: 20 },
        } : {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left" },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "right", cellWidth: 15 },
          4: { halign: "center", cellWidth: 15 },
          5: { halign: "right", cellWidth: 22 },
          6: { halign: "right", cellWidth: 15 },
          7: { halign: "right", cellWidth: 25 },
        },
        margin: { left: 15, right: 15, top: headerHeight },
      });

      return (doc as any).lastAutoTable.finalY + 5;
    },

    // -------------------------------------------------------------
    // SECTION: TOTALS & BANK DETAILS
    // -------------------------------------------------------------
    totals: (y) => {
      const activeSymbol = getPdfCurrencySymbol(currency);
      const showChallanPrices = data.showChallanPrices !== false;
      if (type === DocumentType.DELIVERY_CHALLAN && !showChallanPrices) {
        return y;
      }

      const subtotal = items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
      const totalTax = items.reduce((acc, item) => acc + (item.quantity * item.rate * (item.taxRate || 18)) / 100, 0);
      const grandTotal = Math.round(subtotal + totalTax - discount);

      const summaryRows: string[][] = [
        ["Subtotal:", `${activeSymbol} ${subtotal.toFixed(2)}`],
        ["Tax Amount:", `${activeSymbol} ${totalTax.toFixed(2)}`],
        ["Grand Total:", `${activeSymbol} ${grandTotal.toFixed(2)}`]
      ];

      // Bank Details Table (Left Side)
      if (business.bankName || business.accountNumber) {
        autoTable(doc, {
          startY: y,
          margin: { left: 15, right: pageWidth - 15 - 90 },
          head: [[{ content: "BANK DETAILS", colSpan: 2 }]],
          body: [
            [{ content: "Bank Name:", styles: { fontStyle: "bold" } }, business.bankName || "-"],
            [{ content: "Account No:", styles: { fontStyle: "bold" } }, business.accountNumber || "-"],
            [{ content: "IFSC Code:", styles: { fontStyle: "bold" } }, business.ifscCode || "-"]
          ],
          theme: "grid",
          headStyles: { fillColor: [242, 245, 250], textColor: [30, 30, 30], fontSize: 8, fontStyle: "bold" },
          styles: { fontSize: 8, cellPadding: 2 }
        });
      }

      // Grand Totals Table (Right Side)
      autoTable(doc, {
        startY: y,
        margin: { left: 115, right: 15 },
        body: summaryRows,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [40, 40, 40] },
        columnStyles: {
          0: { halign: "left", cellWidth: 42 },
          1: { halign: "right", cellWidth: 38 }
        },
        didParseCell: (cellData) => {
          if (cellData.row.index === summaryRows.length - 1) {
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.fillColor = [245, 245, 245];
          }
        }
      });

      let nextY = (doc as any).lastAutoTable.finalY + 4;

      // Amount in Words
      const words = numberToWords(grandTotal, currency);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("AMOUNT IN WORDS:", 15, nextY);
      doc.setFont("helvetica", "normal");
      doc.text(words, 15, nextY + 4);

      return nextY + 10;
    },

    // -------------------------------------------------------------
    // SECTION: TERMS & CONDITIONS
    // -------------------------------------------------------------
    terms: (y) => {
      if (!data.terms && !data.notes) return y;

      const body: string[][] = [];
      if (data.notes) {
        body.push(["NOTES / REMARKS"]);
        body.push([data.notes.trim()]);
      }
      if (data.terms) {
        body.push(["TERMS & CONDITIONS"]);
        body.push([data.terms.trim()]);
      }

      autoTable(doc, {
        startY: y,
        body,
        theme: "grid",
        styles: { fontSize: 7.8, cellPadding: 2.5, textColor: [80, 80, 80] },
        didParseCell: (cellData) => {
          if (cellData.cell.text[0] === "TERMS & CONDITIONS" || cellData.cell.text[0] === "NOTES / REMARKS") {
            cellData.cell.styles.fillColor = [240, 240, 240];
            cellData.cell.styles.fontStyle = "bold";
            cellData.cell.styles.textColor = [40, 40, 40];
          }
        },
        margin: { left: 15, right: 15, bottom: SAFE_BOTTOM, top: headerHeight }
      });

      return (doc as any).lastAutoTable.finalY + 6;
    },

    // -------------------------------------------------------------
    // SECTION: SIGNATURE & AUTHENTICATION
    // -------------------------------------------------------------
    signature: (y) => {
      const sigY = Math.max(y, pageHeight - SAFE_BOTTOM - 24);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`For ${business.name || "YOUR BUSINESS NAME"}`, pageWidth - 15, sigY, { align: "right" });

      if (business.signature) {
        try {
          let formatType = "PNG";
          if (business.signature.startsWith("data:image/jpeg") || business.signature.startsWith("data:image/jpg")) formatType = "JPEG";
          doc.addImage(business.signature, formatType, pageWidth - 55, sigY + 2, 40, 15);
        } catch (e) {}
      }

      doc.text("Authorized Signatory", pageWidth - 15, sigY + 20, { align: "right" });
      return sigY + 24;
    }
  };

  // Execute sections in sequence
  const sectionOrder = layoutSettings.sectionOrder || ["header", "party_details", "items_table", "totals", "terms", "signature"];
  sectionOrder.forEach((key) => {
    if (sections[key]) {
      currentY = sections[key](currentY);
    }
  });

  // Footer & Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
    if (!hasLetterhead && !hideForPreprinted) {
      doc.text("This is a computer generated document.", 15, pageHeight - 10);
    }
  }

  return doc;
}

// ==========================================
// 5. DOWNLOAD TRIGGER HELPER
// ==========================================

export async function downloadInvoicePDF(data: InvoiceData, filename?: string): Promise<void> {
  const doc = await generateInvoicePDF(data);
  const safeId = (data.id || "document").replace(/[\/\\]/g, "_");
  const name = filename || `${data.type || "Document"}_${safeId}.pdf`;
  doc.save(name);
}
