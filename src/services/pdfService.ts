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
      let safeDate = "-";
      try {
        if (data.date) safeDate = format(new Date(data.date), "dd/MM/yyyy");
      } catch (e) {}

      const rawBuyerOrdDate = dataAny.buyerOrderDate || data.poDate;
      let buyerOrdDateStr = safeDate;
      if (rawBuyerOrdDate) {
        try {
          buyerOrdDateStr = format(new Date(rawBuyerOrdDate), "dd/MM/yyyy");
        } catch (e) {}
      }

      let dueDateStr = safeDate;
      const rawDueDate = data.validUntilDate || data.dueDate;
      if (rawDueDate) {
        try {
          dueDateStr = format(new Date(rawDueDate), "dd/MM/yyyy");
        } catch (e) {}
      }

      const docTitle = (
        type === DocumentType.QUOTATION
          ? "Quotation"
          : type === DocumentType.TAX_INVOICE
          ? "Tax Invoice"
          : type.replace(/_/g, " ")
      ).toUpperCase();

      const docNumberLabel = type === DocumentType.QUOTATION ? "Quotation No." : "Invoice No.";
      const pTerms = dataAny.paymentTerms || data.paymentTermsCustom || (data.paymentTermsDays ? `${data.paymentTermsDays} ${data.paymentTermsUnit || "Days"}` : "");
      const transportText = data.despatchedThrough || data.transport || dataAny.vehicleNo || "";

      const formatRightCell = (label: string, val?: string) => {
        const cleanVal = val && val.trim() && val.trim() !== "NA" ? val.trim() : "-";
        return [label, cleanVal].join("\n");
      };

      const vendorContentStr = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10";
      const partyContentStr = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10";

      const gridRows: any[] = [
        [
          {
            content: docTitle,
            colSpan: 4,
            styles: { halign: "center", fontStyle: "bold", fillColor: [240, 243, 246], textColor: [15, 23, 42], minCellHeight: 8 }
          }
        ],
        [
          { content: vendorContentStr, colSpan: 2, rowSpan: 3, styles: { valign: "top" } },
          { content: formatRightCell(docNumberLabel, data.id), styles: { minCellHeight: 10 } },
          { content: formatRightCell("Dated", safeDate), styles: { minCellHeight: 10 } }
        ],
        [
          { content: formatRightCell("Delivery Note / LR", dataAny.despatchDocNo || data.dispatchRef || transportText), styles: { minCellHeight: 10 } },
          { content: formatRightCell("Payment Mode", dataAny.paymentMode || data.modeOfPayment || pTerms), styles: { minCellHeight: 10 } }
        ],
        [
          { content: formatRightCell("Order No.", data.poNumber), styles: { minCellHeight: 10 } },
          { content: formatRightCell("Order Date", buyerOrdDateStr), styles: { minCellHeight: 10 } }
        ],
        [
          { content: partyContentStr, colSpan: 2, rowSpan: 2, styles: { valign: "top" } },
          { content: formatRightCell("Payment Terms", pTerms), styles: { minCellHeight: 10 } },
          { content: formatRightCell("Due Date", dueDateStr), styles: { minCellHeight: 10 } }
        ],
        [
          { content: formatRightCell("Dispatch Via", transportText), styles: { minCellHeight: 10 } },
          { content: formatRightCell("Destination", data.destination || dataAny.finalDestination), styles: { minCellHeight: 10 } }
        ]
      ];

      autoTable(doc, {
        startY: y,
        body: gridRows,
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: 2.0, textColor: [15, 23, 42], font: "helvetica", lineColor: [148, 163, 184], lineWidth: 0.15 },
        columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 45 }, 3: { cellWidth: 45 } },
        margin: { left: 15, right: 15, top: headerHeight },
        didDrawCell: (cellData) => {
          if (cellData.section === "body") {
            const cell = cellData.cell;
            const rowIndex = cellData.row.index;
            const colIndex = cellData.column.index;

            if (rowIndex === 0) {
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(15, 23, 42);
              doc.text(docTitle, cell.x + cell.width / 2, cell.y + 5.5, { align: "center" });
              return;
            }

            // Draw Vendor Card
            if (rowIndex === 1 && colIndex === 0) {
              doc.setFillColor(238, 242, 246);
              doc.rect(cell.x + 2, cell.y + 2, cell.width - 4, 4.5, "FD");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.2);
              doc.setTextColor(15, 23, 42);
              doc.text("SELLER / VENDOR", cell.x + 4, cell.y + 5.2);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.5);
              doc.text(business.name || "YOUR BUSINESS NAME", cell.x + 3, cell.y + 11);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(51, 65, 85);
              const addr = doc.splitTextToSize(business.address || "-", 84);
              doc.text(addr, cell.x + 3, cell.y + 15);
              doc.text(`GSTIN: ${business.gstin || "-"}`, cell.x + 3, cell.y + 22);
              doc.text(`Tel: ${business.phone || "-"} | ${business.email || "-"}`, cell.x + 3, cell.y + 26);
              return;
            }

            // Draw Customer Card
            if (rowIndex === 4 && colIndex === 0) {
              doc.setFillColor(238, 242, 246);
              doc.rect(cell.x + 2, cell.y + 2, cell.width - 4, 4.5, "FD");
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.2);
              doc.setTextColor(15, 23, 42);
              doc.text("BUYER / CLIENT", cell.x + 4, cell.y + 5.2);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(8.5);
              doc.text(customer.name || "-", cell.x + 3, cell.y + 11);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(51, 65, 85);
              const addr = doc.splitTextToSize(customer.address || "-", 84);
              doc.text(addr, cell.x + 3, cell.y + 15);
              doc.text(`GSTIN: ${customer.gstin || "-"}`, cell.x + 3, cell.y + 22);
              doc.text(`Tel: ${customer.phone || "-"} | ${customer.email || "-"}`, cell.x + 3, cell.y + 26);
            }
          }
        }
      });

      return (doc as any).lastAutoTable.finalY + 4;
    },

    // -------------------------------------------------------------
    // SECTION: ITEMS TABLE (Line Items, HSN, Quantity, Rates)
    // -------------------------------------------------------------
    items_table: (y) => {
      const activeSymbol = getPdfCurrencySymbol(currency);
      const tableData = items.map((item, index) => [
        index + 1,
        item.description,
        item.hsn || "-",
        `${item.quantity} ${item.unit || "NOS"}`,
        `${activeSymbol} ${item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${activeSymbol} ${(item.quantity * item.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Description of Goods", "HSN", "Qty", `Rate (${activeSymbol})`, `Amount (${activeSymbol})`]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          valign: "middle"
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 14 },
          1: { cellWidth: "auto" },
          2: { halign: "center", cellWidth: 24 },
          3: { halign: "right", cellWidth: 22 },
          4: { halign: "right", cellWidth: 36 },
          5: { halign: "right", cellWidth: 40 }
        },
        styles: { fontSize: 8.5, cellPadding: 2.8, font: "helvetica", textColor: [30, 30, 30] },
        margin: { left: 15, right: 15, top: headerHeight, bottom: SAFE_BOTTOM }
      });

      return (doc as any).lastAutoTable.finalY + 6;
    },

    // -------------------------------------------------------------
    // SECTION: TOTALS & BANK DETAILS
    // -------------------------------------------------------------
    totals: (y) => {
      const activeSymbol = getPdfCurrencySymbol(currency);
      const subtotal = items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
      const totalTax = items.reduce((acc, item) => acc + (item.quantity * item.rate * (item.taxRate || 18)) / 100, 0);
      const grandTotal = Math.round(subtotal + totalTax - discount);

      const summaryRows: string[][] = [
        ["Subtotal:", `${activeSymbol} ${subtotal.toFixed(2)}`],
        ["CGST (9%):", `${activeSymbol} ${(totalTax / 2).toFixed(2)}`],
        ["SGST (9%):", `${activeSymbol} ${(totalTax / 2).toFixed(2)}`],
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
          headStyles: { fillColor: [17, 24, 39], fontSize: 8, fontStyle: "bold" },
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
