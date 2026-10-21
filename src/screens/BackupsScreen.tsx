import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, explainError } from '../lib/supabase';
import { ShopBackup, BackupPayload } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';
import { ArrowLeft, Database, Download, Upload, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface BackupsScreenProps {
  onGoBack: () => void;
  showToast: (msg: string) => void;
}

export const BackupsScreen: React.FC<BackupsScreenProps> = ({ onGoBack, showToast }) => {
  const { currentShop, currentRole } = useAuth();
  const [backups, setBackups] = useState<ShopBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Restore states
  const [restorePayload, setRestorePayload] = useState<any | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const isOwner = currentRole === 'owner';

  const fetchBackups = async () => {
    if (!currentShop) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('shop_backups')
        .select('id, shop_id, created_by, file_name, summary, checksum, version, created_at')
        .eq('shop_id', currentShop.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups((data as ShopBackup[]) || []);
    } catch (err: any) {
      setErrorMsg(explainError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [currentShop?.id]);

  // Create new cloud backup
  const handleCreateBackup = async () => {
    if (!currentShop) return;
    setIsCreating(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('create_shop_backup', {
        p_shop_id: currentShop.id,
      });

      if (error) throw error;

      showToast('✅ Cloud backup created successfully!');
      await fetchBackups();
    } catch (err: any) {
      setErrorMsg(explainError(err));
    } finally {
      setIsCreating(false);
    }
  };

  // Download backup JSON to local disk
  const handleDownloadBackup = async (backupId: string, fileName: string) => {
    try {
      const { data, error } = await supabase
        .from('shop_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data.backup_data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('📥 Backup file downloaded!');
    } catch (err: any) {
      showToast('Failed to download backup: ' + explainError(err));
    }
  };

  // Parse uploaded JSON backup file and preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!currentShop) return;

        // Preview through RPC
        const { data, error } = await supabase.rpc('preview_shop_restore', {
          p_shop_id: currentShop.id,
          p_backup_json: parsed,
        });

        if (error) throw error;

        if (!data.is_valid) {
          setErrorMsg(data.error || 'Invalid backup file.');
          return;
        }

        setRestorePayload(parsed);
        setRestorePreview(data);
        setConfirmInput('');
      } catch (err: any) {
        setErrorMsg('Could not parse backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Restore directly from an existing cloud backup record
  const handleRestoreFromCloudRecord = async (backupId: string) => {
    if (!currentShop) return;
    try {
      const { data, error } = await supabase
        .from('shop_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

      if (error) throw error;

      const { data: previewData, error: prevErr } = await supabase.rpc('preview_shop_restore', {
        p_shop_id: currentShop.id,
        p_backup_json: data.backup_data,
      });

      if (prevErr) throw prevErr;

      setRestorePayload(data.backup_data);
      setRestorePreview(previewData);
      setConfirmInput('');
    } catch (err: any) {
      setErrorMsg(explainError(err));
    }
  };

  // Execute guarded restore
  const handleExecuteRestore = async () => {
    if (!currentShop || !restorePayload || confirmInput.trim().toUpperCase() !== 'RESTORE') {
      return;
    }

    setIsRestoring(true);
    try {
      const { data, error } = await supabase.rpc('restore_shop_backup', {
        p_shop_id: currentShop.id,
        p_backup_json: restorePayload,
      });

      if (error) throw error;

      showToast('🎉 Shop data restored! Pre-restore snapshot preserved.');
      setRestorePayload(null);
      setRestorePreview(null);
      await fetchBackups();
    } catch (err: any) {
      setErrorMsg(explainError(err));
    } finally {
      setIsRestoring(false);
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
            <h2 className="font-head text-2xl font-bold text-navy-900">Cloud Backups</h2>
            <p className="text-xs text-slate-500 font-medium">Privileged database snapshots & guarded restore</p>
          </div>
        </div>

        <button
          onClick={fetchBackups}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Create Backup */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-navy-900">
            <span className="p-2 rounded-xl bg-brand-blue-light text-brand-blue">
              <Database size={20} />
            </span>
            <h3 className="font-head font-bold text-base">Create Cloud Backup</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Generates a tamper-proof, full snapshot directly in the cloud database including all suppliers, bills, payments, and salesman records.
          </p>
          <button
            onClick={handleCreateBackup}
            disabled={isCreating}
            className="w-full py-3 px-4 rounded-xl bg-brand-blue hover:bg-blue-600 active:scale-98 disabled:opacity-50 text-white font-head font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCreating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Database size={16} />
            )}
            <span>Create Cloud Backup Now</span>
          </button>
        </div>

        {/* Restore From File */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-navy-900">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Upload size={20} />
            </span>
            <h3 className="font-head font-bold text-base">Restore From File</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload an existing DukanKhata JSON backup. Every restore is previewed, confirmed, and guarded with an automatic pre-restore safety snapshot.
          </p>
          <label className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-blue bg-slate-50 hover:bg-blue-50/50 text-slate-700 font-head font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={16} className="text-slate-500" />
            <span>Select Backup File (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Cloud Backups Archive List */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-head text-base font-bold text-navy-900 flex items-center gap-2">
          <span>Available Cloud Backups</span>
          <span className="text-xs font-normal text-slate-400">({backups.length})</span>
        </h3>

        {backups.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Database size={36} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No backups created for this shop yet.</p>
            <p className="text-xs mt-0.5">Click "Create Cloud Backup Now" above to make your first snapshot.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map(b => (
              <div
                key={b.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-head font-bold text-sm text-navy-900 truncate">
                      {b.file_name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Created: {formatDate(b.created_at)} • v{b.version}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">
                    MD5: {b.checksum?.slice(0, 8)}...
                  </span>
                </div>

                {/* Summary Metrics */}
                {b.summary && (
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block">Suppliers</span>
                      <span className="font-bold text-navy-900">{b.summary.supplier_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Bills / Payments</span>
                      <span className="font-bold text-navy-900">
                        {b.summary.bill_count || 0} / {b.summary.payment_count || 0}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Total Billed</span>
                      <span className="font-bold text-brand-green">
                        {formatCurrency(b.summary.total_billed)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => handleDownloadBackup(b.id, b.file_name)}
                    className="py-1.5 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-navy-900 hover:bg-slate-100 font-head font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Download size={14} />
                    <span>Download JSON</span>
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => handleRestoreFromCloudRecord(b.id)}
                      className="py-1.5 px-3 rounded-lg bg-brand-red-light text-brand-red hover:bg-red-100 font-head font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={14} />
                      <span>Restore This</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guarded Restore Modal */}
      {restorePreview && (
        <ConfirmationModal
          isOpen={true}
          title="⚠️ Guarded Database Restore"
          subtitle="Carefully review the incoming data"
          confirmText="Restore Data"
          cancelText="Cancel"
          isDestructive={true}
          isLoading={isRestoring}
          onConfirm={handleExecuteRestore}
          onCancel={() => {
            setRestorePayload(null);
            setRestorePreview(null);
          }}
        >
          <div className="space-y-3 py-1 text-xs">
            {/* Safety Warning */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <ShieldAlert size={16} />
                Automatic Safety Net Active
              </p>
              <p>
                Before restoring, DukanKhata will automatically create a <b>pre-restore safety backup</b> of your current cloud records so you can revert at any time.
              </p>
            </div>

            {/* Preview Metrics */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Source Shop:</span>
                <span className="font-bold text-navy-900">{restorePreview.source_shop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Exported At:</span>
                <span className="font-bold text-navy-900">{formatDate(restorePreview.exported_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Suppliers to Restore:</span>
                <span className="font-bold text-navy-900">{restorePreview.supplier_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bills to Restore:</span>
                <span className="font-bold text-navy-900">{restorePreview.bill_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payments to Restore:</span>
                <span className="font-bold text-navy-900">{restorePreview.payment_count}</span>
              </div>
            </div>

            {/* Explicit Confirmation Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Type <span className="text-brand-red font-mono">RESTORE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type RESTORE"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-mono text-sm focus:outline-hidden focus:border-brand-red"
              />
            </div>
          </div>
        </ConfirmationModal>
      )}
    </div>
  );
};
