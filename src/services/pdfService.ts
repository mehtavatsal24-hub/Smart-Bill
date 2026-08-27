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
  const hasLetterhead = !!business.letterhead && business.printMode !== "preprinted";
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Use dynamic margins if provided, otherwise fallback to defaults
  const headerHeight = layoutSettings.headerHeight || (hasLetterhead ? 65 : 25);
  const footerHeight = layoutSettings.footerHeight || (hasLetterhead ? 40 : 20);
  const SAFE_BOTTOM = footerHeight;
  let currentY = headerHeight;

  // Function to add letterhead to a page
  const addLetterhead = () => {
    if (business.letterhead && business.printMode !== "preprinted") {
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

  // Override addPage to automatically add letterhead to new pages
  const originalAddPage = doc.addPage.bind(doc);
  (doc as any).addPage = function(...args: any[]) {
    originalAddPage(...args);
    if (hasLetterhead) addLetterhead();
    return this;
  };

  // Initial letterhead for page 1
  if (hasLetterhead) addLetterhead();

  const sections: Record<PDFSection, (y: number) => number> = {
    header: (y) => {
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
      const { 
        customer, 
        type, 
        id, 
        date, 
        dueDate,
        transport, 
        poNumber,
        poDate,
        validUntilDate,
        modeOfPayment,
        paymentTermsDays,
        paymentTermsUnit,
        paymentTermsCustom,
        despatchedThrough,
        destination,
        noOfPackages,
        dispatchRef,
        transportationReason,
        advancePercentage,
        consigneeName,
        consigneeGstin,
        consigneeAddress,
        preCarriageBy,
        placeOfReceipt,
        vehicleNo,
        finalDestination,
        buyerClientDetails
      } = data;

      const pageWidth = doc.internal.pageSize.width;
      const leftMargin = 15;
      const rightMargin = 15;
      const totalWidth = pageWidth - leftMargin - rightMargin; // 180mm
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
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 3,
          lineWidth: 0.2,
          lineColor: [180, 185, 195],
        },
        margin: { left: leftMargin, right: rightMargin, top: headerHeight },
      });

      const blockStartY = (doc as any).lastAutoTable.finalY;

      // 2. Prepare Left Column Rows with Bold Labels & Bold Names (NO inner horizontal lines)
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
      if (consigneeName) leftRows.push(["Shipped To (Consignee) -", consigneeName]);
      if (consigneeAddress) leftRows.push(["Ship Addr -", consigneeAddress]);
      if (consigneeGstin) leftRows.push(["Consignee GSTIN -", consigneeGstin]);
      if (buyerClientDetails) leftRows.push(["Buyer Details -", buyerClientDetails]);

      autoTable(doc, {
        startY: blockStartY,
        body: leftRows,
        theme: 'plain',
        styles: {
          fontSize: 8,
          cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
          textColor: [20, 20, 20],
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: 34, fontStyle: 'bold', textColor: [30, 30, 30] },
          1: { cellWidth: leftColWidth - 34, fontStyle: 'normal' }
        },
        didParseCell: (data) => {
          if (data.cell.raw === "VENDOR DETAILS" || data.cell.raw === "BUYER & CONSIGNEE DETAILS") {
            data.cell.styles.fillColor = [242, 245, 250];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [30, 30, 30];
            data.cell.styles.fontSize = 8;
            data.cell.styles.cellPadding = { top: 3, bottom: 3, left: 3, right: 3 };
            data.cell.colSpan = 2;
          } else if (data.column.index === 1) {
            const label = data.row.raw[0];
            if (label === "M/S -" || label === "Billed To (Buyer) -" || label === "Shipped To (Consignee) -") {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [30, 30, 30];
            }
          }
        },
        didDrawCell: (data) => {
          if (data.cell.raw === "VENDOR DETAILS" || data.cell.raw === "BUYER & CONSIGNEE DETAILS") {
            doc.setDrawColor(180, 185, 195);
            doc.setLineWidth(0.2);
            doc.line(data.cell.x, data.cell.y, data.cell.x + leftColWidth, data.cell.y);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + leftColWidth, data.cell.y + data.cell.height);
          }
        },
        margin: { left: leftMargin, right: pageWidth - leftMargin - leftColWidth, top: headerHeight },
      });

      const leftFinalY = (doc as any).lastAutoTable.finalY;

      // 3. Build Right Column Pairs (Strict Row-by-Row Filtering - ONLY Non-Empty Values!)
      const docLabel = type === DocumentType.QUOTATION 
        ? "Quotation No." 
        : (type === DocumentType.PURCHASE_ORDER 
          ? "PO No." 
          : (type === DocumentType.PACKING_LIST 
            ? "Packing List No." 
            : "Invoice No."));
            
      const dateFormatted = date ? format(new Date(date), "dd-MM-yyyy") : "";

      const pairRow1: Array<{ k: string; v: string }> = [
        { k: `${docLabel}:`, v: id }
      ];
      if (dateFormatted) pairRow1.push({ k: "Dated:", v: dateFormatted });

      const pairRow2: Array<{ k: string; v: string }> = [];
      if (dispatchRef && dispatchRef.trim() && dispatchRef !== "-") {
        pairRow2.push({ k: "Delivery Note:", v: dispatchRef });
      }
      if (modeOfPayment && modeOfPayment.trim() && modeOfPayment !== "-") {
        pairRow2.push({ k: "Mode of Payment:", v: modeOfPayment });
      }

      const pairRow3: Array<{ k: string; v: string }> = [];
      if (poNumber && poNumber.trim() && poNumber !== "-") {
        pairRow3.push({ k: "Order No.:", v: poNumber });
      }
      if (poDate && poDate.trim() && poDate !== "-") {
        pairRow3.push({ k: "Order Date:", v: format(new Date(poDate), "dd-MM-yyyy") });
      }

      const pairRow4: Array<{ k: string; v: string }> = [];
      const paymentTermsText = paymentTermsCustom || (paymentTermsDays ? `${paymentTermsDays} ${paymentTermsUnit || "Days"}` : "");
      if (paymentTermsText && paymentTermsText.trim() && paymentTermsText !== "-") {
        pairRow4.push({ k: "Payment Terms:", v: paymentTermsText });
      }

      const dueOrValid = type === DocumentType.QUOTATION 
        ? (validUntilDate ? format(new Date(validUntilDate), "dd-MM-yyyy") : "") 
        : dueDate;

      if (dueOrValid && dueOrValid.trim() && dueOrValid !== "-") {
        pairRow4.push({ k: type === DocumentType.QUOTATION ? "Valid Until:" : "Terms / Due Date:", v: dueOrValid });
      }

      const pairRow5: Array<{ k: string; v: string }> = [];
      const dispatchViaText = despatchedThrough || transport || vehicleNo;
      if (dispatchViaText && dispatchViaText.trim() && dispatchViaText !== "-") {
        pairRow5.push({ k: "Dispatch Via:", v: dispatchViaText });
      }

      const destText = destination || finalDestination;
      if (destText && destText.trim() && destText !== "-") {
        pairRow5.push({ k: "Destination:", v: destText });
      }

      const pairRow6: Array<{ k: string; v: string }> = [];
      if (preCarriageBy && preCarriageBy.trim() && preCarriageBy !== "-") {
        pairRow6.push({ k: "Dispatch Mode:", v: preCarriageBy });
      }
      if (placeOfReceipt && placeOfReceipt.trim() && placeOfReceipt !== "-") {
        pairRow6.push({ k: "Place of Receipt:", v: placeOfReceipt });
      }

      const pairRow7: Array<{ k: string; v: string }> = [];
      if (noOfPackages && noOfPackages.trim() && noOfPackages !== "-") {
        pairRow7.push({ k: "No. of Packages:", v: noOfPackages });
      }
      if (transportationReason && transportationReason.trim() && transportationReason !== "-" && transportationReason !== "Supply") {
        pairRow7.push({ k: "Reason:", v: transportationReason });
      }

      const allRows: Array<Array<{ k: string; v: string }>> = [
        pairRow1, pairRow2, pairRow3, pairRow4, pairRow5, pairRow6, pairRow7
      ].filter(r => r.length > 0);

      const rightTableBody: string[][] = allRows.map(row => {
        if (row.length === 2) {
          return [row[0].k, row[0].v, row[1].k, row[1].v];
        } else {
          return [row[0].k, row[0].v, "", ""];
        }
      });

      // Dynamically distribute right column row height so right grid matches left column height 100%
      const totalLeftHeight = leftFinalY - blockStartY;
      const numRightRows = Math.max(1, rightTableBody.length);
      const targetRowHeight = totalLeftHeight / numRightRows;

      const c1W = 21;
      const c2W = (rightColWidth / 2) - c1W;

      autoTable(doc, {
        startY: blockStartY,
        body: rightTableBody,
        theme: 'grid',
        styles: {
          fontSize: 8,
          minCellHeight: targetRowHeight,
          valign: 'middle',
          cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
          textColor: [20, 20, 20],
          font: "helvetica",
          lineWidth: 0.2,
          lineColor: [180, 185, 195]
        },
        columnStyles: {
          0: { cellWidth: c1W, fontStyle: 'bold', textColor: [30, 30, 30] },
          1: { cellWidth: c2W, fontStyle: 'normal' },
          2: { cellWidth: c1W, fontStyle: 'bold', textColor: [30, 30, 30] },
          3: { cellWidth: c2W, fontStyle: 'normal' },
        },
        didParseCell: (data) => {
          const rawRow = data.row.raw as string[];
          if (rawRow && rawRow[0] !== "" && rawRow[2] === "" && data.column.index === 1) {
            data.cell.colSpan = 3;
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

    items_table: (y) => {
      const { items, isExport, currency = "INR", type, showChallanPrices = true } = data;
      const isPackingList = type === DocumentType.PACKING_LIST;
      const hidePrices = type === DocumentType.DELIVERY_CHALLAN && showChallanPrices === false;

      if (isPackingList) {
        const tableData = items.map((item, index) => [
          index + 1,
          item.description,
          item.heatNo || "-",
          item.quantity,
          item.qtyPacked || item.quantity,
          item.remarks || "Complete",
          item.boxNo || `Pkg ${index + 1}`
        ]);

        autoTable(doc, {
          startY: y,
          head: [["PO Sr.No.", "ITEMS", "HEAT NO", "PO. QTY", "QTY PKD NOS", "Remarks", "Packaging"]],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [200, 200, 200],
            textColor: [0, 0, 0],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 30 },
            6: { halign: 'center', cellWidth: 25 },
          },
          styles: { fontSize: 8, cellPadding: 2.5, font: "helvetica", textColor: [0, 0, 0] },
          margin: { left: 15, right: 15, top: headerHeight - 5, bottom: SAFE_BOTTOM },
          didDrawPage: (d) => {
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
      }

      const currencySymbol = currency === "INR" ? "Rs." : (CURRENCY_SYMBOLS[currency] || currency);
      
      const tableData = hidePrices 
        ? items.map((item, index) => [
            index + 1,
            item.description,
            item.hsn,
            `${item.quantity} ${item.unit || "NOS"}`,
          ])
        : items.map((item, index) => [
            index + 1,
            item.description,
            item.hsn,
            item.isRegret ? "-" : `${item.quantity} ${item.unit || "NOS"}`,
            item.isRegret ? "REGRET" : `${isExport ? currencySymbol : "Rs."} ${item.rate.toLocaleString(isExport ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            item.isRegret ? "REGRET" : `${isExport ? currencySymbol : "Rs."} ${(item.quantity * item.rate).toLocaleString(isExport ? 'en-US' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          ]);

      autoTable(doc, {
        startY: y,
        head: hidePrices 
          ? [["#", "Description", "HSN", "Qty"]]
          : [["#", "Description", "HSN", "Qty", `Rate (${currencySymbol})`, `Amount (${currencySymbol})`]],
        theme: layoutSettings.template === "minimal" ? "plain" : "striped",
        body: tableData,
        headStyles: { 
          fillColor: layoutSettings.template === "modern" ? [63, 63, 70] : [30, 30, 30],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        columnStyles: hidePrices 
          ? {
              0: { halign: 'center', cellWidth: 15 },
              1: { cellWidth: 'auto' },
              2: { halign: 'center', cellWidth: 30 },
              3: { halign: 'center', cellWidth: 40 },
            }
          : {
              0: { halign: 'center', cellWidth: 10 },
              1: { cellWidth: 'auto' },
              2: { halign: 'center', cellWidth: 15 },
              3: { halign: 'center', cellWidth: 22 },
              4: { halign: 'right', cellWidth: 38 },
              5: { halign: 'right', cellWidth: 42 },
            },
        didParseCell: (data) => {
          if (data.section === 'head' && !hidePrices) {
            if (data.column.index === 4 || data.column.index === 5) data.cell.styles.halign = 'right';
            else if (data.column.index === 0 || data.column.index === 2 || data.column.index === 3) data.cell.styles.halign = 'center';
          }
        },
        styles: { fontSize: 9, cellPadding: 2.5, font: "helvetica" },
        margin: { top: headerHeight - 5, bottom: SAFE_BOTTOM },
        didDrawPage: (d) => {
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
      const { 
        items, 
        discount = 0, 
        discountRate = 0, 
        isExport, 
        currency = "INR", 
        type, 
        customer, 
        applyTax = true, 
        applyIgst = false, 
        showChallanPrices = true,
        freightType = "none",
        freightAmount = 0,
        freightTaxTiming = "before_tax",
        freightTaxRate = 0,
        packagingType = "none",
        packagingAmount = 0,
        packagingTaxTiming = "before_tax",
        packagingTaxRate = 0,
      } = data;
      
      if (type === DocumentType.PACKING_LIST) return y;
      if (type === DocumentType.DELIVERY_CHALLAN && showChallanPrices === false) return y;
      
      const itemsSubtotal = Math.round(items.reduce((acc, item) => acc + (item.isRegret ? 0 : item.quantity * item.rate), 0) * 100) / 100;
      const isQuotation = type === DocumentType.QUOTATION;
      
      const freightTaxable = (freightType === "extra" && freightTaxTiming === "before_tax") ? freightAmount : 0;
      const packagingTaxable = (packagingType === "extra" && packagingTaxTiming === "before_tax") ? packagingAmount : 0;
      
      const itemsTax = (isQuotation || !applyTax) ? 0 : Math.round(items.reduce((acc, item) => acc + (item.isRegret ? 0 : (item.quantity * item.rate * item.taxRate) / 100), 0) * 100) / 100;
      const freightTax = (isQuotation || !applyTax || freightTaxable === 0) ? 0 : (freightTaxable * freightTaxRate) / 100;
      const packagingTax = (isQuotation || !applyTax || packagingTaxable === 0) ? 0 : (packagingTaxable * packagingTaxRate) / 100;
      
      const totalTax = Math.round((itemsTax + freightTax + packagingTax) * 100) / 100;
      
      const freightNonTaxable = (freightType === "extra" && freightTaxTiming === "after_tax") ? freightAmount : 0;
      const packagingNonTaxable = (packagingType === "extra" && packagingTaxTiming === "after_tax") ? packagingAmount : 0;

      const grandTotal = Math.max(0, Math.round((itemsSubtotal + freightTaxable + packagingTaxable + totalTax + freightNonTaxable + packagingNonTaxable - discount) * 100) / 100);
      const currencySymbol = currency === "INR" ? "Rs." : (CURRENCY_SYMBOLS[currency] || currency);

      const formatCurrencyLocal = (val: number) => {
        if (isExport) return `${currencySymbol} ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        return `Rs. ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      };

      const bizStateCode = business.gstin?.substring(0, 2);
      const custStateCode = customer.gstin?.substring(0, 2);
      const isValidBizState = bizStateCode && /^\d{2}$/.test(bizStateCode);
      const isValidCustState = custStateCode && /^\d{2}$/.test(custStateCode);
      const isInterState = applyIgst || !!(isValidBizState && isValidCustState && bizStateCode !== custStateCode) || isExport;

      const hasDiscount = discount > 0;
      let boxHeight = 16;
      if (freightType !== "none") boxHeight += 8;
      if (packagingType !== "none") boxHeight += 8;
      if (!isQuotation) {
        boxHeight += 8;
        if (!isExport) boxHeight += isInterState ? 8 : 16;
      } else if (hasDiscount) boxHeight += 8;
      if (hasDiscount) boxHeight += 8;

      if (y + boxHeight + 15 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        y = headerHeight;
      }

      const totalsX = pageWidth - 90;
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(252, 252, 252);
      
      doc.rect(totalsX, y - 5, 75, boxHeight, "F");
      doc.rect(totalsX, y - 5, 75, boxHeight, "S");
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      let totalRowY = y + 1;
      
      doc.text(`Subtotal:`, totalsX + 5, totalRowY);
      doc.text(`${formatCurrencyLocal(itemsSubtotal)}`, pageWidth - 20, totalRowY, { align: "right" });
      totalRowY += 8;

      if (freightType === "inclusive") {
        doc.text(`Freight Charge:`, totalsX + 5, totalRowY);
        doc.text(`Inclusive`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      } else if (freightType === "extra") {
        doc.text(`Freight Charge:`, totalsX + 5, totalRowY);
        doc.text(`${formatCurrencyLocal(freightAmount)}`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      }

      if (packagingType === "inclusive") {
        doc.text(`Packaging & Forwarding:`, totalsX + 5, totalRowY);
        doc.text(`Inclusive`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      } else if (packagingType === "extra") {
        doc.text(`Packaging & Forwarding:`, totalsX + 5, totalRowY);
        doc.text(`${formatCurrencyLocal(packagingAmount)}`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      }

      if (!isQuotation) {
        if (!isExport) {
          if (isInterState) {
            doc.text(`IGST:`, totalsX + 5, totalRowY);
            doc.text(`${formatCurrencyLocal(totalTax)}`, pageWidth - 20, totalRowY, { align: "right" });
            totalRowY += 8;
          } else {
            doc.text(`CGST:`, totalsX + 5, totalRowY);
            doc.text(`${formatCurrencyLocal(totalTax / 2)}`, pageWidth - 20, totalRowY, { align: "right" });
            totalRowY += 8;
            doc.text(`SGST:`, totalsX + 5, totalRowY);
            doc.text(`${formatCurrencyLocal(totalTax / 2)}`, pageWidth - 20, totalRowY, { align: "right" });
            totalRowY += 8;
          }
        }
      }

      if (hasDiscount) {
        const discountLabel = discountRate > 0 ? `Discount (${discountRate}%):` : `Discount:`;
        doc.text(discountLabel, totalsX + 5, totalRowY);
        doc.text(`- ${formatCurrencyLocal(discount)}`, pageWidth - 20, totalRowY, { align: "right" });
        totalRowY += 8;
      }
      
      doc.setDrawColor(200, 200, 200);
      doc.line(totalsX + 2, totalRowY - 4, pageWidth - 17, totalRowY - 4);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Grand Total:`, totalsX + 5, totalRowY + 1);
      const finalTotalDisplay = isExport ? formatCurrencyLocal(grandTotal) : `INR ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(finalTotalDisplay, pageWidth - 20, totalRowY + 1, { align: "right" });

      // Add Amount in Words
      const wordsY = totalRowY + 12;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("AMOUNT IN WORDS:", 15, wordsY - 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const amountWords = numberToWords(grandTotal, currency);
      const splitWords = doc.splitTextToSize(amountWords, 120);
      doc.text(splitWords, 15, wordsY + 2);

      return wordsY + (splitWords.length * 4) + 5;
    },

    bank_details: (y) => {
      if (!business.bankName) return y;
      if (business.enabledBankDocTypes && business.enabledBankDocTypes.length > 0) {
        if (!business.enabledBankDocTypes.includes(data.type)) return y;
      }
      const bankBoxHeight = 25;
      if (y + bankBoxHeight + 5 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        y = headerHeight;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("BANK DETAILS:", 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Bank: ${business.bankName}`, 15, y + 5);
      doc.text(`A/C: ${business.accountNumber}`, 15, y + 10);
      doc.text(`IFSC: ${business.ifscCode}`, 15, y + 15);
      if (business.bankBranchSwift) {
        doc.text(`Branch/SWIFT: ${business.bankBranchSwift}`, 15, y + 20);
        return y + 25;
      }
      return y + 20;
    },

    terms: (y) => {
      const { notes, terms, type, showNotes = true, showTerms = true } = data;
      
      if (type === DocumentType.PACKING_LIST) return y;
      if (!showNotes && !showTerms) return y;

      const body = [];
      if (showNotes && notes && notes.trim()) {
        body.push(["NOTES / PAYMENT INSTRUCTIONS"]);
        body.push([notes]);
      }
      if (showTerms && terms && terms.trim()) {
        body.push(["TERMS & CONDITIONS"]);
        body.push([terms]);
      }
      if (body.length === 0) return y;

      if (y + 20 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        y = headerHeight;
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
        margin: { left: 15, right: 15, bottom: SAFE_BOTTOM, top: headerHeight },
        pageBreak: 'auto'
      });
      return (doc as any).lastAutoTable.finalY + 8;
    },

    signature: (y) => {
      const sigHeight = business.signature ? 30 : 20;
      if (y + sigHeight + 10 > pageHeight - SAFE_BOTTOM) {
        doc.addPage();
        y = headerHeight + 5;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`For ${business.name}`, pageWidth - 15, y, { align: "right" });
      
      if (business.signature) {
        try {
          let format = "PNG";
          if (business.signature.startsWith("data:image/jpeg") || business.signature.startsWith("data:image/jpg")) format = "JPEG";
          
          // Position signature image centrally between the two text labels
          // We provide 20mm of vertical space for the signature
          doc.addImage(business.signature, format, pageWidth - 60, y + 2, 45, 18);
          y += 22;
        } catch (e) {}
      } else {
        y += 20;
      }
      
      doc.setFont("helvetica", "bold");
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


function numberToWords(amount: number, currency: string = "INR"): string {
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
    // Indian numbering system (Lakhs, Crores)
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
    // International numbering system
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
  const subCurrencyName = isINR ? "Paise" : (currency === "USD" ? "Cents" : "Cents");

  if (decimalPart > 0) {
    return `${currencyName} ${result} and ${convertChunk(decimalPart)} ${subCurrencyName} Only`;
  }
  return `${currencyName} ${result} Only`;
}

export async function downloadInvoicePDF(data: InvoiceData): Promise<void> {
  const doc = await generateInvoicePDF(data);
  const { id, type } = data;
  const safeId = id.replace(/[\/\\]/g, "_").replace(/[^a-z0-9_\-]/gi, "_");
  const safeType = type.replace(/[^a-z0-9_\-]/gi, "_");
  doc.save(`${safeType}_${safeId}.pdf`);
}

