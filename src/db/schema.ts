import { boolean, doublePrecision, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table (Keyed by Firebase Auth UID)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('admin'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Companies (Multi-Tenant isolation root)
export const companies = pgTable('companies', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  legalName: text('legal_name'),
  taxNumber: text('tax_number'),
  country: text('country').default('CD').notNull(),
  defaultCurrency: text('default_currency').default('USD').notNull(),
  secondaryCurrency: text('secondary_currency').default('CDF').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. User Memberships & RBAC Permissions
export const memberships = pgTable('memberships', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.uid, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('admin'), // owner, admin, manager, accountant, stock_manager, cashier, salesperson, viewer
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Stores (Boutiques / Points de Vente)
export const stores = pgTable('stores', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  address: text('address'),
  city: text('city').default('Kinshasa'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Warehouses (Entrepôts centraux & régionaux)
export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  address: text('address'),
  city: text('city').default('Kinshasa'),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Exchange Rates (Taux de Change Journalier CDF/USD/XOF)
export const exchangeRates = pgTable('exchange_rates', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  baseCurrency: text('base_currency').notNull().default('USD'),
  targetCurrency: text('target_currency').notNull().default('CDF'),
  rate: doublePrecision('rate').notNull(), // Ex: 2850 CDF = 1 USD
  effectiveDate: text('effective_date').notNull(), // Format YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7. Categories
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Products
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  barcode: text('barcode'),
  description: text('description'),
  unit: text('unit').default('pcs').notNull(),
  purchasePriceUsd: doublePrecision('purchase_price_usd').default(0).notNull(),
  sellingPriceUsd: doublePrecision('selling_price_usd').notNull(),
  sellingPriceCdf: doublePrecision('selling_price_cdf').default(0).notNull(),
  minStockAlert: integer('min_stock_alert').default(5).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Stock Balances (Soldes en magasin ou entrepôt)
export const stockBalances = pgTable('stock_balances', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  locationType: text('location_type').notNull(), // 'store' | 'warehouse'
  locationId: text('location_id').notNull(),
  quantity: doublePrecision('quantity').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. Stock Movements (Entrées, sorties, transferts traçables)
export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  movementType: text('movement_type').notNull(), // 'in' | 'out' | 'transfer' | 'adjustment' | 'sale' | 'return'
  fromLocationId: text('from_location_id'),
  toLocationId: text('to_location_id'),
  quantity: doublePrecision('quantity').notNull(),
  unitCostUsd: doublePrecision('unit_cost_usd').default(0),
  reference: text('reference'),
  notes: text('notes'),
  performedBy: text('performed_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Customers
export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  outstandingDebtUsd: doublePrecision('outstanding_debt_usd').default(0).notNull(),
  outstandingDebtCdf: doublePrecision('outstanding_debt_cdf').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Sales (Caisse & Ventes POS)
export const sales = pgTable('sales', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  storeId: text('store_id').notNull().references(() => stores.id),
  customerId: text('customer_id').references(() => customers.id),
  invoiceNumber: text('invoice_number').notNull(),
  totalAmountUsd: doublePrecision('total_amount_usd').notNull(),
  totalAmountCdf: doublePrecision('total_amount_cdf').notNull(),
  exchangeRate: doublePrecision('exchange_rate').notNull(),
  paymentMethod: text('payment_method').notNull(), // 'cash_usd', 'cash_cdf', 'mobile_money_mpesa', 'mobile_money_airtel', 'mobile_money_orange', 'mixed', 'credit'
  amountPaidUsd: doublePrecision('amount_paid_usd').default(0).notNull(),
  amountPaidCdf: doublePrecision('amount_paid_cdf').default(0).notNull(),
  status: text('status').default('completed').notNull(), // 'completed', 'pending', 'cancelled'
  isOfflineCreated: boolean('is_offline_created').default(false).notNull(),
  createdOfflineAt: timestamp('created_offline_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Sale Items (Lignes de vente)
export const saleItems = pgTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),
  sku: text('sku'),
  quantity: doublePrecision('quantity').notNull(),
  unitPriceUsd: doublePrecision('unit_price_usd').notNull(),
  unitPriceCdf: doublePrecision('unit_price_cdf').notNull(),
  totalPriceUsd: doublePrecision('total_price_usd').notNull(),
  totalPriceCdf: doublePrecision('total_price_cdf').notNull(),
});

// 14. Sync Operations (Outbox & Historique serveur immuable avec idempotence)
export const syncOperations = pgTable('sync_operations', {
  id: text('id').primaryKey(), // UUID généré côté client
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  userId: text('user_id').notNull(),
  operationType: text('operation_type').notNull(), // 'create' | 'update' | 'delete'
  entityType: text('entity_type').notNull(), // 'product' | 'sale' | 'stock_movement' | 'customer' | 'exchange_rate'
  entityId: text('entity_id').notNull(),
  payload: text('payload').notNull(), // Données JSON
  idempotencyKey: text('idempotency_key').notNull().unique(),
  syncStatus: text('sync_status').default('synced').notNull(), // 'pending' | 'synced' | 'conflict' | 'failed'
  conflictDetails: text('conflict_details'),
  clientTimestamp: timestamp('client_timestamp').notNull(),
  serverTimestamp: timestamp('server_timestamp').defaultNow().notNull(),
});

// 15. Sync Conflicts (Journal des anomalies nécessitant arbitrage)
export const syncConflicts = pgTable('sync_conflicts', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  operationId: text('operation_id'),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  serverVersion: text('server_version'),
  clientVersion: text('client_version'),
  resolved: boolean('resolved').default(false).notNull(),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  memberships: many(memberships),
  stores: many(stores),
  warehouses: many(warehouses),
  products: many(products),
  sales: many(sales),
  customers: many(customers),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  balances: many(stockBalances),
  movements: many(stockMovements),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  company: one(companies, {
    fields: [sales.companyId],
    references: [companies.id],
  }),
  store: one(stores, {
    fields: [sales.storeId],
    references: [stores.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));
