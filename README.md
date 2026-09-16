# OBE Management System

A production-ready **Outcome Based Education (OBE) Management System** for colleges/institutions.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Auth, RLS, Storage)
- **Styling**: Tailwind CSS
- **Excel Parsing**: SheetJS (`xlsx`)
- **Charts**: Recharts

---

## Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### 3. Initialize Database

Run the SQL migrations in your Supabase SQL editor in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
```

### 4. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Portal Routes

| Route | Description |
|-------|-------------|
| `/login` | Main login portal (role selection) |
| `/admin` | Super Admin Overview Dashboard |
| `/admin/programmes` | Programme → Semester → Subject → CO hierarchy |
| `/admin/users` | Faculty Account Management |
| `/admin/reports` | Institutional OBE Reports with Student ID filter |
| `/admin/pso` | Programme Specific Outcomes (PSO) management |
| `/faculty` | Faculty Overview |
| `/faculty/attainment-levels` | CO Attainment Level Thresholds Configuration |
| `/faculty/co-attainment` | CO Attainment Analysis (CIA-based) |
| `/faculty/cia` | CIA Excel Upload & Calculation |
| `/faculty/ese` | ESE Excel Upload & Calculation |
| `/faculty/direct-attainment` | Direct Attainment (CIA + ESE / 2) |
| `/faculty/course-exit-survey` | Course Exit Survey Upload |
| `/faculty/indirect-attainment` | Indirect Attainment Table |
| `/faculty/final-attainment` | Final CO Attainment with Interpretation |

---

## Calculation Formulas

| Formula | Description |
|---------|-------------|
| `CO% = (Obtained / Max) × 100` | Student CO Percentage |
| `CIA CO Attainment = (Attained Students / Total) × 100` | CO-level CIA Attainment |
| `Direct = (CIA + ESE) / 2` | Direct Attainment |
| `Weighted Direct = Direct × 0.80` | Weighted Direct (configurable) |
| `Indirect% = (Weighted Avg / 5) × 100` | Exit Survey Indirect % |
| `Weighted Indirect = Indirect × 0.20` | Weighted Indirect (configurable) |
| `Final = Weighted Direct + Weighted Indirect` | Final CO Attainment |
| `Score = Final / 100` | CO Attainment Score |

---

## Student ID Matching

**Student ID Number** is the primary matching key across all uploaded Excel files. Student Name is used as secondary display/validation only. Division is intentionally **ignored** throughout all calculations.

---

## Database Migrations

All migrations are version-controlled in `supabase/migrations/`:
- `001_initial_schema.sql` — All tables with indexes
- `002_rls_policies.sql` — Row Level Security policies

---

## Security

- Supabase Auth with JWT session management
- RLS policies protecting all tables
- Next.js middleware protecting `/admin` and `/faculty` routes
- No service role key exposed to browser
- No plaintext passwords stored
