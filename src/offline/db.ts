import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OutboxItem {
  id: string; // Client UUID
  companyId: string;
  deviceId: string;
  userId: string;
  operationType: 'create' | 'update' | 'delete';
  entityType: 'sale' | 'product' | 'stock_movement' | 'customer' | 'exchange_rate';
  entityId: string;
  payload: any;
  idempotencyKey: string;
  clientTimestamp: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastError?: string;
}

export interface CachedProduct {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryName?: string;
  unit: string;
  purchasePriceUsd: number;
  sellingPriceUsd: number;
  sellingPriceCdf: number;
  currentLocationStock: number;
  totalStock: number;
  minStockAlert: number;
}

interface PikistockDBSchema extends DBSchema {
  outbox: {
    key: string;
    value: OutboxItem;
    indexes: { 'by-status': string; 'by-timestamp': string };
  };
  products: {
    key: string;
    value: CachedProduct;
    indexes: { 'by-sku': string; 'by-name': string };
  };
  sales: {
    key: string;
    value: any;
  };
  customers: {
    key: string;
    value: any;
  };
  meta: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'pikistock_offline_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PikistockDBSchema>> | null = null;

export function getPikiDB(): Promise<IDBPDatabase<PikistockDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PikistockDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Outbox store
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
          outboxStore.createIndex('by-status', 'syncStatus');
          outboxStore.createIndex('by-timestamp', 'clientTimestamp');
        }
        // Cached products store
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('by-sku', 'sku');
          prodStore.createIndex('by-name', 'name');
        }
        // Local sales
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id' });
        }
        // Local customers
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        // Metadata (sync cursor, deviceId, rates)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
      },
    });
  }
  return dbPromise;
}

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('pikistock_device_id');
  if (!deviceId) {
    deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('pikistock_device_id', deviceId);
  }
  return deviceId;
}
