# Implementation Decisions

## Phase 1

- SQLite is the default server repository; set `STORAGE=json` to use the atomic JSON repository. When SQLite starts with an empty database, it imports `data/applications.json` if present, otherwise `data/sample-data.json`. Imported legacy rows receive `updated_at` at midnight UTC on `date_applied` and an initial status-history entry; the original JSON file is retained.
- The dashboard cannot directly import the Node.js core or repository modules into its browser bundle. Phase 1 removes its frozen clock and maintains `updated_at`/`history` in its current browser storage. Replacing that storage with the shared server source requires the REST API from Phase 3, so the end-to-end dashboard connection remains in Phase 5 rather than introducing a second HTTP implementation early.
