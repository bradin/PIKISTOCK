import React, { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { syncEngine } from '../offline/syncEngine.ts';
import { ReceiptModal } from './ReceiptModal.tsx';

interface CartItem {
  product: any;
  quantity: number;
}

interface PosViewProps {
  products: any[];
  customers: any[];
  selectedLocation: { id: string; name: string; type: 'store' | 'warehouse' } | null;
  company: any;
  exchangeRate: number;
  onSaleComplete: () => void;
  isOnline: boolean;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  customers,
  selectedLocation,
  company,
  exchangeRate,
  onSaleComplete,
  isOnline,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash_usd');
  const [submitting, setSubmitting] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);

  // Filter products by search and category
  const categories = ['all', ...Array.from(new Set(products.map((p) => p.categoryName || 'Général')))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCat = selectedCategory === 'all' || (p.categoryName || 'Général') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Cart operations
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  // Totals in USD & CDF
  const totalAmountUsd = cart.reduce(
    (sum, item) => sum + item.product.sellingPriceUsd * item.quantity,
    0
  );
  const totalAmountCdf = Math.round(totalAmountUsd * exchangeRate);

  // Validate and submit sale
  const handleValidateSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const invoiceNumber = `FACT-${Date.now().toString().slice(-6)}`;
    const storeId = selectedLocation?.id || 'store-kin-marche';

    const salePayload = {
      id: saleId,
      companyId: company?.id || 'comp-kivu-distribution',
      storeId,
      customerId: selectedCustomer || null,
      invoiceNumber,
      totalAmountUsd,
      totalAmountCdf,
      exchangeRate,
      paymentMethod,
      amountPaidUsd: paymentMethod === 'cash_usd' ? totalAmountUsd : 0,
      amountPaidCdf: paymentMethod === 'cash_cdf' ? totalAmountCdf : 0,
      status: 'completed',
      isOfflineCreated: !isOnline,
      createdOfflineAt: !isOnline ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      items: cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPriceUsd: item.product.sellingPriceUsd,
        unitPriceCdf: item.product.sellingPriceCdf || Math.round(item.product.sellingPriceUsd * exchangeRate),
        totalPriceUsd: item.product.sellingPriceUsd * item.quantity,
        totalPriceCdf: (item.product.sellingPriceCdf || Math.round(item.product.sellingPriceUsd * exchangeRate)) * item.quantity,
      })),
    };

    try {
      if (isOnline) {
        // Direct post to backend REST API
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-token-pikistock',
          },
          body: JSON.stringify(salePayload),
        });
        if (!res.ok) throw new Error('Erreur lors de la validation serveur');
      } else {
        // Enqueue into offline Outbox in IndexedDB!
        await syncEngine.enqueue(
          company?.id || 'comp-kivu-distribution',
          'create',
          'sale',
          saleId,
          salePayload
        );
      }

      // Show receipt modal
      setLastSaleReceipt(salePayload);
      clearCart();
      onSaleComplete();
    } catch (err: any) {
      console.warn('Network issue during sale, falling back to outbox:', err);
      // Fallback: enqueue to outbox even if online request failed unexpectedly
      await syncEngine.enqueue(
        company?.id || 'comp-kivu-distribution',
        'create',
        'sale',
        saleId,
        salePayload
      );
      setLastSaleReceipt(salePayload);
      clearCart();
      onSaleComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Receipt Modal */}
      {lastSaleReceipt && (
        <ReceiptModal
          sale={lastSaleReceipt}
          company={company}
          store={selectedLocation}
          onClose={() => setLastSaleReceipt(null)}
        />
      )}

      {/* Left Column: Product Selection Grid (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Category Filter */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un article par nom, SKU ou code-barres..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat === 'all' ? 'Tous les rayons' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const inCart = cart.find((it) => it.product.id === p.id);
            const isOutOfStock = (p.totalStock || 0) <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isOutOfStock
                    ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                    : inCart
                    ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {p.sku}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        (p.totalStock || 0) <= p.minStockAlert
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      Stock : {p.totalStock || 0} {p.unit}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {p.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {p.description || p.categoryName}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-base font-extrabold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                      ${p.sellingPriceUsd.toFixed(2)}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {(p.sellingPriceCdf || Math.round(p.sellingPriceUsd * exchangeRate)).toLocaleString('fr-FR')} CDF
                    </div>
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
                      <span>{inCart.quantity}</span>
                      <span className="text-[10px] font-normal">au panier</span>
                    </div>
                  ) : (
                    <button
                      disabled={isOutOfStock}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Checkout Cart & Settlement (5 cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-2xs overflow-hidden sticky top-4">
        {/* Cart Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Panier de Caisse
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-bold">
              {cart.reduce((a, b) => a + b.quantity, 0)} articles
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              Vider
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Client Attribué
          </label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="">Client Comptoir Particulier (Comptant)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.outstandingDebtUsd > 0 ? `(Dette: $${c.outstandingDebtUsd})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800 max-h-[280px] overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Le panier est vide. Cliquez sur un article pour l'ajouter.
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    ${item.product.sellingPriceUsd.toFixed(2)} x {item.quantity} = $
                    {(item.product.sellingPriceUsd * item.quantity).toFixed(2)}
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Methods */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Moyen de Règlement
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: 'cash_usd', label: 'Espèces USD ($)', icon: Banknote },
              { id: 'cash_cdf', label: 'Espèces Francs (CDF)', icon: Banknote },
              { id: 'mobile_money_mpesa', label: 'M-Pesa (Vodacom)', icon: Smartphone },
              { id: 'mobile_money_airtel', label: 'Airtel Money', icon: Smartphone },
              { id: 'mobile_money_orange', label: 'Orange Money', icon: Smartphone },
              { id: 'mixed', label: 'Règlement Mixte', icon: CreditCard },
            ].map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                    paymentMethod === pm.id
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dual Total Bar & Validation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-semibold text-slate-500">Total en Dollar :</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              ${totalAmountUsd.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Total en Franc Congolais :
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {totalAmountCdf.toLocaleString('fr-FR')} CDF
            </span>
          </div>

          <div className="text-[11px] text-slate-400 text-right">
            Taux du jour : 1 USD = {exchangeRate.toLocaleString('fr-FR')} CDF
          </div>

          <button
            disabled={cart.length === 0 || submitting}
            onClick={handleValidateSale}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md ${
              cart.length === 0 || submitting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 active:scale-[0.99]'
            }`}
          >
            {submitting ? (
              <span>Enregistrement en cours...</span>
            ) : (
              <>
                <span>Encaisser & Valider la Vente</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
