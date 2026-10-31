import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  FileCode,
  HardDrive,
} from 'lucide-react';
import { syncEngine, SyncEngineState } from '../offline/syncEngine.ts';
import { getPikiDB, OutboxItem } from '../offline/db.ts';

interface SyncCenterViewProps {
  syncState: SyncEngineState;
  onForceSync: () => void;
  onToggleSimulatedOffline: () => void;
}

export const SyncCenterView: React.FC<SyncCenterViewProps> = ({
  syncState,
  onForceSync,
  onToggleSimulatedOffline,
}) => {
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOutbox = async () => {
    try {
      const db = await getPikiDB();
      const all = await db.getAll('outbox');
      // Sort newest first
      all.sort(
        (a, b) => new Date(b.clientTimestamp).getTime() - new Date(a.clientTimestamp).getTime()
      );
      setOutboxItems(all);
    } catch (e) {
      console.error('Failed to load outbox:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutbox();
    const interval = setInterval(fetchOutbox, 2000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = syncState.isOnline && !syncState.isSimulatedOffline;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Moteur de Synchronisation & File d'Attente (Outbox)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contrôle de l'architecture Offline-First, idempotence des requêtes et persistance IndexedDB
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSimulatedOffline}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              syncState.isSimulatedOffline
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            {syncState.isSimulatedOffline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>
              {syncState.isSimulatedOffline ? 'Désactiver Simulation' : 'Simuler Coupure Internet'}
            </span>
          </button>

          <button
            onClick={async () => {
              await onForceSync();
              fetchOutbox();
            }}
            disabled={syncState.isSyncing || !isOnline}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncState.isSyncing ? 'Synchronisation...' : 'Synchroniser Maintenant'}</span>
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Network & Protocol Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>État de la Connexion</span>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{isOnline ? 'En Ligne (PostgreSQL)' : 'Hors Connexion'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {syncState.isSimulatedOffline
              ? 'Mode test simulant une coupure Internet physique'
              : isOnline
              ? 'Connecté au serveur central Cloud SQL'
              : 'Sauvegarde locale active'}
          </div>
        </div>

        {/* Local IndexedDB Outbox Queue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>File d'Attente Locale (Outbox)</span>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {outboxItems.filter((i) => i.syncStatus === 'pending').length} opérations en attente
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Stockées de manière permanente dans IndexedDB
          </div>
        </div>

        {/* Last sync & Integrity */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Dernière Synchronisation</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white font-mono">
            {syncState.lastSyncTime
              ? new Date(syncState.lastSyncTime).toLocaleTimeString('fr-FR')
              : 'Pas encore synchronisé'}
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            Protocole d'Idempotence UUID actif
          </div>
        </div>
      </div>

      {/* Outbox Items Detailed Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Journal des Opérations Locales (IndexedDB Outbox)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chaque écriture est garantie et horodatée localement avant transmission
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">{outboxItems.length} opérations enregistrées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Identifiant (UUID)</th>
                <th className="py-3 px-3">Type Entité</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Horodatage Client</th>
                <th className="py-3 px-3">Clé d'Idempotence</th>
                <th className="py-3 px-4 text-right">Statut Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {outboxItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucune opération hors-ligne en attente. Toutes les données sont à jour.
                  </td>
                </tr>
              ) : (
                outboxItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors font-mono">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {item.id}
                    </td>
                    <td className="py-3 px-3 uppercase text-blue-600 dark:text-blue-400 font-semibold font-sans">
                      {item.entityType}
                    </td>
                    <td className="py-3 px-3 uppercase text-slate-700 dark:text-slate-300 font-sans">
                      {item.operationType}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {new Date(item.clientTimestamp).toLocaleTimeString('fr-FR')}
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[150px]">
                      {item.idempotencyKey}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.syncStatus === 'synced'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            : item.syncStatus === 'syncing'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 animate-pulse'
                            : item.syncStatus === 'conflict'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {item.syncStatus === 'synced'
                          ? 'Synchronisé'
                          : item.syncStatus === 'syncing'
                          ? 'En cours...'
                          : item.syncStatus === 'conflict'
                          ? 'Conflit'
                          : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
