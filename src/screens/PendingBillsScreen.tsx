import React, { useState } from 'react';
import { Supplier, BillWithDetails } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../lib/formatters';
import { ArrowLeft, CreditCard, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface PendingBillsScreenProps {
  suppliers: Supplier[];
  bills: BillWithDetails[];
  onAddPayment: (billId: string, amount: number, paymentDate: string) => Promise<void>;
  onGoBack: () => void;
  onNavigateToAddBill: () => void;
}

export const PendingBillsScreen: React.FC<PendingBillsScreenProps> = ({
  suppliers,
  bills,
  onAddPayment,
  onGoBack,
  onNavigateToAddBill,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [payingBill, setPayingBill] = useState<BillWithDetails | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pendingBills = bills.filter(b => b.status === 'pending');

  // Suppliers that currently have pending bills
  const activeSupplierIds = Array.from(new Set(pendingBills.map(b => b.supplier_id)));
  const filteredBills = selectedSupplierId === 'all'
    ? pendingBills
    : pendingBills.filter(b => b.supplier_id === selectedSupplierId);

  const numericPaymentAmount = parseFloat(paymentAmountStr) || 0;
  const currentRemaining = payingBill ? payingBill.remaining_balance : 0;
  const newRemaining = Math.max(0, currentRemaining - numericPaymentAmount);

  const handleOpenPayModal = (bill: BillWithDetails) => {
    setPayingBill(bill);
    setPaymentAmountStr('');
    setPaymentDate(getTodayDateString());
    setErrorMsg('');
  };

  const handlePreviewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericPaymentAmount || numericPaymentAmount <= 0) {
      setErrorMsg('Please enter a valid payment amount.');
      return;
    }
    if (numericPaymentAmount > currentRemaining) {
      setErrorMsg(`Payment amount cannot exceed remaining balance of ${formatCurrency(currentRemaining)}.`);
      return;
    }
    setErrorMsg('');
    setIsConfirmOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!payingBill) return;
    setIsSubmitting(true);
    try {
      await onAddPayment(payingBill.id, numericPaymentAmount, paymentDate);
      setIsConfirmOpen(false);
      setPayingBill(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment.');
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-head text-2xl font-bold text-navy-900">Pending Bills</h2>
            <p className="text-xs text-slate-500 font-medium">
              {pendingBills.length} outstanding bill{pendingBills.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToAddBill}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-brand-green text-white font-head font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Bill</span>
        </button>
      </div>

      {/* Supplier Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedSupplierId('all')}
          className={`shrink-0 px-4 py-2 rounded-full font-head font-bold text-xs transition-all ${
            selectedSupplierId === 'all'
              ? 'bg-brand-red text-white shadow-md shadow-red-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({pendingBills.length})
        </button>
        {activeSupplierIds.map(supId => {
          const sup = suppliers.find(s => s.id === supId);
          const supCount = pendingBills.filter(b => b.supplier_id === supId).length;
          return (
            <button
              key={supId}
              onClick={() => setSelectedSupplierId(supId)}
              className={`shrink-0 px-4 py-2 rounded-full font-head font-bold text-xs transition-all ${
                selectedSupplierId === supId
                  ? 'bg-brand-red text-white shadow-md shadow-red-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sup?.name || 'Supplier'} ({supCount})
            </button>
          );
        })}
      </div>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="font-head text-lg font-bold text-navy-900">No Pending Bills!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {selectedSupplierId !== 'all'
              ? 'There are no outstanding balances for this supplier.'
              : 'All bills have been fully paid. Great job!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map(bill => (
            <div
              key={bill.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-head text-lg font-bold text-navy-900 leading-snug">
                    {bill.supplier?.name || 'Unknown Supplier'}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{formatDate(bill.bill_date)}</span>
                    {bill.salesman_name && (
                      <>
                        <span>•</span>
                        <span>Salesman: {bill.salesman_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <StatusBadge status="pending" />
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block">Bill Total</span>
                  <span className="font-bold text-navy-900 text-sm">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Paid So Far</span>
                  <span className="font-bold text-brand-green text-sm">
                    {formatCurrency(bill.paid_total)}
                  </span>
                </div>
              </div>

              {/* Bottom Row: Remaining + Pay Button */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-bold">
                    Remaining Balance
                  </span>
                  <span className="font-head text-2xl font-extrabold text-brand-red">
                    {formatCurrency(bill.remaining_balance)}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenPayModal(bill)}
                  className="py-2.5 px-5 rounded-xl bg-brand-green hover:bg-emerald-600 active:scale-95 text-white font-head font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard size={16} />
                  <span>+ Pay</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Add Payment Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-navy-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-slideUp">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-head text-xl font-bold text-navy-900">💳 Record Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">{payingBill.supplier?.name}</p>
              </div>
              <button
                onClick={() => setPayingBill(null)}
                className="text-slate-400 hover:text-navy-900 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePreviewPayment} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Remaining
                </span>
                <span className="font-head text-2xl font-extrabold text-brand-red">
                  {formatCurrency(payingBill.remaining_balance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={payingBill.remaining_balance}
                    value={paymentAmountStr}
                    onChange={(e) => setPaymentAmountStr(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-8 pr-4 py-3 text-navy-900 font-head font-bold text-lg focus:outline-hidden focus:border-brand-green focus:bg-white transition-all"
                  />
                </div>
                {/* Full pay shortcut */}
                <button
                  type="button"
                  onClick={() => setPaymentAmountStr(String(payingBill.remaining_balance))}
                  className="mt-1.5 text-xs text-brand-blue font-bold hover:underline"
                >
                  Pay Full Amount ({formatCurrency(payingBill.remaining_balance)})
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-navy-900 font-medium focus:outline-hidden focus:border-brand-green focus:bg-white transition-all text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingBill(null)}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-head font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 text-white font-head font-bold text-sm shadow-md transition-all"
                >
                  Preview →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Payment Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="✅ Confirm Payment"
        subtitle="Review how this payment will update the bill"
        confirmText="Confirm Payment"
        cancelText="← Back"
        isLoading={isSubmitting}
        onConfirm={handleConfirmPayment}
        onCancel={() => setIsConfirmOpen(false)}
      >
        <div className="space-y-3 py-1">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-xs uppercase tracking-wider text-amber-800 font-bold block mb-1">
              You Are Paying
            </span>
            <span className="font-head text-3xl font-extrabold text-navy-900">
              {formatCurrency(numericPaymentAmount)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Current Balance:</span>
            <span className="font-bold text-slate-700">{formatCurrency(currentRemaining)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">After Payment:</span>
            <span className="font-bold text-brand-red font-head text-base">
              {formatCurrency(newRemaining)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
            <span className="text-slate-500">Status After:</span>
            <span className="font-bold">
              {newRemaining === 0 ? (
                <span className="text-brand-green">✅ PAID (Will move to Paid Bills)</span>
              ) : (
                <span className="text-amber-600">⏳ Still Pending</span>
              )}
            </span>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
};
