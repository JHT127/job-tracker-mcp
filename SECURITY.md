# Security Policy

## Supported Versions

This is a student learning project. Only the current version in this repository is supported — no older versions are maintained.

## Reporting a Vulnerability

If you discover a security issue in this project, please report it to the course mentor at: **info@nextflows.ai**

## Hardening Summary

### `add_application` (Razan)

- All input fields validated with Zod before the tool runs: `company`/`role` are non-empty, capped at 100 characters, and must contain letters; `date_applied` must match `YYYY-MM-DD`; `status`/`source` are restricted to fixed allowlists.
- `notes` is optional, capped at 500 characters. `status`/`source` fall back to safe defaults when omitted.
- Errors are caught and returned as a short message — no raw stack traces exposed to the model. Errors are also logged locally.
- Data is written only to `./data/applications.json`; no external APIs or API keys are used.

### `update_status` (Shahd)

- Defense in depth: `new_status` is validated twice — once by the Zod input schema at the tool boundary, and again inside `updateApplicationStatus()`, so invalid values are rejected even if the function is called directly.
- `new_status` is checked against a fixed allowlist (`applied`, `interview`, `offer`, `rejected`) before any write occurs.
- If the application `id` isn't found or the status is invalid, the tool returns a short, clear error — no internal details exposed.

### `list_applications` (Taima)

- Output cap: responses are capped at 50 applications per request, with `total` (actual count) and `truncated` (boolean) so callers know when results were cut off.
- `status` filter is validated against a fixed Zod enum; any other value is rejected before the tool runs.
- On failure (missing/corrupted data file), returns a short, generic message ("Could not read applications data.") — no stack traces exposed.

### `get_next_actions` (Joud)

- Inputs validated with Zod: `limit` must be a positive integer, capped at 10 by schema; `status`, if provided, must match the fixed application-status enum.
- Defense in depth: `limit` is also clamped in the handler itself (`Math.min(Math.max(1, requestedLimit), 10)`), so a sensible bound is enforced even if the schema-level cap is ever bypassed or changed — the same double-validation pattern used in `update_status`.
- Output cap with visibility: results are sliced to the effective `limit`, and the response includes `total` (actual match count) and a `truncated` flag so the caller knows when results were cut off, mirroring `list_applications`'s truncation reporting.
- No external network calls — reads only the local `./data/applications.json` fixture via `loadApplications()`, so no request timeout is needed for this tool.
- Two-layer error handling: `loadApplications()` catches file-read/parse failures and re-throws a generic `"Could not read applications data."` (no raw fs/JSON errors surfaced); the tool handler wraps the whole call in its own try/catch, logs the full error to stderr as `[get_next_actions] error ...` for debugging, and returns a short, generic message to the model ("Unable to compute next actions.") — no stack traces or internal details exposed either way.
- Empty results are handled as a valid state, not an error: if no applications are stale or recently updated, the tool returns a short human-readable message instead of an empty/ambiguous payload.

## Secrets & Environment

- `.gitignore` excludes `.env` and `.env.local`.
- `.env.example` is provided as a placeholder; the project currently requires no API keys or secrets — all data is local, in `./data/applications.json`.
- Repository was scanned with `rg -i 'api[_-]?key|secret|token' --glob '!.git'` — no exposed secrets found.

## HTTP API and Integration Hardening

- All request bodies are parsed as JSON only for the REST API paths; malformed bodies are rejected with `VALIDATION_ERROR`/`INVALID_CSV` responses instead of crashing the process.
- API keys are optional and validated through the `x-api-key` header; headers are never logged in raw form because the structured logger redacts `authorization`, `apiKey`, `token`, `secret`, and similar fields.
- Webhook delivery signs requests with `x-jobtracker-signature` and avoids logging the raw webhook secret.
- `parse_job_posting` and URL-fetching flows must enforce SSRF protections before outbound requests: allow-listed hosts, no private network ranges, and no localhost/metadata addresses. If a URL resolves to a blocked address, the request is rejected with a structured error code.
- Docker builds run as a non-root user and the runtime image does not install extra package managers or credentials into the final image.
