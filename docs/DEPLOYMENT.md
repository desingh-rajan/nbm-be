# Deployment Guide

## Production Environment

- **Server**: Vultr VPS (139.84.158.2)
- **Domain**: <https://neverbeforemarketing.com>
- **Tool**: Kamal 2.7.0
- **API Base**: /nbm-be/api

## Quick Deploy

```bash
# Deploy
kamal deploy

# Run migrations
kamal app exec "deno task migrate:run"

# Seed database
kamal app exec "deno task db:seed:site"

# Check logs
kamal app logs --since 10m
```

## How It Works

**Simplified Architecture:**

```text
Public URL:  https://neverbeforemarketing.com/nbm-be/api/site-settings
               ↓
Proxy:       Strips /nbm-be/api prefix (default behavior)
               ↓
App Route:   GET /site-settings
```

**Key Points:**

- App routes: `/site-settings`, `/articles`, `/auth/*` (no prefix in code!)
- Public URLs: `https://neverbeforemarketing.com/nbm-be/api/*`
- Proxy strips `/nbm-be/api` automatically (Kamal default)
- Zero manual configuration needed ✨

## Common Commands

```bash
# Check container status
ssh root@139.84.158.2 "docker ps | grep nbm-be"

# Test API
curl https://neverbeforemarketing.com/nbm-be/api/health
curl https://neverbeforemarketing.com/nbm-be/api/site-settings

# Verify database
ssh root@139.84.158.2 "docker exec nbm-be-postgres psql -U nbm_user -d nbm_be_production -c '\dt'"
```

## Architecture Overview

### Simplified Path-Based Routing

The deployment uses a **clean, simple architecture** that works with Kamal's default proxy behavior:

**How it works:**

1. **Client requests**: `https://neverbeforemarketing.com/nbm-be/api/site-settings`
2. **kamal-proxy receives**: `/nbm-be/api/site-settings`
3. **kamal-proxy matches** path prefix: `/nbm-be/api` → route to nbm-be-web
4. **kamal-proxy strips prefix** (default behavior): `/site-settings`
5. **App receives**: `/site-settings` ✅
6. **App routes match**: `GET /site-settings` registered in code ✅

**Key Simplification:**

- **App routes**: Registered at `/site-settings`, `/articles`, `/auth/*` (no prefix!)
- **Public URLs**: `https://neverbeforemarketing.com/nbm-be/api/site-settings`
- **Proxy behavior**: Strips `/nbm-be/api` prefix automatically (default)
- **Result**: Clean routing with **zero manual configuration** needed!

### Why This is Better

**Before (Complex):**

- ❌ App routes included `/nbm-be/api` prefix in code
- ❌ Had to disable proxy's default stripping behavior
- ❌ Required manual proxy registration with `--strip-path-prefix=false`
- ❌ Complex post-deploy hooks to automate registration
- ❌ Configuration hell for each deployment

**After (Simple):**

- ✅ App routes are clean: `/site-settings`, `/articles`
- ✅ Uses proxy's default stripping behavior
- ✅ Kamal handles proxy registration automatically
- ✅ No manual commands or hooks needed
- ✅ Works the same in development and production

### URL Structure

```text
https://neverbeforemarketing.com/
├── /                          → Frontend (Next.js on port 3000)
└── /nbm-be/api/*              → Backend API (Deno on port 8000)
    ├── /health                → Health check
    ├── /auth/*                → Authentication
    ├── /admin/*               → Admin endpoints
    └── /site-settings/*       → Site configuration
```

### Route Registration (Clean!)

```typescript
// src/entities/index.ts - Auto-registered routes
app.route("/", routeModule.default);  // ← No prefix!

// src/main.ts - Manual routes
app.route("/", authRoutes);  // ← No prefix!
app.route("/", adminRoutes);  // ← No prefix!
app.get("/health", healthCheck);  // Root level health check
```

**Routes in app:**

- `/site-settings`, `/articles`, `/auth/login`, `/admin/users`, etc.

**Public URLs:**

- `https://neverbeforemarketing.com/nbm-be/api/site-settings`
- `https://neverbeforemarketing.com/nbm-be/api/articles`
- `https://neverbeforemarketing.com/nbm-be/api/auth/login`

**Magic:** Proxy strips `/nbm-be/api` automatically! ✨

---

## First Time Setup

### Prerequisites

- Kamal installed (`gem install kamal`)
- Docker Hub account with repository: `desinghrajan/nbm-be`
- VPS access: 139.84.158.2
- Frontend already deployed with kamal-proxy on same server

### 1. Configure Secrets

Edit `.kamal/secrets` and fill in the values:

```bash
# Docker Hub credentials
export KAMAL_REGISTRY_PASSWORD="your-docker-hub-token"

# Database credentials (generate secure passwords)
export POSTGRES_PASSWORD="your-postgres-password"
export DATABASE_PASSWORD="your-postgres-password"  # Should match POSTGRES_PASSWORD

# JWT Secret (generate with: openssl rand -hex 32)
export JWT_SECRET="your-jwt-secret-key"
```

### 2. Source the secrets file

```bash
source .kamal/secrets
```

### 3. Setup Steps

1. **Initialize Kamal** (if not done):

   ```bash
   kamal init
   ```

2. **Setup the server** (installs Docker, creates network):

   ```bash
   kamal server bootstrap
   ```

3. **Setup PostgreSQL accessory**:

   ```bash
   kamal accessory boot postgres
   ```

   Wait for PostgreSQL to be ready:

   ```bash
   kamal accessory logs postgres
   ```

4. **Deploy the application**:

   ```bash
   kamal deploy
   ```

5. **Run database migrations**:

   ```bash
   kamal app exec "deno task migrate:run"
   ```

6. **Seed the superadmin user** (only once):

   ```bash
   kamal app exec "deno task db:seed:superadmin"
   ```

---

## Troubleshooting

### Migrations not run

```bash
kamal app exec "deno task migrate:run"
```

### Need to rebuild image

```bash
git push origin main
kamal deploy  # Rebuilds with latest code
```

### Database Table Not Found

**Symptoms:**

- API returns error: `relation "site_settings" does not exist`
- Seed script fails

**Solution:**

```bash
# Run migrations
kamal app exec "deno task migrate:run"

# Verify table exists
ssh root@139.84.158.2 "docker exec nbm-be-postgres psql -U nbm_user -d nbm_be_production -c '\dt'"
```

### Check container health

```bash
ssh root@139.84.158.2 "docker ps | grep nbm-be-web"
curl https://neverbeforemarketing.com/nbm-be/api/health
```

### Check kamal-proxy routing

```bash
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy list"
```

### View logs

```bash
# Application logs
kamal app logs --since 10m
kamal app logs --follow

# Database logs
kamal accessory logs postgres
```

---

## Useful Commands

### Deployment

```bash
# Deploy to production
kamal deploy

# Run migrations
kamal app exec "deno task migrate:run"

# Seed database
kamal app exec "deno task db:seed:site"
```

### Monitoring

```bash
# Check container status
ssh root@139.84.158.2 "docker ps | grep nbm-be"

# Check all services
kamal app status

# View logs
kamal app logs --since 10m

# Test API
curl https://neverbeforemarketing.com/nbm-be/api/health
curl https://neverbeforemarketing.com/nbm-be/api/site-settings | jq '.'
```

### Database Operations

```bash
# Connect to PostgreSQL
kamal accessory exec postgres psql -U nbm_user -d nbm_be_production

# Backup database
kamal accessory exec postgres pg_dump -U nbm_user nbm_be_production > backup.sql

# Verify tables
ssh root@139.84.158.2 "docker exec nbm-be-postgres psql -U nbm_user -d nbm_be_production -c '\dt'"
```

### Other

```bash
# Restart application
kamal app restart

# View environment variables
kamal app exec env

# Rollback to previous version
kamal rollback
```

---

## Configuration Reference

### Database Connection

The application connects to PostgreSQL using:

- **Host**: `nbm-be-postgres` (Docker network internal DNS)
- **Port**: `5432`
- **Database**: `nbm_be_production`
- **User**: `nbm_user`
- **Password**: From `POSTGRES_PASSWORD` secret

### Environment Variables

**Clear (not secret):**

- `PORT=8000`
- `NODE_ENV=production`
- `ENVIRONMENT=production`
- `DATABASE_HOST=nbm-be-postgres`
- `DATABASE_PORT=5432`
- `DATABASE_NAME=nbm_be_production`
- `DATABASE_USER=nbm_user`

**Secret:**

- `DATABASE_PASSWORD` - PostgreSQL password
- `JWT_SECRET` - JWT signing key

### Kamal Proxy Configuration

The deployment uses kamal-proxy (shared with frontend) for path-based routing:

- **Configuration**: `path_prefix: /nbm-be/api` in `config/deploy.yml`
- **Routing**: Requests to `/nbm-be/api/*` are routed to backend container
- **Path Stripping**: Proxy automatically strips `/nbm-be/api` prefix (default behavior)
- **App Routes**: Registered cleanly without prefix: `/site-settings`, `/articles`, `/auth/*`
- **SSL**: Uses existing SSL certificate from frontend deployment
- **Domain**: Shares `neverbeforemarketing.com` with frontend

---

## Best Practices

1. ✅ Keep routes clean (no prefixes in code)
2. ✅ Let proxy handle path stripping (default behavior)
3. ✅ Test endpoints after deployment
4. ✅ Use `kamal app logs` for debugging
5. ✅ Commit hashes help track deployments
6. ✅ Never commit `.kamal/secrets` to git
7. ✅ Use strong passwords for PostgreSQL
8. ✅ Consider setting up PostgreSQL backups

That's it! Simple deployment with Kamal's defaults.
