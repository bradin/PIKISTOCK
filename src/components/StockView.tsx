import React, { useState } from 'react';
import {
  Layers,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse,
  Store,
  Plus,
  History,
  X,
  Check,
} from 'lucide-react';
import { syncEngine } from '../offline/syncEngine.ts';

interface StockViewProps {
  products: any[];
  stores: any[];
  warehouses: any[];
  company: any;
  onRefresh: () => void;
  isOnline: boolean;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  stores,
  warehouses,
  company,
  onRefresh,
  isOnline,
}) => {
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Transfer form state
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [fromLocId, setFromLocId] = useState(warehouses[0]?.id || '');
  const [toLocId, setToLocId] = useState(stores[0]?.id || '');
  const [transferQty, setTransferQty] = useState(10);
  const [transferNotes, setTransferNotes] = useState('Approvisionnement boutique');

  // Entry form state
  const [entryProductId, setEntryProductId] = useState(products[0]?.id || '');
  const [entryLocId, setEntryLocId] = useState(warehouses[0]?.id || '');
  const [entryQty, setEntryQty] = useState(50);
  const [entryRef, setEntryRef] = useState('BON-LIVRAISON-2026');
  const [entryNotes, setEntryNotes] = useState('Arrivage fournisseur Matadi');

  const allLocations = [
    ...warehouses.map((w) => ({ ...w, type: 'warehouse' })),
    ...stores.map((s) => ({ ...s, type: 'store' })),
  ];

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !fromLocId || !toLocId || fromLocId === toLocId) return;
    setSubmitting(true);

    const movementId = `smov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id: movementId,
      companyId: company?.id || 'comp-kivu-distribution',
      productId: selectedProductId,
      movementType: 'transfer',
      fromLocationId: fromLocId,
      toLocationId: toLocId,
      quantity: Number(transferQty),
      reference: `TRF-${Date.now().toString().slice(-6)}`,
      notes: transferNotes,
    };

    try {
      if (isOnline) {
        await fetch('/api/stocks/movements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-token-pikistock',
          },
          body: JSON.stringify(payload),
        });
      } else {
        await syncEngine.enqueue(
          company?.id || 'comp-kivu-distribution',
          'create',
          'stock_movement',
          movementId,
          payload
        );
      }
      setTransferModalOpen(false);
      onRefresh();
    } catch (err) {
      console.warn('Network issue, queued in outbox:', err);
      await syncEngine.enqueue(
        company?.id || 'comp-kivu-distribution',
        'create',
        'stock_movement',
        movementId,
        payload
      );
      setTransferModalOpen(false);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryProductId || !entryLocId) return;
    setSubmitting(true);

    const movementId = `smov-in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id: movementId,
      companyId: company?.id || 'comp-kivu-distribution',
      productId: entryProductId,
      movementType: 'in',
      toLocationId: entryLocId,
      quantity: Number(entryQty),
      reference: entryRef,
      notes: entryNotes,
    };

    try {
      if (isOnline) {
        await fetch('/api/stocks/movements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-token-pikistock',
          },
          body: JSON.stringify(payload),
        });
      } else {
        await syncEngine.enqueue(
          company?.id || 'comp-kivu-distribution',
          'create',
          'stock_movement',
          movementId,
          payload
        );
      }
      setEntryModalOpen(false);
      onRefresh();
    } catch (err) {
      console.warn('Network issue, queued in outbox:', err);
      await syncEngine.enqueue(
        company?.id || 'comp-kivu-distribution',
        'create',
        'stock_movement',
        movementId,
        payload
      );
      setEntryModalOpen(false);
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Gestion des Mouvements & Entrepôts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transferts inter-sites, réceptions de marchandises et traçabilité des stocks
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setEntryModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Entrée / Réception Stock</span>
          </button>
          <button
            onClick={() => setTransferModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Nouveau Transfert Inter-Sites</span>
          </button>
        </div>
      </div>

      {/* Location Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Warehouse className="w-5 h-5" />
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                Entrepôt Central
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">{w.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{w.address}</p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Statut :</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Opérationnel</span>
            </div>
          </div>
        ))}

        {stores.map((s) => (
          <div key={s.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Store className="w-5 h-5" />
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                Boutique de Vente
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3">{s.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.address}</p>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Caisse POS :</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Prête & Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Balances Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Inventaire & Niveaux de Stock par Produit
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {products.length} références répertoriées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3 text-right">Stock Global</th>
                <th className="py-3 px-3 text-right">Seuil d'Alerte</th>
                <th className="py-3 px-4 text-right">Actions Rapides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {p.name}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {p.sku}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                    {p.totalStock || 0} {p.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {p.minStockAlert} {p.unit}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setTransferModalOpen(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Transférer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Transfert Inter-Établissements
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Article à Transférer
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Dispo: {p.totalStock || 0} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Origine (Départ)
                  </label>
                  <select
                    value={fromLocId}
                    onChange={(e) => setFromLocId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {allLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination (Arrivée)
                  </label>
                  <select
                    value={toLocId}
                    onChange={(e) => setToLocId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {allLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quantité à Déplacer
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Motif / Référence
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Ex: Réapprovisionnement hebdomadaire"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || fromLocId === toLocId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Validation...' : 'Valider le Transfert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {entryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Réception de Marchandises (Entrée Stock)
              </h3>
              <button onClick={() => setEntryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEntry} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Article Réceptionné
                </label>
                <select
                  value={entryProductId}
                  onChange={(e) => setEntryProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lieu de Réception
                </label>
                <select
                  value={entryLocId}
                  onChange={(e) => setEntryLocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {allLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantité Entrante
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={entryQty}
                    onChange={(e) => setEntryQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    N° Bon de Livraison
                  </label>
                  <input
                    type="text"
                    value={entryRef}
                    onChange={(e) => setEntryRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observations / Fournisseur
                </label>
                <input
                  type="text"
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEntryModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Validation...' : 'Enregistrer Entrée'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
