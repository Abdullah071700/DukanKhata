import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Supplier, BillWithDetails } from '../types';
import { formatCurrency, formatDate, round2 } from './formatters';

/**
 * Downloads a direct PDF file for Whole-Shop report using jsPDF + autoTable.
 */
export function downloadWholeShopPdf(
  shopName: string,
  suppliers: Supplier[],
  bills: BillWithDetails[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Header banner
  doc.setFillColor(26, 26, 46); // #1a1a2e navy
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(`DukanKhata - ${shopName}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Whole Shop Bill & Balance Statement | Generated: ${dateStr}`, 14, 23);

  // Summary Metrics Box
  const totalBilled = bills.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalPaid = bills.reduce((acc, b) => acc + Number(b.paid_total), 0);
  const totalPending = bills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);
  const pendingCount = bills.filter(b => b.status === 'pending').length;

  doc.setFillColor(240, 244, 248);
  doc.roundedRect(14, 35, 182, 20, 2, 2, 'F');

  doc.setTextColor(26, 26, 46);
  doc.setFontSize(9);
  doc.text('TOTAL SUPPLIERS', 20, 42);
  doc.text('TOTAL BILLED', 65, 42);
  doc.text('TOTAL PAID', 115, 42);
  doc.text('OUTSTANDING BALANCE', 155, 42);

  doc.setFontSize(12);
  doc.text(`${suppliers.length}`, 20, 50);
  doc.text(formatCurrency(totalBilled), 65, 50);
  doc.setTextColor(29, 185, 84); // Green
  doc.text(formatCurrency(totalPaid), 115, 50);
  doc.setTextColor(230, 57, 70); // Red
  doc.text(`${formatCurrency(totalPending)} (${pendingCount} bills)`, 155, 50);

  // Table 1: Suppliers Summary
  doc.setTextColor(26, 26, 46);
  doc.setFontSize(12);
  doc.text('Supplier Balances', 14, 63);

  const supRows = suppliers.map((s, idx) => {
    const sBills = bills.filter(b => b.supplier_id === s.id);
    const sPending = sBills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);
    const sPaid = sBills.reduce((acc, b) => acc + Number(b.paid_total), 0);
    return [
      idx + 1,
      s.name,
      sBills.length,
      formatCurrency(sPaid),
      formatCurrency(sPending),
    ];
  });

  autoTable(doc, {
    startY: 67,
    head: [['#', 'Supplier Name', 'Total Bills', 'Paid', 'Pending Balance']],
    body: supRows,
    theme: 'striped',
    headStyles: { fillColor: [26, 26, 46], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5 },
  });

  // Table 2: Pending Bills (if any)
  const pendingBills = bills.filter(b => b.status === 'pending');
  if (pendingBills.length) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(230, 57, 70);
    doc.text(`Pending Bills (${pendingBills.length})`, 14, finalY);

    const pendingRows = pendingBills.map((b, idx) => [
      idx + 1,
      b.supplier?.name || 'Unknown',
      formatDate(b.bill_date),
      b.salesman_name || '—',
      formatCurrency(b.amount),
      formatCurrency(b.paid_total),
      formatCurrency(b.remaining_balance),
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['#', 'Supplier', 'Date', 'Salesman', 'Bill Amount', 'Paid', 'Remaining']],
      body: pendingRows,
      theme: 'grid',
      headStyles: { fillColor: [230, 57, 70], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
    });
  }

  const cleanShop = shopName.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_') || 'Shop';
  doc.save(`DukanKhata_${cleanShop}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Downloads a direct PDF file for Supplier-Specific report.
 */
export function downloadSupplierPdf(
  shopName: string,
  supplier: Supplier,
  bills: BillWithDetails[],
  fromDate?: string,
  toDate?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const rangeText = fromDate && toDate
    ? `${formatDate(fromDate)} to ${formatDate(toDate)}`
    : fromDate
    ? `From ${formatDate(fromDate)} onwards`
    : toDate
    ? `Up to ${formatDate(toDate)}`
    : 'All Dates';

  // Banner
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`Supplier Statement: ${supplier.name}`, 14, 13);
  doc.setFontSize(10);
  doc.text(`Shop: ${shopName} | Date Range: ${rangeText} | Generated: ${dateStr}`, 14, 21);

  // Totals box
  const totalBilled = bills.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalPaid = bills.reduce((acc, b) => acc + Number(b.paid_total), 0);
  const totalPending = bills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);

  doc.setFillColor(240, 244, 248);
  doc.roundedRect(14, 33, 269, 18, 2, 2, 'F');

  doc.setTextColor(26, 26, 46);
  doc.setFontSize(9);
  doc.text('MATCHING BILLS', 20, 39);
  doc.text('TOTAL BILLED', 80, 39);
  doc.text('TOTAL PAID', 150, 39);
  doc.text('REMAINING BALANCE', 220, 39);

  doc.setFontSize(12);
  doc.text(`${bills.length}`, 20, 46);
  doc.text(formatCurrency(totalBilled), 80, 46);
  doc.setTextColor(29, 185, 84);
  doc.text(formatCurrency(totalPaid), 150, 46);
  doc.setTextColor(230, 57, 70);
  doc.text(formatCurrency(totalPending), 220, 46);

  // Bills table
  const billRows = bills.map((b, idx) => [
    idx + 1,
    formatDate(b.bill_date),
    b.salesman_name || '—',
    formatCurrency(b.amount),
    formatCurrency(b.paid_total),
    formatCurrency(b.remaining_balance),
    b.status.toUpperCase(),
    b.payments.length > 0
      ? b.payments.map(p => `${formatCurrency(p.amount)} (${formatDate(p.payment_date)})`).join(', ')
      : 'None',
  ]);

  autoTable(doc, {
    startY: 56,
    head: [['#', 'Bill Date', 'Salesman', 'Bill Amount', 'Paid Amount', 'Remaining', 'Status', 'Payment History']],
    body: billRows,
    theme: 'grid',
    headStyles: { fillColor: [26, 26, 46], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
      6: { cellWidth: 25 },
      7: { cellWidth: 'auto' },
    },
  });

  const cleanSup = supplier.name.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_') || 'Supplier';
  doc.save(`DukanKhata_${cleanSup}_Bills_${new Date().toISOString().slice(0, 10)}.pdf`);
}
