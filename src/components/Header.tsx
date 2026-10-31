import React from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  ArrowRightLeft,
  CircleCheck,
  AlertTriangle,
} from 'lucide-react';
import { SyncEngineState } from '../offline/syncEngine.ts';

interface HeaderProps {
  currentTabName: string;
  selectedLocation: { id: string; name: string; type: 'store' | 'warehouse' } | null;
  syncState: SyncEngineState;
  onForceSync: () => void;
  onToggleSimulatedOffline: () => void;
  exchangeRate: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTabName,
  selectedLocation,
  syncState,
  onForceSync,
  onToggleSimulatedOffline,
  exchangeRate,
  darkMode,
  setDarkMode,
}) => {
  const isOnline = syncState.isOnline && !syncState.isSimulatedOffline;

  return (
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1: Context & Location Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
          {currentTabName}
        </h2>
        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
          <span>Établissement :</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
            {selectedLocation?.name || 'Non défini'}
          </span>
        </div>
      </div>

      {/* Zone 2: Real-time Offline-First Network & Sync Status Bar */}
      <div className="flex items-center gap-3">
        {/* Network status pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isOnline
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
          }`}
        >
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="whitespace-nowrap">
            {isOnline
              ? 'En Ligne (PostgreSQL)'
              : syncState.isSimulatedOffline
              ? 'Hors-Ligne (Simulé)'
              : 'Hors-Ligne (Local)'}
          </span>
        </div>

        {/* Pending outbox count & sync trigger */}
        {syncState.pendingCount > 0 ? (
          <button
            onClick={onForceSync}
            disabled={syncState.isSyncing || !isOnline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs"
            title="Opérations enregistrées dans IndexedDB prêtes à être envoyées au serveur"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncState.pendingCount} en attente</span>
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="whitespace-nowrap">Synchronisé</span>
          </div>
        )}

        {/* Offline Test Toggle */}
        <button
          onClick={onToggleSimulatedOffline}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
            syncState.isSimulatedOffline
              ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
          title="Permet de tester le fonctionnement hors connexion et la sauvegarde dans IndexedDB"
        >
          {syncState.isSimulatedOffline ? 'Rétablir Internet' : 'Simuler Hors-Ligne'}
        </button>
      </div>

      {/* Zone 3: Exchange Rate & User Profile */}
      <div className="flex items-center gap-3">
        {/* Daily Exchange Rate Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="text-slate-500 dark:text-slate-400">1 USD =</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {exchangeRate.toLocaleString('fr-FR')} CDF
          </span>
        </div>

        {/* Dark Mode Switcher */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Basculer thème sombre / clair"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            DG
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
              Directeur Général
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              Propriétaire (Owner)
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
