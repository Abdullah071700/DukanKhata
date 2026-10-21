import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Supplier, BillWithDetails } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../lib/formatters';
import { ArrowLeft, Download, FileSpreadsheet, FileText, AlertCircle, Calendar } from 'lucide-react';
import { exportSupplierExcel } from '../lib/exportExcel';
import { downloadSupplierPdf } from '../lib/exportPdf';
import { StatusBadge } from '../components/StatusBadge';

interface SupplierReportScreenProps {
  suppliers: Supplier[];
  bills: BillWithDetails[];
  onGoBack: () => void;
  showToast: (msg: string) => void;
}

export const SupplierReportScreen: React.FC<SupplierReportScreenProps> = ({
  suppliers,
  bills,
  onGoBack,
  showToast,
}) => {
  const { currentShop } = useAuth();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Quick range helper
  const handleSetRange = (type: 'thisMonth' | 'lastMonth' | 'last30' | 'clear') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (type === 'thisMonth') {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      setFromDate(firstDay.toISOString().slice(0, 10));
      setToDate(lastDay.toISOString().slice(0, 10));
    } else if (type === 'lastMonth') {
      const firstDay = new Date(y, m - 1, 1);
      const lastDay = new Date(y, m, 0);
      setFromDate(firstDay.toISOString().slice(0, 10));
      setToDate(lastDay.toISOString().slice(0, 10));
    } else if (type === 'last30') {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      setFromDate(past.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (type === 'clear') {
      setFromDate('');
      setToDate('');
    }
  };

  // Filter bills on bill date (inclusive of both endpoints)
  const filteredBills = useMemo(() => {
    if (!selectedSupplierId) return [];

    return bills
      .filter(b => b.supplier_id === selectedSupplierId)
      .filter(b => {
        if (!fromDate && !toDate) return true;
        if (!b.bill_date) return false;
        if (fromDate && b.bill_date < fromDate) return false;
        if (toDate && b.bill_date > toDate) return false;
        return true;
      })
      .sort((a, b) => (a.bill_date || '').localeCompare(b.bill_date || ''));
  }, [bills, selectedSupplierId, fromDate, toDate]);

  // Validation
  const isDateInvalid = fromDate && toDate && fromDate > toDate;

  // Totals
  const totals = useMemo(() => {
    const billed = filteredBills.reduce((acc, b) => acc + Number(b.amount), 0);
    const paid = filteredBills.reduce((acc, b) => acc + Number(b.paid_total), 0);
    const balance = filteredBills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);
    return { billed, paid, balance };
  }, [filteredBills]);

  const handleExportExcel = () => {
    if (!selectedSupplier) {
      showToast('Please select a supplier first.');
      return;
    }
    if (filteredBills.length === 0) {
      showToast('No bills match the selected date range.');
      return;
    }

    try {
      exportSupplierExcel(
        currentShop?.name || 'Shop',
        selectedSupplier,
        filteredBills,
        fromDate,
        toDate
      );
      showToast(`📊 Excel (.xlsx) generated for ${selectedSupplier.name}!`);
    } catch (err: any) {
      showToast('Failed to generate Excel: ' + err.message);
    }
  };

  const handleExportPdf = () => {
    if (!selectedSupplier) {
      showToast('Please select a supplier first.');
      return;
    }
    if (filteredBills.length === 0) {
      showToast('No bills match the selected date range.');
      return;
    }

    try {
      downloadSupplierPdf(
        currentShop?.name || 'Shop',
        selectedSupplier,
        filteredBills,
        fromDate,
        toDate
      );
      showToast(`📄 PDF Statement generated for ${selectedSupplier.name}!`);
    } catch (err: any) {
      showToast('Failed to generate PDF: ' + err.message);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onGoBack}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="font-head text-2xl font-bold text-navy-900">Supplier Statement</h2>
          <p className="text-xs text-slate-500 font-medium">Filter by bill date & export native reports</p>
        </div>
      </div>

      {/* Filter Control Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Supplier Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Supplier
          </label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-navy-900 font-medium focus:outline-hidden focus:border-brand-blue focus:bg-white transition-all text-sm"
          >
            <option value="">— Select Supplier —</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filters */}
        <div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-navy-900 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-brand-blue focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-navy-900 text-xs sm:text-sm font-medium focus:outline-hidden focus:border-brand-blue focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Date Range Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleSetRange('thisMonth')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blue-light text-brand-blue hover:bg-blue-100 active:scale-95 transition-all"
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => handleSetRange('lastMonth')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blue-light text-brand-blue hover:bg-blue-100 active:scale-95 transition-all"
            >
              Last month
            </button>
            <button
              type="button"
              onClick={() => handleSetRange('last30')}
              className="px-3 py-1 rounded-full text-xs font-medium bg-brand-blue-light text-brand-blue hover:bg-blue-100 active:scale-95 transition-all"
            >
              Last 30 days
            </button>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => handleSetRange('clear')}
                className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
              >
                Clear dates
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Filtered by bill date. Both endpoint dates are included. Leave blank for all time.
          </p>
        </div>

        {isDateInvalid && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>The From date cannot be after the To date. Please adjust the range.</span>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {selectedSupplier && !isDateInvalid && (
        <div className="space-y-4">
          {/* Totals Metric Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-head text-lg font-bold text-navy-900">{selectedSupplier.name}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {filteredBills.length} bill{filteredBills.length === 1 ? '' : 's'} matching filter
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Billed
                </span>
                <span className="font-head text-base sm:text-lg font-bold text-navy-900">
                  {formatCurrency(totals.billed)}
                </span>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block mb-1">
                  Paid
                </span>
                <span className="font-head text-base sm:text-lg font-bold text-brand-green">
                  {formatCurrency(totals.paid)}
                </span>
              </div>
              <div className="bg-red-50 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase tracking-wider text-red-700 font-bold block mb-1">
                  Balance
                </span>
                <span className="font-head text-base sm:text-lg font-bold text-brand-red">
                  {formatCurrency(totals.balance)}
                </span>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportExcel}
                disabled={filteredBills.length === 0}
                className="py-3 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 disabled:opacity-40 text-white font-head font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet size={18} />
                <span>Download Excel</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={filteredBills.length === 0}
                className="py-3 px-4 rounded-xl bg-brand-red hover:bg-red-600 disabled:opacity-40 text-white font-head font-bold text-sm shadow-md shadow-red-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText size={18} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Bills Preview List */}
          {filteredBills.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-head text-base font-bold text-navy-900">No Bills Found</p>
              <p className="text-xs text-slate-500 mt-1">
                No bills recorded for {selectedSupplier.name} in the selected date range.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-head text-sm font-bold uppercase tracking-wider text-slate-500">
                Matching Bills ({filteredBills.length})
              </h4>
              <div className="divide-y divide-slate-100">
                {filteredBills.map(b => (
                  <div key={b.id} className="py-3 flex justify-between items-center gap-2 text-sm">
                    <div>
                      <div className="font-bold text-navy-900">{formatDate(b.bill_date)}</div>
                      <div className="text-xs text-slate-400">
                        Salesman: {b.salesman_name || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-navy-900">{formatCurrency(b.amount)}</div>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
