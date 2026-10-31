import React from 'react';
import { Printer, CheckCircle, X, Store } from 'lucide-react';

interface ReceiptModalProps {
  sale: any;
  company: any;
  store: any;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  company,
  store,
  onClose,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle className="w-5 h-5" />
            <span>Vente Validée avec Succès</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content (Printable styling) */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono select-text bg-white dark:bg-slate-900">
          <div className="text-center space-y-1 border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
            <h2 className="font-bold text-base text-slate-900 dark:text-white uppercase font-sans">
              {company?.name || 'PIKISTOCK DISTRIBUTION'}
            </h2>
            <div className="text-slate-500">{company?.legalName}</div>
            <div className="text-slate-500">RCCM : {company?.taxNumber || 'CD/KNG/RCCM/24-B-08712'}</div>
            <div className="text-slate-500 font-sans font-medium flex items-center justify-center gap-1 mt-1">
              <Store className="w-3 h-3" />
              <span>{store?.name || 'Boutique Marché Central'}</span>
            </div>
            <div className="text-[11px] text-slate-400">{store?.address || 'Kinshasa, RDC'}</div>
          </div>

          {/* Invoice Info */}
          <div className="space-y-1 border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Facture N° :</span>
              <span className="font-bold text-slate-900 dark:text-white">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Heure :</span>
              <span>{new Date(sale.createdAt || Date.now()).toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mode de règlement :</span>
              <span className="font-semibold">{sale.paymentMethod?.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Statut réseau :</span>
              <span className={sale.isOfflineCreated ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                {sale.isOfflineCreated ? 'Enregistré Hors-Ligne (IndexedDB)' : 'Validé en Ligne (PostgreSQL)'}
              </span>
            </div>
          </div>

          {/* Line items table */}
          <div className="space-y-2 border-b border-dashed border-slate-300 dark:border-slate-700 pb-4">
            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
              <span className="w-1/2">Désignation</span>
              <span className="w-1/4 text-center">Qté</span>
              <span className="w-1/4 text-right">Total ($)</span>
            </div>
            {sale.items?.map((it: any, idx: number) => (
              <div key={idx} className="flex justify-between text-slate-800 dark:text-slate-200">
                <span className="w-1/2 truncate font-sans text-xs">{it.productName || it.name}</span>
                <span className="w-1/4 text-center tabular-nums">{it.quantity}</span>
                <span className="w-1/4 text-right font-bold tabular-nums">
                  ${(it.totalPriceUsd || it.unitPriceUsd * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>TOTAL USD :</span>
              <span className="tabular-nums">${Number(sale.totalAmountUsd).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-blue-600 dark:text-blue-400">
              <span>TOTAL CDF :</span>
              <span className="tabular-nums">
                {Number(sale.totalAmountCdf).toLocaleString('fr-FR')} CDF
              </span>
            </div>
            <div className="text-[10px] text-slate-400 text-right pt-1">
              Taux appliqué : 1 USD = {Number(sale.exchangeRate || 2850).toLocaleString('fr-FR')} CDF
            </div>
          </div>

          <div className="text-center pt-4 text-[11px] text-slate-400 font-sans italic border-t border-dashed border-slate-200 dark:border-slate-800">
            Merci de votre confiance. Les marchandises vendues ne sont ni reprises ni échangées.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le Reçu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
