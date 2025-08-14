# DailyBet AI

ML-powered daily betting recommendations using Next.js 14 and Supabase.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Fill in your actual values in .env.local
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - Reusable React components
- `/.kiro/specs` - Project specifications and requirements

## Environment Variables

See `.env.example` for required environment variables.

## Deployment

This project is configured for deployment on Vercel with automated cron jobs for daily pick generation.

## Monitoring and Health Checks

The application includes built-in monitoring and health check capabilities:

### Health Check Endpoint
```bash
curl https://your-domain.vercel.app/api/health
```

### System Monitoring Script
```bash
# Monitor local development
npm run monitor

# Monitor production deployment
npm run monitor:prod

# Verbose monitoring output
npm run monitor:verbose
```

### Admin Monitoring Dashboard
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  https://your-domain.vercel.app/api/admin/monitoring
```

For detailed deployment and monitoring instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Python ML service
- Vercel deployment# moneyline
