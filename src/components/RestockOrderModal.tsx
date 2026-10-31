import React, { useState } from 'react';
import {
  Truck,
  Package,
  X,
  Check,
  Building2,
  DollarSign,
  Coins,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { syncEngine } from '../offline/syncEngine.ts';

interface RestockOrderModalProps {
  productsToRestock: any[];
  warehouses: any[];
  stores: any[];
  company: any;
  exchangeRate: number;
  isOnline: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RestockOrderModal: React.FC<RestockOrderModalProps> = ({
  productsToRestock,
  warehouses,
  stores,
  company,
  exchangeRate,
  isOnline,
  onClose,
  onSuccess,
}) => {
  const [destinationId, setDestinationId] = useState<string>(
    warehouses[0]?.id || stores[0]?.id || ''
  );
  const [supplierName, setSupplierName] = useState<string>(
    'Société d’Importation & Distribution Centrale (Kinshasa)'
  );
  const [orderReference, setOrderReference] = useState<string>(
    `CMD-REAPPRO-${Date.now().toString().slice(-6)}`
  );
  const [orderNotes, setOrderNotes] = useState<string>(
    'Commande de réapprovisionnement automatique suite à alerte de stock'
  );
  const [submitting, setSubmitting] = useState(false);

  // Quantities map: productId -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of productsToRestock) {
      const deficit = Math.max(0, (p.minStockAlert || 5) - (p.totalStock || 0));
      // Suggest ordering deficit + buffer (e.g. at least 2x threshold or minimum 10)
      const suggested = Math.max(deficit * 2, p.minStockAlert * 2, 10);
      init[p.id] = suggested;
    }
    return init;
  });

  const allLocations = [
    ...warehouses.map((w) => ({ ...w, type: 'warehouse' })),
    ...stores.map((s) => ({ ...s, type: 'store' })),
  ];

  const handleQuantityChange = (productId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, val),
    }));
  };

  // Calculations
  const totalCostUsd = productsToRestock.reduce((acc, p) => {
    const qty = quantities[p.id] || 0;
    return acc + qty * (Number(p.purchasePriceUsd) || 0);
  }, 0);

  const totalCostCdf = Math.round(totalCostUsd * exchangeRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationId || productsToRestock.length === 0) return;
    setSubmitting(true);

    try {
      for (const p of productsToRestock) {
        const qty = quantities[p.id] || 1;
        const movementId = `smov-reappro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const payload = {
          id: movementId,
          companyId: company?.id || 'comp-kivu-distribution',
          productId: p.id,
          movementType: 'in',
          toLocationId: destinationId,
          quantity: qty,
          unitCostUsd: Number(p.purchasePriceUsd || 0),
          reference: orderReference,
          notes: `${orderNotes} · Fournisseur: ${supplierName}`,
        };

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
          // Enqueue into IndexedDB Outbox
          await syncEngine.enqueue(
            company?.id || 'comp-kivu-distribution',
            'create',
            'stock_movement',
            movementId,
            payload
          );
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting restock order:', err);
      // Fallback
      for (const p of productsToRestock) {
        const qty = quantities[p.id] || 1;
        const movementId = `smov-reappro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await syncEngine.enqueue(
          company?.id || 'comp-kivu-distribution',
          'create',
          'stock_movement',
          movementId,
          {
            id: movementId,
            companyId: company?.id || 'comp-kivu-distribution',
            productId: p.id,
            movementType: 'in',
            toLocationId: destinationId,
            quantity: qty,
            unitCostUsd: Number(p.purchasePriceUsd || 0),
            reference: orderReference,
            notes: `${orderNotes} · Fournisseur: ${supplierName}`,
          }
        );
      }
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Truck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Créer une Commande de Réapprovisionnement
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {productsToRestock.length} article(s) sous le seuil d'alerte sélectionné(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Destination & Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lieu de Livraison / Réception *
              </label>
              <select
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {allLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type === 'warehouse' ? 'Entrepôt' : 'Boutique'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fournisseur / Importateur
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                placeholder="Ex: Minoterie du Congo / Bracongo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                N° Bon de Commande
              </label>
              <input
                type="text"
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes & Remarques
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Items to Restock List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 dark:text-white">
                Articles à Réapprovisionner & Quantités à Commander
              </span>
              <span className="text-[11px] text-slate-500">
                Ajustez les quantités nécessaires
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {productsToRestock.map((p) => {
                const stock = p.totalStock || 0;
                const alert = p.minStockAlert || 5;
                const deficit = Math.max(0, alert - stock);
                const currentQty = quantities[p.id] || 1;
                const costUsd = currentQty * (p.purchasePriceUsd || 0);

                return (
                  <div key={p.id} className="p-3 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">SKU: {p.sku}</span>
                        <span>·</span>
                        <span className={stock === 0 ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                          Stock actuel : {stock} / {alert} {p.unit} ({stock === 0 ? 'Rupture' : `Déficit: -${deficit}`})
                        </span>
                        <span>·</span>
                        <span className="font-mono">Coût unit : ${Number(p.purchasePriceUsd).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-slate-500 font-medium">Quantité :</label>
                        <input
                          type="number"
                          min="1"
                          value={currentQty}
                          onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-center"
                        />
                        <span className="text-[11px] text-slate-500">{p.unit}</span>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <div className="font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                          ${costUsd.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {Math.round(costUsd * exchangeRate).toLocaleString('fr-FR')} CDF
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget & Parity Summary */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-medium">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span>Budget Estimé de la Commande :</span>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-slate-900 dark:text-white font-mono tabular-nums">
                ${totalCostUsd.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400 font-mono tabular-nums">
                ≈ {totalCostCdf.toLocaleString('fr-FR')} CDF
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {isOnline
              ? 'Mise à jour directe du stock dans PostgreSQL'
              : 'Enregistrement sécurisé hors-ligne dans IndexedDB Outbox'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={submitting || productsToRestock.length === 0}
              onClick={handleSubmit}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Traitement...'
                  : 'Valider et Réceptionner le Réapprovisionnement'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
