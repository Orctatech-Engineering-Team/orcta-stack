# Deployment

Get your app live in 15 minutes.

---

## TL;DR

| Part | Where | Cost |
|------|-------|------|
| Backend | Railway, Render, or any VPS | $5-20/mo |
| Frontend | Vercel | Free |
| Database | Supabase, Neon, or Railway | Free tier available |
| Redis | Upstash or Railway | Free tier available |

---

## 1. Database

Pick one. All have free tiers.

### Supabase (recommended)
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string
3. Copy the `postgres://` URL

### Neon
1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string from dashboard

### Railway
1. Create PostgreSQL service at [railway.app](https://railway.app)
2. Copy `DATABASE_URL` from Variables tab

---

## 2. Backend

### Option A: Railway (easiest)

1. Push your code to GitHub
2. Create new project at [railway.app](https://railway.app)
3. Select "Deploy from GitHub repo"
4. Set root directory to `apps/backend`
5. Add environment variables:

```
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=<your-secret>
BETTER_AUTH_URL=https://<your-railway-url>
FRONTEND_URL=https://<your-vercel-url>
```

6. Railway auto-deploys on push

### Option B: Any VPS (more control)

SSH into your server:

```bash
# Install dependencies
curl -fsSL https://get.docker.com | sh

# Clone and build
git clone <your-repo> app && cd app
docker build -t api -f apps/backend/Dockerfile .

# Run
docker run -d \
  --name api \
  --restart unless-stopped \
  -p 9999:9999 \
  -e DATABASE_URL="postgres://..." \
  -e BETTER_AUTH_SECRET="..." \
  -e BETTER_AUTH_URL="https://api.yourdomain.com" \
  -e FRONTEND_URL="https://yourdomain.com" \
  api
```

Point your domain with a reverse proxy:

```bash
# Caddy (automatic HTTPS)
echo "api.yourdomain.com { reverse_proxy localhost:9999 }" | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 3. Frontend

### Vercel (30 seconds)

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Set:
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `cd ../.. && pnpm build:frontend`
   - **Output Directory**: `dist`
4. Add environment variable:
   - `VITE_API_URL` = `https://api.yourdomain.com`
5. Deploy

Vercel auto-deploys on every push.

---

## 4. Redis (if using jobs/caching)

### Upstash (recommended)
1. Create database at [upstash.com](https://upstash.com)
2. Copy the Redis URL
3. Add to backend env: `REDIS_URL=redis://...`

### Railway
1. Add Redis service to your project
2. Copy `REDIS_URL` from Variables

---

## 5. File Storage (if using uploads)

### Cloudflare R2 (recommended — no egress fees)

1. Create bucket at [dash.cloudflare.com](https://dash.cloudflare.com) → R2
2. Create API token with read/write permissions
3. Add to backend env:

```
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
```

### AWS S3

```
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

---

## 6. Background Jobs

If you're using the job queue, run the worker alongside your API:

### Railway
Add a second service pointing to the same repo:
- **Start Command**: `pnpm --filter backend jobs`

### VPS
```bash
docker run -d \
  --name worker \
  --restart unless-stopped \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  api \
  node src/jobs/worker.js
```

---

## Environment Variables Reference

### Required

```bash
DATABASE_URL=postgres://user:pass@host:5432/db
BETTER_AUTH_SECRET=<32+ random characters>
BETTER_AUTH_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Optional

```bash
# Redis
REDIS_URL=redis://...

# File storage
S3_ENDPOINT=https://...
S3_BUCKET=uploads
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Email
RESEND_API_KEY=re_...

# Tuning
PORT=9999
LOG_LEVEL=info
NODE_ENV=production
```

---

## Verify It Works

```bash
# Health check
curl https://api.yourdomain.com/api/health

# Should return:
# {"success":true,"data":{"status":"healthy",...}}
```

---

## Troubleshooting

**502 Bad Gateway**
→ Backend isn't running. Check logs: `docker logs api`

**CORS errors**
→ Make sure `FRONTEND_URL` matches exactly (including https)

**Auth not working**
→ Check `BETTER_AUTH_URL` matches your API domain

**Database connection refused**
→ Whitelist your server IP in your database provider's dashboard
