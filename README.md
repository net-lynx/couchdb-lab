# CouchDB Lab — SvelteKit SPA + PouchDB live-sync

Offline-first SvelteKit SPA that syncs with CouchDB via PouchDB, everything running in Docker.

## Stack

| Layer | Tech |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 (runes), `adapter-static` SPA |
| Client DB | PouchDB (browser, IndexedDB) |
| Server DB | CouchDB 3.4 |
| Sync | PouchDB bi-directional live replication |
| Data fetching | TanStack Query (query invalidation driven by `db.changes()`) |
| Styling | Tailwind CSS v4 + shadcn-svelte |

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

| Service | URL |
|---|---|
| SvelteKit app | http://localhost:5173 |
| CouchDB Fauxton | http://localhost:5984/_utils |
| CouchDB API | http://localhost:5984 |

**CouchDB credentials**: `admin` / `password` (set in `.env`)

## Live-sync demo

1. Open http://localhost:5173/notes in **two tabs**
2. Add or delete a note in one tab — the other updates within ~1 second
3. Add a doc directly in Fauxton (`notes` DB) — it appears in the app automatically

## Offline demo

1. Open `/notes`, add some notes (stored locally in IndexedDB via PouchDB)
2. Stop CouchDB: `docker compose stop couchdb`
3. Add more notes — they still work (offline-first local writes)
4. Restart CouchDB: `docker compose start couchdb`
5. Notes replicate to CouchDB automatically (`retry: true` in PouchDB sync)

## Architecture

```
Browser
  PouchDB('notes')  ←──live bi-directional sync──→  CouchDB :5984/notes
      │                                                   (Fauxton)
      │ db.changes({ live: true })
      ▼
  TanStack Query invalidate  →  /notes page re-renders
```

Writes go to the **local** PouchDB first (instant, works offline). The live replication loop
syncs all changes to/from CouchDB in the background.

## Security note (lab only)

`PUBLIC_COUCHDB_URL` embeds admin credentials and is exposed to the browser — acceptable
for a local lab. In production:

- Use CouchDB per-user databases with cookie auth or API keys
- Proxy CouchDB through a backend (hide credentials server-side)
- Restrict CORS to specific origins instead of `*`

## Project structure

```
couchdb-lab/
├── docker-compose.yml
├── .env                        # COUCHDB_USER, COUCHDB_PASSWORD, PUBLIC_COUCHDB_URL
├── init/
│   └── couchdb-init.sh         # idempotent: cluster setup, system DBs, notes DB, CORS
└── web/                        # SvelteKit app
    ├── Dockerfile
    └── src/
        ├── lib/
        │   ├── db/pouch.ts                          # PouchDB singleton + live sync
        │   └── features/notes/
        │       ├── types.ts
        │       ├── api.ts                           # CRUD on local PouchDB
        │       ├── queries.ts                       # TanStack Query hooks
        │       ├── live-sync.ts                     # db.changes() → invalidateQueries
        │       └── components/
        │           ├── note-form.svelte
        │           └── note-list.svelte
        └── routes/
            ├── +page.svelte                         # home → /notes
            └── notes/+page.svelte                   # Notes CRUD demo
```
