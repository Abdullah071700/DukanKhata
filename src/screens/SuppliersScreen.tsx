import React, { useState } from 'react';
import { Supplier, BillWithDetails } from '../types';
import { formatCurrency } from '../lib/formatters';
import { ArrowLeft, Plus, UserX, Edit2, AlertCircle, Phone, Check } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface SuppliersScreenProps {
  suppliers: Supplier[];
  bills: BillWithDetails[];
  onAddSupplier: (name: string, phone?: string) => Promise<void>;
  onUpdateSupplier: (id: string, name: string, phone?: string) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  onGoBack: () => void;
}

export const SuppliersScreen: React.FC<SuppliersScreenProps> = ({
  suppliers,
  bills,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onGoBack,
}) => {
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    // Check duplicate
    if (suppliers.some(s => s.name.toLowerCase() === newSupplierName.trim().toLowerCase())) {
      setErrorMsg('A supplier with this name already exists.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onAddSupplier(newSupplierName.trim(), newSupplierPhone.trim() || undefined);
      setNewSupplierName('');
      setNewSupplierPhone('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditName(sup.name);
    setEditPhone(sup.phone || '');
    setErrorMsg('');
  };

  const handleSaveEdit = async () => {
    if (!editingSupplier || !editName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateSupplier(editingSupplier.id, editName.trim(), editPhone.trim() || undefined);
      setEditingSupplier(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update supplier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setIsSubmitting(true);
    try {
      await onDeleteSupplier(deletingSupplier.id);
      setDeletingSupplier(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete supplier.');
      setDeletingSupplier(null);
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
        <div>
          <h2 className="font-head text-2xl font-bold text-navy-900">Manage Suppliers</h2>
          <p className="text-xs text-slate-500 font-medium">{suppliers.length} registered supplier{suppliers.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Add Supplier Form */}
      <form onSubmit={handleAdd} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-head font-bold text-sm text-navy-900 uppercase tracking-wider">
          Add New Supplier
        </h3>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            placeholder="Supplier / Company name *"
            required
            className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-navy-900 font-medium focus:outline-hidden focus:border-brand-green focus:bg-white transition-all text-sm"
          />
          <input
            type="tel"
            value={newSupplierPhone}
            onChange={(e) => setNewSupplierPhone(e.target.value)}
            placeholder="Phone number (optional)"
            className="sm:w-48 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-navy-900 font-medium focus:outline-hidden focus:border-brand-green focus:bg-white transition-all text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newSupplierName.trim()}
            className="py-3 px-6 rounded-xl bg-brand-green hover:bg-emerald-600 disabled:opacity-50 text-white font-head font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={18} />
            <span>Add Supplier</span>
          </button>
        </div>
      </form>

      {/* Suppliers List */}
      {suppliers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
          <div className="text-5xl mb-3">👥</div>
          <h3 className="font-head text-lg font-bold text-navy-900">No Suppliers Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Add your wholesale suppliers above to start recording bills and payments against their account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map(sup => {
            const supBills = bills.filter(b => b.supplier_id === sup.id);
            const pendingSupBills = supBills.filter(b => b.status === 'pending');
            const totalPending = pendingSupBills.reduce((acc, b) => acc + Number(b.remaining_balance), 0);
            const hasBills = supBills.length > 0;

            return (
              <div
                key={sup.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0">
                  <h3 className="font-head text-lg font-bold text-navy-900 truncate">
                    {sup.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {sup.phone && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Phone size={12} /> {sup.phone}
                      </span>
                    )}
                    <span>•</span>
                    <span>{supBills.length} total bill{supBills.length === 1 ? '' : 's'}</span>
                    <span>•</span>
                    <span className={pendingSupBills.length > 0 ? 'text-brand-red font-bold' : 'text-brand-green font-bold'}>
                      {pendingSupBills.length} pending
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-bold">
                      Outstanding
                    </span>
                    <span className={`font-head text-xl font-extrabold ${totalPending > 0 ? 'text-brand-red' : 'text-brand-green'}`}>
                      {formatCurrency(totalPending)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(sup)}
                      className="p-2 rounded-xl text-slate-500 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingSupplier(sup)}
                      className="p-2 rounded-xl text-slate-400 hover:text-brand-red hover:bg-red-50 transition-colors"
                      title="Remove Supplier"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Supplier Modal */}
      <ConfirmationModal
        isOpen={Boolean(editingSupplier)}
        title="✏️ Edit Supplier"
        subtitle="Update supplier details"
        confirmText="Save Changes"
        cancelText="Cancel"
        isLoading={isSubmitting}
        onConfirm={handleSaveEdit}
        onCancel={() => setEditingSupplier(null)}
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-navy-900 font-medium focus:outline-hidden focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-navy-900 font-medium focus:outline-hidden focus:border-brand-blue"
            />
          </div>
        </div>
      </ConfirmationModal>

      {/* Delete Guarded Modal */}
      {deletingSupplier && (() => {
        const linkedBillsCount = bills.filter(b => b.supplier_id === deletingSupplier.id).length;
        const canDelete = linkedBillsCount === 0;

        return (
          <ConfirmationModal
            isOpen={true}
            title={canDelete ? "⚠️ Remove Supplier" : "🚫 Cannot Remove Supplier"}
            subtitle={deletingSupplier.name}
            confirmText={canDelete ? "Remove Supplier" : "Understood"}
            cancelText="Cancel"
            isDestructive={canDelete}
            isLoading={isSubmitting}
            onConfirm={canDelete ? handleDelete : () => setDeletingSupplier(null)}
            onCancel={() => setDeletingSupplier(null)}
          >
            <div className="py-2">
              {canDelete ? (
                <p className="text-sm text-slate-600">
                  Are you sure you want to remove <b>{deletingSupplier.name}</b>? Since there are no bills referencing this supplier, this action is safe.
                </p>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle size={16} />
                    Active Bills Found ({linkedBillsCount})
                  </p>
                  <p>
                    DukanKhata protects your ledger integrity: <b>{deletingSupplier.name}</b> cannot be removed because <b>{linkedBillsCount} bill(s)</b> reference this supplier.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    To delete a supplier, all associated bills must first be cleared or reallocated.
                  </p>
                </div>
              )}
            </div>
          </ConfirmationModal>
        );
      })()}
    </div>
  );
};
