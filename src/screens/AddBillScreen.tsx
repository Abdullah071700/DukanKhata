import React, { useState } from 'react';
import { Supplier, Salesman } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../lib/formatters';
import { ArrowLeft, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface AddBillScreenProps {
  suppliers: Supplier[];
  salesmen: Salesman[];
  onSaveBill: (billData: {
    supplierId: string;
    amount: number;
    billDate: string;
    salesmanName: string;
  }) => Promise<void>;
  onGoBack: () => void;
  onNavigateToSuppliers: () => void;
}

export const AddBillScreen: React.FC<AddBillScreenProps> = ({
  suppliers,
  salesmen,
  onSaveBill,
  onGoBack,
  onNavigateToSuppliers,
}) => {
  const [supplierId, setSupplierId] = useState('');
  const [salesmanName, setSalesmanName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [billDate, setBillDate] = useState(getTodayDateString());
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Two-step confirmation modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isFinalConfirmOpen, setIsFinalConfirmOpen] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const numericAmount = parseFloat(amountStr) || 0;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!supplierId) {
      setErrorMsg('Please select a supplier.');
      return;
    }
    if (!salesmanName.trim()) {
      setErrorMsg('Please enter salesman or representative name.');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Please enter a valid bill amount greater than 0.');
      return;
    }
    if (!billDate) {
      setErrorMsg('Please select a bill date.');
      return;
    }

    setIsReviewOpen(true);
  };

  const handleProceedToFinal = () => {
    setIsReviewOpen(false);
    setIsFinalConfirmOpen(true);
  };

  const handleSaveBill = async () => {
    setIsSubmitting(true);
    try {
      await onSaveBill({
        supplierId,
        amount: numericAmount,
        billDate,
        salesmanName: salesmanName.trim(),
      });
      setIsFinalConfirmOpen(false);
      onGoBack();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save bill.');
      setIsFinalConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
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
        <h2 className="font-head text-2xl font-bold text-navy-900">Add New Bill</h2>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleReview} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        {/* Supplier Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Supplier <span className="text-brand-red">*</span>
            </label>
            {suppliers.length === 0 && (
              <button
                type="button"
                onClick={onNavigateToSuppliers}
                className="text-xs text-brand-blue font-bold hover:underline"
              >
                + Add Supplier First
              </button>
            )}
          </div>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
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

        {/* Salesman Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Salesman / Representative <span className="text-brand-red">*</span>
          </label>
          <input
            type="text"
            value={salesmanName}
            onChange={(e) => setSalesmanName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-navy-900 font-medium focus:outline-hidden focus:border-brand-blue focus:bg-white transition-all text-sm"
          />

          {/* Quick Salesman Chips */}
          {salesmen.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 self-center mr-1">Recent:</span>
              {salesmen.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSalesmanName(s.name)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-blue-light text-brand-blue hover:bg-blue-100 active:scale-95 transition-all"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bill Amount */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Bill Amount (₹) <span className="text-brand-red">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-base">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              required
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-8 pr-4 py-3 text-navy-900 font-head font-bold text-lg focus:outline-hidden focus:border-brand-blue focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Bill Date */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Bill Date <span className="text-brand-red">*</span>
          </label>
          <input
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            required
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-navy-900 font-medium focus:outline-hidden focus:border-brand-blue focus:bg-white transition-all text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full mt-4 py-4 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 text-white font-head font-bold text-lg shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Eye size={20} />
          <span>👁 Review Bill</span>
        </button>
      </form>

      {/* Step 1: Review Modal */}
      <ConfirmationModal
        isOpen={isReviewOpen}
        title="📋 Review Bill"
        subtitle="Confirm the details before proceeding"
        confirmText="Confirm Details →"
        cancelText="Edit Details"
        onConfirm={handleProceedToFinal}
        onCancel={() => setIsReviewOpen(false)}
      >
        <div className="space-y-3 py-1">
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Supplier:</span>
            <span className="font-bold text-navy-900">{selectedSupplier?.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Salesman:</span>
            <span className="font-bold text-navy-900">{salesmanName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Bill Date:</span>
            <span className="font-bold text-navy-900">{formatDate(billDate)}</span>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center mt-3">
            <span className="text-xs uppercase tracking-wider text-amber-800 font-bold block mb-1">
              Bill Amount
            </span>
            <span className="font-head text-3xl font-extrabold text-brand-red">
              {formatCurrency(numericAmount)}
            </span>
          </div>
        </div>
      </ConfirmationModal>

      {/* Step 2: Final Confirmation Modal */}
      <ConfirmationModal
        isOpen={isFinalConfirmOpen}
        title="🔒 Final Confirmation"
        subtitle="Are you sure you want to save this bill?"
        confirmText="💾 Save Bill to Cloud"
        cancelText="← Go Back"
        isDestructive={false}
        isLoading={isSubmitting}
        onConfirm={handleSaveBill}
        onCancel={() => setIsFinalConfirmOpen(false)}
      >
        <div className="space-y-3 py-1">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>Once saved, this bill balance will be added to the supplier khata.</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Supplier:</span>
            <span className="font-bold text-navy-900">{selectedSupplier?.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Amount:</span>
            <span className="font-bold text-brand-red font-head text-base">
              {formatCurrency(numericAmount)}
            </span>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
};
