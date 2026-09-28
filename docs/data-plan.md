# Week 3 Data Plan — Job Application Tracker

Written before any handler is wired to real data, per the Week 3 task rule:
_"Do not implement all handlers until this file exists."_

## Why this looks different from the starter mapping

The Week 3 brief's starter mapping (Notes → markdown, Weather → Open-Meteo,
Quotes → Quotable, etc.) assumes each tool talks to a different kind of
source. Our P0 tools don't — `docs/design.md` already commits us to **"No
paid APIs or external services of any kind — all data lives locally."** The
tools share one `ApplicationRepository`: SQLite at `./data/applications.sqlite`
by default, or the atomic JSON store at `./data/applications.json` when
`STORAGE=json` is set. An empty SQLite database imports an existing JSON file
once, or uses the committed `./data/sample-data.json` if no JSON exists.
There's no network call to lose on Demo Day, which trivially satisfies the
"must work if Wi-Fi dies" rule — but we still document failure modes below,
since a local file can still be missing, empty, or malformed.

We have **4 P0 tools**, not 3 (`add_application`, `update_status`,
`list_applications`, `get_next_actions`), matching the Tool Inventory table
in `docs/design.md`.

## Data Plan Table

| tool                | source                 | fixture path                          | auth | failure modes                                                                                                                                                                                                                |
| ------------------- | ---------------------- | ------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_application`   | `ApplicationRepository` | SQLite or JSON repository             | none | sample missing/unreadable; malformed legacy JSON; duplicate company/role warning; invalid `date_applied`; concurrent updates                                                                                                 |
| `update_status`     | `ApplicationRepository` | SQLite or JSON repository             | none | `id` not found; invalid `new_status`; database/file unavailable; invalid stored record                                                                                                                                       |
| `list_applications` | `ApplicationRepository` | SQLite or JSON repository             | none | sample missing on first use; empty store; malformed JSON or database record; invalid `status` filter                                                                                                                         |
| `get_next_actions`  | `ApplicationRepository` | SQLite or JSON repository             | none | sample missing on first use; malformed date in stored record; timezone/date boundary; no matching action (valid empty state); large store should degrade gracefully                                                           |

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
- SQLite (`./data/applications.sqlite`) is the default, ignored runtime store.
- Set `STORAGE=json` to use ignored per-user `./data/applications.json`; its
  missing-file path initializes from the sample.
- All handlers use the same repository contract, so storage choice does not
  change tool behavior or create per-tool fixtures.

## Missing-File Behavior

When the JSON runtime file is absent, the repository reads the sample and
creates the runtime file with exclusive-create semantics. A new empty SQLite
database imports an existing JSON runtime file when available, otherwise it
loads the sample once. A missing/unreadable sample or malformed runtime data
remains an error and is returned through the existing generic tool handling.
