# Batteries

Everything included beyond the basics.

---

## File Uploads

Upload files directly to S3 or Cloudflare R2 using presigned URLs. Files never touch your server.

### Setup

Add to `.env`:

```bash
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # Or leave empty for AWS S3
S3_BUCKET=uploads
S3_REGION=auto
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

### Usage

```typescript
import { getUploadUrl, getDownloadUrl, generateKey, deleteFile } from "@/lib/storage";

// Generate a unique key
const key = generateKey("photo.jpg", "avatars");
// → "avatars/550e8400-e29b-41d4-a716-446655440000.jpg"

// Get presigned upload URL (valid 1 hour)
const uploadUrl = await getUploadUrl({
  key,
  contentType: "image/jpeg",
  expiresIn: 3600,
});

// Client uploads directly
await fetch(uploadUrl, { method: "PUT", body: file });

// Get download URL
const downloadUrl = await getDownloadUrl({ key });

// Delete when done
await deleteFile(key);
```

### Frontend Integration

```typescript
async function uploadFile(file: File) {
  // 1. Get presigned URL from your API
  const { uploadUrl, key } = await api.post("/uploads/presign", {
    filename: file.name,
    contentType: file.type,
  });

  // 2. Upload directly to S3/R2
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  return key;
}
```

---

## WebSockets

Real-time communication with room support.

### Setup

Already included. WebSocket connections go to `/ws`.

### Server Usage

```typescript
import { wsManager } from "@/lib/ws";

// In your WebSocket handler
app.get("/ws", upgradeWebSocket((c) => ({
  onOpen(event, ws) {
    const id = crypto.randomUUID();
    wsManager.add(id, ws, c.get("user")?.id);
    wsManager.join(id, "global");
  },

  onMessage(event, ws) {
    const data = JSON.parse(event.data);
    // Handle messages
  },

  onClose(event, ws) {
    wsManager.remove(id);
  },
})));

// Anywhere in your code
wsManager.broadcast("room-name", { type: "update", data: {...} });
wsManager.sendToUser(userId, { type: "notification", message: "Hey!" });
wsManager.broadcastAll({ type: "announcement", message: "Server restart in 5 min" });
```

### Client Usage

```typescript
const ws = new WebSocket("wss://api.example.com/ws");

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};

ws.send(JSON.stringify({ type: "join", room: "chat-123" }));
```

---

## Background Jobs

Process work asynchronously with BullMQ.

### Setup

Add to `.env`:

```bash
REDIS_URL=redis://localhost:6379
```

### Define Job Types

Edit `apps/backend/src/jobs/index.ts`:

```typescript
export type JobName = "email" | "cleanup" | "processImage";

export interface JobData {
  email: { to: string; template: string; data: Record<string, unknown> };
  cleanup: { olderThanDays: number };
  processImage: { imageUrl: string; outputKey: string };
}
```

### Queue a Job

```typescript
import { addJob } from "@/jobs";

// Simple
await addJob("email", {
  to: "user@example.com",
  template: "welcome",
  data: { name: "Alex" },
});

// With options
await addJob("cleanup", { olderThanDays: 30 }, {
  delay: 60000,        // Wait 1 minute before processing
  priority: 10,        // Higher = processed first
});
```

### Process Jobs

Edit `apps/backend/src/jobs/worker.ts`:

```typescript
const processors = {
  async email(job) {
    const { to, template, data } = job.data;
    await sendEmail(to, template, data);
  },

  async processImage(job) {
    const { imageUrl, outputKey } = job.data;
    // Your image processing logic
  },
};
```

### Run Workers

```bash
pnpm --filter backend jobs
```

In production, run this as a separate process/container.

---

## Rate Limiting

Protect your API from abuse.

### Basic Usage

```typescript
import { rateLimit } from "@/lib/rate-limit";

// Apply to all routes: 100 requests per minute per IP
app.use("/api/*", rateLimit());

// Custom limits
app.use("/api/search", rateLimit({
  windowMs: 60000,    // 1 minute
  max: 20,            // 20 requests
}));
```

### Presets

```typescript
import { authRateLimit, strictRateLimit } from "@/lib/rate-limit";

// 5 requests per 5 minutes (for login/signup)
app.post("/api/auth/*", authRateLimit);

// 10 requests per minute (for expensive operations)
app.post("/api/export", strictRateLimit);
```

### Custom Key

Rate limit by user instead of IP:

```typescript
app.use("/api/*", rateLimit({
  keyGenerator: (c) => c.get("user")?.id || c.req.header("x-forwarded-for") || "anon",
}));
```

### Response Headers

All responses include:
- `X-RateLimit-Limit` — Max requests allowed
- `X-RateLimit-Remaining` — Requests remaining
- `Retry-After` — Seconds until reset (when limited)

---

## Email

Send transactional emails with Resend.

### Setup

Add to `.env`:

```bash
RESEND_API_KEY=re_xxxxx
```

### Usage

```typescript
import { Resend } from "resend";
import { welcomeEmail } from "@repo/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

const template = welcomeEmail({
  name: "Alex",
  actionUrl: "https://app.example.com/verify?token=xxx",
});

await resend.emails.send({
  from: "hello@yourdomain.com",
  to: "user@example.com",
  subject: template.subject,
  html: template.html,
  text: template.text,
});
```

### Create Templates

Edit `packages/email-templates/src/index.ts`:

```typescript
export function invoiceEmail({ amount, dueDate }: { amount: number; dueDate: string }) {
  return {
    subject: `Invoice for $${amount}`,
    html: baseTemplate("Invoice", `<p>Amount due: $${amount}</p><p>Due by: ${dueDate}</p>`),
    text: `Invoice\n\nAmount due: $${amount}\nDue by: ${dueDate}`,
  };
}
```
