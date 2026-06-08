# JoinSafe

> Employer stability risk scores powered by real government data.

JoinSafe helps U.S. job seekers and employees evaluate employer job-stability risk before joining — or while employed. It combines real WARN Act layoff data, SEC EDGAR public-company disclosures, and a transparent heuristic risk engine into a single, explainable score.

---

## Architecture

```
joinsafe/
├── apps/
│   ├── web/          Next.js 15 App Router — marketing site + product UI
│   └── worker/       Background ingestion and scoring jobs
├── packages/
│   ├── core/         Risk engine, types, business logic (no I/O)
│   ├── db/           Prisma schema + singleton client
│   ├── providers/    SEC EDGAR and WARN Act data clients
│   └── ui/           Shared React components and design tokens
```

**Data flow:**
```
State WARN APIs ─┐
SEC EDGAR API   ─┤─► worker/ingest ─► Postgres ─► worker/score ─► RiskScore ─► web
                 │
                 └─► Nightly cron (configurable schedule)
```

---

## Local Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker (for local Postgres)

### 1. Clone and install

```bash
git clone <repo>
cd joinsafe
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — minimum required: DATABASE_URL, SEC_EDGAR_USER_AGENT
```

### 3. Start Postgres

```bash
docker compose up -d
```

### 4. Run migrations + seed

```bash
pnpm db:migrate   # Apply all migrations
pnpm db:seed      # Load sample companies and scores
```

### 5. Start the web app

```bash
pnpm dev
# → http://localhost:3000
```

### 6. (Optional) Run the worker

```bash
# Start the scheduler daemon
pnpm --filter @joinsafe/worker dev

# Or run a single job manually
pnpm ingest:warn
pnpm ingest:sec
pnpm score:recompute
```

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:migrate:prod` | Run Prisma migrations (production) |
| `pnpm db:seed` | Seed sample data |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm ingest:warn` | Run WARN ingestion job once |
| `pnpm ingest:sec` | Run SEC ingestion job once |
| `pnpm score:recompute` | Recompute all risk scores |

---

## Risk Score Methodology

Scores range from **0 (minimal risk)** to **100 (severe risk)**. Each score is composed of four weighted components:

| Component | Weight | Source |
|---|---|---|
| WARN Filings | 40% | State labor agency WARN Act databases |
| Financial Health | 30% | SEC XBRL inline financial data |
| SEC Disclosures | 20% | SEC EDGAR 10-K/10-Q/8-K filings |
| Momentum | 10% | Score trend vs prior period |

**Tiers:** STABLE (0–20) · WATCH (21–40) · ELEVATED (41–60) · HIGH (61–80) · CRITICAL (81–100)

Every score includes a **confidence** percentage (0–100%) based on data coverage. Private companies with no SEC filings have lower confidence scores.

Full methodology documentation: `/methodology` (in app).

---

## Adding WARN State Parsers

State coverage is defined in `packages/providers/src/warn/state-parsers/index.ts`.

To add a new state:

1. Create `packages/providers/src/warn/state-parsers/<state-code>.ts`
2. Implement the `WarnStateParser` interface
3. Register it in `STATE_PARSERS` in `index.ts`

See `california.ts` as a reference implementation.

---

## Environment Variables

See `.env.example` for all variables with documentation.

**Required for production:**
- `DATABASE_URL` — Postgres connection string
- `AUTH_SECRET` — NextAuth.js session secret
- `SEC_EDGAR_USER_AGENT` — Required by SEC API (format: `AppName/1.0 contact@domain.com`)

---

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL via Prisma ORM
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Auth:** NextAuth.js v5
- **Validation:** Zod
- **Monorepo:** Turborepo + pnpm workspaces
- **Payments:** Stripe (configured, not yet wired)
