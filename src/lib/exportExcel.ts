import * as XLSX from 'xlsx';
import { Supplier, BillWithDetails, Payment } from '../types';
import { sanitizeSpreadsheetValue, formatDate, round2 } from './formatters';

/**
 * Generates and downloads a real native .xlsx workbook for Whole-Shop export.
 */
export function exportWholeShopExcel(
  shopName: string,
  suppliers: Supplier[],
  bills: BillWithDetails[]
) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);

  // --- SHEET 1: SUMMARY & SUPPLIERS ---
  const supRows = suppliers.map((s, idx) => {
    const sBills = bills.filter(b => b.supplier_id === s.id);
    const totalBilled = sBills.reduce((acc, b) => acc + Number(b.amount), 0);
    const totalPaid = sBills.reduce((acc, b) => acc + Number(b.paid_total), 0);
    const totalPending = sBills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);

    return {
      '#': idx + 1,
      'Supplier Name': sanitizeSpreadsheetValue(s.name),
      'Phone': sanitizeSpreadsheetValue(s.phone || ''),
      'Total Bills': sBills.length,
      'Total Billed (₹)': round2(totalBilled),
      'Total Paid (₹)': round2(totalPaid),
      'Pending Balance (₹)': round2(totalPending),
    };
  });

  const wsSuppliers = XLSX.utils.json_to_sheet(supRows);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, 'Suppliers & Balances');

  // --- SHEET 2: ALL BILLS ---
  const billRows = bills.map((b, idx) => ({
    '#': idx + 1,
    'Bill ID': sanitizeSpreadsheetValue(b.id),
    'Supplier': sanitizeSpreadsheetValue(b.supplier?.name || 'Unknown'),
    'Bill Date': formatDate(b.bill_date),
    'Salesman': sanitizeSpreadsheetValue(b.salesman_name || '—'),
    'Bill Amount (₹)': round2(b.amount),
    'Paid Amount (₹)': round2(b.paid_total),
    'Remaining Balance (₹)': round2(b.remaining_balance),
    'Status': b.status.toUpperCase(),
    'Payments Count': b.payments.length,
  }));

  const wsBills = XLSX.utils.json_to_sheet(billRows);
  XLSX.utils.book_append_sheet(wb, wsBills, 'All Bills');

  // --- SHEET 3: PAYMENT HISTORY ---
  const payRows: any[] = [];
  let pIdx = 1;
  bills.forEach(b => {
    b.payments.forEach(p => {
      payRows.push({
        '#': pIdx++,
        'Payment ID': sanitizeSpreadsheetValue(p.id),
        'Bill ID': sanitizeSpreadsheetValue(b.id),
        'Supplier': sanitizeSpreadsheetValue(b.supplier?.name || 'Unknown'),
        'Bill Date': formatDate(b.bill_date),
        'Payment Date': formatDate(p.payment_date),
        'Amount Paid (₹)': round2(p.amount),
        'Notes': sanitizeSpreadsheetValue(p.notes || ''),
      });
    });
  });

  const wsPayments = XLSX.utils.json_to_sheet(payRows.length ? payRows : [{ 'Note': 'No payments recorded yet' }]);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payment History');

  // Download real .xlsx binary
  const cleanShopName = shopName.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_') || 'Shop';
  XLSX.writeFile(wb, `DukanKhata_${cleanShopName}_Full_Export_${dateStr}.xlsx`);
}

/**
 * Generates and downloads a real native .xlsx workbook for Supplier-Specific export.
 */
export function exportSupplierExcel(
  shopName: string,
  supplier: Supplier,
  bills: BillWithDetails[],
  fromDate?: string,
  toDate?: string
) {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().slice(0, 10);
  const rangeLabel = fromDate && toDate
    ? `${fromDate}_to_${toDate}`
    : fromDate
    ? `from_${fromDate}`
    : toDate
    ? `up_to_${toDate}`
    : 'all_dates';

  // --- SHEET 1: BILLS ---
  const billRows = bills.map((b, idx) => ({
    '#': idx + 1,
    'Bill ID': sanitizeSpreadsheetValue(b.id),
    'Supplier': sanitizeSpreadsheetValue(supplier.name),
    'Bill Date': formatDate(b.bill_date),
    'Salesman': sanitizeSpreadsheetValue(b.salesman_name || '—'),
    'Bill Amount (₹)': round2(b.amount),
    'Paid Amount (₹)': round2(b.paid_total),
    'Remaining Balance (₹)': round2(b.remaining_balance),
    'Status': b.status.toUpperCase(),
  }));

  // Totals summary row
  const totalBilled = bills.reduce((acc, b) => acc + Number(b.amount), 0);
  const totalPaid = bills.reduce((acc, b) => acc + Number(b.paid_total), 0);
  const totalBalance = bills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);

  billRows.push({
    '#': 'TOTAL',
    'Bill ID': '',
    'Supplier': sanitizeSpreadsheetValue(supplier.name),
    'Bill Date': '',
    'Salesman': '',
    'Bill Amount (₹)': round2(totalBilled),
    'Paid Amount (₹)': round2(totalPaid),
    'Remaining Balance (₹)': round2(totalBalance),
    'Status': '',
  } as any);

  const wsBills = XLSX.utils.json_to_sheet(billRows);
  XLSX.utils.book_append_sheet(wb, wsBills, 'Supplier Bills');

  // --- SHEET 2: PAYMENTS ---
  const payRows: any[] = [];
  let pIdx = 1;
  bills.forEach(b => {
    b.payments.forEach(p => {
      payRows.push({
        '#': pIdx++,
        'Payment ID': sanitizeSpreadsheetValue(p.id),
        'Bill ID': sanitizeSpreadsheetValue(b.id),
        'Bill Date': formatDate(b.bill_date),
        'Payment Date': formatDate(p.payment_date),
        'Payment Amount (₹)': round2(p.amount),
      });
    });
  });

  const wsPayments = XLSX.utils.json_to_sheet(payRows.length ? payRows : [{ 'Note': 'No payments recorded for these bills' }]);
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payment Details');

  const cleanSupName = supplier.name.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '_') || 'Supplier';
  XLSX.writeFile(wb, `DukanKhata_${cleanSupName}_Bills_${rangeLabel}.xlsx`);
}
