# NBM Backend Deployment Guide

## Prerequisites

- Kamal installed (`gem install kamal`)
- Docker Hub account with repository: `desinghrajan/nbm-be`
- VPS access: 139.84.158.2
- Frontend already deployed with Traefik proxy

## Environment Setup

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

## Deployment Steps

### First Time Setup

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

4. **Build and push the Docker image**:
   ```bash
   kamal build push
   ```

5. **Deploy the application**:
   ```bash
   kamal deploy
   ```

6. **Run database migrations**:
   ```bash
   kamal app exec 'deno run --allow-all scripts/migrate-run.ts'
   ```

7. **Seed the superadmin user** (only once):
   ```bash
   kamal app exec 'deno run --allow-all scripts/seed-superadmin.ts'
   ```

### Subsequent Deployments

For code updates:

```bash
# Build and deploy in one command
kamal deploy

# Or step by step:
kamal build push
kamal deploy
```

## Useful Commands

### Check Status
```bash
# Check all services
kamal app status

# Check PostgreSQL
kamal accessory status postgres

# View logs
kamal app logs
kamal app logs --follow

# Check PostgreSQL logs
kamal accessory logs postgres
```

### Database Operations

```bash
# Connect to PostgreSQL
kamal accessory exec postgres psql -U nbm_user -d nbm_be_production

# Backup database
kamal accessory exec postgres pg_dump -U nbm_user nbm_be_production > backup.sql

# Run migrations
kamal app exec 'deno run --allow-all scripts/migrate-run.ts'
```

### Troubleshooting

```bash
# SSH into server
ssh root@139.84.158.2

# View running containers
kamal app containers

# Restart application
kamal app restart

# View environment variables
kamal app exec env

# Check Traefik routing
docker logs nbm-fe-traefik  # Assuming frontend named traefik container
```

### Rollback

```bash
# Rollback to previous version
kamal rollback
```

## API Endpoint

After successful deployment, your API will be available at:

- **Base URL**: `https://neverbeforemarketing.com/nbm-be/api`
- **Health Check**: `https://neverbeforemarketing.com/nbm-be/api/health`
- **Login**: `https://neverbeforemarketing.com/nbm-be/api/auth/login`
- **Articles**: `https://neverbeforemarketing.com/nbm-be/api/articles`
- **Admin Articles**: `https://neverbeforemarketing.com/nbm-be/api/admin/articles`

## Traefik Configuration

The deployment is configured to work with your existing Traefik instance from the frontend deployment:

- Routes requests from `/nbm-be/api` to the backend container
- Strips `/nbm-be/api` prefix before forwarding (so `/nbm-be/api/health` becomes `/health`)
- Uses existing SSL certificate from Let's Encrypt
- Shares the same domain: `neverbeforemarketing.com`

## Database Connection

The application connects to PostgreSQL using:
- **Host**: `nbm-be-postgres` (Docker network internal DNS)
- **Port**: `5432`
- **Database**: `nbm_be_production`
- **User**: `nbm_user`
- **Password**: From `POSTGRES_PASSWORD` secret

## Security Notes

1. Never commit `.kamal/secrets` to git (already in .gitignore)
2. Use strong passwords for PostgreSQL
3. Use a secure JWT secret (at least 32 bytes, hex encoded)
4. Consider setting up PostgreSQL backups
5. Monitor application logs regularly

## Environment Variables

The application uses these environment variables in production:

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

## Next Steps After Deployment

1. Test the health endpoint
2. Test authentication with superadmin credentials
3. Update frontend to use production API URL
4. Set up monitoring (optional)
5. Configure PostgreSQL backups (optional)
