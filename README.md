# Forever IT Institute Management System — Backend API

[![NestJS](https://img.shields.io/badge/NestJS-v12-E0234E?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Dynamic%20Driver-336791?logo=postgresql)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-Supported-FE0808?logo=typeorm)](https://typeorm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI%203.0-85EA2D?logo=swagger)](http://localhost:3001/api/docs)

Production-ready NestJS REST API for **Forever IT Institute** student registration, course management, multiple-course enrollment, fee calculations, payment receipts, audit logging, and administrative reporting.

---

## 1. Prerequisites

- **Node.js**: `v20.x`, `v22.x`, or `v24.x` (LTS recommended)
- **PostgreSQL**: PostgreSQL 14, 15, 16, or 17 (Supabase or cPanel PostgreSQL)
- **npm**: `v10.x` or higher

---

## 2. Dynamic PostgreSQL Connection Architecture

The API uses the official TypeORM PostgreSQL driver and dynamically selects between two deployment setups **via environment variables alone**:

```
                              ┌──────────────────────────────────────────────┐
                              │           Dynamic Database Resolver          │
                              │       (src/config/database.config.ts)        │
                              └──────────────────────┬───────────────────────┘
                                                     │
                         ┌───────────────────────────┴───────────────────────────┐
                         ▼                                                       ▼
            【Option A: Development】                              【Option B: Production】
             Supabase / Managed Cloud                               cPanel / Self-Hosted VPS
               (via DATABASE_URL)                                     (via DB_* individual fields)
```

### Precedence Rule
1. If `DATABASE_URL` is provided and non-empty, the API connects using this URL.
2. If `DATABASE_URL` is empty, the API connects using `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_DATABASE`.
3. If neither configuration is complete, the API fails immediately at startup with an actionable `DatabaseConfigurationError`. **No silent fallback to SQLite or memory occurs.**

### SSL Configuration (`DB_SSL`)
- `DB_SSL=auto` *(Default)*: Automatically activates SSL when connecting to Supabase (`*.supabase.co`), cloud poolers, or when `sslmode=require` is present in `DATABASE_URL`. Local/cPanel databases without SSL remain unencrypted.
- `DB_SSL=true`: Enforces TLS connection.
- `DB_SSL=false`: Disables TLS (recommended for localhost or internal cPanel unix socket/localhost connections).
- `DB_SSL_REJECT_UNAUTHORIZED`: Set to `true` (default) for strict certificate validation, or `false` when using self-signed development certificates or specific poolers.

---

## 3. Environment Setup

Copy one of the provided templates to `.env`:

### For Development (Supabase):
```bash
cp .env.development.example .env
```
Fill in your Supabase connection string:
```env
DATABASE_URL=postgresql://postgres.yourproject:yourpassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
DB_SSL=auto
DB_SSL_REJECT_UNAUTHORIZED=false
```

### For Production (cPanel / Hostinger / Dedicated PostgreSQL):
```bash
cp .env.production.example .env
```
Configure your cPanel database details:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=cpaneluser_fituser
DB_PASSWORD=YourStrongDatabasePassword123!
DB_DATABASE=cpaneluser_forever_it_db
DB_SSL=false
```

---

## 4. Installation & Database Initialization

```bash
# 1. Install dependencies
npm install

# 2. Run TypeORM Migrations
npm run migration:run

# 3. Seed Default Admin, Courses, and Demo Record
npm run seed
```

### Default Seeded Credentials:
- **Admin**: `admin@foreveritbd.com` / `Admin123456!`
- **Staff**: `staff@foreveritbd.com` / `Staff123456!`

> **Note**: Change passwords in production immediately upon first login. Never commit production passwords to Git.

### Default Seeded Courses:
1. `BOC-01` — Basic Office Course (4,000 BDT)
2. `BD-01` — Business Development (8,000 BDT)
3. `SEO-01` — Search Engine Optimization (SEO) (10,000 BDT)
4. `WD-01` — Website Development (15,000 BDT)
5. `SD-01` — Software Development (20,000 BDT)

---

## 5. Running the Application

```bash
# Development mode (hot reload)
npm run start:dev

# Production build
npm run build

# Production start
npm run start:prod
```

- **API Base**: `http://localhost:3001/api/v1`
- **Swagger Documentation**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/api/v1/health`

---

## 6. Testing & Quality Assurance

```bash
# Run unit & configuration tests
npm run test

# Run linter
npm run lint

# Run production build check
npm run build
```

---

## 7. cPanel Deployment Guide

1. Ensure your cPanel package provides **Node.js Selector / Application Manager** (CloudLinux or cPanel Node.js Application Manager). Ordinary PHP-only shared hosting cannot run persistent Node.js servers.
2. In cPanel > **PostgreSQL Databases**:
   - Create a database: `cpaneluser_forever_it_db`.
   - Create a user: `cpaneluser_fituser` with a strong password.
   - Associate the user with the database granting `ALL PRIVILEGES`.
3. In cPanel > **Setup Node.js App**:
   - Application root: `forever-it-institute-management-api`
   - Application startup file: `dist/main.js`
   - Node.js version: `20.x` or `22.x`
   - Application mode: `Production`
4. In cPanel Terminal or SSH:
   ```bash
   npm install --omit=dev
   npm run migration:run
   npm run seed
   ```
5. Restart the Node.js application in cPanel. Verify the health status at `https://your-domain.com/api/v1/health`.

---

## 8. Backup & Recovery

- **PostgreSQL Database Dump**:
  ```bash
  pg_dump -U cpaneluser_fituser -h localhost -d cpaneluser_forever_it_db -F c -b -v -f backup_$(date +%F).dump
  ```
- **Restore**:
  ```bash
  pg_restore -U cpaneluser_fituser -h localhost -d cpaneluser_forever_it_db -v backup_2026-10-11.dump
  ```
