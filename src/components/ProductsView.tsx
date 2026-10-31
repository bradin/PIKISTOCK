import React, { useState } from 'react';
import { Search, Plus, Package, AlertCircle, X, Check, Filter } from 'lucide-react';
import { syncEngine } from '../offline/syncEngine.ts';

interface ProductsViewProps {
  products: any[];
  stores: any[];
  warehouses: any[];
  company: any;
  exchangeRate: number;
  onRefresh: () => void;
  isOnline: boolean;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  stores,
  warehouses,
  company,
  exchangeRate,
  onRefresh,
  isOnline,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryName, setCategoryName] = useState('Alimentation & Céréales');
  const [unit, setUnit] = useState('sac');
  const [purchasePriceUsd, setPurchasePriceUsd] = useState<number>(0);
  const [sellingPriceUsd, setSellingPriceUsd] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [initialLocationId, setInitialLocationId] = useState<string>(
    warehouses[0]?.id || stores[0]?.id || ''
  );

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.categoryName || 'Général')))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = categoryFilter === 'all' || (p.categoryName || 'Général') === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !sellingPriceUsd) return;
    setSubmitting(true);

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const sellingPriceCdf = Math.round(Number(sellingPriceUsd) * exchangeRate);

    const payload = {
      id: productId,
      companyId: company?.id || 'comp-kivu-distribution',
      name,
      sku,
      barcode: barcode || null,
      unit,
      purchasePriceUsd: Number(purchasePriceUsd),
      sellingPriceUsd: Number(sellingPriceUsd),
      sellingPriceCdf,
      minStockAlert: Number(minStockAlert),
      initialStock: Number(initialStock),
      initialLocationId,
      initialLocationType: warehouses.find((w) => w.id === initialLocationId) ? 'warehouse' : 'store',
    };

    try {
      if (isOnline) {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-token-pikistock',
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Erreur création produit serveur');
      } else {
        // Enqueue into offline Outbox!
        await syncEngine.enqueue(
          company?.id || 'comp-kivu-distribution',
          'create',
          'product',
          productId,
          payload
        );
      }

      setModalOpen(false);
      resetForm();
      onRefresh();
    } catch (err) {
      console.warn('Network issue creating product, queued in outbox:', err);
      await syncEngine.enqueue(
        company?.id || 'comp-kivu-distribution',
        'create',
        'product',
        productId,
        payload
      );
      setModalOpen(false);
      resetForm();
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setBarcode('');
    setPurchasePriceUsd(0);
    setSellingPriceUsd(0);
    setInitialStock(0);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Catalogue des Articles & Produits
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestion des prix d'achat, prix de vente CDF/USD, codes-barres et unités
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Nouvel Article</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par libellé, SKU ou code-barres..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'Toutes les catégories' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products High-Density Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Désignation de l'Article</th>
                <th className="py-3 px-3">SKU & Code-Barres</th>
                <th className="py-3 px-3">Catégorie</th>
                <th className="py-3 px-3 text-right">Prix Achat ($)</th>
                <th className="py-3 px-3 text-right">Prix Vente ($)</th>
                <th className="py-3 px-3 text-right">Prix Vente (CDF)</th>
                <th className="py-3 px-4 text-center">Stock Consolidé</th>
                <th className="py-3 px-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((prod) => {
                const isLow = (prod.totalStock || 0) <= prod.minStockAlert;
                return (
                  <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {prod.name}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                      <div>{prod.sku}</div>
                      {prod.barcode && (
                        <div className="text-[10px] text-slate-400 font-normal">{prod.barcode}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {prod.categoryName || 'Alimentation'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      ${Number(prod.purchasePriceUsd).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
                      ${Number(prod.sellingPriceUsd).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {(prod.sellingPriceCdf || Math.round(prod.sellingPriceUsd * exchangeRate)).toLocaleString('fr-FR')} CDF
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {prod.totalStock || 0}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">{prod.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isLow
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isLow ? 'Alerte Seuil' : 'Optimal'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Product */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ajouter un Article au Répertoire
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom du Produit / Désignation *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Huile Manji 20L"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Référence SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="Ex: HUILE-MANJI-20L"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code-Barres EAN
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Ex: 690123456789"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unité de Mesure
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="sac">Sac</option>
                    <option value="carton">Carton</option>
                    <option value="bidon">Bidon</option>
                    <option value="fardeau">Fardeau</option>
                    <option value="pcs">Pièce</option>
                    <option value="kg">Kilogramme</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Seuil Alerte Stock
                  </label>
                  <input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Prices in USD and CDF */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prix d'Achat Unitaire ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePriceUsd}
                    onChange={(e) => setPurchasePriceUsd(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prix de Vente ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPriceUsd}
                    onChange={(e) => setSellingPriceUsd(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-blue-600"
                  />
                  <div className="text-[11px] text-blue-600 font-semibold mt-1">
                    ≈ {Math.round(sellingPriceUsd * exchangeRate).toLocaleString('fr-FR')} CDF
                  </div>
                </div>
              </div>

              {/* Initial stock allocation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Initial
                  </label>
                  <input
                    type="number"
                    value={initialStock}
                    onChange={(e) => setInitialStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lieu de Stockage
                  </label>
                  <select
                    value={initialLocationId}
                    onChange={(e) => setInitialLocationId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Entrepôt)
                      </option>
                    ))}
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Boutique)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Enregistrement...' : 'Enregistrer le Produit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
