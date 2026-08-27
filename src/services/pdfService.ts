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

      if (type !== DocumentType.TAX_INVOICE) {
        // --- SIMPLE DOC / QUOTATION / PO / CHALLAN / PACKING LIST LAYOUT (Matching media_1787819639799.png) ---
        
        // 1. Title Banner Bar
        const docTitle = type === DocumentType.QUOTATION 
          ? "QUOTATION" 
          : (type === DocumentType.PURCHASE_ORDER 
            ? "PURCHASE ORDER" 
            : (type === DocumentType.PROFORMA_INVOICE 
              ? "PROFORMA INVOICE" 
              : (type === DocumentType.PACKING_LIST 
                ? "PACKING LIST" 
                : "DELIVERY CHALLAN")));

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
            cellPadding: 3,
            lineWidth: 0.2,
            lineColor: [180, 185, 195],
          },
          margin: { left: leftMargin, right: rightMargin, top: headerHeight },
        });

        const topRefStartY = (doc as any).lastAutoTable.finalY;

        // 2. Top Document Reference Row(s)
        const docLabel = type === DocumentType.QUOTATION 
          ? "Quotation No." 
          : (type === DocumentType.PURCHASE_ORDER 
            ? "P.O. No." 
            : (type === DocumentType.PACKING_LIST 
              ? "Packing List No." 
              : (type === DocumentType.PROFORMA_INVOICE 
                ? "Proforma Invoice No." 
                : "Challan No.")));

        const dateLabel = type === DocumentType.QUOTATION 
          ? "Quotation Date" 
          : (type === DocumentType.PURCHASE_ORDER 
            ? "P.O. Date" 
            : "Date");

        const dateFormatted = date ? formatDateClean(date) : "";

        const topRefRows: string[][] = [
          [`${docLabel} - ${id}`, `${dateLabel} - ${dateFormatted}`]
        ];

        const paymentTermsText = paymentTermsCustom || (paymentTermsDays ? `${paymentTermsDays} ${paymentTermsUnit || "Days"}` : "");
        const dueOrValid = type === DocumentType.QUOTATION 
          ? (validUntilDate ? formatDateClean(validUntilDate) : "") 
          : formatDateClean(dueDate);

        if (paymentTermsText && paymentTermsText.trim() && paymentTermsText !== "-") {
          if (dueOrValid && dueOrValid.trim() && dueOrValid !== "-") {
            const validLabel = type === DocumentType.QUOTATION ? "Valid Until" : "Terms / Due Date";
            topRefRows.push([`Payment Terms - ${paymentTermsText}`, `${validLabel} - ${dueOrValid}`]);
          } else {
            topRefRows.push([`Payment Terms - ${paymentTermsText}`, ""]);
          }
        } else if (dueOrValid && dueOrValid.trim() && dueOrValid !== "-") {
          const validLabel = type === DocumentType.QUOTATION ? "Valid Until" : "Terms / Due Date";
          topRefRows.push([`${validLabel} - ${dueOrValid}`, ""]);
        }

        autoTable(doc, {
          startY: topRefStartY,
          body: topRefRows,
          theme: 'grid',
          styles: {
            fontSize: 7.5,
            cellPadding: 3,
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
          didParseCell: (data) => {
            const rawRow = data.row.raw as string[];
            if (rawRow && rawRow[1] === "" && data.column.index === 0) {
              data.cell.colSpan = 2;
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
        if (consigneeName) customerRows.push(["Shipped To (Consignee) -", consigneeName]);
        if (consigneeAddress) customerRows.push(["Ship Addr -", consigneeAddress]);

        // Render Vendor Column (x = 15 to x = 105)
        autoTable(doc, {
          startY: bottomBlockStartY,
          body: vendorRows,
          theme: 'plain',
          styles: {
            fontSize: 7.5,
            cellPadding: { top: 1.0, bottom: 1.0, left: 3, right: 3 },
            textColor: [20, 20, 20],
            font: "helvetica"
          },
          columnStyles: {
            0: { cellWidth: 90, fontStyle: 'normal' }
          },
          didParseCell: (data) => {
            if (data.cell.raw === "VENDOR DETAILS") {
              data.cell.styles.fillColor = [242, 245, 250];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [30, 30, 30];
              data.cell.styles.fontSize = 7.5;
              data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 3, right: 3 };
              data.cell.colSpan = 2;
            }
          },
          didDrawCell: (data) => {
            if (data.cell.raw === "VENDOR DETAILS") {
              doc.setDrawColor(180, 185, 195);
              doc.setLineWidth(0.2);
              doc.line(data.cell.x, data.cell.y, data.cell.x + 90, data.cell.y);
              doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + 90, data.cell.y + data.cell.height);
            } else if (data.section === 'body' && Array.isArray(data.row.raw)) {
              const label = String(data.row.raw[0] || "");
              const val = String(data.row.raw[1] || "");
              if (label && label !== "VENDOR DETAILS") {
                doc.setFillColor(255, 255, 255);
                doc.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

                const paddingX = data.cell.x + 3;
                const posY = data.cell.y + (data.cell.height / 2) + 1.0;

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);
                doc.text(label, paddingX, posY);

                const labelW = doc.getTextWidth(label);
                const isBoldVal = (label === "M/S -");
                doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);
                doc.text(` ${val}`, paddingX + labelW, posY);
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
            cellPadding: { top: 1.0, bottom: 1.0, left: 3, right: 3 },
            textColor: [20, 20, 20],
            font: "helvetica"
          },
          columnStyles: {
            0: { cellWidth: 90, fontStyle: 'normal' }
          },
          didParseCell: (data) => {
            if (data.cell.raw === "CUSTOMER DETAILS") {
              data.cell.styles.fillColor = [242, 245, 250];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = [30, 30, 30];
              data.cell.styles.fontSize = 7.5;
              data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 3, right: 3 };
              data.cell.colSpan = 2;
            }
          },
          didDrawCell: (data) => {
            if (data.cell.raw === "CUSTOMER DETAILS") {
              doc.setDrawColor(180, 185, 195);
              doc.setLineWidth(0.2);
              doc.line(data.cell.x, data.cell.y, data.cell.x + 90, data.cell.y);
              doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + 90, data.cell.y + data.cell.height);
            } else if (data.section === 'body' && Array.isArray(data.row.raw)) {
              const label = String(data.row.raw[0] || "");
              const val = String(data.row.raw[1] || "");
              if (label && label !== "CUSTOMER DETAILS") {
                doc.setFillColor(255, 255, 255);
                doc.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

                const paddingX = data.cell.x + 3;
                const posY = data.cell.y + (data.cell.height / 2) + 1.0;

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);
                doc.text(label, paddingX, posY);

                const labelW = doc.getTextWidth(label);
                const isBoldVal = (label === "M/S -" || label === "Shipped To (Consignee) -");
                doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(30, 30, 30);
                doc.text(` ${val}`, paddingX + labelW, posY);
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

      // --- TAX INVOICE FULL LOGISTICS LAYOUT ---
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
          cellPadding: 3,
          lineWidth: 0.2,
          lineColor: [180, 185, 195],
        },
        margin: { left: leftMargin, right: rightMargin, top: headerHeight },
      });

      const blockStartY = (doc as any).lastAutoTable.finalY;

      // 2. Prepare Left Column Rows with Bold Labels & Bold Names (NO inner horizontal lines & Tight Inline Gap!)
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
          fontSize: 7.5,
          cellPadding: { top: 1.0, bottom: 1.0, left: 3, right: 3 },
          textColor: [20, 20, 20],
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: leftColWidth, fontStyle: 'normal' }
        },
        didParseCell: (data) => {
          if (data.cell.raw === "VENDOR DETAILS" || data.cell.raw === "BUYER & CONSIGNEE DETAILS") {
            data.cell.styles.fillColor = [242, 245, 250];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [30, 30, 30];
            data.cell.styles.fontSize = 7.5;
            data.cell.styles.cellPadding = { top: 2.5, bottom: 2.5, left: 3, right: 3 };
            data.cell.colSpan = 2;
          }
        },
        didDrawCell: (data) => {
          if (data.cell.raw === "VENDOR DETAILS" || data.cell.raw === "BUYER & CONSIGNEE DETAILS") {
            doc.setDrawColor(180, 185, 195);
            doc.setLineWidth(0.2);
            doc.line(data.cell.x, data.cell.y, data.cell.x + leftColWidth, data.cell.y);
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + leftColWidth, data.cell.y + data.cell.height);
          } else if (data.section === 'body' && Array.isArray(data.row.raw)) {
            const label = String(data.row.raw[0] || "");
            const val = String(data.row.raw[1] || "");
            if (label && label !== "VENDOR DETAILS" && label !== "BUYER & CONSIGNEE DETAILS") {
              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

              const paddingX = data.cell.x + 3;
              const posY = data.cell.y + (data.cell.height / 2) + 1.0;

              // Draw Label in Bold
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              doc.setTextColor(30, 30, 30);
              doc.text(label, paddingX, posY);

              const labelW = doc.getTextWidth(label);

              // Draw Value in Normal (or Bold for Name) with ONLY a small natural gap (1.5mm)
              const isBoldVal = (label === "M/S -" || label === "Billed To (Buyer) -" || label === "Shipped To (Consignee) -");
              doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(30, 30, 30);
              doc.text(` ${val}`, paddingX + labelW, posY);
            }
          }
        },
        margin: { left: leftMargin, right: pageWidth - leftMargin - leftColWidth, top: headerHeight },
      });

      const leftFinalY = (doc as any).lastAutoTable.finalY;

      // 3. Build Right Column Pairs (Strict Row-by-Row Filtering - ONLY Non-Empty Values!)
      const docLabel = "Invoice No.";
      const dateFormatted = date ? formatDateClean(date) : "";

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
        pairRow3.push({ k: "Order Date:", v: formatDateClean(poDate) });
      }

      const pairRow4: Array<{ k: string; v: string }> = [];
      const paymentTermsText = paymentTermsCustom || (paymentTermsDays ? `${paymentTermsDays} ${paymentTermsUnit || "Days"}` : "");
      if (paymentTermsText && paymentTermsText.trim() && paymentTermsText !== "-") {
        pairRow4.push({ k: "Payment Terms:", v: paymentTermsText });
      }

      if (dueDate && dueDate.trim() && dueDate !== "-") {
        pairRow4.push({ k: "Terms / Due Date:", v: formatDateClean(dueDate) });
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

      // 2-Column table format matching Image 2 reference layout
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
          cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 },
          textColor: [20, 20, 20],
          font: "helvetica",
          lineWidth: 0.2,
          lineColor: [180, 185, 195]
        },
        columnStyles: {
          0: { cellWidth: rightColWidth / 2 },
          1: { cellWidth: rightColWidth / 2 },
        },
        didParseCell: (data) => {
          const rawRow = data.row.raw as any[];
          if (rawRow && rawRow[1] === null && data.column.index === 0) {
            data.cell.colSpan = 2;
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const rawItem = data.cell.raw as { k: string; v: string } | null;
            if (rawItem && rawItem.k) {
              // Fill cell background white to clear default text rendering
              doc.setFillColor(255, 255, 255);
              doc.rect(data.cell.x + 0.1, data.cell.y + 0.1, data.cell.width - 0.2, data.cell.height - 0.2, 'F');

              const paddingX = data.cell.x + 2.5;
              const availW = data.cell.width - 5;
              const formattedVal = formatDateClean(rawItem.v);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              const keyWidth = doc.getTextWidth(rawItem.k);

              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              const valWidth = doc.getTextWidth(` ${formattedVal}`);

              // Auto text wrap: Check if Key + Value fits on 1 single line
              if ((keyWidth + valWidth) <= availW) {
                const centerY = data.cell.y + (data.cell.height / 2) + 1.0;
                doc.setFont("helvetica", "bold");
                doc.text(rawItem.k, paddingX, centerY);
                doc.setFont("helvetica", "normal");
                doc.text(` ${formattedVal}`, paddingX + keyWidth, centerY);
              } else {
                // Multi-line wrap inside cell: Line 1 = Key (Bold), Line 2 = Value (Normal)
                const line1Y = data.cell.y + (data.cell.height / 2) - 1.2;
                const line2Y = data.cell.y + (data.cell.height / 2) + 2.5;

                doc.setFont("helvetica", "bold");
                doc.text(rawItem.k, paddingX, line1Y);

                doc.setFont("helvetica", "normal");
                const wrappedVal = doc.splitTextToSize(formattedVal, availW);
                doc.text(wrappedVal[0] || "", paddingX, line2Y);
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

    items_table: (y) => {
      const { items, isExport, currency = "INR", type, showChallanPrices = true } = data;
      const isTaxInvoice = type === DocumentType.TAX_INVOICE;
      const isChallan = type === DocumentType.DELIVERY_CHALLAN;
      const isPackingList = type === DocumentType.PACKING_LIST;

      const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

      let headers: string[] = [];
      if (isPackingList) {
        headers = ["S.N.", "Description of Goods", "HSN/SAC", "Box No.", "Heat / Lot No.", "Qty Packed", "Total Qty", "Unit"];
      } else if (isChallan) {
        headers = showChallanPrices 
          ? ["S.N.", "Description of Goods", "HSN/SAC", "Qty", "Unit", `Rate (${currencySymbol})`, `Amount (${currencySymbol})`]
          : ["S.N.", "Description of Goods", "HSN/SAC", "Qty", "Unit"];
      } else {
        headers = ["S.N.", "Description of Goods", "HSN/SAC", "Qty", "Unit", `Rate (${currencySymbol})`, `Tax %`, `Amount (${currencySymbol})`];
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

    totals: (y) => {
      const { items, currency = "INR", type, showChallanPrices = true } = data;
      if (type === DocumentType.DELIVERY_CHALLAN && !showChallanPrices) {
        return y;
      }

      const currencySymbol = CURRENCY_SYMBOLS[currency] || currency;

      let subtotal = 0;
      let totalTax = 0;

      items.forEach((item) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const taxRate = Number(item.taxRate) || 0;
        const itemAmount = qty * rate;
        subtotal += itemAmount;
        totalTax += itemAmount * (taxRate / 100);
      });

      const grandTotal = subtotal + totalTax;

      const totalsData = [
        ["Subtotal:", `${currencySymbol} ${subtotal.toFixed(2)}`],
        ["Tax Amount:", `${currencySymbol} ${totalTax.toFixed(2)}`],
        ["Grand Total:", `${currencySymbol} ${grandTotal.toFixed(2)}`],
      ];

      autoTable(doc, {
        startY: y,
        body: totalsData,
        theme: "plain",
        styles: {
          fontSize: 8.5,
          cellPadding: 1.5,
        },
        columnStyles: {
          0: { halign: "right", fontStyle: "bold", cellWidth: 130 },
          1: { halign: "right", fontStyle: "bold", cellWidth: 35 },
        },
        margin: { left: 15, right: 15, top: headerHeight },
      });

      return (doc as any).lastAutoTable.finalY + 8;
    },

    bank_details: (y) => {
      const { business, type } = data;

      // Check if bank details should be shown for this document type
      const enabledTypes = business.enabledBankDocTypes || [DocumentType.TAX_INVOICE, DocumentType.PROFORMA_INVOICE];
      if (!enabledTypes.includes(type) || !business.bankName) {
        return y;
      }

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Bank Account Details:", 15, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Bank: ${business.bankName}`, 15, y + 4);
      doc.text(`A/C No: ${business.accountNumber}`, 15, y + 8);
      doc.text(`IFSC: ${business.ifscCode}`, 15, y + 12);
      if (business.bankBranchSwift) {
        doc.text(`Branch/SWIFT: ${business.bankBranchSwift}`, 15, y + 16);
        return y + 22;
      }

      return y + 18;
    },

    terms: (y) => {
      const { notes, terms } = data;
      let currentSectionY = y;

      if (notes) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 15, currentSectionY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const splitNotes = doc.splitTextToSize(notes, 180);
        doc.text(splitNotes, 15, currentSectionY + 4);
        currentSectionY += 4 + (splitNotes.length * 4) + 4;
      }

      if (terms) {
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text("Terms & Conditions:", 15, currentSectionY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const splitTerms = doc.splitTextToSize(terms, 180);
        doc.text(splitTerms, 15, currentSectionY + 4);
        currentSectionY += 4 + (splitTerms.length * 4) + 4;
      }

      return currentSectionY;
    },

    signature: (y) => {
      const { business } = data;
      const signatureY = Math.max(y, pageHeight - SAFE_BOTTOM - 25);

      if (business.signature) {
        try {
          let format = "PNG";
          if (business.signature.startsWith("data:image/jpeg") || business.signature.startsWith("data:image/jpg")) format = "JPEG";
          doc.addImage(business.signature, format, pageWidth - 55, signatureY - 15, 40, 15);
        } catch (e) {}
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`For ${business.name}`, pageWidth - 15, signatureY, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text("Authorized Signatory", pageWidth - 15, signatureY + 8, { align: "right" });

      return signatureY + 12;
    }
  };

  // Render sections in configured order
  const order = layoutSettings.sectionOrder || DEFAULT_LAYOUT.sectionOrder;
  for (const sectionName of order) {
    if (sections[sectionName]) {
      currentY = sections[sectionName](currentY);
    }
  }

  return doc;
}
