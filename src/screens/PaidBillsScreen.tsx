import React, { useState } from 'react';
import { Supplier, BillWithDetails } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { ArrowLeft, ChevronDown, ChevronUp, History } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

interface PaidBillsScreenProps {
  suppliers: Supplier[];
  bills: BillWithDetails[];
  onGoBack: () => void;
}

export const PaidBillsScreen: React.FC<PaidBillsScreenProps> = ({
  suppliers,
  bills,
  onGoBack,
}) => {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const paidBills = bills.filter(b => b.status === 'paid');

  const toggleExpand = (billId: string) => {
    setExpandedBillId(prev => (prev === billId ? null : billId));
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
          <h2 className="font-head text-2xl font-bold text-navy-900">Paid Bills</h2>
          <p className="text-xs text-slate-500 font-medium">
            {paidBills.length} cleared bill{paidBills.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {paidBills.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
          <div className="text-5xl mb-3">📭</div>
          <h3 className="font-head text-lg font-bold text-navy-900">No Paid Bills Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Bills with cleared balances will automatically appear here with their complete payment history.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paidBills.map(bill => {
            const isExpanded = expandedBillId === bill.id;
            const lastPayment = bill.payments.length > 0
              ? bill.payments[bill.payments.length - 1]
              : null;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                <div
                  onClick={() => toggleExpand(bill.id)}
                  className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-head text-lg font-bold text-navy-900 leading-snug">
                        {bill.supplier?.name || 'Unknown Supplier'}
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Bill Date: {formatDate(bill.bill_date)}</span>
                        {bill.salesman_name && (
                          <>
                            <span>•</span>
                            <span>Salesman: {bill.salesman_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <StatusBadge status="paid" />
                  </div>

                  {/* Summary Row */}
                  <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Bill Amount</span>
                      <span className="font-bold text-navy-900 text-sm">
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Payments</span>
                      <span className="font-bold text-slate-700 text-sm">
                        {bill.payments.length} installment{bill.payments.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Last Paid</span>
                      <span className="font-bold text-brand-green text-sm">
                        {lastPayment ? formatDate(lastPayment.payment_date) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Indicator */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 text-brand-blue font-bold">
                      <History size={14} />
                      {isExpanded ? 'Hide Payment History' : 'View Payment History'}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Payment History */}
                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-2 animate-fadeIn">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Payment History
                    </h4>
                    {bill.payments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No payment records found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {bill.payments.map((p, pIdx) => (
                          <div
                            key={p.id || pIdx}
                            className="bg-white rounded-xl p-3 border border-slate-200 flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-700">Payment #{pIdx + 1}</span>
                              <span className="text-slate-400 ml-2">{formatDate(p.payment_date)}</span>
                            </div>
                            <span className="font-head font-bold text-sm text-brand-green">
                              {formatCurrency(p.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
