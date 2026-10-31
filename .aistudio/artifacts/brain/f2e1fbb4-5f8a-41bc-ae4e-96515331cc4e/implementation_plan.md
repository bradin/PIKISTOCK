# PIKISTOCK — Plateforme SaaS Commerciale & Stocks Offline-First

Architecture et plan d'exécution pour la conception et le déploiement de **PIKISTOCK**, plateforme de gestion commerciale, de stocks, de points de vente (caisse POS), de finances et de synchronisation multi-établissements conçue pour le marché africain (RDC et international), avec prise en charge native hors connexion (Offline-First) et base de données relationnelle PostgreSQL Cloud SQL.

---

## Synthèse & Décisions Validées

> [!IMPORTANT]
> **Décisions issues de la phase de cadrage interactif :**
> - **Architecture Serveur & Persistance** : Backend Express TypeScript modulaire avec schéma relationnel PostgreSQL complet (via Drizzle ORM et Cloud SQL). Conforme aux exigences strictes de validation serveur, isolation multi-tenant, transactions d'inventaire et journal d'audit.
> - **Système Offline-First & Moteur de Synchronisation** :
>   1. Persistance locale sur le Web via **IndexedDB** (schéma miroir structuré).
>   2. File d'attente sortante locale (**Outbox**) persistante avec identifiants UUID générés côté client et clés d'idempotence (`idempotency_key`).
>   3. Détection dynamique des statuts réseau (`online` / `offline`), badge d'état non intrusif dans la barre supérieure, et déclencheur automatique de synchronisation bidirectionnelle au rétablissement d'Internet.
>   4. Détection et journalisation des conflits d'inventaire ou de prix sans écrasement silencieux.
> - **Système Multi-Devises** : Prise en charge multi-devises intégrale avec double affichage en temps réel (ex. Franc Congolais CDF et Dollar Américain USD), configuration des taux de change journaliers, arrondi monétaire strict et ventilation des règlements (Cash, Mobile Money M-Pesa/Airtel/Orange, Carte).
> - **Modèle d'Entreprise Initial (Phase 1)** : Configuration par défaut d'un **Commerce de gros et demi-gros** doté d'un entrepôt central de stockage et de boutiques de vente au détail rattachées.

---

## 1. Vue d'Ensemble & Proposition de Valeur

### Ce que fait PIKISTOCK
PIKISTOCK permet aux commerçants, grossistes, distributeurs et gérants de points de vente de continuer à enregistrer leurs opérations quotidiennes (ventes en caisse, mouvements de stock, réceptions, dépenses, règlements clients) **même en cas de coupure totale d'Internet ou d'électricité**. Dès le rétablissement de la connexion, le moteur de synchronisation résout les files d'attente, applique les règles métier côté serveur PostgreSQL, met à jour les stocks consolidés et renvoie l'état officiel à tous les terminaux autorisés.

### Cibles & Rôles
- **Dirigeants & Propriétaires (Owners / Admins)** : Visibilité temps réel sur le chiffre d'affaires, la valorisation des stocks, la marge brute, les créances et les mouvements inter-boutiques.
- **Responsables de Stock (Stock Managers)** : Réception des commandes fournisseurs, inventaires physiques, ajustements et transferts d'entrepôt.
- **Caissiers & Vendeurs (Cashiers / Sales)** : Interface de caisse ultra-rapide (tactile, lecteur code-barres, encaissements fractionnés CDF/USD et Mobile Money), utilisable 100% hors-ligne.

---

## 2. Expérience Utilisateur & Design Visuel

### Direction Esthétique & Thème
- **Direction Visuelle** : Interface SaaS haut de gamme professionnelle, utilitaire et dense, inspirée des meilleurs outils ERP modernes (Stripe, Linear, Shopify POS).
- **Palette de Couleurs** :
  - *Toile de fond neutre (60%)* : Ardoise profonde (`#0B1120` en mode sombre) et blanc feutré / gris perle (`#F8FAFC` en mode clair).
  - *Surfaces structurelles (30%)* : Panneaux avec bordures déliées 1px (`border-slate-200 dark:border-slate-800`), aucun empilement de cartes dans des cartes.
  - *Accents fonctionnels (10%)* : Bleu électrique cobalt (`#2563EB` / `#3B82F6`) pour les actions principales et la navigation, ambre (`#D97706`) pour les alertes de stock faible et vert forêt (`#16A34A`) pour les opérations synchronisées et le statut réseau.
- **Discipline Typographique** :
  - Titres et structure : *Plus Jakarta Sans* pour une lisibilité géométrique impeccable.
  - Chiffres et métriques financières : *Font mono avec tabular-nums* (`font-mono tabular-nums`) pour garantir l'alignement vertical strict des décimales en USD et CDF.
  - Règle Zéro-Pilule : Pas d'empilement de badges décoratifs colorés sur les métadonnées ; séparateurs typographiques épurés (`·`, `/`).
- **Contrat de Barre Supérieure** :
  - *Zone 1 (Marque & Contexte)* : Nom PIKISTOCK avec sélecteur d'établissement actif (Boutique / Entrepôt) et indicateur d'entreprise.
  - *Zone 2 (Indicateur Réseau & Sync)* : Statut clair et fonctionnel (`En ligne`, `Hors connexion`, `3 opérations en attente de synchronisation` avec bouton de forçage manuel).
  - *Zone 3 (Profil & Taux du Jour)* : Raccourci vers le convertisseur/taux CDF-USD du jour et menu utilisateur.

### Parcours Utilisateur Clés
1. **Prise en main & Tableau de bord consolidé** : Visualisation instantanée des KPI (CA du jour, valeur du stock, créances clients, alertes de rupture) avec mention explicite des données locales ou synchronisées.
2. **Caisse Enregistreuse POS (Online & Offline)** :
   - Sélection rapide de produits via recherche textuelle, catégories ou scan code-barres.
   - Panier avec ajustement des quantités et remises autorisées.
   - Choix du client (comptant ou compte client avec solde/dette).
   - Modal d'encaissement multi-devises (montant dû converti automatiquement selon le taux du jour en CDF ou USD, saisie de règlements mixtes : espèces CDF + mobile money USD).
   - Impression/génération de reçu numérique et inscription immédiate dans l'Outbox locale.
3. **Mouvements de Stock & Transferts** :
   - Saisie d'une entrée de marchandise ou d'un transfert Entrepôt Central $\rightarrow$ Boutique 1.
   - Historique traçable horodaté avec motif d'ajustement.
4. **Contrôle & Résolution de Synchronisation** :
   - Panneau dédié affichant l'état de la file d'attente sortante, les opérations confirmées par le serveur et les éventuels conflits d'inventaire signalés par le backend.

---

## 3. Décisions Architecturales & Compromis Techniques

| Décision | Approche Retenue | Justification & Bénéfice | Alternative Écartée |
| :--- | :--- | :--- | :--- |
| **Persistance Locale Web** | **IndexedDB** natif via wrapper typé structuré | Stockage persistant, transactions fiables, support de volumes importants sans la limite de 5MB de `localStorage`. | `localStorage` (trop limité, synchrone, bloque l'UI). |
| **Base de Données Centrale** | **PostgreSQL Cloud SQL** avec Drizzle ORM | Modèle relationnel strict, intégrité référentielle, contraintes d'unicité, types numériques précis (`numeric(15,2)`), support de transactions ACID pour l'inventaire. | Base NoSQL / Firebase Firestore seule (moins adaptée aux contraintes comptables strictes et inventaires complexes). |
| **Protocole de Synchronisation** | **Outbox Pattern + Clés d'Idempotence** | Chaque modification locale génère une opération immuable avec UUID client. Le serveur traite chaque opération de façon idempotente sans doublon même en cas de retry réseau. | Synchronisation directe d'états bruts (risque d'écrasement silencieux de données distantes). |
| **Gestion Multi-Tenant** | Isolation stricte par `company_id` contrôlée par le serveur | Chaque requête API valide l'appartenance de l'utilisateur à l'entreprise demandée via le token de session et les memberships. | Filtrage uniquement côté client (faille de sécurité critique). |
| **Devises & Monnaie** | Stockage en double devise de référence avec taux de transaction figé | Chaque vente et mouvement financier stocke la devise saisie, le taux de change au moment de l'opération et le montant en devise de consolidation. | Conversion dynamique a posteriori (fausse les bilans comptables passés). |

---

## 4. Architecture Système & Flux de Données

### Schéma Architectural (Système Distribué Offline-First)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT WEB (PWA / BROWSER)                      │
│                                                                        │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌───────────────────┐  │
│  │ UI React / Tailwind  │  │  State Manager  │  │ Network Listener  │  │
│  │  (POS, Stock, Dash)  │  │   & UI Hooks    │  │ (Online / Offline)│  │
│  └──────────┬───────────┘  └────────┬────────┘  └─────────┬─────────┘  │
│             │                       │                     │            │
│             ▼                       ▼                     │            │
│  ┌───────────────────────────────────────────┐            │            │
│  │         IndexedDB Local Storage           │            │            │
│  │  ┌──────────────────┐ ┌────────────────┐  │            │            │
│  │  │ Cached Entities  │ │ Outbox Queue   │  │            │            │
│  │  │ (Products, etc.) │ │ (Pending Sync) │  │            │            │
│  │  └──────────────────┘ └────────┬───────┘  │            │            │
│  └────────────────────────────────┼──────────┘            │            │
│                                   │                       │            │
│                                   ▼                       │            │
│                    ┌────────────────────────────┐         │            │
│                    │   Sync Engine (Client)     │◄────────┘            │
│                    │ - Batch operations         │                      │
│                    │ - Retry & Conflict detect  │                      │
│                    └──────────────┬─────────────┘                      │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ HTTPS REST / Bearer Token
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SERVEUR BACKEND (EXPRESS / NODE.JS)                  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares : Auth (JWT/Sessions), Multi-Tenant Guard, RateLimit │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │                                    │
│  ┌────────────────────────────────┴─────────────────────────────────┐  │
│  │ REST API Routers :                                               │  │
│  │  /api/auth       - Inscription, connexion, sélection entreprise │  │
│  │  /api/companies  - Établissements, boutiques, entrepôts, devises │  │
│  │  /api/products   - Catalogue, catégories, codes-barres, prix     │  │
│  │  /api/inventory  - Mouvements, balances, alertes de rupture      │  │
│  │  /api/sales      - Caisse POS, encaissements, factures/reçus     │  │
│  │  /api/sync       - Réception batch outbox, détection conflits,   │  │
│  │                    pull des deltas serveur depuis curseur        │  │
│  └────────────────────────────────┬─────────────────────────────────┘  │
│                                   │ Transactions Drizzle ORM           │
│                                   ▼                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                 POSTGRESQL CLOUD SQL DATABASE                    │  │
│  │  users, companies, stores, warehouses, products, stock_movements,│  │
│  │  sales, sale_items, sync_operations, sync_conflicts, audit_logs  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ Identiques endpoints REST / Sync
┌───────────────────────────────────┴────────────────────────────────────┐
│                    APPLICATION ANDROID (EXPANSION)                     │
│               React Native + SQLite Local + Sync Engine                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Plan de Réalisation Détaillé par Phases

### Phase 1 : Fondations, Modèle de Données & Moteur Multi-Tenant (Focus Immédiat)
1. **Activation de l'infrastructure Cloud SQL** :
   - Présentation de la carte d'activation Cloud SQL au développeur/utilisateur pour sélection du projet et de la région.
   - Configuration de la connexion PostgreSQL via `pg.Pool` et Drizzle ORM avec les variables d'environnement plateforme.
2. **Définition du Schéma de Base de Données Central** :
   - Tables multi-tenant : `users`, `companies`, `company_users` (rôles et permissions), `stores`, `warehouses`, `currencies`, `exchange_rates`.
   - Tables commerciales : `categories`, `products`, `stock_balances`, `stock_movements`, `sales`, `sale_items`, `customers`.
   - Tables de synchronisation : `sync_operations` (journal d'opérations immuable), `sync_conflicts` (traçabilité des désaccords).
3. **Moteur Backend Express** :
   - Mise en place du serveur `server.ts` sur le port 3000 avec routage API versionné (`/api/v1/*`).
   - Authentification sécurisée, gestion des sessions, sélecteur d'entreprise active et contrôle d'accès strict (RBAC).
   - Endpoints de synchronisation bidirectionnelle :
     - `POST /api/v1/sync/push` : Réception d'un batch d'opérations locales avec validation d'idempotence et application transactionnelle.
     - `GET /api/v1/sync/pull` : Récupération des deltas modifiés depuis le dernier curseur horodaté.
4. **Moteur Client Offline-First & IndexedDB** :
   - Module de base de données locale `PikiLocalDB` encapsulant IndexedDB.
   - File d'attente d'émissions (`Outbox`) persistante stockant chaque action avec `operation_id` (UUID), `entity_type`, `action`, `payload`, `timestamp`, `status`.
   - Surveillance de l'état réseau (`navigator.onLine`, événements `online`/`offline`) et déclencheur automatique de synchronisation en tâche de fond.
5. **Interface Utilisateur & Navigation Principale** :
   - Mise en page applicative responsive avec barre latérale ergonomique et barre supérieure 3 zones respectant le contrat de design.
   - Badge d'état réseau et centre de contrôle de la synchronisation (statut en ligne/hors ligne, nombre d'opérations en attente, historique des synchronisations).
   - Sélecteur d'entreprise et d'établissement (Entrepôt Central / Boutique principale).
   - Gestion du taux de change quotidien (Franc Congolais CDF $\leftrightarrow$ Dollar USD).
6. **Modules Opérationnels Fonctionnels** :
   - **Tableau de Bord** : Indicateurs clés (CA, stock, créances) avec bascule instantanée en mode simulation hors-connexion.
   - **Gestion des Produits & Stock** : Liste, recherche, création de produits, ajustement des stocks fonctionnant en ligne et hors ligne.
   - **Caisse Enregistreuse POS** : Interface d'encaissement rapide avec recherche d'articles, panier, devises mixtes, génération de reçu et enregistrement automatique dans l'Outbox en cas de coupure réseau.
7. **Jeux de Données de Démonstration (Seed)** :
   - Entreprise modèle configurée : *Maison Kivu Grossiste & Distribution* (Entrepôt central à Kinshasa/Goma, 2 boutiques de vente, catalogue de produits types, taux CDF/USD configuré).

---

## 6. Prochaines Étapes après Validation

Dès que vous confirmez ce plan, nous démarrons immédiatement l'exécution de la **Phase 1** :
1. Déclenchement de la configuration de l'infrastructure Cloud SQL PostgreSQL.
2. Écriture du schéma relationnel Drizzle et initialisation de la base de données.
3. Développement du serveur Express avec les routes API et le moteur de synchronisation.
4. Développement du moteur local IndexedDB et de l'interface utilisateur PIKISTOCK avec le mode hors-ligne complet et testable.
