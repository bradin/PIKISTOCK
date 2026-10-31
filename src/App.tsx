import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { PosView } from './components/PosView.tsx';
import { ProductsView } from './components/ProductsView.tsx';
import { StockView } from './components/StockView.tsx';
import { SalesHistoryView } from './components/SalesHistoryView.tsx';
import { SyncCenterView } from './components/SyncCenterView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { syncEngine, SyncEngineState } from './offline/syncEngine.ts';
import { getPikiDB } from './offline/db.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [darkMode, setDarkMode] = useState(true);

  // Sync state from background engine
  const [syncState, setSyncState] = useState<SyncEngineState>(syncEngine.getState());

  // Application Data
  const [company, setCompany] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    id: string;
    name: string;
    type: 'store' | 'warehouse';
  } | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(2850.0);
  const [loading, setLoading] = useState(true);

  // Manage Dark Mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Subscribe to Sync Engine state changes
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial data (Online with offline IndexedDB fallback)
  const loadData = async () => {
    try {
      const isOnline = syncEngine.isNetworkAvailable();

      if (isOnline) {
        // 1. Fetch tenant context
        const authRes = await fetch('/api/auth/me', {
          headers: { Authorization: 'Bearer demo-token-pikistock' },
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          setCompany(authData.activeCompany);
          setStores(authData.stores || []);
          setWarehouses(authData.warehouses || []);

          if (!selectedLocation && authData.stores && authData.stores.length > 0) {
            setSelectedLocation({
              id: authData.stores[0].id,
              name: authData.stores[0].name,
              type: 'store',
            });
          }

          if (authData.currentExchangeRate?.rate) {
            setExchangeRate(Number(authData.currentExchangeRate.rate));
          }
        }

        // 2. Fetch products
        const prodRes = await fetch('/api/products', {
          headers: { Authorization: 'Bearer demo-token-pikistock' },
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData);
          // Cache in IndexedDB for offline use
          const db = await getPikiDB();
          const tx = db.transaction('products', 'readwrite');
          for (const p of prodData) {
            await tx.store.put(p);
          }
          await tx.done;
        }

        // 3. Fetch sales
        const salesRes = await fetch('/api/sales', {
          headers: { Authorization: 'Bearer demo-token-pikistock' },
        });
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSales(salesData);
        }

        // 4. Fetch customers
        const custRes = await fetch('/api/customers', {
          headers: { Authorization: 'Bearer demo-token-pikistock' },
        });
        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData);
        }
      } else {
        // Offline: Load from IndexedDB cache
        const db = await getPikiDB();
        const cachedProducts = await db.getAll('products');
        if (cachedProducts.length > 0) {
          setProducts(cachedProducts);
        }
      }
    } catch (err) {
      console.warn('Network error during data load, using cached records:', err);
      // Fallback to IndexedDB
      try {
        const db = await getPikiDB();
        const cachedProducts = await db.getAll('products');
        if (cachedProducts.length > 0) {
          setProducts(cachedProducts);
        }
      } catch (dbErr) {
        console.error('IndexedDB load error:', dbErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateExchangeRate = async (newRate: number) => {
    setExchangeRate(newRate);
    if (syncEngine.isNetworkAvailable()) {
      await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-token-pikistock',
        },
        body: JSON.stringify({
          companyId: company?.id || 'comp-kivu-distribution',
          rate: newRate,
        }),
      });
      await loadData();
    }
  };

  const tabTitles: Record<ActiveTab, string> = {
    dashboard: 'Tableau de Bord Commercial',
    pos: 'Point de Vente & Caisse POS',
    products: 'Gestion du Catalogue & Prix',
    stock: 'Mouvements & Entrepôts',
    sales: 'Journal des Ventes & Reçus',
    sync: 'Centre de Synchronisation & Outbox',
    settings: 'Paramètres & Devises',
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={syncState.pendingCount}
        currentStore={selectedLocation}
        stores={stores}
        warehouses={warehouses}
        selectedLocation={selectedLocation}
        onSelectLocation={setSelectedLocation}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <Header
          currentTabName={tabTitles[activeTab]}
          selectedLocation={selectedLocation}
          syncState={syncState}
          onForceSync={async () => {
            await syncEngine.syncNow();
            await loadData();
          }}
          onToggleSimulatedOffline={() => syncEngine.toggleSimulatedOffline()}
          exchangeRate={exchangeRate}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        {/* View Content Port */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                products={products}
                sales={sales}
                stores={stores}
                warehouses={warehouses}
                company={company}
                exchangeRate={exchangeRate}
                onNavigate={setActiveTab}
                isSimulatedOffline={syncState.isSimulatedOffline}
                onRefresh={loadData}
                isOnline={syncEngine.isNetworkAvailable()}
              />
            )}

            {activeTab === 'pos' && (
              <PosView
                products={products}
                customers={customers}
                selectedLocation={selectedLocation}
                company={company}
                exchangeRate={exchangeRate}
                onSaleComplete={loadData}
                isOnline={syncEngine.isNetworkAvailable()}
              />
            )}

            {activeTab === 'products' && (
              <ProductsView
                products={products}
                stores={stores}
                warehouses={warehouses}
                company={company}
                exchangeRate={exchangeRate}
                onRefresh={loadData}
                isOnline={syncEngine.isNetworkAvailable()}
              />
            )}

            {activeTab === 'stock' && (
              <StockView
                products={products}
                stores={stores}
                warehouses={warehouses}
                company={company}
                onRefresh={loadData}
                isOnline={syncEngine.isNetworkAvailable()}
              />
            )}

            {activeTab === 'sales' && (
              <SalesHistoryView
                sales={sales}
                company={company}
                stores={stores}
                selectedLocation={selectedLocation}
              />
            )}

            {activeTab === 'sync' && (
              <SyncCenterView
                syncState={syncState}
                onForceSync={async () => {
                  await syncEngine.syncNow();
                  await loadData();
                }}
                onToggleSimulatedOffline={() => syncEngine.toggleSimulatedOffline()}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                company={company}
                exchangeRate={exchangeRate}
                onUpdateExchangeRate={handleUpdateExchangeRate}
                isOnline={syncEngine.isNetworkAvailable()}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
