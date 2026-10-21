import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Supplier, BillWithDetails } from '../types';
import { formatCurrency } from '../lib/formatters';
import { PlusCircle, ClipboardList, CheckCircle2, Users, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportWholeShopExcel } from '../lib/exportExcel';
import { downloadWholeShopPdf } from '../lib/exportPdf';

interface DashboardScreenProps {
  suppliers: Supplier[];
  bills: BillWithDetails[];
  loading: boolean;
  onNavigate: (screen: string) => void;
  showToast: (msg: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  suppliers,
  bills,
  loading,
  onNavigate,
  showToast,
}) => {
  const { currentShop } = useAuth();

  const pendingBills = bills.filter(b => b.status === 'pending');
  const totalPendingAmount = pendingBills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleExportExcel = () => {
    try {
      exportWholeShopExcel(currentShop?.name || 'Shop', suppliers, bills);
      showToast('📊 Whole shop Excel (.xlsx) downloaded!');
    } catch (err: any) {
      showToast('Failed to generate Excel: ' + err.message);
    }
  };

  const handleExportPdf = () => {
    try {
      downloadWholeShopPdf(currentShop?.name || 'Shop', suppliers, bills);
      showToast('📄 Whole shop PDF downloaded!');
    } catch (err: any) {
      showToast('Failed to generate PDF: ' + err.message);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-head text-xl font-bold text-white flex items-center gap-2">
              <span>🏪</span> {currentShop?.name || 'My Shop'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">{todayStr}</p>
          </div>
        </div>

        {/* Pending Box */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15">
          <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block mb-1">
            Total Outstanding Balance
          </span>
          <div className="font-head text-4xl sm:text-5xl font-extrabold text-[#ffd166] tracking-tight">
            {loading ? (
              <span className="inline-block w-8 h-8 border-3 border-amber-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              formatCurrency(totalPendingAmount)
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
            <div className="bg-white/10 rounded-xl px-3.5 py-2.5 text-center">
              <div className="font-head text-xl font-bold text-white">
                {loading ? '...' : suppliers.length}
              </div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wide">Suppliers</div>
            </div>
            <div className="bg-white/10 rounded-xl px-3.5 py-2.5 text-center">
              <div className="font-head text-xl font-bold text-white">
                {loading ? '...' : pendingBills.length}
              </div>
              <div className="text-[11px] text-slate-300 uppercase tracking-wide">Pending Bills</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Add Bill */}
        <button
          onClick={() => onNavigate('addBill')}
          className="p-5 rounded-2xl bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-96 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center group"
        >
          <span className="p-2.5 rounded-xl bg-white/20 group-hover:scale-110 transition-transform">
            <PlusCircle size={28} />
          </span>
          <span className="font-head font-bold text-base sm:text-lg">Add Bill</span>
        </button>

        {/* Pending Bills */}
        <button
          onClick={() => onNavigate('pending')}
          className="p-5 rounded-2xl bg-gradient-to-br from-brand-red to-red-600 text-white shadow-lg shadow-red-500/20 active:scale-96 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center group"
        >
          <span className="p-2.5 rounded-xl bg-white/20 group-hover:scale-110 transition-transform">
            <ClipboardList size={28} />
          </span>
          <span className="font-head font-bold text-base sm:text-lg">Pending Bills</span>
        </button>

        {/* Paid Bills */}
        <button
          onClick={() => onNavigate('paid')}
          className="p-5 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-96 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center group"
        >
          <span className="p-2.5 rounded-xl bg-white/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={28} />
          </span>
          <span className="font-head font-bold text-base sm:text-lg">Paid Bills</span>
        </button>

        {/* View Suppliers */}
        <button
          onClick={() => onNavigate('suppliers')}
          className="p-5 rounded-2xl bg-gradient-to-br from-brand-yellow to-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-96 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center group"
        >
          <span className="p-2.5 rounded-xl bg-white/20 group-hover:scale-110 transition-transform">
            <Users size={28} />
          </span>
          <span className="font-head font-bold text-base sm:text-lg">View Suppliers</span>
        </button>

        {/* Supplier Bill Download - Wide */}
        <button
          onClick={() => onNavigate('supplierReport')}
          className="col-span-2 p-4 rounded-2xl bg-gradient-to-r from-navy-900 to-navy-700 text-white shadow-lg shadow-black/10 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer group"
        >
          <Download size={22} className="text-amber-300 group-hover:translate-y-0.5 transition-transform" />
          <span className="font-head font-bold text-base sm:text-lg">Supplier Bill Download (Date Filter)</span>
        </button>
      </div>

      {/* Whole Shop Quick Export Actions */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <h3 className="font-head font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
          Whole Shop Quick Reports
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportExcel}
            className="py-3 px-4 rounded-xl bg-brand-green hover:bg-emerald-600 active:scale-98 text-white font-head font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={18} />
            <span>Whole Shop Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="py-3 px-4 rounded-xl bg-brand-red hover:bg-red-600 active:scale-98 text-white font-head font-bold text-sm shadow-md shadow-red-500/20 transition-all flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            <span>Whole Shop PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
