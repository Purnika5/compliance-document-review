# Database Migration System

This directory contains database migration utilities and table schema definitions for the Compliance Document Review Platform.

## Execution Options

### 1. Standalone Migration Script
Run the standalone migration script using Node / ts-node:
```bash
node backend/src/configs/migrations/run_migrations.js
```

### 2. HTTP Endpoint
You can trigger or check migrations via the live API backend:
```http
GET /health/migrate
GET /api/migrate
```

### 3. Automated Boot & Test Fallback
Migrations are automatically verified on server startup. If PostgreSQL authentication is unavailable in local dev, `pool.ts` gracefully falls back to `pg-mem` in-memory database to maintain full developer productivity.
