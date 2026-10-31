import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './src/db/index.ts';
import {
  companies,
  stores,
  warehouses,
  products,
  categories,
  stockBalances,
  stockMovements,
  sales,
  saleItems,
  customers,
  exchangeRates,
  syncOperations,
  syncConflicts,
} from './src/db/schema.ts';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PIKISTOCK API Central', time: new Date().toISOString() });
});

// Seed trigger
app.post('/api/seed', async (req, res) => {
  try {
    await seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Base de données initialisée avec succès' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de l’initialisation' });
  }
});

// 1. Auth & Current Tenant Context
app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const userCompanies = await db.select().from(companies);
    
    // Pick first company or default
    const activeCompany = userCompanies[0] || null;
    let activeStores: any[] = [];
    let activeWarehouses: any[] = [];
    let currentRate: any = null;

    if (activeCompany) {
      activeStores = await db.select().from(stores).where(eq(stores.companyId, activeCompany.id));
      activeWarehouses = await db.select().from(warehouses).where(eq(warehouses.companyId, activeCompany.id));
      
      const rates = await db
        .select()
        .from(exchangeRates)
        .where(eq(exchangeRates.companyId, activeCompany.id))
        .orderBy(desc(exchangeRates.createdAt))
        .limit(1);
      currentRate = rates[0] || null;
    }

    res.json({
      user,
      companies: userCompanies,
      activeCompany,
      stores: activeStores,
      warehouses: activeWarehouses,
      currentExchangeRate: currentRate || { rate: 2850.0, baseCurrency: 'USD', targetCurrency: 'CDF' },
    });
  } catch (error: any) {
    console.error('Error fetching auth context:', error);
    res.status(500).json({ error: error.message || 'Erreur chargement profil' });
  }
});

// 2. Exchange Rates
app.get('/api/exchange-rates', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = (req.query.companyId as string) || 'comp-kivu-distribution';
    const rates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.companyId, companyId))
      .orderBy(desc(exchangeRates.createdAt))
      .limit(10);
    res.json(rates);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur récupération taux' });
  }
});

app.post('/api/exchange-rates', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { companyId, baseCurrency, targetCurrency, rate, effectiveDate } = req.body;
    const newRate = await db
      .insert(exchangeRates)
      .values({
        id: `rate-${Date.now()}`,
        companyId: companyId || 'comp-kivu-distribution',
        baseCurrency: baseCurrency || 'USD',
        targetCurrency: targetCurrency || 'CDF',
        rate: Number(rate),
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      })
      .returning();

    // Also update products with updated sellingPriceCdf
    const allProducts = await db.select().from(products).where(eq(products.companyId, companyId || 'comp-kivu-distribution'));
    for (const prod of allProducts) {
      await db
        .update(products)
        .set({
          sellingPriceCdf: Math.round(prod.sellingPriceUsd * Number(rate)),
          updatedAt: new Date(),
        })
        .where(eq(products.id, prod.id));
    }

    res.json(newRate[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur mise à jour taux' });
  }
});

// 3. Products & Inventory
app.get('/api/products', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = (req.query.companyId as string) || 'comp-kivu-distribution';
    const locationId = req.query.locationId as string;

    const allProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId))
      .orderBy(products.name);

    const allBalances = await db
      .select()
      .from(stockBalances)
      .where(eq(stockBalances.companyId, companyId));

    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.companyId, companyId));

    // Consolidate stock balances onto products
    const enriched = allProducts.map((p) => {
      const balancesForProd = allBalances.filter((b) => b.productId === p.id);
      const totalQuantity = balancesForProd.reduce((sum, b) => sum + (b.quantity || 0), 0);
      const locationSpecificBalance = locationId
        ? balancesForProd.find((b) => b.locationId === locationId)?.quantity || 0
        : totalQuantity;

      const cat = allCategories.find((c) => c.id === p.categoryId);

      return {
        ...p,
        categoryName: cat?.name || 'Général',
        totalStock: totalQuantity,
        currentLocationStock: locationSpecificBalance,
      };
    });

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur chargement produits' });
  }
});

app.post('/api/products', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const newProduct = await db
      .insert(products)
      .values({
        id: data.id || `prod-${Date.now()}`,
        companyId: data.companyId || 'comp-kivu-distribution',
        categoryId: data.categoryId || null,
        name: data.name,
        sku: data.sku,
        barcode: data.barcode || null,
        description: data.description || null,
        unit: data.unit || 'pcs',
        purchasePriceUsd: Number(data.purchasePriceUsd || 0),
        sellingPriceUsd: Number(data.sellingPriceUsd || 0),
        sellingPriceCdf: Number(data.sellingPriceCdf || 0),
        minStockAlert: Number(data.minStockAlert || 5),
        isActive: true,
      })
      .returning();

    // Initialize stock balance if initial quantity provided
    if (data.initialStock && data.initialLocationId) {
      await db.insert(stockBalances).values({
        id: `bal-${Date.now()}`,
        companyId: data.companyId || 'comp-kivu-distribution',
        productId: newProduct[0].id,
        locationType: data.initialLocationType || 'warehouse',
        locationId: data.initialLocationId,
        quantity: Number(data.initialStock),
      });

      await db.insert(stockMovements).values({
        id: `smov-${Date.now()}`,
        companyId: data.companyId || 'comp-kivu-distribution',
        productId: newProduct[0].id,
        movementType: 'in',
        toLocationId: data.initialLocationId,
        quantity: Number(data.initialStock),
        unitCostUsd: Number(data.purchasePriceUsd || 0),
        reference: 'STOCK-INITIAL',
        notes: 'Stock initial à la création du produit',
        performedBy: req.user?.displayName || 'Admin',
      });
    }

    res.status(201).json(newProduct[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur création produit' });
  }
});

// 4. Stock Balances & Movements
app.get('/api/stocks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = (req.query.companyId as string) || 'comp-kivu-distribution';
    const balances = await db.select().from(stockBalances).where(eq(stockBalances.companyId, companyId));
    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.companyId, companyId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(50);

    res.json({ balances, movements });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur stock' });
  }
});

app.post('/api/stocks/movements', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { companyId, productId, movementType, fromLocationId, toLocationId, quantity, notes, reference } = req.body;
    const qty = Number(quantity);

    // Record movement
    const movement = await db
      .insert(stockMovements)
      .values({
        id: `smov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        companyId: companyId || 'comp-kivu-distribution',
        productId,
        movementType,
        fromLocationId,
        toLocationId,
        quantity: qty,
        reference: reference || `MVT-${Date.now().toString().slice(-6)}`,
        notes,
        performedBy: req.user?.displayName || 'Directeur Général',
      })
      .returning();

    // Adjust balances accordingly
    if (movementType === 'in' && toLocationId) {
      const existing = await db
        .select()
        .from(stockBalances)
        .where(and(eq(stockBalances.productId, productId), eq(stockBalances.locationId, toLocationId)));

      if (existing.length > 0) {
        await db
          .update(stockBalances)
          .set({ quantity: existing[0].quantity + qty, updatedAt: new Date() })
          .where(eq(stockBalances.id, existing[0].id));
      } else {
        await db.insert(stockBalances).values({
          id: `bal-${Date.now()}`,
          companyId: companyId || 'comp-kivu-distribution',
          productId,
          locationType: 'store',
          locationId: toLocationId,
          quantity: qty,
        });
      }
    } else if (movementType === 'transfer' && fromLocationId && toLocationId) {
      // Decrement from source
      const src = await db
        .select()
        .from(stockBalances)
        .where(and(eq(stockBalances.productId, productId), eq(stockBalances.locationId, fromLocationId)));
      if (src.length > 0) {
        await db
          .update(stockBalances)
          .set({ quantity: Math.max(0, src[0].quantity - qty), updatedAt: new Date() })
          .where(eq(stockBalances.id, src[0].id));
      }
      // Increment destination
      const dest = await db
        .select()
        .from(stockBalances)
        .where(and(eq(stockBalances.productId, productId), eq(stockBalances.locationId, toLocationId)));
      if (dest.length > 0) {
        await db
          .update(stockBalances)
          .set({ quantity: dest[0].quantity + qty, updatedAt: new Date() })
          .where(eq(stockBalances.id, dest[0].id));
      } else {
        await db.insert(stockBalances).values({
          id: `bal-${Date.now()}`,
          companyId: companyId || 'comp-kivu-distribution',
          productId,
          locationType: 'store',
          locationId: toLocationId,
          quantity: qty,
        });
      }
    }

    res.status(201).json(movement[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur enregistrement mouvement' });
  }
});

// 5. Sales & Invoicing (POS)
app.get('/api/sales', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = (req.query.companyId as string) || 'comp-kivu-distribution';
    const allSales = await db
      .select()
      .from(sales)
      .where(eq(sales.companyId, companyId))
      .orderBy(desc(sales.createdAt))
      .limit(50);

    const allItems = await db.select().from(saleItems);

    const enriched = allSales.map((s) => ({
      ...s,
      items: allItems.filter((i) => i.saleId === s.id),
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur chargement ventes' });
  }
});

app.post('/api/sales', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      id,
      companyId,
      storeId,
      customerId,
      invoiceNumber,
      totalAmountUsd,
      totalAmountCdf,
      exchangeRate,
      paymentMethod,
      amountPaidUsd,
      amountPaidCdf,
      items,
      isOfflineCreated,
      createdOfflineAt,
    } = req.body;

    const saleId = id || `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const compId = companyId || 'comp-kivu-distribution';
    const store = storeId || 'store-kin-marche';

    // 1. Create Sale
    const newSale = await db
      .insert(sales)
      .values({
        id: saleId,
        companyId: compId,
        storeId: store,
        customerId: customerId || null,
        invoiceNumber: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        totalAmountUsd: Number(totalAmountUsd),
        totalAmountCdf: Number(totalAmountCdf),
        exchangeRate: Number(exchangeRate || 2850),
        paymentMethod: paymentMethod || 'cash_usd',
        amountPaidUsd: Number(amountPaidUsd || totalAmountUsd),
        amountPaidCdf: Number(amountPaidCdf || 0),
        status: 'completed',
        isOfflineCreated: !!isOfflineCreated,
        createdOfflineAt: createdOfflineAt ? new Date(createdOfflineAt) : null,
      })
      .returning();

    // 2. Insert items and decrement stock
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await db.insert(saleItems).values({
          id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          saleId,
          productId: item.productId,
          productName: item.productName || item.name,
          sku: item.sku || null,
          quantity: Number(item.quantity),
          unitPriceUsd: Number(item.unitPriceUsd),
          unitPriceCdf: Number(item.unitPriceCdf),
          totalPriceUsd: Number(item.totalPriceUsd),
          totalPriceCdf: Number(item.totalPriceCdf),
        });

        // Decrement store stock balance
        const balance = await db
          .select()
          .from(stockBalances)
          .where(and(eq(stockBalances.productId, item.productId), eq(stockBalances.locationId, store)));

        if (balance.length > 0) {
          const newQty = Math.max(0, balance[0].quantity - Number(item.quantity));
          await db
            .update(stockBalances)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(stockBalances.id, balance[0].id));
        }

        // Log stock movement for sale
        await db.insert(stockMovements).values({
          id: `smov-sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          companyId: compId,
          productId: item.productId,
          movementType: 'sale',
          fromLocationId: store,
          quantity: Number(item.quantity),
          reference: invoiceNumber || saleId,
          notes: `Vente en caisse ${isOfflineCreated ? '(Enregistrée Hors-Ligne)' : ''}`,
          performedBy: req.user?.displayName || 'Caissier',
        });
      }
    }

    res.status(201).json(newSale[0]);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: error.message || 'Erreur enregistrement vente' });
  }
});

// 6. Customers
app.get('/api/customers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = (req.query.companyId as string) || 'comp-kivu-distribution';
    const list = await db.select().from(customers).where(eq(customers.companyId, companyId));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur clients' });
  }
});

app.post('/api/customers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone, email, address, companyId } = req.body;
    const newCust = await db
      .insert(customers)
      .values({
        id: `cust-${Date.now()}`,
        companyId: companyId || 'comp-kivu-distribution',
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        outstandingDebtUsd: 0,
        outstandingDebtCdf: 0,
      })
      .returning();
    res.status(201).json(newCust[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur création client' });
  }
});

// 7. Central Sync Engine : POST /api/sync/push
// Processes outbox operations from client with strict idempotency and transaction handling
app.post('/api/sync/push', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { operations } = req.body;
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.json({ processed: 0, results: [] });
    }

    const results: any[] = [];

    for (const op of operations) {
      const {
        id,
        companyId,
        deviceId,
        userId,
        operationType,
        entityType,
        entityId,
        payload,
        idempotencyKey,
        clientTimestamp,
      } = op;

      // 1. Idempotency Check: Have we already processed this operation?
      const existing = await db
        .select()
        .from(syncOperations)
        .where(eq(syncOperations.idempotencyKey, idempotencyKey));

      if (existing.length > 0) {
        // Already processed, return success without duplicate execution
        results.push({
          operationId: id,
          status: 'synced',
          alreadyProcessed: true,
          message: 'Opération déjà synchronisée (idempotente)',
        });
        continue;
      }

      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

      try {
        // 2. Dispatch to entity logic based on entityType
        if (entityType === 'sale') {
          // Process sale insertion
          const saleId = entityId || parsedPayload.id || `sale-${Date.now()}`;
          const existingSale = await db.select().from(sales).where(eq(sales.id, saleId));

          if (existingSale.length === 0) {
            await db.insert(sales).values({
              id: saleId,
              companyId: companyId || 'comp-kivu-distribution',
              storeId: parsedPayload.storeId || 'store-kin-marche',
              customerId: parsedPayload.customerId || null,
              invoiceNumber: parsedPayload.invoiceNumber,
              totalAmountUsd: Number(parsedPayload.totalAmountUsd),
              totalAmountCdf: Number(parsedPayload.totalAmountCdf),
              exchangeRate: Number(parsedPayload.exchangeRate),
              paymentMethod: parsedPayload.paymentMethod,
              amountPaidUsd: Number(parsedPayload.amountPaidUsd || 0),
              amountPaidCdf: Number(parsedPayload.amountPaidCdf || 0),
              status: 'completed',
              isOfflineCreated: true,
              createdOfflineAt: new Date(clientTimestamp),
            });

            if (parsedPayload.items && Array.isArray(parsedPayload.items)) {
              for (const it of parsedPayload.items) {
                await db.insert(saleItems).values({
                  id: `sitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  saleId,
                  productId: it.productId,
                  productName: it.productName || it.name,
                  sku: it.sku || null,
                  quantity: Number(it.quantity),
                  unitPriceUsd: Number(it.unitPriceUsd),
                  unitPriceCdf: Number(it.unitPriceCdf),
                  totalPriceUsd: Number(it.totalPriceUsd),
                  totalPriceCdf: Number(it.totalPriceCdf),
                });

                // Decrement stock balance safely
                const bal = await db
                  .select()
                  .from(stockBalances)
                  .where(
                    and(
                      eq(stockBalances.productId, it.productId),
                      eq(stockBalances.locationId, parsedPayload.storeId || 'store-kin-marche')
                    )
                  );
                if (bal.length > 0) {
                  const newQ = Math.max(0, bal[0].quantity - Number(it.quantity));
                  await db
                    .update(stockBalances)
                    .set({ quantity: newQ, updatedAt: new Date() })
                    .where(eq(stockBalances.id, bal[0].id));
                }
              }
            }
          }
        } else if (entityType === 'product') {
          if (operationType === 'create') {
            await db
              .insert(products)
              .values({
                id: entityId,
                companyId: companyId || 'comp-kivu-distribution',
                categoryId: parsedPayload.categoryId || null,
                name: parsedPayload.name,
                sku: parsedPayload.sku,
                barcode: parsedPayload.barcode || null,
                description: parsedPayload.description || null,
                unit: parsedPayload.unit || 'pcs',
                purchasePriceUsd: Number(parsedPayload.purchasePriceUsd || 0),
                sellingPriceUsd: Number(parsedPayload.sellingPriceUsd || 0),
                sellingPriceCdf: Number(parsedPayload.sellingPriceCdf || 0),
                minStockAlert: Number(parsedPayload.minStockAlert || 5),
                isActive: true,
              })
              .onConflictDoNothing();
          } else if (operationType === 'update') {
            await db
              .update(products)
              .set({
                name: parsedPayload.name,
                sellingPriceUsd: Number(parsedPayload.sellingPriceUsd),
                sellingPriceCdf: Number(parsedPayload.sellingPriceCdf),
                updatedAt: new Date(),
              })
              .where(eq(products.id, entityId));
          }
        } else if (entityType === 'stock_movement') {
          await db.insert(stockMovements).values({
            id: entityId || `smov-${Date.now()}`,
            companyId: companyId || 'comp-kivu-distribution',
            productId: parsedPayload.productId,
            movementType: parsedPayload.movementType,
            fromLocationId: parsedPayload.fromLocationId || null,
            toLocationId: parsedPayload.toLocationId || null,
            quantity: Number(parsedPayload.quantity),
            reference: parsedPayload.reference || 'SYNC-OUTBOX',
            notes: parsedPayload.notes || 'Opération hors-ligne synchronisée',
            performedBy: req.user?.displayName || 'Agent Hors-Ligne',
          });
        }

        // 3. Mark operation as permanently recorded in sync_operations log
        await db.insert(syncOperations).values({
          id,
          companyId: companyId || 'comp-kivu-distribution',
          deviceId: deviceId || 'web-client',
          userId: userId || req.user?.uid || 'anonymous',
          operationType,
          entityType,
          entityId,
          payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
          idempotencyKey,
          syncStatus: 'synced',
          clientTimestamp: new Date(clientTimestamp),
        });

        results.push({
          operationId: id,
          status: 'synced',
          message: 'Synchronisé avec succès',
        });
      } catch (opErr: any) {
        console.error('Error applying outbox operation:', opErr);
        // Log conflict if applicable
        await db.insert(syncConflicts).values({
          id: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          companyId: companyId || 'comp-kivu-distribution',
          operationId: id,
          entityType,
          entityId,
          serverVersion: JSON.stringify({ error: opErr.message }),
          clientVersion: typeof payload === 'string' ? payload : JSON.stringify(payload),
          resolutionNotes: 'Erreur lors de l’application sur le serveur',
        });

        results.push({
          operationId: id,
          status: 'conflict',
          message: opErr.message || 'Conflit de synchronisation',
        });
      }
    }

    res.json({ processed: results.length, results });
  } catch (error: any) {
    console.error('Sync push failure:', error);
    res.status(500).json({ error: error.message || 'Échec de synchronisation' });
  }
});

// 8. Pull server updates since cursor timestamp
app.get('/api/sync/pull', requireAuth, async (req: AuthRequest, res) => {
  try {
    const companyId = (req.query.companyId as string) || 'comp-kivu-distribution';
    const since = req.query.since ? new Date(req.query.since as string) : new Date(0);

    const updatedProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.companyId, companyId), gte(products.updatedAt, since)));

    const currentRates = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.companyId, companyId))
      .orderBy(desc(exchangeRates.createdAt))
      .limit(1);

    const recentBalances = await db
      .select()
      .from(stockBalances)
      .where(eq(stockBalances.companyId, companyId));

    res.json({
      serverTime: new Date().toISOString(),
      products: updatedProducts,
      exchangeRate: currentRates[0] || null,
      stockBalances: recentBalances,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur pull synchronisation' });
  }
});

// Auto seed on boot
seedDatabaseIfEmpty().catch((err) => console.error('Auto seed error:', err));

// Start server with Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 PIKISTOCK Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
