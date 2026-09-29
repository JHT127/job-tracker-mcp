# Building the Job Application Tracker MCP Server

## Requirements

We set out to build an MCP (Model Context Protocol) server to manage job application records through natural conversation with an AI assistant, instead of a manual spreadsheet. The scope was a full CRUD tool:

- Add a job application (company, role, date applied, source, notes).
- List applications, with the ability to filter by status.
- Update an application's status as it moves through the pipeline (applied → interview → offer/rejected).
- Delete an application.
- Suggest next actions based on stored application data.

## Design

We built the server in TypeScript, with work split by tool: Razan built `add_application`, Shahd built `update_status`, Joud built `get_next_actions`, and Taima built `list_applications`. Razan, Shahd, and Taima later built `delete_application` together to close out the CRUD set.

All input is validated with **Zod v4** schemas (company, role, date_applied, status, source, notes), so malformed input is rejected before it reaches storage. Data is stored in a local JSON file, loaded and saved through shared helper functions. We later added a companion dashboard for a visual view of the same data.

## Bug and Fix

During development, we found that applications added through `add_application` weren't appearing in `list_applications` — the two tools weren't reading and writing from the same source of truth. We traced the issue to `loadApplications()` and re-wired the helper functions so both tools operated on the same data source.

## Testing

Once the bug was fixed and `delete_application` was complete, we validated the full CRUD set with a structured test sequence, calling `list_applications` before and after every mutation:

**List → Add → List → Update → List → Delete → List**

Every step returned PASS: the new record appeared after Add, the status change was reflected after Update, and the record was removed after Delete, with the count returning to baseline.

## Result

Full project, including the MCP server and dashboard: **https://github.com/JHT127/my-first-mcp**
