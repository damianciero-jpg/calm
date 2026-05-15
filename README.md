# Viada — AI-Powered Autism Support

Viada bridges the gap between a child's emotional world and their caregiving team. Parents track mood and behavior patterns; therapists review session data and generate progress reports; children engage through age-appropriate experiences.

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Auth, Postgres, Realtime)
- **Anthropic Claude** (AI insights)
- **Vercel** (hosting)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Anthropic keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed test data

```bash
npm run seed
```

Creates a parent (`parent@test.calmpath`) and therapist (`therapist@test.calmpath`) with realistic session data. Password: `CalmPath123!`

## Deploy

```bash
vercel --prod   # run from repo root
```
