import React, { useState } from 'react';
import {
  TrendingUp,
  Boxes,
  ShoppingCart,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Warehouse,
  Store,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  ArrowDownLeft,
  Filter,
  Package,
} from 'lucide-react';
import { RestockOrderModal } from './RestockOrderModal.tsx';

interface DashboardViewProps {
  products: any[];
  sales: any[];
  stores: any[];
  warehouses: any[];
  company: any;
  exchangeRate: number;
  onNavigate: (tab: any) => void;
  isSimulatedOffline: boolean;
  onRefresh?: () => void;
  isOnline?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  stores,
  warehouses,
  company,
  exchangeRate,
  onNavigate,
  isSimulatedOffline,
  onRefresh,
  isOnline = true,
}) => {
  // Modal state for restock order
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedRestockProducts, setSelectedRestockProducts] = useState<any[]>([]);
  const [alertFilter, setAlertFilter] = useState<'all_alerts' | 'ruptures' | 'low_stock'>('all_alerts');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Financial Calculations
  const totalSalesUsd = sales.reduce((acc, s) => acc + (Number(s.totalAmountUsd) || 0), 0);
  const totalSalesCdf = totalSalesUsd * exchangeRate;

  const totalStockValuationUsd = products.reduce(
    (acc, p) => acc + (p.purchasePriceUsd || 0) * (p.totalStock || 0),
    0
  );
  const totalStockValuationCdf = totalStockValuationUsd * exchangeRate;

  // Products under or at alert threshold defined in database
  const lowStockProducts = products.filter((p) => (p.totalStock || 0) <= (p.minStockAlert || 5));
  const ruptureProducts = products.filter((p) => (p.totalStock || 0) <= 0);

  // Filtered list based on selected tab
  const displayedAlertProducts = lowStockProducts.filter((p) => {
    if (alertFilter === 'ruptures') return (p.totalStock || 0) <= 0;
    if (alertFilter === 'low_stock') return (p.totalStock || 0) > 0;
    return true;
  });

  // Calculate estimated total restock investment needed for all alerted items
  const totalRestockInvestmentUsd = lowStockProducts.reduce((sum, p) => {
    const stock = p.totalStock || 0;
    const alert = p.minStockAlert || 5;
    const deficit = Math.max(0, alert - stock);
    const suggestedQty = Math.max(deficit * 2, alert * 2, 10);
    return sum + suggestedQty * (p.purchasePriceUsd || 0);
  }, 0);
  const totalRestockInvestmentCdf = Math.round(totalRestockInvestmentUsd * exchangeRate);

  const handleOpenRestockSingle = (product: any) => {
    setSelectedRestockProducts([product]);
    setRestockModalOpen(true);
  };

  const handleOpenRestockAll = () => {
    if (lowStockProducts.length === 0) return;
    setSelectedRestockProducts(lowStockProducts);
    setRestockModalOpen(true);
  };

  const handleRestockSuccess = () => {
    setSuccessToast('Commande de réapprovisionnement enregistrée et stock mis à jour avec succès.');
    setTimeout(() => setSuccessToast(null), 5000);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Restock Order Modal */}
      {restockModalOpen && (
        <RestockOrderModal
          productsToRestock={selectedRestockProducts}
          warehouses={warehouses}
          stores={stores}
          company={company}
          exchangeRate={exchangeRate}
          isOnline={isOnline}
          onClose={() => setRestockModalOpen(false)}
          onSuccess={handleRestockSuccess}
        />
      )}

      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:underline">
            Fermer
          </button>
        </div>
      )}

      {/* Offline Alert Banner if simulated or offline */}
      {isSimulatedOffline && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Mode simulation hors connexion actif :</span> Vous pouvez
            effectuer des réapprovisionnements, ventes en caisse ou ajustements de stock. Toutes les
            opérations sont persistées localement dans IndexedDB et seront synchronisées avec
            PostgreSQL dès la reconnexion.
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chiffre d'Affaires */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Chiffre d'Affaires</span>
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              ${totalSalesUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">
              ≈ {totalSalesCdf.toLocaleString('fr-FR')} CDF
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{sales.length} ventes enregistrées</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+100% opérationnel</span>
          </div>
        </div>

        {/* Card 2: Valeur Totale du Stock */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Valeur du Stock (Coût d'achat)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              ${totalStockValuationUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              ≈ {totalStockValuationCdf.toLocaleString('fr-FR')} CDF
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{products.length} références répertoriées</span>
            <button
              onClick={() => onNavigate('stock')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              Gérer stock <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Alertes Ruptures */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Stocks Faibles & Ruptures</span>
            <span
              className={`p-1.5 rounded-lg ${
                lowStockProducts.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {lowStockProducts.length}{' '}
              <span className="text-xs font-normal text-slate-500">produits</span>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              {ruptureProducts.length} en rupture complète
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Seuils minimaux définis en base</span>
            <button
              onClick={handleOpenRestockAll}
              disabled={lowStockProducts.length === 0}
              className="text-amber-600 dark:text-amber-400 hover:underline font-semibold disabled:opacity-50"
            >
              Commander tout
            </button>
          </div>
        </div>

        {/* Card 4: Établissements Connectés */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Réseau d'Établissements</span>
            <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Warehouse className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {stores.length + warehouses.length}{' '}
              <span className="text-xs font-normal text-slate-500">sites</span>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
              {warehouses.length} entrepôt central · {stores.length} boutiques
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Kinshasa, RDC</span>
            <button
              onClick={() => onNavigate('pos')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Ouvrir caisse
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOUVEAU COMPOSANT VISUEL : ALERTES DE STOCK CRITIQUE & RÉAPPROVISIONNEMENT */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Articles ayant Atteint ou Dépassé le Seuil d'Alerte
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  {lowStockProducts.length} critique(s)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Surveillance continue des stocks par rapport au seuil minimum défini en base de données (<code className="font-mono text-[11px]">min_stock_alert</code>)
              </p>
            </div>
          </div>

          {/* Action Header Button & Filters */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Filter segmented buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setAlertFilter('all_alerts')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  alertFilter === 'all_alerts'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tous ({lowStockProducts.length})
              </button>
              <button
                onClick={() => setAlertFilter('ruptures')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  alertFilter === 'ruptures'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                Ruptures ({ruptureProducts.length})
              </button>
              <button
                onClick={() => setAlertFilter('low_stock')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  alertFilter === 'low_stock'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                Faibles ({lowStockProducts.length - ruptureProducts.length})
              </button>
            </div>

            {/* Batch Reorder Button */}
            <button
              onClick={handleOpenRestockAll}
              disabled={lowStockProducts.length === 0}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              title="Créer une commande consolidée pour l'ensemble des articles sous le seuil d'alerte"
            >
              <Truck className="w-4 h-4" />
              <span>Commande Groupée</span>
            </button>
          </div>
        </div>

        {/* Financial Replenishment Gauge Bar */}
        {lowStockProducts.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Budget estimé de remise à niveau :</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                ${totalRestockInvestmentUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                ≈ {totalRestockInvestmentCdf.toLocaleString('fr-FR')} CDF
              </span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Fournisseurs suggérés : Importateurs Matadi & Minoteries Locales
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayedAlertProducts.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Aucun article critique dans cette sélection
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Tous les produits ont un niveau de stock supérieur ou égal à leur seuil minimum de sécurité.
              </p>
            </div>
          ) : (
            displayedAlertProducts.map((p) => {
              const currentStock = p.totalStock || 0;
              const minAlert = p.minStockAlert || 5;
              const isRupture = currentStock <= 0;
              const deficit = Math.max(0, minAlert - currentStock);
              const percentage = Math.min(100, Math.round((currentStock / minAlert) * 100));
              const suggestedOrderQty = Math.max(deficit * 2, minAlert * 2, 10);
              const estimatedOrderCostUsd = suggestedOrderQty * (p.purchasePriceUsd || 0);

              return (
                <div
                  key={p.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left Column: Product Info & Category */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {p.name}
                      </span>
                      {isRupture ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                          Rupture de Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                          Stock Critique ({percentage}%)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 font-mono">
                      <span>SKU: {p.sku}</span>
                      <span aria-hidden="true" className="font-sans">·</span>
                      <span className="font-sans">{p.categoryName || 'Alimentation'}</span>
                      <span aria-hidden="true" className="font-sans">·</span>
                      <span>Coût d'achat : ${Number(p.purchasePriceUsd).toFixed(2)}</span>
                    </div>

                    {/* Stock Gauge Meter */}
                    <div className="pt-1 max-w-md">
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1 font-mono">
                        <span>Dispo: <strong className={isRupture ? 'text-rose-600' : 'text-amber-600'}>{currentStock} {p.unit}</strong></span>
                        <span>Seuil min en base: <strong>{minAlert} {p.unit}</strong></span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">Déficit: -{deficit} {p.unit}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isRupture ? 'w-0' : percentage <= 35 ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle: Recommended Order Calculation */}
                  <div className="text-left md:text-right shrink-0 font-mono text-xs space-y-0.5">
                    <div className="text-slate-500 text-[11px] font-sans">
                      Commande recommandée :
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      +{suggestedOrderQty} {p.unit}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold tabular-nums">
                      ≈ ${estimatedOrderCostUsd.toFixed(2)} USD
                    </div>
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      {(Math.round(estimatedOrderCostUsd * exchangeRate)).toLocaleString('fr-FR')} CDF
                    </div>
                  </div>

                  {/* Right: Direct Reorder Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenRestockSingle(p)}
                      className="w-full md:w-auto px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Réapprovisionner</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 2-Column Split: Top Products & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Products Inventory */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Articles Phares & Niveaux de Stock
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Disponibilités consolidées dans les entrepôts et boutiques
              </p>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Voir tout
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.slice(0, 6).map((prod) => (
              <div key={prod.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="min-w-0 pr-4">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {prod.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>SKU: {prod.sku}</span>
                    <span aria-hidden="true">·</span>
                    <span>{prod.categoryName || 'Alimentation'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      ${prod.sellingPriceUsd} ({prod.sellingPriceCdf?.toLocaleString('fr-FR')} CDF)
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-bold tabular-nums ${
                      (prod.totalStock || 0) <= prod.minStockAlert
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {prod.totalStock || 0} {prod.unit}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {(prod.totalStock || 0) <= prod.minStockAlert ? 'Alerte stock bas' : 'En stock'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Sales & POS Operations */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Dernières Ventes Enregistrées
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traçabilité des factures (en ligne et hors-ligne)
              </p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Historique complet
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sales.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucune vente enregistrée pour le moment.
                <div className="mt-3">
                  <button
                    onClick={() => onNavigate('pos')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                  >
                    Effectuer une première vente
                  </button>
                </div>
              </div>
            ) : (
              sales.slice(0, 6).map((sale) => (
                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white font-mono">
                        {sale.invoiceNumber}
                      </span>
                      {sale.isOfflineCreated && (
                        <span className="text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          Hors-Ligne
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{sale.paymentMethod?.replace('_', ' ').toUpperCase()}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {new Date(sale.createdAt || Date.now()).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                      ${Number(sale.totalAmountUsd).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {Number(sale.totalAmountCdf).toLocaleString('fr-FR')} CDF
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
