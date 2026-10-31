import { db } from './index.ts';
import {
  users,
  companies,
  memberships,
  stores,
  warehouses,
  exchangeRates,
  categories,
  products,
  stockBalances,
  stockMovements,
  customers,
} from './schema.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabaseIfEmpty() {
  try {
    // Check if companies exist
    const existingCompanies = await db.select().from(companies).limit(1);
    if (existingCompanies.length > 0) {
      console.log('Database already seeded. Skipping initial seeding.');
      return;
    }

    console.log('🌱 Seeding initial PIKISTOCK enterprise data into PostgreSQL...');

    const adminUid = 'pikistock-admin-uid-001';
    const companyId = 'comp-kivu-distribution';
    const today = new Date().toISOString().split('T')[0];

    // 1. Create Default User
    await db.insert(users).values({
      id: 'usr-admin-001',
      uid: adminUid,
      email: 'admin@pikistock.cd',
      displayName: 'Directeur Général (Maison Kivu)',
      role: 'owner',
    }).onConflictDoNothing();

    // 2. Create Company
    await db.insert(companies).values({
      id: companyId,
      name: 'Maison Kivu Grossiste & Distribution',
      slug: 'maison-kivu',
      legalName: 'Maison Kivu Import-Export SARL',
      taxNumber: 'CD/KNG/RCCM/24-B-08712',
      country: 'CD',
      defaultCurrency: 'USD',
      secondaryCurrency: 'CDF',
    });

    // 3. Create Membership
    await db.insert(memberships).values({
      id: 'memb-001',
      userId: adminUid,
      companyId: companyId,
      role: 'owner',
      isActive: true,
    });

    // 4. Create Stores & Warehouse
    const store1Id = 'store-kin-marche';
    const store2Id = 'store-kin-victoire';
    const warehouseId = 'wh-central-limete';

    await db.insert(stores).values([
      {
        id: store1Id,
        companyId,
        name: 'Boutique Marché Central',
        code: 'KIN-M01',
        address: 'Avenue du Commerce, Croisement Kasavubu',
        city: 'Kinshasa',
        phone: '+243 81 234 5678',
        isActive: true,
      },
      {
        id: store2Id,
        companyId,
        name: 'Boutique Victoire / Kasa-Vubu',
        code: 'KIN-V02',
        address: 'Rond-point Victoire, Imm. Cristal',
        city: 'Kinshasa',
        phone: '+243 82 987 6543',
        isActive: true,
      },
    ]);

    await db.insert(warehouses).values([
      {
        id: warehouseId,
        companyId,
        name: 'Entrepôt Central Limete Industriel',
        code: 'WH-LIM-01',
        address: '14e Rue Limete Poids Lourds',
        city: 'Kinshasa',
        phone: '+243 89 111 2233',
        isActive: true,
      },
    ]);

    // 5. Daily Exchange Rate (CDF / USD)
    await db.insert(exchangeRates).values({
      id: 'rate-today-001',
      companyId,
      baseCurrency: 'USD',
      targetCurrency: 'CDF',
      rate: 2850.0,
      effectiveDate: today,
    });

    // 6. Categories
    const categoriesData = [
      { id: 'cat-alim', companyId, name: 'Alimentation & Céréales', description: 'Riz, farine, semoule en gros' },
      { id: 'cat-huiles', companyId, name: 'Huiles & Condiments', description: 'Huiles végétales et sucre' },
      { id: 'cat-boissons', companyId, name: 'Boissons & Eaux', description: 'Packs et cartons de boissons' },
      { id: 'cat-hygiene', companyId, name: 'Hygiène & Entretien', description: 'Savons, détergents' },
    ];
    await db.insert(categories).values(categoriesData);

    // 7. Products
    const productsData = [
      {
        id: 'prod-riz-simba-25',
        companyId,
        categoryId: 'cat-alim',
        name: 'Sac de Riz Super Simba 25kg',
        sku: 'RIZ-SIMBA-25',
        barcode: '6901234567891',
        description: 'Riz blanc supérieur parfumé 25kg',
        unit: 'sac',
        purchasePriceUsd: 19.5,
        sellingPriceUsd: 24.0,
        sellingPriceCdf: 68400.0,
        minStockAlert: 15,
      },
      {
        id: 'prod-huile-manji-20',
        companyId,
        categoryId: 'cat-huiles',
        name: 'Huile Végétale Manji Bidon 20L',
        sku: 'HUILE-MANJI-20L',
        barcode: '6901234567892',
        description: 'Huile végétale raffinée de table 20L',
        unit: 'bidon',
        purchasePriceUsd: 22.0,
        sellingPriceUsd: 27.5,
        sellingPriceCdf: 78375.0,
        minStockAlert: 10,
      },
      {
        id: 'prod-sucre-kwilu-50',
        companyId,
        categoryId: 'cat-huiles',
        name: 'Sac Sucre de Canne Kwilu 50kg',
        sku: 'SUCRE-KWILU-50',
        barcode: '6901234567893',
        description: 'Sucre blanc cristallisé pur canne 50kg',
        unit: 'sac',
        purchasePriceUsd: 38.0,
        sellingPriceUsd: 45.0,
        sellingPriceCdf: 128250.0,
        minStockAlert: 8,
      },
      {
        id: 'prod-farine-azam-25',
        companyId,
        categoryId: 'cat-alim',
        name: 'Farine de Froment Azam 25kg',
        sku: 'FARINE-AZAM-25',
        barcode: '6901234567894',
        description: 'Farine de blé supérieure pour boulangerie',
        unit: 'sac',
        purchasePriceUsd: 18.0,
        sellingPriceUsd: 22.5,
        sellingPriceCdf: 64125.0,
        minStockAlert: 12,
      },
      {
        id: 'prod-lait-nido-carton',
        companyId,
        categoryId: 'cat-alim',
        name: 'Carton Lait en Poudre Nido (6 x 2.5kg)',
        sku: 'LAIT-NIDO-CARTON',
        barcode: '6901234567895',
        description: 'Lait entier enrichi en poudre',
        unit: 'carton',
        purchasePriceUsd: 46.0,
        sellingPriceUsd: 55.0,
        sellingPriceCdf: 156750.0,
        minStockAlert: 6,
      },
      {
        id: 'prod-savon-coq-40',
        companyId,
        categoryId: 'cat-hygiene',
        name: 'Carton Savon Le Coq (40 pcs x 200g)',
        sku: 'SAVON-COQ-40',
        barcode: '6901234567896',
        description: 'Savon de ménage traditionnel',
        unit: 'carton',
        purchasePriceUsd: 9.0,
        sellingPriceUsd: 12.0,
        sellingPriceCdf: 34200.0,
        minStockAlert: 20,
      },
      {
        id: 'prod-eau-vive-pack',
        companyId,
        categoryId: 'cat-boissons',
        name: 'Fardeau Eau Vive Minérale (6 x 1.5L)',
        sku: 'EAU-VIVE-PACK',
        barcode: '6901234567897',
        description: 'Eau minérale naturelle plate',
        unit: 'fardeau',
        purchasePriceUsd: 3.2,
        sellingPriceUsd: 4.5,
        sellingPriceCdf: 12825.0,
        minStockAlert: 25,
      },
    ];
    await db.insert(products).values(productsData);

    // 8. Stock Balances (Warehouse & Store)
    const balances = [
      // In Central Warehouse
      { id: 'bal-wh-riz', companyId, productId: 'prod-riz-simba-25', locationType: 'warehouse', locationId: warehouseId, quantity: 240 },
      { id: 'bal-wh-huile', companyId, productId: 'prod-huile-manji-20', locationType: 'warehouse', locationId: warehouseId, quantity: 150 },
      { id: 'bal-wh-sucre', companyId, productId: 'prod-sucre-kwilu-50', locationType: 'warehouse', locationId: warehouseId, quantity: 80 },
      { id: 'bal-wh-farine', companyId, productId: 'prod-farine-azam-25', locationType: 'warehouse', locationId: warehouseId, quantity: 120 },
      { id: 'bal-wh-lait', companyId, productId: 'prod-lait-nido-carton', locationType: 'warehouse', locationId: warehouseId, quantity: 45 },
      { id: 'bal-wh-savon', companyId, productId: 'prod-savon-coq-40', locationType: 'warehouse', locationId: warehouseId, quantity: 300 },
      { id: 'bal-wh-eau', companyId, productId: 'prod-eau-vive-pack', locationType: 'warehouse', locationId: warehouseId, quantity: 180 },

      // In Store 1 (Marché Central)
      { id: 'bal-s1-riz', companyId, productId: 'prod-riz-simba-25', locationType: 'store', locationId: store1Id, quantity: 35 },
      { id: 'bal-s1-huile', companyId, productId: 'prod-huile-manji-20', locationType: 'store', locationId: store1Id, quantity: 20 },
      { id: 'bal-s1-sucre', companyId, productId: 'prod-sucre-kwilu-50', locationType: 'store', locationId: store1Id, quantity: 12 },
      { id: 'bal-s1-farine', companyId, productId: 'prod-farine-azam-25', locationType: 'store', locationId: store1Id, quantity: 18 },
      { id: 'bal-s1-lait', companyId, productId: 'prod-lait-nido-carton', locationType: 'store', locationId: store1Id, quantity: 8 },
      { id: 'bal-s1-savon', companyId, productId: 'prod-savon-coq-40', locationType: 'store', locationId: store1Id, quantity: 40 },
      { id: 'bal-s1-eau', companyId, productId: 'prod-eau-vive-pack', locationType: 'store', locationId: store1Id, quantity: 28 },
    ];
    await db.insert(stockBalances).values(balances);

    // Initial stock receipt movement
    await db.insert(stockMovements).values({
      id: 'smov-init-001',
      companyId,
      productId: 'prod-riz-simba-25',
      movementType: 'in',
      toLocationId: warehouseId,
      quantity: 275,
      unitCostUsd: 19.5,
      reference: 'REC-INIT-2026',
      notes: 'Réception stock initial conteneur Matadi',
      performedBy: 'Directeur Général',
    });

    // 9. Customers
    const customersData = [
      {
        id: 'cust-boma-001',
        companyId,
        name: 'Éts Boma & Frères (Grossiste Marché)',
        phone: '+243 81 555 7788',
        email: 'boma.distribution@gmail.com',
        address: 'Pavillon 4, Marché Central Kinshasa',
        outstandingDebtUsd: 240.0,
        outstandingDebtCdf: 684000.0,
      },
      {
        id: 'cust-grace-002',
        companyId,
        name: 'Alimentation La Grâce (Demi-Gros)',
        phone: '+243 82 444 3322',
        email: 'lagrace.alim@yahoo.fr',
        address: 'Av. Gambela, Commune de Kasa-Vubu',
        outstandingDebtUsd: 0,
        outstandingDebtCdf: 0,
      },
      {
        id: 'cust-direct-003',
        companyId,
        name: 'Client Comptoir Particulier',
        phone: '',
        email: '',
        address: 'Comptoir Caisse',
        outstandingDebtUsd: 0,
        outstandingDebtCdf: 0,
      },
    ];
    await db.insert(customers).values(customersData);

    console.log('✅ Initial enterprise data successfully seeded into Cloud SQL PostgreSQL!');
  } catch (error) {
    console.error('Error during database seeding:', error);
  }
}
