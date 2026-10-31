import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Receipt,
  RefreshCw,
  Settings,
  Building2,
  Store,
  Warehouse,
  ChevronDown,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'pos' | 'products' | 'stock' | 'sales' | 'sync' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingCount: number;
  currentStore: { id: string; name: string } | null;
  stores: Array<{ id: string; name: string; code?: string }>;
  warehouses: Array<{ id: string; name: string; code?: string }>;
  onSelectLocation: (loc: { id: string; name: string; type: 'store' | 'warehouse' }) => void;
  selectedLocation: { id: string; name: string; type: 'store' | 'warehouse' } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  stores,
  warehouses,
  onSelectLocation,
  selectedLocation,
}) => {
  const [locMenuOpen, setLocMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'pos', label: 'Caisse POS (Ventes)', icon: ShoppingCart },
    { id: 'products', label: 'Catalogue & Produits', icon: Package },
    { id: 'stock', label: 'Gestion des Stocks', icon: Layers },
    { id: 'sales', label: 'Factures & Ventes', icon: Receipt },
    {
      id: 'sync',
      label: 'Moteur Offline & Sync',
      icon: RefreshCw,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { id: 'settings', label: 'Paramètres & Devises', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl tracking-wider shadow-md shadow-blue-500/20">
            P
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              PIKISTOCK
            </h1>
            <p className="text-[11px] text-blue-400 font-medium tracking-wide uppercase">
              Gestion Commerciale & Stocks
            </p>
          </div>
        </div>

        {/* Company & Active Location Selector */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            Maison Kivu Distribution
          </div>

          <div className="relative">
            <button
              onClick={() => setLocMenuOpen(!locMenuOpen)}
              className="w-full text-left bg-slate-800/80 hover:bg-slate-800 px-2.5 py-2 rounded-lg border border-slate-700 text-xs flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                {selectedLocation?.type === 'warehouse' ? (
                  <Warehouse className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className="font-medium text-white truncate">
                  {selectedLocation?.name || 'Sélectionner un site'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {locMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-30 text-xs">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                  Boutiques de Vente
                </div>
                {stores.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectLocation({ id: s.id, name: s.name, type: 'store' });
                      setLocMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-700/70 transition-colors ${
                      selectedLocation?.id === s.id ? 'text-blue-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5 text-blue-400" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}

                <div className="px-3 py-1 mt-1 text-[10px] font-semibold text-slate-400 uppercase border-t border-slate-700/60 pt-1">
                  Entrepôts de Stockage
                </div>
                {warehouses.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      onSelectLocation({ id: w.id, name: w.name, type: 'warehouse' });
                      setLocMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-700/70 transition-colors ${
                      selectedLocation?.id === w.id ? 'text-amber-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5 text-amber-400" />
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Slogan & Version Footer */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
        <p className="text-slate-300 italic">
          "Gérez votre stock. Contrôlez votre business. Grandissez sans limites."
        </p>
        <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400">
          <span>PIKISTOCK v1.0.0</span>
          <span>RDC / Afrique</span>
        </div>
      </div>
    </aside>
  );
};
