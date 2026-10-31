import { getPikiDB, OutboxItem, CachedProduct, getOrCreateDeviceId } from './db.ts';

type SyncListener = (state: SyncEngineState) => void;

export interface SyncEngineState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastSyncError: string | null;
}

class SyncEngine {
  private state: SyncEngineState = {
    isOnline: navigator.onLine,
    isSimulatedOffline: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: localStorage.getItem('pikistock_last_sync_time'),
    lastSyncError: null,
  };

  private listeners: Set<SyncListener> = new Set();
  private syncInterval: any = null;

  constructor() {
    this.initNetworkListeners();
    this.updatePendingCount();
    this.startPeriodicSync();
  }

  private initNetworkListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notify();
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notify();
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): SyncEngineState {
    return { ...this.state };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.getState()));
  }

  // Toggle offline simulation for testing offline POS and stock movements
  public toggleSimulatedOffline(forceOffline?: boolean) {
    this.state.isSimulatedOffline =
      forceOffline !== undefined ? forceOffline : !this.state.isSimulatedOffline;
    this.notify();
    if (!this.state.isSimulatedOffline && this.isNetworkAvailable()) {
      this.syncNow();
    }
  }

  public isNetworkAvailable(): boolean {
    return this.state.isOnline && !this.state.isSimulatedOffline;
  }

  public async updatePendingCount(): Promise<number> {
    try {
      const db = await getPikiDB();
      const all = await db.getAllFromIndex('outbox', 'by-status', 'pending');
      this.state.pendingCount = all.length;
      this.notify();
      return all.length;
    } catch {
      return 0;
    }
  }

  // Enqueue operation into IndexedDB Outbox
  public async enqueue(
    companyId: string,
    operationType: 'create' | 'update' | 'delete',
    entityType: 'sale' | 'product' | 'stock_movement' | 'customer' | 'exchange_rate',
    entityId: string,
    payload: any
  ): Promise<OutboxItem> {
    const db = await getPikiDB();
    const id = `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const idempotencyKey = `idemp-${id}-${Math.random().toString(36).substring(2, 9)}`;
    const deviceId = getOrCreateDeviceId();

    const outboxItem: OutboxItem = {
      id,
      companyId,
      deviceId,
      userId: 'pikistock-admin-uid-001',
      operationType,
      entityType,
      entityId,
      payload,
      idempotencyKey,
      clientTimestamp: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
    };

    await db.put('outbox', outboxItem);
    await this.updatePendingCount();

    // If online, trigger background sync immediately
    if (this.isNetworkAvailable()) {
      this.syncNow().catch(console.error);
    }

    return outboxItem;
  }

  // Synchronize outbox queue to central server & pull updates
  public async syncNow(): Promise<{ success: boolean; pushed: number; error?: string }> {
    if (!this.isNetworkAvailable()) {
      return { success: false, pushed: 0, error: 'Connexion indisponible' };
    }

    if (this.state.isSyncing) {
      return { success: true, pushed: 0 };
    }

    this.state.isSyncing = true;
    this.state.lastSyncError = null;
    this.notify();

    try {
      const db = await getPikiDB();
      const pendingOps = await db.getAllFromIndex('outbox', 'by-status', 'pending');

      let pushedCount = 0;

      // 1. Push pending operations in batch
      if (pendingOps.length > 0) {
        // Mark as syncing in local DB
        for (const op of pendingOps) {
          op.syncStatus = 'syncing';
          await db.put('outbox', op);
        }

        const res = await fetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-token-pikistock',
          },
          body: JSON.stringify({ operations: pendingOps }),
        });

        if (!res.ok) {
          throw new Error(`Erreur serveur HTTP ${res.status}`);
        }

        const data = await res.json();

        // Mark successfully confirmed ops
        for (const result of data.results || []) {
          const op = pendingOps.find((o) => o.id === result.operationId);
          if (op) {
            if (result.status === 'synced') {
              op.syncStatus = 'synced';
              await db.put('outbox', op);
              pushedCount++;
            } else if (result.status === 'conflict') {
              op.syncStatus = 'conflict';
              op.lastError = result.message;
              await db.put('outbox', op);
            }
          }
        }
      }

      // 2. Pull delta updates from server
      const lastPull = (await db.get('meta', 'last_server_pull_cursor')) || '1970-01-01T00:00:00Z';
      const pullRes = await fetch(`/api/sync/pull?since=${encodeURIComponent(lastPull)}`, {
        headers: { Authorization: 'Bearer demo-token-pikistock' },
      });

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        // Update local products cache
        if (pullData.products && Array.isArray(pullData.products)) {
          const tx = db.transaction('products', 'readwrite');
          for (const p of pullData.products) {
            await tx.store.put({
              id: p.id,
              companyId: p.companyId,
              name: p.name,
              sku: p.sku,
              barcode: p.barcode,
              unit: p.unit,
              purchasePriceUsd: p.purchasePriceUsd,
              sellingPriceUsd: p.sellingPriceUsd,
              sellingPriceCdf: p.sellingPriceCdf,
              currentLocationStock: p.totalStock || 0,
              totalStock: p.totalStock || 0,
              minStockAlert: p.minStockAlert,
            });
          }
          await tx.done;
        }

        await db.put('meta', pullData.serverTime, 'last_server_pull_cursor');
      }

      const now = new Date().toISOString();
      this.state.lastSyncTime = now;
      localStorage.setItem('pikistock_last_sync_time', now);
      await this.updatePendingCount();

      this.state.isSyncing = false;
      this.notify();
      return { success: true, pushed: pushedCount };
    } catch (err: any) {
      console.warn('Sync error:', err);
      // Revert syncing back to pending
      const db = await getPikiDB();
      const syncingOps = await db.getAllFromIndex('outbox', 'by-status', 'syncing');
      for (const op of syncingOps) {
        op.syncStatus = 'pending';
        op.retryCount = (op.retryCount || 0) + 1;
        op.lastError = err.message;
        await db.put('outbox', op);
      }

      this.state.isSyncing = false;
      this.state.lastSyncError = err.message || 'Échec de synchronisation';
      await this.updatePendingCount();
      this.notify();
      return { success: false, pushed: 0, error: err.message };
    }
  }

  // Periodic heartbeat sync (every 30s)
  private startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      if (this.isNetworkAvailable() && this.state.pendingCount > 0) {
        this.syncNow().catch(console.error);
      }
    }, 30000);
  }
}

export const syncEngine = new SyncEngine();
