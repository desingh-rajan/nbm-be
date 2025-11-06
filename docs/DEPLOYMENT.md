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

```
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

## Troubleshooting

**Migrations not run:**

```bash
kamal app exec "deno task migrate:run"
```

**Need to rebuild image:**

```bash
git push origin main
kamal deploy  # Rebuilds with latest code
```

That's it! Simple deployment with Kamal's defaults.

---

## Architecture Overview

### Simplified Path-Based Routing

The deployment now uses a **clean, simple architecture** that works with Kamal's default proxy behavior:

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

### Common Tasks

**Run migrations:**

```bash
kamal app exec "deno task migrate:run"

# Verify tables exist
ssh root@139.84.158.2 "docker exec nbm-be-postgres psql -U nbm_user -d nbm_be_production -c '\dt'"
```

**Seed database:**

```bash
kamal app exec "deno task db:seed:site"
```

**Check container health:**

```bash
ssh root@139.84.158.2 "docker ps | grep nbm-be-web"
curl https://neverbeforemarketing.com/nbm-be/api/health
```

### Issue 3: Database Table Not Found

**Symptoms:**

- API returns error: `relation "site_settings" does not exist`
- Seed script fails

**Root Cause:**
Migrations not run in production database.

**Solution:**

```bash
# Run migrations
kamal app exec "deno task migrate:run"

# Verify table exists
ssh root@139.84.158.2 "docker exec nbm-be-postgres psql -U nbm_user -d nbm_be_production -c '\dt'"
```

---

### Issue 4: Seed Script Not Found in Container

**Symptoms:**

- Error: `Module not found "file:///app/scripts/seed-site-settings.ts"`

**Root Cause:**
The Docker image was built before the seed script was committed to the repository.

**Solution:**

1. Commit and push the seed script
2. Rebuild the Docker image (kamal deploy will build new image with latest code)
3. Run the seed script

```bash
# Ensure latest code is pushed
git add scripts/seed-site-settings.ts
git commit -m "feat: Add site settings seed script"
git push origin main

# Deploy (will rebuild with latest code)
kamal deploy

# Run seed script
ssh root@139.84.158.2 "docker exec <container> deno task db:seed:site"
```

---

## Path-Based Routing Architecture

### URL Structure

```
https://neverbeforemarketing.com/
├── /                          → Frontend (Next.js on port 3000)
└── /nbm-be/api/*              → Backend API (Deno on port 8000)
    ├── /health                → Health check
    ├── /auth/*                → Authentication
    ├── /admin/*               → Admin endpoints
    └── /site-settings/*       → Site configuration
```

### How Proxy Routing Works

1. **Client Request**: `https://neverbeforemarketing.com/nbm-be/api/site-settings`
2. **Nginx/TLS Termination**: Handles HTTPS and SSL certificates
3. **kamal-proxy**: Routes based on path prefix
   - Matches `/nbm-be/api` prefix
   - Forwards to backend container with `--strip-path-prefix=false`
4. **Backend Container**: Receives full path `/nbm-be/api/site-settings`
5. **Hono App**: Matches route registered at `/nbm-be/api/site-settings`

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

## Quick Reference

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

# View logs
kamal app logs --since 10m

# Test API
curl https://neverbeforemarketing.com/nbm-be/api/health
curl https://neverbeforemarketing.com/nbm-be/api/site-settings | jq '.'
```

### Best Practices

1. ✅ Keep routes clean (no prefixes in code)
2. ✅ Let proxy handle path stripping (default behavior)
3. ✅ Test endpoints after deployment
4. ✅ Use `kamal app logs` for debugging
5. ✅ Commit hashes help track deployments
