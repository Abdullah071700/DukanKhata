import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase, explainError } from './lib/supabase';
import { Supplier, Bill, Payment, Salesman, BillWithDetails } from './types';
import { Navbar } from './components/Navbar';
import { InstallPrompt } from './components/InstallPrompt';
import { AuthScreen } from './screens/AuthScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AddBillScreen } from './screens/AddBillScreen';
import { PendingBillsScreen } from './screens/PendingBillsScreen';
import { PaidBillsScreen } from './screens/PaidBillsScreen';
import { SuppliersScreen } from './screens/SuppliersScreen';
import { SupplierReportScreen } from './screens/SupplierReportScreen';
import { BackupsScreen } from './screens/BackupsScreen';

export const App: React.FC = () => {
  const { user, loading: authLoading, currentShop } = useAuth();

  // Navigation
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');

  // Business state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [billsWithDetails, setBillsWithDetails] = useState<BillWithDetails[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Fetch shop operational data from Supabase
  const loadShopData = useCallback(async () => {
    if (!currentShop?.id) return;
    setLoadingData(true);

    try {
      // 1. Fetch Suppliers
      const { data: supData, error: supErr } = await supabase
        .from('suppliers')
        .select('*')
        .eq('shop_id', currentShop.id)
        .order('name', { ascending: true });

      if (supErr) throw supErr;
      const loadedSuppliers = (supData as Supplier[]) || [];
      setSuppliers(loadedSuppliers);

      // 2. Fetch Salesmen
      const { data: salData, error: salErr } = await supabase
        .from('salesmen')
        .select('*')
        .eq('shop_id', currentShop.id)
        .order('last_used_at', { ascending: false });

      if (!salErr && salData) {
        setSalesmen(salData as Salesman[]);
      }

      // 3. Fetch Bills and Payments
      const { data: billsData, error: billsErr } = await supabase
        .from('bills')
        .select('*')
        .eq('shop_id', currentShop.id)
        .order('bill_date', { ascending: false });

      if (billsErr) throw billsErr;

      const { data: payData, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .eq('shop_id', currentShop.id)
        .order('payment_date', { ascending: true });

      if (payErr) throw payErr;

      const loadedPayments = (payData as Payment[]) || [];
      const loadedBills = (billsData as Bill[]) || [];

      // Combine into BillWithDetails
      const detailed: BillWithDetails[] = loadedBills.map((b) => {
        const bPayments = loadedPayments.filter((p) => p.bill_id === b.id);
        const paidTotal = bPayments.reduce((acc, p) => acc + Number(p.amount), 0);
        const remainingBalance = Math.max(0, Number(b.amount) - paidTotal);
        const sup = loadedSuppliers.find((s) => s.id === b.supplier_id);

        return {
          ...b,
          payments: bPayments,
          supplier: sup,
          paid_total: paidTotal,
          remaining_balance: remainingBalance,
        };
      });

      setBillsWithDetails(detailed);
    } catch (err: any) {
      console.error('Error loading shop data:', err);
      showToast(explainError(err));
    } finally {
      setLoadingData(false);
    }
  }, [currentShop?.id, showToast]);

  useEffect(() => {
    if (user && currentShop?.id) {
      loadShopData();
    }
  }, [user, currentShop?.id, loadShopData]);

  // Operations
  const handleSaveBill = async ({
    supplierId,
    amount,
    billDate,
    salesmanName,
  }: {
    supplierId: string;
    amount: number;
    billDate: string;
    salesmanName: string;
  }) => {
    if (!currentShop?.id) throw new Error('No active shop.');

    // 1. Insert into bills
    const { data: newBill, error: billErr } = await supabase
      .from('bills')
      .insert({
        shop_id: currentShop.id,
        supplier_id: supplierId,
        amount,
        bill_date: billDate,
        salesman_name: salesmanName,
        status: 'pending',
      })
      .select()
      .single();

    if (billErr) throw new Error(explainError(billErr));

    // 2. Upsert salesman
    if (salesmanName.trim()) {
      try {
        await supabase
          .from('salesmen')
          .upsert(
            {
              shop_id: currentShop.id,
              name: salesmanName.trim(),
              last_used_at: new Date().toISOString(),
            },
            { onConflict: 'shop_id,name' }
          );
      } catch {
        // Non-critical operation
      }
    }

    showToast('✅ Bill saved to cloud!');
    await loadShopData();
  };

  const handleAddPayment = async (billId: string, amount: number, paymentDate: string) => {
    if (!currentShop?.id) throw new Error('No active shop.');

    const { error: payErr } = await supabase.from('payments').insert({
      shop_id: currentShop.id,
      bill_id: billId,
      amount,
      payment_date: paymentDate,
    });

    if (payErr) throw new Error(explainError(payErr));

    showToast('✅ Payment recorded!');
    await loadShopData();
  };

  const handleAddSupplier = async (name: string, phone?: string) => {
    if (!currentShop?.id) throw new Error('No active shop.');

    const { error } = await supabase.from('suppliers').insert({
      shop_id: currentShop.id,
      name,
      phone: phone || null,
    });

    if (error) throw new Error(explainError(error));

    showToast('✅ Supplier added!');
    await loadShopData();
  };

  const handleUpdateSupplier = async (id: string, name: string, phone?: string) => {
    if (!currentShop?.id) throw new Error('No active shop.');

    const { error } = await supabase
      .from('suppliers')
      .update({ name, phone: phone || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('shop_id', currentShop.id);

    if (error) throw new Error(explainError(error));

    showToast('✅ Supplier updated!');
    await loadShopData();
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!currentShop?.id) throw new Error('No active shop.');

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('shop_id', currentShop.id);

    if (error) throw new Error(explainError(error));

    showToast('Supplier removed.');
    await loadShopData();
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center text-white">
        <span className="text-5xl mb-4 animate-bounce">🏪</span>
        <h2 className="font-head text-2xl font-bold">DukanKhata</h2>
        <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mt-4" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-body selection:bg-brand-green selection:text-white">
      {/* Navbar */}
      <Navbar
        onOpenBackups={() => setCurrentScreen('backups')}
        onGoHome={() => setCurrentScreen('dashboard')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 pb-24">
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            suppliers={suppliers}
            bills={billsWithDetails}
            loading={loadingData}
            onNavigate={(screen) => setCurrentScreen(screen)}
            showToast={showToast}
          />
        )}

        {currentScreen === 'addBill' && (
          <AddBillScreen
            suppliers={suppliers}
            salesmen={salesmen}
            onSaveBill={handleSaveBill}
            onGoBack={() => setCurrentScreen('dashboard')}
            onNavigateToSuppliers={() => setCurrentScreen('suppliers')}
          />
        )}

        {currentScreen === 'pending' && (
          <PendingBillsScreen
            suppliers={suppliers}
            bills={billsWithDetails}
            onAddPayment={handleAddPayment}
            onGoBack={() => setCurrentScreen('dashboard')}
            onNavigateToAddBill={() => setCurrentScreen('addBill')}
          />
        )}

        {currentScreen === 'paid' && (
          <PaidBillsScreen
            suppliers={suppliers}
            bills={billsWithDetails}
            onGoBack={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'suppliers' && (
          <SuppliersScreen
            suppliers={suppliers}
            bills={billsWithDetails}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onGoBack={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'supplierReport' && (
          <SupplierReportScreen
            suppliers={suppliers}
            bills={billsWithDetails}
            onGoBack={() => setCurrentScreen('dashboard')}
            showToast={showToast}
          />
        )}

        {currentScreen === 'backups' && (
          <BackupsScreen
            onGoBack={() => setCurrentScreen('dashboard')}
            showToast={showToast}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div className="bg-navy-900/95 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-5 py-3 rounded-full shadow-2xl border border-slate-700 animate-slideUp pointer-events-auto">
            {toastMsg}
          </div>
        </div>
      )}

      {/* PWA Install Banner */}
      <InstallPrompt />
    </div>
  );
};
