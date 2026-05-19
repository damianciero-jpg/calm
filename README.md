# Viada - Neurodivergent Support

Viada supports neurodivergent kids, teens, and families through emotional wellness tools. Parents track mood and behavior patterns; therapists review session data and generate progress reports; children and teens engage through age-appropriate experiences.

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Firebase** (Auth, Firestore)
- **Anthropic Claude** (AI insights)
- **Vercel** (hosting)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Firebase + Anthropic keys
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
