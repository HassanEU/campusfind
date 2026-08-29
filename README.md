# CampusFind

**Intelligent Campus Lost & Found**

A student loses their earbuds in the library. Someone hands a pair in at the desk two days
later. CampusFind scores the two reports against each other, shows the student *why* they
look like the same object, and walks a staff member through verifying the claimant before
the item changes hands — recording every step in PostgreSQL as it goes.

The database is not a storage bucket bolted onto a UI. The scoring engine, the workflow
rules, the statistics and the audit history all live in PostgreSQL as functions, triggers,
constraints and views .

---

## CONTENTS

- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [The five-minute demo](#the-five-minute-demo)
- [What runs where](#what-runs-where)
- [Inspecting the database](#inspecting-the-database)
- [Docker commands](#docker-commands)
- [Running without Docker](#running-without-docker)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Documentation](#documentation)

---

## Quick start

You need Docker Desktop. Nothing else.

```bash
git clone <this-repo> campusfind
cd campusfind

cp .env.example .env
# Open .env and set POSTGRES_PASSWORD, PGADMIN_PASSWORD and JWT_SECRET.
# For JWT_SECRET:  openssl rand -hex 48

docker compose up -d --build
```

The first start takes a couple of minutes: it builds two images, then PostgreSQL runs every
migration, function, view, trigger and seed file in order. Watch it happen with
`docker compose logs -f postgres`. When the log says `CampusFind :: database ready.` you are
set.

| Service | URL | Notes |
|---|---|---|
| Web app | http://localhost:5174 | The application |
| API | http://localhost:4001/api/health | Should return `{"status":"ok"}` |
| pgAdmin | http://localhost:5051 | Database browser |
| PostgreSQL | `localhost:55432` | For `psql` or a GUI client |

The host ports are deliberately unusual (55432, 5051, 4001, 5174) so this project cannot
collide with a PostgreSQL you already run on 5432 or another stack on 8080. Change them in
`.env` if you need to.

---

## Demo accounts

Every seeded account uses the password **`Campus@123`**.

| Role | Email | What they can do |
|---|---|---|
| Student | `aarav@campus.edu` | Report items, review matches, submit claims |
| Staff | `rahul.desai@campusfind.edu` | Run the desk: verify QR labels, approve returns |
| Admin | `admin@campusfind.edu` | Analytics, users, categories, locations, audit log |

Other students (`sneha@campus.edu`, `kabir@campus.edu`, `ananya@campus.edu` and more) exist
so the dashboards have realistic traffic. The sign-in screen lists the three accounts above
so you do not have to memorise them mid-presentation.

These credentials are demo data, not secrets. Passwords are stored as bcrypt hashes — the
seed file hashes them with `pgcrypto` so that plaintext never reaches a table.

---

## The five-minute demo

This is the full lifecycle, end to end, and it is worth rehearsing once before presenting.

**1. Report something lost** — sign in as `aarav@campus.edu`, choose *Report lost item*.

> Black AirPods Pro, Electronics, Central Library, brand Apple, colour Black,
> "White charging case with a small scratch on the lid and a blue sticker inside."

**2. Hand the matching item in** — sign out, sign in as staff (`rahul.desai@campusfind.edu`),
choose *Log found item*, and describe the same object found at Central Library.

The moment you save it, three things happen inside the database: a trigger issues a QR label
(`CF-FOUND-000131` or similar), the matching engine scores the new item against every open
lost report, and the student gets a notification. The QR label appears on screen ready to
print.

**3. Look at the match** — back as the student, open *Matches*. The report now shows a score
out of 100 with the six criteria broken out: category, brand, colour, location, time and
description similarity. Nothing is hidden; the same numbers are stored in the `matches`
table.

**4. Claim it** — open the match, click *Submit claim*, and describe something only the owner
would know. The found item moves to `CLAIM_PENDING`.

**5. Verify at the desk** — as staff, open *Verify & return*. Scan the QR with a camera or
type the code. The item, its status and the pending claim load straight from PostgreSQL,
including the claimant's identifying details so you can question them. Record the check as
passed.

**6. Approve** — the *Approve* button is deliberately refused until a verification has
passed. Once it has, approval runs as a single transaction: claim approved, item moved to
`RETURNED`, lost report `RESOLVED`, competing matches dismissed, return record written,
student notified. Any failure rolls the whole thing back.

**7. Show the evidence** — sign in as admin. The analytics page recalculates from SQL (the
resolution rate has just moved), and the audit log shows the whole sequence:
`LOST_ITEM_CREATED → FOUND_ITEM_CREATED → QR_GENERATED → MATCH_CREATED → CLAIM_SUBMITTED →
QR_VERIFIED → CLAIM_APPROVED → ITEM_RETURNED`.

---

## What runs where

```
Browser ──> web (nginx, port 5174)          React + TypeScript + Vite + Tailwind
   │
   └──────> api (Node, port 4001)           Express + node-postgres, parameterised SQL
                  │
                  └──> postgres (55432)     schema, matching engine, triggers, views
                           ▲
                       pgadmin (5051)       read/write database browser
```

Four containers, one private Docker network (`campusfind-net`), one named volume for the
data (`campusfind_pgdata`). Stopping the stack does not delete anything.

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS with a hand-built design system,
Radix UI primitives, Framer Motion for transitions, TanStack Query for caching, Recharts for
the analytics, `html5-qrcode` for camera scanning. Routes are code-split, so the QR scanner
and chart libraries only download on the pages that use them.

**Backend** — Express with a layered structure (routes → controllers → services →
repositories). There is no ORM: every query is visible SQL with `$1, $2` placeholders, which
is both the safe way to do it and the point of the exercise.

**Database** — PostgreSQL 16 with `pg_trgm` for text similarity and `pgcrypto` for hashing
the seeded passwords.

---

## Inspecting the database

**With pgAdmin** — open http://localhost:5051 and log in with the `PGADMIN_EMAIL` and
`PGADMIN_PASSWORD` from your `.env`. The CampusFind server is pre-registered, so expand
*Servers → CampusFind → Databases → campusfind → Schemas → public → Tables*. When it asks for
the database password, use `POSTGRES_PASSWORD`.

Right-click any table and choose *View/Edit Data → All Rows*. To run SQL, use *Tools → Query
Tool*.

**With psql:**

```bash
docker compose exec postgres psql -U campusfind -d campusfind
```

Useful things to type once you are in:

```sql
\dt                      -- list the 13 tables
\dv                      -- list the 11 views
\df fn_*                 -- list the functions
\d+ lost_items           -- one table's columns, constraints and indexes

-- Score any two reports by hand and see the reasoning:
SELECT * FROM fn_score_match(1, 1);

-- The staff review queue:
SELECT claim_id, claimant_name, found_item_name, qr_code FROM v_pending_claims;

-- Prove the workflow guard is real (this fails, on purpose):
UPDATE found_items SET status = 'UNCLAIMED' WHERE status = 'RETURNED';
```

That last one raising `Invalid found item transition: RETURNED -> UNCLAIMED` is a good thing
to demonstrate live: the rule is enforced by the database, not by the application, so it
holds even when someone edits rows by hand.

---

## Docker commands

```bash
docker compose up -d                # start everything
docker compose up -d --build        # start, rebuilding after code changes
docker compose ps                   # what is running and is it healthy
docker compose logs -f api          # follow the API log
docker compose logs -f postgres     # follow database startup / SQL errors
docker compose restart api          # restart one service
docker compose down                 # stop, keeping all data
docker compose down -v              # stop and DELETE the CampusFind volume
```

`docker compose down -v` only removes volumes belonging to this project, and the next
`up` will replay all the migrations and seeds from scratch. Use it when you want a clean
database for a rehearsal.

Everything here is namespaced under the compose project `campusfind` — its own network,
volumes and container names — so it cannot interfere with other stacks on the machine.

---

## Running without Docker

Useful when you want hot reload while developing. You still need PostgreSQL; the easiest
route is to run only that container and point the local processes at it.

```bash
docker compose up -d postgres

# API
cd backend
npm install
npm run dev            # http://localhost:4001/api

# Web, in a second terminal
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The API reads `.env` from the repository root, so the same `POSTGRES_PASSWORD` and
`JWT_SECRET` work. Because Vite serves on 5173 in dev, set `CORS_ORIGIN=http://localhost:5173`
in `.env` and restart the API, or the browser will block the requests.

---

## Testing

`backend/scripts/smoke-test.ts` drives the entire acceptance flow against a running API —
registration, authorisation rules, reporting, matching, claiming, QR verification, the
approval transaction, the audit trail and pagination. It makes 80 assertions and prints each
one.

```bash
cd backend
npm run smoke                                     # against localhost:4001
API_URL=http://localhost:4001/api npm run smoke   # explicit
```

It creates its own users and reports, so it is safe to run repeatedly against the demo
database.

Type checking and production builds:

```bash
cd backend  && npm run typecheck
cd frontend && npm run typecheck && npm run build
```

---

## Project layout

```
campusfind/
├── backend/                    Express + TypeScript API
│   ├── src/
│   │   ├── routes/             endpoint definitions and middleware wiring
│   │   ├── controllers/        HTTP in, HTTP out
│   │   ├── services/           business rules and transactions
│   │   ├── repositories/       every SQL statement lives here
│   │   ├── middleware/         auth, validation, error translation
│   │   ├── validators/         Zod schemas for request bodies and queries
│   │   ├── db/pool.ts          connection pool + withTransaction helper
│   │   └── utils/              hashing, tokens, errors, serialisation
│   └── scripts/smoke-test.ts   end-to-end acceptance test
│
├── frontend/                   React + TypeScript + Vite
│   └── src/
│       ├── components/ui/      the design system primitives
│       ├── components/shared/  match score, item card, filters, QR scanner
│       ├── components/layout/  app shell, navigation, notifications
│       ├── pages/              landing, auth, student, staff, admin
│       ├── hooks/              auth context and TanStack Query hooks
│       └── lib/                API client and formatting helpers
│
├── database/
│   ├── migrations/             tables, constraints, indexes
│   ├── functions/              utilities, matching engine, analytics
│   ├── views/                  the 11 reporting views
│   ├── triggers/               audit, workflow guards, validation
│   ├── seeds/                  reference data, reports, a worked scenario
│   └── docker-init/            applies the above in dependency order
│
├── docs/
│   ├── DBMS_VIVA.md            every database concept, where it is used, why
│   ├── DATABASE_DESIGN.md      ER model, normalisation, keys, indexes
│   └── API.md                  every endpoint, with request and response shapes
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Documentation

- **[docs/DBMS_VIVA.md](docs/DBMS_VIVA.md)** — the 22 required database concepts, each with
  the exact place it appears in CampusFind, why that choice was made, runnable SQL and the
  result to expect. Written to be read aloud in a viva.
- **[docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)** — entities, relationships, keys,
  functional dependencies, the normalisation argument, every index and why it exists, and an
  ER diagram in text form.
- **[docs/API.md](docs/API.md)** — all endpoints with roles, request bodies, responses and
  error codes.

---

## Security notes

Passwords are bcrypt-hashed and never stored or logged in plaintext. Authentication uses
signed JWTs; authorisation is checked per route by role, and ownership is re-checked in the
service layer so a student cannot read another student's match by guessing an ID. Every
query is parameterised. Request bodies are validated with Zod before they reach a service.
Sign-in and QR lookup are rate limited. Database errors are translated into safe messages —
constraint names and SQL never reach the client.

`.env` is git-ignored. `.env.example` contains placeholders only. Generate a real
`JWT_SECRET` with `openssl rand -hex 48` before running this anywhere that matters.

The QR payload is deliberately just an opaque code such as `CF-FOUND-000131`. It carries no
name, no email and no item description, so a label that falls off a shelf leaks nothing.
