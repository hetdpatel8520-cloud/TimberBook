const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { numberToWords } = require('./timberMath');

const FONT_REGULAR_PATH = path.join(__dirname, '../../assets/fonts/Arial.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '../../assets/fonts/Arial-Bold.ttf');

/**
 * Generates a professional Timber Tax Invoice PDF matching desktop ERP printouts
 */
function generateInvoicePdf(invoice, company, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
  doc.pipe(stream);

  let fontRegular = 'Helvetica';
  let fontBold = 'Helvetica-Bold';
  let currencySymbol = 'Rs.';

  if (fs.existsSync(FONT_REGULAR_PATH) && fs.existsSync(FONT_BOLD_PATH)) {
    try {
      doc.registerFont('AppFont', FONT_REGULAR_PATH);
      doc.registerFont('AppFont-Bold', FONT_BOLD_PATH);
      fontRegular = 'AppFont';
      fontBold = 'AppFont-Bold';
      currencySymbol = '₹';
    } catch (e) {
      console.error('Failed to register custom fonts in pdfService:', e.message);
    }
  }

  const primaryNavy = '#102A43';
  const accentGold = '#D4A017';
  const textDark = '#1F2937';
  const textMuted = '#6B7280';
  const borderGrey = '#E5E7EB';

  // Header Box
  doc.rect(30, 30, 535, 75).fillAndStroke('#F8FAFC', primaryNavy);

  // Company Title & Header
  doc.fontSize(16).fillColor(primaryNavy).font(fontBold)
    .text(company.name || 'TAX INVOICE', 40, 38, { width: 340 });

  doc.fontSize(8).fillColor(textMuted).font(fontRegular)
    .text(company.tagline || `${company.businessType || 'Timber Trader'} & Saw Mill`, 40, 56)
    .text(`${company.address || ''}, ${company.city || ''} - ${company.pincode || ''}, ${company.state || ''}`, 40, 68)
    .text(`GSTIN: ${company.gstin || ''} | Phone: ${company.phone || ''}`, 40, 80);

  // Invoice Title & Badges (Right corner)
  doc.fontSize(13).fillColor(accentGold).font(fontBold)
    .text('TAX INVOICE', 390, 38, { align: 'right', width: 165 });

  doc.fontSize(7).fillColor(primaryNavy).font(fontRegular)
    .text('ORIGINAL FOR RECIPIENT', 390, 54, { align: 'right', width: 165 })
    .text(`Invoice No: ${invoice.billNo}`, 390, 68, { align: 'right', width: 165, font: fontBold })
    .text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, 390, 80, { align: 'right', width: 165 });

  // Bill To & Shipped To Box
  let y = 115;
  doc.rect(30, y, 262, 70).stroke(borderGrey);
  doc.rect(302, y, 263, 70).stroke(borderGrey);

  doc.fontSize(8).fillColor(primaryNavy).font(fontBold)
    .text('DETAILS OF RECEIVER / BILLED TO:', 36, y + 6);

  const party = invoice.partySnapshot || {};
  doc.fontSize(8).fillColor(textDark).font(fontRegular)
    .text(`Name: ${party.name || 'Cash Customer'}`, 36, y + 18)
    .text(`Address: ${party.address || 'Local'}, ${party.city || ''}`, 36, y + 30)
    .text(`GSTIN: ${party.gstin || 'Unregistered'} | State: ${party.state || 'Local'}`, 36, y + 42)
    .text(`Phone: ${party.phone || 'N/A'}`, 36, y + 54);

  doc.fontSize(8).fillColor(primaryNavy).font(fontBold)
    .text('TRANSPORT & DISPATCH DETAILS:', 308, y + 6);

  const extra = invoice.extraDetails || {};
  doc.fontSize(8).fillColor(textDark).font(fontRegular)
    .text(`Mode: ${invoice.mode || 'Credit'} | Challan: ${invoice.challanNo || 'N/A'}`, 308, y + 18)
    .text(`Vehicle No: ${extra.vehicleNo || 'N/A'} | Transport: ${extra.transport || 'Direct'}`, 308, y + 30)
    .text(`Driver: ${extra.driverName || 'N/A'} (${extra.driverPhone || ''})`, 308, y + 42)
    .text(`Delivery At: ${invoice.deliveryAt || 'Destination'}`, 308, y + 54);

  // Items Table Header
  y = 195;
  doc.rect(30, y, 535, 20).fill(primaryNavy);
  doc.fontSize(7.5).fillColor('#FFFFFF').font(fontBold)
    .text('Sr', 34, y + 5, { width: 20 })
    .text('Description of Timber Goods', 58, y + 5, { width: 160 })
    .text('HSN', 222, y + 5, { width: 35 })
    .text('Pcs/Qty', 260, y + 5, { width: 40, align: 'right' })
    .text('CFT / CBM', 305, y + 5, { width: 55, align: 'right' })
    .text('Rate', 365, y + 5, { width: 45, align: 'right' })
    .text('Taxable', 415, y + 5, { width: 55, align: 'right' })
    .text(`Total (${currencySymbol})`, 475, y + 5, { width: 80, align: 'right' });

  // Items Rows
  y += 20;
  let sr = 1;
  const items = invoice.items || [];

  items.forEach((item) => {
    const isEven = sr % 2 === 0;
    if (isEven) {
      doc.rect(30, y, 535, 22).fill('#F9FAFB');
    }
    doc.rect(30, y, 535, 22).stroke(borderGrey);

    let desc = item.description || 'Timber Item';
    if (invoice.billType === 'Size' && item.thickness && item.width && item.length) {
      desc += ` (${item.thickness}"×${item.width}"×${item.length}')`;
    }

    let volStr = '';
    if (item.cft) volStr += `${item.cft} CFT`;
    if (item.cbm) volStr += ` / ${item.cbm} CBM`;
    if (!volStr) volStr = `${item.qty} ${item.rateUnit || 'Units'}`;

    doc.fontSize(7.5).fillColor(textDark).font(fontRegular)
      .text(String(sr++), 34, y + 6, { width: 20 })
      .text(desc, 58, y + 6, { width: 160, lineBreak: false, ellipsis: true })
      .text(item.hsn || '4407', 222, y + 6, { width: 35 })
      .text(String(item.qty || item.pieces || 1), 260, y + 6, { width: 40, align: 'right' })
      .text(volStr, 305, y + 6, { width: 55, align: 'right' })
      .text(Number(item.rate || 0).toFixed(2), 365, y + 6, { width: 45, align: 'right' })
      .text(Number(item.amount || 0).toFixed(2), 415, y + 6, { width: 55, align: 'right' })
      .text(Number(item.total || item.amount || 0).toFixed(2), 475, y + 6, { width: 80, align: 'right' });

    y += 22;
  });

  // Totals Box
  y = Math.max(y + 10, 480);
  doc.rect(30, y, 310, 95).stroke(borderGrey); // Bank info & words
  doc.rect(345, y, 220, 95).stroke(borderGrey); // Taxes & Grand Total

  // Left side: Bank Details & Amount in Words
  const bank = company.bankDetails || {};
  doc.fontSize(7.5).fillColor(primaryNavy).font(fontBold)
    .text('BANK DETAILS FOR DIRECT PAYMENT:', 36, y + 6);

  doc.fontSize(7).fillColor(textDark).font(fontRegular)
    .text(`Bank: ${bank.bankName || 'SBI'} | A/c No: ${bank.accountNo || 'N/A'}`, 36, y + 18)
    .text(`IFSC: ${bank.ifsc || 'N/A'} | Branch: ${bank.branch || 'Main Branch'}`, 36, y + 28)
    .text(`A/c Name: ${bank.accountName || company.name || 'Account Holder'}`, 36, y + 38);

  doc.fontSize(7.5).fillColor(primaryNavy).font(fontBold)
    .text('AMOUNT IN WORDS:', 36, y + 54);

  doc.fontSize(7.5).fillColor(accentGold).font(fontBold)
    .text(numberToWords(invoice.grandTotal || 0), 36, y + 66, { width: 300 });

  // Right side: Tax breakdown & Grand Total
  doc.fontSize(8).fillColor(textDark).font(fontRegular)
    .text('Taxable Subtotal:', 355, y + 8)
    .text(`${currencySymbol} ${Number(invoice.subtotal || 0).toFixed(2)}`, 460, y + 8, { width: 100, align: 'right' });

  let taxRowY = y + 20;
  if (invoice.cgstTotal > 0 || invoice.sgstTotal > 0) {
    doc.text(`CGST:`, 355, taxRowY)
      .text(`${currencySymbol} ${Number(invoice.cgstTotal || 0).toFixed(2)}`, 460, taxRowY, { width: 100, align: 'right' });
    taxRowY += 12;
    doc.text(`SGST:`, 355, taxRowY)
      .text(`${currencySymbol} ${Number(invoice.sgstTotal || 0).toFixed(2)}`, 460, taxRowY, { width: 100, align: 'right' });
    taxRowY += 12;
  }
  if (invoice.igstTotal > 0) {
    doc.text(`IGST:`, 355, taxRowY)
      .text(`${currencySymbol} ${Number(invoice.igstTotal || 0).toFixed(2)}`, 460, taxRowY, { width: 100, align: 'right' });
    taxRowY += 12;
  }

  doc.text(`Round Off:`, 355, taxRowY)
    .text(`${currencySymbol} ${Number(invoice.roundOff || 0).toFixed(2)}`, 460, taxRowY, { width: 100, align: 'right' });

  // Grand Total bar
  doc.rect(345, y + 68, 220, 27).fill(primaryNavy);
  doc.fontSize(10).fillColor('#FFFFFF').font(fontBold)
    .text('GRAND TOTAL:', 355, y + 76)
    .text(`${currencySymbol} ${Number(invoice.grandTotal || 0).toLocaleString('en-IN')}`, 450, y + 76, { width: 105, align: 'right' });

  // Footer: Terms & Authorised Signatory
  y = y + 105;
  doc.fontSize(7).fillColor(textMuted).font(fontRegular)
    .text('Terms & Conditions:', 30, y);
  const terms = company.termsAndConditions || [];
  let termY = y + 10;
  terms.slice(0, 3).forEach((term, idx) => {
    doc.text(`${idx + 1}. ${term}`, 30, termY);
    termY += 9;
  });

  // Signatory
  doc.fontSize(8).fillColor(primaryNavy).font(fontBold)
    .text(`For ${company.name || 'Company'}`, 390, y + 15, { align: 'right', width: 175 })
    .text('Authorised Signatory', 390, y + 48, { align: 'right', width: 175, font: fontRegular });

  doc.end();
}

module.exports = { generateInvoicePdf };
