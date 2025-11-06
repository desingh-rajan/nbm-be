# Deployment Guide

## Kamal Deployment to Production

### Production Environment

- **Server**: Vultr VPS (139.84.158.2)
- **Domain**: <https://neverbeforemarketing.com>
- **API Path**: /nbm-be/api
- **Deployment Tool**: Kamal 2.7.0
- **Proxy**: kamal-proxy (shared with frontend)

### Deployment Commands

```bash
# Build and push Docker image
kamal deploy

# Or skip build if already pushed
kamal deploy --skip-push

# Run migrations
kamal app exec "deno task migrate:run"

# Seed database
kamal app exec "deno task db:seed"
kamal app exec "deno task db:seed:site"

# Check logs
kamal app logs
kamal app logs --since 5m

# Restart app
ssh root@139.84.158.2 "docker restart <container-name>"
```

### Automatic Proxy Registration (via Hooks)

Proxy registration is **automated** via the `post-deploy` hook in `config/deploy.yml`. After `kamal deploy` completes, the hook automatically:

1. Removes old proxy registration
2. Gets the new container ID  
3. Registers with kamal-proxy (with `--strip-path-prefix=false`)

**No manual intervention needed for regular deployments!** ✅

### Manual Proxy Registration (if needed)

If the hook fails or you need to manually register:

```bash
# Register backend with path prefix (NO STRIPPING)
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy deploy nbm-be-web \
  --target=<container-id>:8000 \
  --host=neverbeforemarketing.com \
  --path-prefix=/nbm-be/api \
  --strip-path-prefix=false \
  --health-check-path=/health \
  --health-check-interval=10s \
  --health-check-timeout=120s \
  --target-timeout=60s"

# Check proxy routes
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy list"

# Remove proxy registration
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy remove nbm-be-web"
```

### When Manual Registration is Required

You **only** need manual proxy registration in these scenarios:

1. **First-time deployment** on a new VPS
2. **Hook failure** (check deployment logs if proxy isn't working)
3. **Proxy configuration change** (changing path prefix, host, etc.)

For regular deployments, the hook handles everything automatically.

---

## Common Issues

### Issue 1: 404 Routes Not Found After Deployment

**Symptoms:**

- API returns 404 for all endpoints except `/health`
- Container logs show: `GET /site-settings 404`
- Routes are registered at `/nbm-be/api/*` in the code

**Root Cause:**
The `--strip-path-prefix` flag in kamal-proxy **defaults to `true`**. When enabled, the proxy strips `/nbm-be/api` from incoming requests before forwarding to the container. This causes a mismatch:

- **Client request**: `https://neverbeforemarketing.com/nbm-be/api/site-settings`
- **Proxy forwards** (with stripping): `/site-settings`
- **App expects**: `/nbm-be/api/site-settings`
- **Result**: 404 Not Found

**Solution:**
Explicitly set `--strip-path-prefix=false` when registering the proxy route:

```bash
# WRONG (path prefix is stripped by default)
docker exec kamal-proxy kamal-proxy deploy nbm-be-web \
  --target=<container-id>:8000 \
  --host=neverbeforemarketing.com \
  --path-prefix=/nbm-be/api

# CORRECT (preserve full path)
docker exec kamal-proxy kamal-proxy deploy nbm-be-web \
  --target=<container-id>:8000 \
  --host=neverbeforemarketing.com \
  --path-prefix=/nbm-be/api \
  --strip-path-prefix=false  # ← ADD THIS
```

**Verification:**

```bash
# Test health endpoint
curl https://neverbeforemarketing.com/nbm-be/api/health

# Test API endpoint
curl https://neverbeforemarketing.com/nbm-be/api/site-settings

# Check container logs
docker logs nbm-be-web-<hash>
```

**Why This Happened:**
When the frontend was deployed, it may have changed the default kamal-proxy configuration or created a new proxy instance. The proxy's default behavior is to strip path prefixes, which broke the backend routing that was working previously.

**Key Takeaway:**
Always explicitly set `--strip-path-prefix=false` when using path-based routing with kamal-proxy if your application expects to receive the full path.

---

### Issue 2: Container Exited After Deployment

**Symptoms:**

- Container shows as "Exited" or stops immediately
- Deployment fails at proxy registration step

**Root Cause:**
Kamal tries to register the container with kamal-proxy before it's fully healthy, causing a conflict.

**Solution:**

1. Stop and remove the failed container
2. Start the container manually
3. Register with proxy after container is healthy

```bash
# Stop and remove old containers
ssh root@139.84.158.2 "docker stop <old-container> && docker rm <old-container>"

# Start the new container
ssh root@139.84.158.2 "docker start <new-container>"

# Wait for health check to pass, then register proxy
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy deploy nbm-be-web ..."
```

---

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

### Route Registration in Code

```typescript
// src/entities/index.ts
app.route("/nbm-be/api", routeModule.default);

// src/main.ts
app.route("/nbm-be/api", authRoutes);
app.route("/nbm-be/api", adminRoutes);
app.get("/health", healthCheck); // Root level health check
```

**Important**: The `/health` endpoint is registered at root level (not under `/nbm-be/api`) because it's used by kamal-proxy for health checks.

---

## Best Practices

1. **Always specify `--strip-path-prefix=false`** when using path-based routing
2. **Document proxy configuration** in deployment scripts
3. **Keep health check at root level** (`/health` not `/nbm-be/api/health`)
4. **Test routes after deployment** before declaring success
5. **Check container logs** to see what paths the app is receiving
6. **Use commit hashes for containers** rather than `:latest` tag for clarity

---

## Quick Reference

### Get Container ID

```bash
ssh root@139.84.158.2 "docker ps | grep nbm-be-web"
```

### Check Proxy Status

```bash
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy list"
```

### View Container Logs

```bash
ssh root@139.84.158.2 "docker logs --tail 50 <container-id>"
```

### Restart Container

```bash
ssh root@139.84.158.2 "docker restart <container-id>"
```

### Remove and Re-register Proxy

```bash
ssh root@139.84.158.2 "docker exec kamal-proxy kamal-proxy remove nbm-be-web && \
  docker exec kamal-proxy kamal-proxy deploy nbm-be-web \
  --target=<container-id>:8000 \
  --host=neverbeforemarketing.com \
  --path-prefix=/nbm-be/api \
  --strip-path-prefix=false \
  --health-check-path=/health \
  --health-check-interval=10s \
  --health-check-timeout=120s \
  --target-timeout=60s"
```
