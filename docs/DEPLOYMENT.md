# Deployment Guide

## Backend (VPS / Docker)

### Option 1: Docker

```bash
# Build
docker build -t orcta-backend -f apps/backend/Dockerfile .

# Run
docker run -d \
  --name orcta-backend \
  -p 9999:9999 \
  -e DATABASE_URL="postgres://..." \
  -e BETTER_AUTH_SECRET="..." \
  -e BETTER_AUTH_URL="https://api.yourdomain.com" \
  -e FRONTEND_URL="https://yourdomain.com" \
  orcta-backend
```

### Option 2: Direct (PM2)

```bash
# On server
git clone <repo> && cd orcta-stack
pnpm install
pnpm build

# Run with PM2
pm2 start apps/backend/dist/src/index.js --name api

# Optional: Run workers
pm2 start "pnpm --filter backend jobs" --name workers
```

### Reverse Proxy (Caddy)

```
api.yourdomain.com {
    reverse_proxy localhost:9999
}
```

### Database

Use managed PostgreSQL (Supabase, Neon, Railway) or self-hosted.

```bash
# Apply migrations on deploy
pnpm db:migrate
```

---

## Frontend (Vercel)

1. Connect repo to Vercel
2. Set:
   - Root Directory: `apps/frontend`
   - Build Command: `cd ../.. && pnpm build:frontend`
   - Output Directory: `dist`
3. Add environment variable:
   - `VITE_API_URL` = `https://api.yourdomain.com`

---

## Environment Variables

### Backend (required)

```bash
DATABASE_URL=postgres://user:pass@host:5432/db
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Backend (optional)

```bash
# Redis (for jobs, rate limiting)
REDIS_URL=redis://localhost:6379

# S3/R2 storage
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=uploads
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx

# Email
RESEND_API_KEY=re_xxx
```

### Frontend

```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## Health Check

```bash
curl https://api.yourdomain.com/api/health
```

---

## CI/CD

GitHub Actions runs on every PR:
- Lint
- Type check
- Tests

Deploy manually or add CD step to workflow.
