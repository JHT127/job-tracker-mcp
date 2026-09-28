# Week 3 Data Plan — Job Application Tracker

Written before any handler is wired to real data, per the Week 3 task rule:
_"Do not implement all handlers until this file exists."_

## Why this looks different from the starter mapping

The Week 3 brief's starter mapping (Notes → markdown, Weather → Open-Meteo,
Quotes → Quotable, etc.) assumes each tool talks to a different kind of
source. Our P0 tools don't — `docs/design.md` already commits us to **"No
paid APIs or external services of any kind — all data lives in a local JSON
file."** So all four P0 tools share one runtime store: `./data/applications.json`,
initialized from the committed `./data/sample-data.json` when it is missing.
There's no network call to lose on Demo Day, which trivially satisfies the
"must work if Wi-Fi dies" rule — but we still document failure modes below,
since a local file can still be missing, empty, or malformed.

We have **4 P0 tools**, not 3 (`add_application`, `update_status`,
`list_applications`, `get_next_actions`), matching the Tool Inventory table
in `docs/design.md`.

## Data Plan Table

| tool                | source            | fixture path               | auth | failure modes                                                                                                                                                                                                                    |
| ------------------- | ----------------- | -------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_application`   | Local file (JSON) | `./data/applications.json` | none | sample file missing/unreadable; runtime file contains invalid JSON; duplicate `id` generated; `date_applied` not a valid ISO date; concurrent writes can race                                                                    |
| `update_status`     | Local file (JSON) | `./data/applications.json` | none | `id` not found; `new_status` not allowed; sample file missing/unreadable on first run; runtime file contains invalid JSON                                                                                                        |
| `list_applications` | Local file (JSON) | `./data/applications.json` | none | sample file missing/unreadable on first run; empty runtime file; malformed JSON (trailing comma, bad row); invalid `status` filter; one bad record in an otherwise-valid array                                                   |
| `get_next_actions`  | Local file (JSON) | `./data/applications.json` | none | sample file missing/unreadable on first run; empty runtime file; malformed `date_applied`; timezone/date-parsing edge case at midnight; no matching action (valid empty state); large file (100+ rows) should degrade gracefully |

## Example Responses (happy path)

### `add_application`

```json
{
  "id": "app-3",
  "company": "Taskera Labs",
  "role": "Backend Engineer",
  "date_applied": "2026-07-31",
  "status": "applied",
  "source": "referral",
  "notes": "Referred by a friend from university"
}
```

### `update_status`

```json
{
  "id": "app-2",
  "company": "Exalt Technologies",
  "role": "Frontend Developer",
  "date_applied": "2026-07-28",
  "status": "interview",
  "source": "referral",
  "notes": "Interview scheduled"
}
```

### `list_applications`

```json
{
  "statusFilter": "applied",
  "applications": [
    {
      "id": "app-1",
      "company": "Orion VLSI Technologies",
      "role": "Software Engineer",
      "date_applied": "2026-07-01",
      "status": "applied",
      "source": "linkedin",
      "notes": "No response yet"
    }
  ]
}
```

### `get_next_actions`

```json
[
  {
    "action": "Follow up with Orion VLSI Technologies",
    "application_id": "app-1",
    "reason": "stale application: 30 days without an update."
  },
  {
    "action": "Prepare for Exalt Technologies",
    "application_id": "app-2",
    "reason": "recently updated to interview."
  }
]
```

## Fixture Plan

- `./data/sample-data.json` is the committed, anonymized sample dataset.
- `./data/applications.json` is per-user runtime data, is ignored by Git,
  and is initialized from the sample when a tool first reads it.
- Every P0 handler reads from (and `add_application` / `update_status`
  write to) this one runtime file — no per-tool fixture is needed.

## Missing-File Behavior

When `./data/applications.json` is absent, the shared loader reads
`./data/sample-data.json` and creates the runtime file with exclusive-create
semantics. If another first-run call creates the file first, the loader reads
that file instead of overwriting it. A missing/unreadable sample or malformed
runtime JSON remains an error and is returned through the existing generic
tool error handling.
