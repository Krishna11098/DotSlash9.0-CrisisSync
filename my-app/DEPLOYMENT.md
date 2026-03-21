# 🚀 Deployment Guide

Deploy your Multimodal Truth + Priority Engine to production in minutes.

---

## 🟢 Option 1: Vercel (Recommended)

**Easiest deployment. 1-click setup.**

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Multimodal Truth Engine"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repo
   - Select `/my-app` as root directory

3. **Set Environment Variables**
   - Go to "Settings → Environment Variables"
   - Add: `HF_API_KEY=hf_your_token_here`
   - Save

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live! 🎉

**Result:** Your app is live at `your-domain.vercel.app`

---

## 🐳 Option 2: Docker

**For any hosting platform (Render, Railway, AWS, etc.)**

### Create Dockerfile

Already included in project structure.

### Build & Run Locally

```bash
# Build image
docker build -t truth-engine .

# Run container
docker run -p 3000:3000 \
  -e HF_API_KEY=hf_your_token \
  truth-engine
```

### Deploy to Render

1. Create account: [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Configure:
   - **Root Directory:** `my-app`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Add environment variable: `HF_API_KEY=...`
6. Deploy!

### Deploy to Railway

1. Create account: [railway.app](https://railway.app)
2. Click "New Project"
3. Select "GitHub Repo"
4. Choose your repository
5. Railway auto-detects Next.js
6. Add `HF_API_KEY` in Variables
7. Deploy!

### Deploy to AWS (ECS)

```bash
# Build image
docker build -t truth-engine .

# Tag for ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker tag truth-engine:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/truth-engine:latest

docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/truth-engine:latest

# Create ECS task & service
```

---

## ⚡ Option 3: Containerize for Production

### Multi-stage build (optimized)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

### Push to Docker Hub

```bash
docker build -t your-username/truth-engine:latest .
docker login
docker push your-username/truth-engine:latest
```

---

## 🔐 Production Checklist

### Environment

- [ ] `HF_API_KEY` set securely
- [ ] `NODE_ENV=production`
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Error logging configured

### Security

- [ ] API authentication added (JWT/OAuth)
- [ ] Input validation enforced
- [ ] HTTPS/TLS enabled
- [ ] Request signing implemented
- [ ] Sensitive data encrypted

### Monitoring

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Log aggregation (CloudWatch, Datadog)
- [ ] Uptime monitoring
- [ ] Alert thresholds set

### Scaling

- [ ] Auto-scaling configured
- [ ] Load balancer setup
- [ ] Cache strategy (Redis)
- [ ] Database replicas (if applicable)
- [ ] CDN for static assets

---

## 📊 Cost Estimates

### Vercel (Recommended)

| Usage | Cost |
|-------|------|
| Hobby | Free (up to 100/month) |
| Pro | $20/month |
| Enterprise | Custom |

### HuggingFace API

| Tier | Cost |
|------|------|
| Free | Free (rate limited) |
| Pro | $9/month |
| Enterprise | Contact |

### Total for MVP

- **Vercel:** $20/month
- **HF API:** $9/month
- **Total:** ~$30/month for production

---

## 🚨 Performance Optimization

### Caching Strategies

```typescript
// Cache identical image submissions
const cache = new Map<string, any>();

const imageHash = crypto
  .createHash("md5")
  .update(imageBase64)
  .digest("hex");

if (cache.has(imageHash)) {
  return cache.get(imageHash);
}
```

### Async Processing

Instead of waiting for all models:

```typescript
// Process in background, return immediately
const jobId = await queQueue.submit({
  image,
  text_description,
});

return { processing: true, jobId };
```

### Model Batching

Process multiple reports together for efficiency.

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      
      - run: npm install
      - run: npm run lint
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@master
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 📈 Post-Deployment

### Monitor Performance

```bash
# Check logs
vercel logs --prod  # Vercel
docker logs -f truth-engine  # Docker

# Response time
curl -w "@curl-format.txt" -o /dev/null -s http://your-app.com/api/verify-report
```

### Database Integration (Next Step)

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Save report to database
await prisma.report.create({
  data: {
    image_hash: hash(imageBase64),
    priority_level: result.priority.priority_level,
    approved: result.approved,
    created_at: new Date(),
  },
});
```

### Webhook Setup

Send approved reports to authorities:

```typescript
if (result.approved) {
  await fetch("https://authorities-api.gov/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.AUTHORITY_API_KEY,
    },
    body: JSON.stringify(result),
  });
}
```

---

## 🆘 Troubleshooting Deployment

### "HF_API_KEY is undefined"

Check environment variables are set:

```bash
vercel env list
# Should show HF_API_KEY
```

### "Timeout on model inference"

HuggingFace free tier can be slow. Options:
- Upgrade to HF Pro tier
- Use Replicate.ai instead
- Self-host models (advanced)

### "Build fails"

```bash
# Clear cache and rebuild
vercel rebuild
vercel deploy --prod --force
```

### "High latency"

- Add caching layer
- Use async processing
- Batch requests
- Switch to paid HF tier

---

## 🎯 Next Steps After Deployment

1. **Set up monitoring** (Sentry, DataDog)
2. **Add database** (PostgreSQL)
3. **Implement webhooks** to authorities
4. **Fine-tune models** on real data
5. **Build admin dashboard**
6. **Launch mobile app**

---

**Your app is production-ready! 🚀**

Questions? Check SETUP_GUIDE.md or EXAMPLES.md
