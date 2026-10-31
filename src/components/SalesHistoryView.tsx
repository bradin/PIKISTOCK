import React, { useState } from 'react';
import { Search, Receipt, Printer, ExternalLink, Filter, Calendar } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal.tsx';

interface SalesHistoryViewProps {
  sales: any[];
  company: any;
  stores: any[];
  selectedLocation: any;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  company,
  stores,
  selectedLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<any | null>(null);

  const filtered = sales.filter((s) => {
    return (
      s.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.paymentMethod?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Receipt Modal for re-printing */}
      {selectedReceiptSale && (
        <ReceiptModal
          sale={selectedReceiptSale}
          company={company}
          store={stores.find((st) => st.id === selectedReceiptSale.storeId) || selectedLocation}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Journal des Ventes & Factures Émises
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Traçabilité intégrale des transactions en magasin et à distance
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-2xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° Facture ou Mode de Paiement..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">N° Facture</th>
                <th className="py-3 px-3">Date & Heure</th>
                <th className="py-3 px-3">Boutique</th>
                <th className="py-3 px-3">Mode Paiement</th>
                <th className="py-3 px-3 text-right">Montant ($)</th>
                <th className="py-3 px-3 text-right">Montant (CDF)</th>
                <th className="py-3 px-3 text-center">Origine</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucune vente trouvée.
                  </td>
                </tr>
              ) : (
                filtered.map((sale) => {
                  const storeName = stores.find((s) => s.id === sale.storeId)?.name || 'Boutique';
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {sale.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {new Date(sale.createdAt || Date.now()).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {storeName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">
                          {sale.paymentMethod?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400">
                        ${Number(sale.totalAmountUsd).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {Number(sale.totalAmountCdf).toLocaleString('fr-FR')} CDF
                      </td>
                      <td className="py-3 px-3 text-center">
                        {sale.isOfflineCreated ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                            Hors-Ligne
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                            En Ligne
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedReceiptSale(sale)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reçu</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
