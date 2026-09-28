# ROLE

You are a senior TypeScript engineer and open-source maintainer. You are upgrading the repository in this workspace (a Job Application Tracker MCP server) into a polished, well-tested, portfolio-grade open-source project that real users benefit from and recruiters are impressed by.

# HOW YOU MUST WORK (NON-NEGOTIABLE)

1. Read the entire repo first (src/, docs/, data/, job-tracker-dashboard/, README, package.json). Summarize your understanding in PROGRESS.md before changing anything.
2. Work in the phases below, IN ORDER. Do not start a phase until the previous phase's Gate passes.
3. Maintain `PROGRESS.md` at the repo root: a checklist of every task, with status (todo / in-progress / done), notes, and the exact commands you ran to verify it. Update it after every task.
4. After every task, run the verification commands (install, typecheck, lint, test, build). If anything fails, fix it before moving on. Never leave the repo in a broken state.
5. Make small, logical git commits using Conventional Commits (`fix:`, `feat:`, `test:`, `docs:`, `chore:`), one per task or tight group of tasks.
6. Do NOT stop, summarize, or ask me questions until every phase Gate and the Final Definition of Done are satisfied. If something is ambiguous, choose the most reasonable option, document the decision in `docs/decisions.md`, and continue.
7. Never fake results. Do not stub features and claim they work. Do not write tests that assert nothing. Do not weaken or delete a failing test to make it pass. If a feature needs credentials you don't have (Google, Notion, Gmail, Telegram), implement it fully against the real API using environment variables, add an interface + mock for tests, and document exactly how I set it up. Mark it "requires credentials" in PROGRESS.md.
8. Never commit secrets. Never scrape LinkedIn (terms violation); support manual export import only.
9. Keep backward compatibility with existing tool names and their input schemas unless a change is documented in CHANGELOG.md.
10. No dead code, no unused variables, no `any` (unless justified with a comment), no hardcoded dates.

# KNOWN BUGS TO FIX (verified by me)

- `src/tools/getNextActions.ts`: the response object references an undefined variable `limit` (ReferenceError swallowed by catch, so the tool returns "Unable to compute next actions" whenever actions exist). It also builds an unused `text` variable and returns a different JSON than intended. Fix, and add a regression test that would have caught it.
- Hardcoded "today" (`2026-07-31` in the server, `2026-08-24` in the dashboard). Inject a clock/`now` parameter everywhere; default to the real current date.
- "Stale" and "recently updated" are computed from `date_applied` because no `updated_at` exists. Add `updated_at` and a `history[]` of status changes (status, timestamp). Skip terminal statuses (`rejected`, `offer`) when suggesting follow-ups. Migrate existing data safely.
- Non-atomic writes and no locking in `saveApplications` (crash or concurrent calls can corrupt data). Use write-to-temp-then-rename plus an in-process mutex, or move to SQLite (Phase 2).
- The dashboard uses a hardcoded SEED and localStorage instead of real data (two sources of truth).
- `package.json` test script is a placeholder; there is no test runner, lint, CI, or build script.
- Design doc (`docs/design.md`) lists tools that are not implemented: `get_stale_applications`, `get_conversion_stats`, `get_health_score`, `add_contact`, `get_reconnect_suggestions`.
- Repo hygiene: a 2 MB PDF in docs/, a file named `blog-post-mcp-journey (2).md`, real-looking data committed in `data/applications.json`, duplicated README sections, Windows-only setup instructions.

# PHASE 0 — Baseline and tooling

- Add vitest, ESLint (typescript-eslint), Prettier, `tsc --noEmit` typecheck, TypeScript strict mode, a real `build` script (output to `dist/`), `bin` entry, and scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:coverage`, `inspect`.
- Add GitHub Actions CI (install, typecheck, lint, test with coverage, build) on push and PR, Node LTS matrix.
- Add Husky + lint-staged pre-commit.
- Clean the repo (hygiene items above). Move data to `data/sample-data.json`; gitignore `data/applications.json`; the server must auto-create the real data file from a sample on first run.
- GATE 0: clean install works; typecheck, lint, test, build all pass in CI-equivalent local run.

# PHASE 1 — Fix bugs and harden the core

- Fix every bug in the Known Bugs list.
- Refactor into a shared `src/core/` layer (pure business logic, no MCP or HTTP imports): repository interface, application service, next-actions engine, stats. MCP tools, REST API, CLI and dashboard must all call this layer.
- Storage behind an interface `ApplicationRepository` with two implementations: `JsonFileRepository` (atomic writes, mutex) and `SqliteRepository` (better-sqlite3 or Drizzle, with migrations). Selected by env var `STORAGE=json|sqlite` (default sqlite; provide an automatic JSON-to-SQLite import).
- Extend the data model: `updated_at`, `history[]`, `salary`, `location`, `work_mode` (remote/hybrid/onsite), `job_url`, `priority`, `tags[]`, `deadline`, `resume_version`. Keep existing fields valid.
- Add `update_application` (edit any field), `undo_last_change`, duplicate detection on add (warn, don't block), and a confirmation flow for delete (use MCP elicitation if the SDK supports it; otherwise a `confirm: true` parameter).
- Next-actions engine: priority scoring (days waiting, status, source, deadline, priority), per-status follow-up rules (configurable), terminal statuses excluded, deterministic with injected clock.
- GATE 1: unit tests cover the core at >= 90% line coverage; regression tests exist for each fixed bug; migration from old data format is tested.

# PHASE 2 — New MCP tools, resources and prompts

Implement with Zod schemas, clear descriptions, correct annotations (readOnlyHint / destructiveHint), pagination/limits, and helpful error messages:

- `get_stale_applications(days_threshold)`, `get_conversion_stats`, `get_health_score` (score + human-readable reasons)
- Contacts CRM: `add_contact`, `list_contacts`, `link_contact_to_application`, `get_reconnect_suggestions`
- Interviews: `add_interview` (date, type, interviewer, prep notes), `list_upcoming_interviews`
- `parse_job_posting` (accepts pasted text or a URL fetched politely with timeout and size limit; extracts company, role, location, requirements, salary; optionally creates the application)
- `match_cv_to_job` (accepts CV text + job description; returns matched skills, gaps, suggested keywords; deterministic logic, no paid API required)
- `draft_followup_email`, `draft_thank_you` (template-based from the application history and contact)
- `generate_interview_prep` (structured checklist and STAR prompts for the role)
- `weekly_report`
- `bulk_import` (CSV; LinkedIn/Notion export format) and `export` (CSV, Markdown, JSON)
- MCP Resources (e.g. `applications://all`, `applications://{id}`, `stats://summary`) and MCP Prompts (`weekly-review`, `prepare-interview`, `what-should-i-do-today`).
- Support both stdio and Streamable HTTP transports.
- Update tests: every tool has success, validation-failure, not-found and edge-case tests. Add an end-to-end test that spawns the built server and calls every tool through the MCP client SDK.
- GATE 2: all tools listed by the MCP Inspector/E2E test with correct schemas; E2E suite passes.

# PHASE 3 — REST API

- Add an HTTP server (Hono or Fastify) that reuses `src/core/`. Endpoints: CRUD for applications, contacts, interviews; `PATCH /applications/:id/status`; `GET /stats`; `GET /next-actions`; `GET /health`; import/export.
- API-key auth (env `API_KEY`), rate limiting, CORS config, input validation with Zod, consistent error format, request logging (pino).
- OpenAPI spec generated from the Zod schemas, served at `/docs` (Swagger UI or Scalar). Commit the generated `openapi.json` and add a CI check that it is up to date.
- Webhooks: register URLs for `application.status_changed` events, with HMAC signatures and retry.
- GATE 3: API integration tests (supertest or equivalent) cover every endpoint, including auth failures and validation errors.

# PHASE 4 — Integrations (each behind an interface, with mocks in tests)

- Google Calendar: create/update/delete events for interviews and follow-up reminders (OAuth flow documented, tokens stored outside the repo).
- Notion: two-way sync of applications with a Notion database (create DB schema helper, conflict handling via `updated_at`).
- Gmail: detect interview/rejection/offer emails via read-only scope and propose status updates (never change status silently; require confirmation).
- Notifications: Telegram bot and generic webhook/Slack/Discord notifier for daily "what should I do today".
- Optional: `find_jobs` tool using a free job API (Remotive/Adzuna) with results mapped to add_application.
- Each integration: config validation on startup, clear error messages when credentials are missing (feature disabled, server still starts), `docs/integrations/<name>.md` with step-by-step setup.
- GATE 4: integration code is covered by tests using mocked clients; the server starts and works with zero integrations configured.

# PHASE 5 — Dashboard

- Connect `job-tracker-dashboard` to the REST API (remove SEED and localStorage as the source of truth; keep localStorage only for UI preferences).
- Add: drag-and-drop Kanban by status, timeline view, calendar view of interviews/deadlines, search + filters, charts (funnel, applications per week, conversion by source), contacts page, dark mode, responsive/mobile layout, PWA (installable), accessibility (keyboard nav, ARIA, contrast), i18n with English and Arabic (including RTL).
- Add an AI-chat-style command bar OR a clearly documented "Connect Claude" panel that shows the MCP config for the user's OS.
- Add a hosted-demo build mode (`VITE_DEMO=true`) that runs entirely on in-memory sample data so it can be deployed to Vercel/Netlify with no backend.
- Add component tests (vitest + Testing Library) and one Playwright smoke test of the main flows.
- GATE 5: `npm run build` for the dashboard succeeds, tests pass, Lighthouse accessibility >= 90 (document the result).

# PHASE 6 — Generalize and package

- Make statuses and fields configurable (a `tracker.config.json`), so the same tool works for jobs, scholarships, university applications, and visas. Default config remains "jobs".
- Structured logging, error codes, secret redaction in logs.
- Dockerfile (multi-stage, non-root) and docker-compose (API + dashboard). Publish-ready npm package so `npx job-tracker-mcp` starts the stdio server (do not publish; prepare and verify with `npm pack` and a local install test).
- SECURITY.md and docs/threat-model.md updated for the new attack surface (HTTP API, integrations, URL fetching: SSRF protections required for `parse_job_posting`).
- GATE 6: `docker build` succeeds (or, if Docker is unavailable, the Dockerfile is validated with hadolint and you state this clearly); `npm pack` install test passes.

# PHASE 7 — Documentation and presentation

- Rewrite README: one-line pitch, why it exists, feature table, 3-command quick start, Claude Desktop/Cursor/VS Code config for Windows, macOS and Linux, architecture diagram (Mermaid), screenshots placeholders with exact capture instructions, tool reference table generated from the actual Zod schemas (script + CI check), badges (CI, coverage, license, npm).
- Add: CHANGELOG.md (Keep a Changelog), CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue and PR templates, ROADMAP.md, `docs/architecture.md`, `docs/api.md`, `docs/demo-script.md` (updated), `examples/` updated to every new tool.
- Bump version to 1.0.0 and tag notes in CHANGELOG.
- GATE 7: every link and command in the docs is verified; a fresh clone following the README quick start works end to end (test this literally in a temp directory).

# FINAL DEFINITION OF DONE (all must be true before you stop)

1. `npm ci && npm run typecheck && npm run lint && npm run test:coverage && npm run build` passes at the root and in the dashboard, with no warnings you can fix.
2. Overall coverage >= 85% lines for `src/core` and `src/tools`; all bugs in the Known Bugs list have regression tests.
3. E2E test proves every MCP tool works through a real MCP client against the built server.
4. Fresh-clone test: clone into a temp dir, follow the README, and the server + API + dashboard run.
5. No secrets, no hardcoded dates, no `TODO`/`FIXME` left, no skipped or commented-out tests.
6. PROGRESS.md shows every task done, with the verification command output summarized. Any credential-dependent feature is listed with exact setup steps.
7. `git log` is clean and follows Conventional Commits.

When you believe you are done, do a final self-audit: re-read this file top to bottom, and for each requirement write "PASS" or "FAIL" with evidence in PROGRESS.md. If any line is FAIL, fix it and re-audit. Only then reply with a final summary and a list of things I must do manually (credentials, deployment, screenshots).

# ROLE

You are a senior TypeScript engineer and open-source maintainer. You are upgrading the repository in this workspace (a Job Application Tracker MCP server) into a polished, well-tested, portfolio-grade open-source project that real users benefit from and recruiters are impressed by.

# HOW YOU MUST WORK (NON-NEGOTIABLE)

1. Read the entire repo first (src/, docs/, data/, job-tracker-dashboard/, README, package.json). Summarize your understanding in PROGRESS.md before changing anything.
2. Work in the phases below, IN ORDER. Do not start a phase until the previous phase's Gate passes.
3. Maintain `PROGRESS.md` at the repo root: a checklist of every task, with status (todo / in-progress / done), notes, and the exact commands you ran to verify it. Update it after every task.
4. After every task, run the verification commands (install, typecheck, lint, test, build). If anything fails, fix it before moving on. Never leave the repo in a broken state.
5. Make small, logical git commits using Conventional Commits (`fix:`, `feat:`, `test:`, `docs:`, `chore:`), one per task or tight group of tasks.
6. Do NOT stop, summarize, or ask me questions until every phase Gate and the Final Definition of Done are satisfied. If something is ambiguous, choose the most reasonable option, document the decision in `docs/decisions.md`, and continue.
7. Never fake results. Do not stub features and claim they work. Do not write tests that assert nothing. Do not weaken or delete a failing test to make it pass. If a feature needs credentials you don't have (Google, Notion, Gmail, Telegram), implement it fully against the real API using environment variables, add an interface + mock for tests, and document exactly how I set it up. Mark it "requires credentials" in PROGRESS.md.
8. Never commit secrets. Never scrape LinkedIn (terms violation); support manual export import only.
9. Keep backward compatibility with existing tool names and their input schemas unless a change is documented in CHANGELOG.md.
10. No dead code, no unused variables, no `any` (unless justified with a comment), no hardcoded dates.

# KNOWN BUGS TO FIX (verified by me)

- `src/tools/getNextActions.ts`: the response object references an undefined variable `limit` (ReferenceError swallowed by catch, so the tool returns "Unable to compute next actions" whenever actions exist). It also builds an unused `text` variable and returns a different JSON than intended. Fix, and add a regression test that would have caught it.
- Hardcoded "today" (`2026-07-31` in the server, `2026-08-24` in the dashboard). Inject a clock/`now` parameter everywhere; default to the real current date.
- "Stale" and "recently updated" are computed from `date_applied` because no `updated_at` exists. Add `updated_at` and a `history[]` of status changes (status, timestamp). Skip terminal statuses (`rejected`, `offer`) when suggesting follow-ups. Migrate existing data safely.
- Non-atomic writes and no locking in `saveApplications` (crash or concurrent calls can corrupt data). Use write-to-temp-then-rename plus an in-process mutex, or move to SQLite (Phase 2).
- The dashboard uses a hardcoded SEED and localStorage instead of real data (two sources of truth).
- `package.json` test script is a placeholder; there is no test runner, lint, CI, or build script.
- Design doc (`docs/design.md`) lists tools that are not implemented: `get_stale_applications`, `get_conversion_stats`, `get_health_score`, `add_contact`, `get_reconnect_suggestions`.
- Repo hygiene: a 2 MB PDF in docs/, a file named `blog-post-mcp-journey (2).md`, real-looking data committed in `data/applications.json`, duplicated README sections, Windows-only setup instructions.

# PHASE 0 — Baseline and tooling

- Add vitest, ESLint (typescript-eslint), Prettier, `tsc --noEmit` typecheck, TypeScript strict mode, a real `build` script (output to `dist/`), `bin` entry, and scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:coverage`, `inspect`.
- Add GitHub Actions CI (install, typecheck, lint, test with coverage, build) on push and PR, Node LTS matrix.
- Add Husky + lint-staged pre-commit.
- Clean the repo (hygiene items above). Move data to `data/sample-data.json`; gitignore `data/applications.json`; the server must auto-create the real data file from a sample on first run.
- GATE 0: clean install works; typecheck, lint, test, build all pass in CI-equivalent local run.

# PHASE 1 — Fix bugs and harden the core

- Fix every bug in the Known Bugs list.
- Refactor into a shared `src/core/` layer (pure business logic, no MCP or HTTP imports): repository interface, application service, next-actions engine, stats. MCP tools, REST API, CLI and dashboard must all call this layer.
- Storage behind an interface `ApplicationRepository` with two implementations: `JsonFileRepository` (atomic writes, mutex) and `SqliteRepository` (better-sqlite3 or Drizzle, with migrations). Selected by env var `STORAGE=json|sqlite` (default sqlite; provide an automatic JSON-to-SQLite import).
- Extend the data model: `updated_at`, `history[]`, `salary`, `location`, `work_mode` (remote/hybrid/onsite), `job_url`, `priority`, `tags[]`, `deadline`, `resume_version`. Keep existing fields valid.
- Add `update_application` (edit any field), `undo_last_change`, duplicate detection on add (warn, don't block), and a confirmation flow for delete (use MCP elicitation if the SDK supports it; otherwise a `confirm: true` parameter).
- Next-actions engine: priority scoring (days waiting, status, source, deadline, priority), per-status follow-up rules (configurable), terminal statuses excluded, deterministic with injected clock.
- GATE 1: unit tests cover the core at >= 90% line coverage; regression tests exist for each fixed bug; migration from old data format is tested.

# PHASE 2 — New MCP tools, resources and prompts

Implement with Zod schemas, clear descriptions, correct annotations (readOnlyHint / destructiveHint), pagination/limits, and helpful error messages:

- `get_stale_applications(days_threshold)`, `get_conversion_stats`, `get_health_score` (score + human-readable reasons)
- Contacts CRM: `add_contact`, `list_contacts`, `link_contact_to_application`, `get_reconnect_suggestions`
- Interviews: `add_interview` (date, type, interviewer, prep notes), `list_upcoming_interviews`
- `parse_job_posting` (accepts pasted text or a URL fetched politely with timeout and size limit; extracts company, role, location, requirements, salary; optionally creates the application)
- `match_cv_to_job` (accepts CV text + job description; returns matched skills, gaps, suggested keywords; deterministic logic, no paid API required)
- `draft_followup_email`, `draft_thank_you` (template-based from the application history and contact)
- `generate_interview_prep` (structured checklist and STAR prompts for the role)
- `weekly_report`
- `bulk_import` (CSV; LinkedIn/Notion export format) and `export` (CSV, Markdown, JSON)
- MCP Resources (e.g. `applications://all`, `applications://{id}`, `stats://summary`) and MCP Prompts (`weekly-review`, `prepare-interview`, `what-should-i-do-today`).
- Support both stdio and Streamable HTTP transports.
- Update tests: every tool has success, validation-failure, not-found and edge-case tests. Add an end-to-end test that spawns the built server and calls every tool through the MCP client SDK.
- GATE 2: all tools listed by the MCP Inspector/E2E test with correct schemas; E2E suite passes.

# PHASE 3 — REST API

- Add an HTTP server (Hono or Fastify) that reuses `src/core/`. Endpoints: CRUD for applications, contacts, interviews; `PATCH /applications/:id/status`; `GET /stats`; `GET /next-actions`; `GET /health`; import/export.
- API-key auth (env `API_KEY`), rate limiting, CORS config, input validation with Zod, consistent error format, request logging (pino).
- OpenAPI spec generated from the Zod schemas, served at `/docs` (Swagger UI or Scalar). Commit the generated `openapi.json` and add a CI check that it is up to date.
- Webhooks: register URLs for `application.status_changed` events, with HMAC signatures and retry.
- GATE 3: API integration tests (supertest or equivalent) cover every endpoint, including auth failures and validation errors.

# PHASE 4 — Integrations (each behind an interface, with mocks in tests)

- Google Calendar: create/update/delete events for interviews and follow-up reminders (OAuth flow documented, tokens stored outside the repo).
- Notion: two-way sync of applications with a Notion database (create DB schema helper, conflict handling via `updated_at`).
- Gmail: detect interview/rejection/offer emails via read-only scope and propose status updates (never change status silently; require confirmation).
- Notifications: Telegram bot and generic webhook/Slack/Discord notifier for daily "what should I do today".
- Optional: `find_jobs` tool using a free job API (Remotive/Adzuna) with results mapped to add_application.
- Each integration: config validation on startup, clear error messages when credentials are missing (feature disabled, server still starts), `docs/integrations/<name>.md` with step-by-step setup.
- GATE 4: integration code is covered by tests using mocked clients; the server starts and works with zero integrations configured.

# PHASE 5 — Dashboard

- Connect `job-tracker-dashboard` to the REST API (remove SEED and localStorage as the source of truth; keep localStorage only for UI preferences).
- Add: drag-and-drop Kanban by status, timeline view, calendar view of interviews/deadlines, search + filters, charts (funnel, applications per week, conversion by source), contacts page, dark mode, responsive/mobile layout, PWA (installable), accessibility (keyboard nav, ARIA, contrast), i18n with English and Arabic (including RTL).
- Add an AI-chat-style command bar OR a clearly documented "Connect Claude" panel that shows the MCP config for the user's OS.
- Add a hosted-demo build mode (`VITE_DEMO=true`) that runs entirely on in-memory sample data so it can be deployed to Vercel/Netlify with no backend.
- Add component tests (vitest + Testing Library) and one Playwright smoke test of the main flows.
- GATE 5: `npm run build` for the dashboard succeeds, tests pass, Lighthouse accessibility >= 90 (document the result).

# PHASE 6 — Generalize and package

- Make statuses and fields configurable (a `tracker.config.json`), so the same tool works for jobs, scholarships, university applications, and visas. Default config remains "jobs".
- Structured logging, error codes, secret redaction in logs.
- Dockerfile (multi-stage, non-root) and docker-compose (API + dashboard). Publish-ready npm package so `npx job-tracker-mcp` starts the stdio server (do not publish; prepare and verify with `npm pack` and a local install test).
- SECURITY.md and docs/threat-model.md updated for the new attack surface (HTTP API, integrations, URL fetching: SSRF protections required for `parse_job_posting`).
- GATE 6: `docker build` succeeds (or, if Docker is unavailable, the Dockerfile is validated with hadolint and you state this clearly); `npm pack` install test passes.

# PHASE 7 — Documentation and presentation

- Rewrite README: one-line pitch, why it exists, feature table, 3-command quick start, Claude Desktop/Cursor/VS Code config for Windows, macOS and Linux, architecture diagram (Mermaid), screenshots placeholders with exact capture instructions, tool reference table generated from the actual Zod schemas (script + CI check), badges (CI, coverage, license, npm).
- Add: CHANGELOG.md (Keep a Changelog), CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue and PR templates, ROADMAP.md, `docs/architecture.md`, `docs/api.md`, `docs/demo-script.md` (updated), `examples/` updated to every new tool.
- Bump version to 1.0.0 and tag notes in CHANGELOG.
- GATE 7: every link and command in the docs is verified; a fresh clone following the README quick start works end to end (test this literally in a temp directory).

# FINAL DEFINITION OF DONE (all must be true before you stop)

1. `npm ci && npm run typecheck && npm run lint && npm run test:coverage && npm run build` passes at the root and in the dashboard, with no warnings you can fix.
2. Overall coverage >= 85% lines for `src/core` and `src/tools`; all bugs in the Known Bugs list have regression tests.
3. E2E test proves every MCP tool works through a real MCP client against the built server.
4. Fresh-clone test: clone into a temp dir, follow the README, and the server + API + dashboard run.
5. No secrets, no hardcoded dates, no `TODO`/`FIXME` left, no skipped or commented-out tests.
6. PROGRESS.md shows every task done, with the verification command output summarized. Any credential-dependent feature is listed with exact setup steps.
7. `git log` is clean and follows Conventional Commits.

When you believe you are done, do a final self-audit: re-read this file top to bottom, and for each requirement write "PASS" or "FAIL" with evidence in PROGRESS.md. If any line is FAIL, fix it and re-audit. Only then reply with a final summary and a list of things I must do manually (credentials, deployment, screenshots).
# ROLE
You are a senior TypeScript engineer and open-source maintainer. You are upgrading the repository in this workspace (a Job Application Tracker MCP server) into a polished, well-tested, portfolio-grade open-source project that real users benefit from and recruiters are impressed by.

# HOW YOU MUST WORK (NON-NEGOTIABLE)
1. Read the entire repo first (src/, docs/, data/, job-tracker-dashboard/, README, package.json). Summarize your understanding in PROGRESS.md before changing anything.
2. Work in the phases below, IN ORDER. Do not start a phase until the previous phase's Gate passes.
3. Maintain `PROGRESS.md` at the repo root: a checklist of every task, with status (todo / in-progress / done), notes, and the exact commands you ran to verify it. Update it after every task.
4. After every task, run the verification commands (install, typecheck, lint, test, build). If anything fails, fix it before moving on. Never leave the repo in a broken state.
5. Make small, logical git commits using Conventional Commits (`fix:`, `feat:`, `test:`, `docs:`, `chore:`), one per task or tight group of tasks.
6. Do NOT stop, summarize, or ask me questions until every phase Gate and the Final Definition of Done are satisfied. If something is ambiguous, choose the most reasonable option, document the decision in `docs/decisions.md`, and continue.
7. Never fake results. Do not stub features and claim they work. Do not write tests that assert nothing. Do not weaken or delete a failing test to make it pass. If a feature needs credentials you don't have (Google, Notion, Gmail, Telegram), implement it fully against the real API using environment variables, add an interface + mock for tests, and document exactly how I set it up. Mark it "requires credentials" in PROGRESS.md.
8. Never commit secrets. Never scrape LinkedIn (terms violation); support manual export import only.
9. Keep backward compatibility with existing tool names and their input schemas unless a change is documented in CHANGELOG.md.
10. No dead code, no unused variables, no `any` (unless justified with a comment), no hardcoded dates.

# KNOWN BUGS TO FIX (verified by me)
- `src/tools/getNextActions.ts`: the response object references an undefined variable `limit` (ReferenceError swallowed by catch, so the tool returns "Unable to compute next actions" whenever actions exist). It also builds an unused `text` variable and returns a different JSON than intended. Fix, and add a regression test that would have caught it.
- Hardcoded "today" (`2026-07-31` in the server, `2026-08-24` in the dashboard). Inject a clock/`now` parameter everywhere; default to the real current date.
- "Stale" and "recently updated" are computed from `date_applied` because no `updated_at` exists. Add `updated_at` and a `history[]` of status changes (status, timestamp). Skip terminal statuses (`rejected`, `offer`) when suggesting follow-ups. Migrate existing data safely.
- Non-atomic writes and no locking in `saveApplications` (crash or concurrent calls can corrupt data). Use write-to-temp-then-rename plus an in-process mutex, or move to SQLite (Phase 2).
- The dashboard uses a hardcoded SEED and localStorage instead of real data (two sources of truth).
- `package.json` test script is a placeholder; there is no test runner, lint, CI, or build script.
- Design doc (`docs/design.md`) lists tools that are not implemented: `get_stale_applications`, `get_conversion_stats`, `get_health_score`, `add_contact`, `get_reconnect_suggestions`.
- Repo hygiene: a 2 MB PDF in docs/, a file named `blog-post-mcp-journey (2).md`, real-looking data committed in `data/applications.json`, duplicated README sections, Windows-only setup instructions.

# PHASE 0 — Baseline and tooling
- Add vitest, ESLint (typescript-eslint), Prettier, `tsc --noEmit` typecheck, TypeScript strict mode, a real `build` script (output to `dist/`), `bin` entry, and scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:coverage`, `inspect`.
- Add GitHub Actions CI (install, typecheck, lint, test with coverage, build) on push and PR, Node LTS matrix.
- Add Husky + lint-staged pre-commit.
- Clean the repo (hygiene items above). Move data to `data/sample-data.json`; gitignore `data/applications.json`; the server must auto-create the real data file from a sample on first run.
- GATE 0: clean install works; typecheck, lint, test, build all pass in CI-equivalent local run.

# PHASE 1 — Fix bugs and harden the core
- Fix every bug in the Known Bugs list.
- Refactor into a shared `src/core/` layer (pure business logic, no MCP or HTTP imports): repository interface, application service, next-actions engine, stats. MCP tools, REST API, CLI and dashboard must all call this layer.
- Storage behind an interface `ApplicationRepository` with two implementations: `JsonFileRepository` (atomic writes, mutex) and `SqliteRepository` (better-sqlite3 or Drizzle, with migrations). Selected by env var `STORAGE=json|sqlite` (default sqlite; provide an automatic JSON-to-SQLite import).
- Extend the data model: `updated_at`, `history[]`, `salary`, `location`, `work_mode` (remote/hybrid/onsite), `job_url`, `priority`, `tags[]`, `deadline`, `resume_version`. Keep existing fields valid.
- Add `update_application` (edit any field), `undo_last_change`, duplicate detection on add (warn, don't block), and a confirmation flow for delete (use MCP elicitation if the SDK supports it; otherwise a `confirm: true` parameter).
- Next-actions engine: priority scoring (days waiting, status, source, deadline, priority), per-status follow-up rules (configurable), terminal statuses excluded, deterministic with injected clock.
- GATE 1: unit tests cover the core at >= 90% line coverage; regression tests exist for each fixed bug; migration from old data format is tested.

# PHASE 2 — New MCP tools, resources and prompts
Implement with Zod schemas, clear descriptions, correct annotations (readOnlyHint / destructiveHint), pagination/limits, and helpful error messages:
- `get_stale_applications(days_threshold)`, `get_conversion_stats`, `get_health_score` (score + human-readable reasons)
- Contacts CRM: `add_contact`, `list_contacts`, `link_contact_to_application`, `get_reconnect_suggestions`
- Interviews: `add_interview` (date, type, interviewer, prep notes), `list_upcoming_interviews`
- `parse_job_posting` (accepts pasted text or a URL fetched politely with timeout and size limit; extracts company, role, location, requirements, salary; optionally creates the application)
- `match_cv_to_job` (accepts CV text + job description; returns matched skills, gaps, suggested keywords; deterministic logic, no paid API required)
- `draft_followup_email`, `draft_thank_you` (template-based from the application history and contact)
- `generate_interview_prep` (structured checklist and STAR prompts for the role)
- `weekly_report`
- `bulk_import` (CSV; LinkedIn/Notion export format) and `export` (CSV, Markdown, JSON)
- MCP Resources (e.g. `applications://all`, `applications://{id}`, `stats://summary`) and MCP Prompts (`weekly-review`, `prepare-interview`, `what-should-i-do-today`).
- Support both stdio and Streamable HTTP transports.
- Update tests: every tool has success, validation-failure, not-found and edge-case tests. Add an end-to-end test that spawns the built server and calls every tool through the MCP client SDK.
- GATE 2: all tools listed by the MCP Inspector/E2E test with correct schemas; E2E suite passes.

# PHASE 3 — REST API
- Add an HTTP server (Hono or Fastify) that reuses `src/core/`. Endpoints: CRUD for applications, contacts, interviews; `PATCH /applications/:id/status`; `GET /stats`; `GET /next-actions`; `GET /health`; import/export.
- API-key auth (env `API_KEY`), rate limiting, CORS config, input validation with Zod, consistent error format, request logging (pino).
- OpenAPI spec generated from the Zod schemas, served at `/docs` (Swagger UI or Scalar). Commit the generated `openapi.json` and add a CI check that it is up to date.
- Webhooks: register URLs for `application.status_changed` events, with HMAC signatures and retry.
- GATE 3: API integration tests (supertest or equivalent) cover every endpoint, including auth failures and validation errors.

# PHASE 4 — Integrations (each behind an interface, with mocks in tests)
- Google Calendar: create/update/delete events for interviews and follow-up reminders (OAuth flow documented, tokens stored outside the repo).
- Notion: two-way sync of applications with a Notion database (create DB schema helper, conflict handling via `updated_at`).
- Gmail: detect interview/rejection/offer emails via read-only scope and propose status updates (never change status silently; require confirmation).
- Notifications: Telegram bot and generic webhook/Slack/Discord notifier for daily "what should I do today".
- Optional: `find_jobs` tool using a free job API (Remotive/Adzuna) with results mapped to add_application.
- Each integration: config validation on startup, clear error messages when credentials are missing (feature disabled, server still starts), `docs/integrations/<name>.md` with step-by-step setup.
- GATE 4: integration code is covered by tests using mocked clients; the server starts and works with zero integrations configured.

# PHASE 5 — Dashboard
- Connect `job-tracker-dashboard` to the REST API (remove SEED and localStorage as the source of truth; keep localStorage only for UI preferences).
- Add: drag-and-drop Kanban by status, timeline view, calendar view of interviews/deadlines, search + filters, charts (funnel, applications per week, conversion by source), contacts page, dark mode, responsive/mobile layout, PWA (installable), accessibility (keyboard nav, ARIA, contrast), i18n with English and Arabic (including RTL).
- Add an AI-chat-style command bar OR a clearly documented "Connect Claude" panel that shows the MCP config for the user's OS.
- Add a hosted-demo build mode (`VITE_DEMO=true`) that runs entirely on in-memory sample data so it can be deployed to Vercel/Netlify with no backend.
- Add component tests (vitest + Testing Library) and one Playwright smoke test of the main flows.
- GATE 5: `npm run build` for the dashboard succeeds, tests pass, Lighthouse accessibility >= 90 (document the result).

# PHASE 6 — Generalize and package
- Make statuses and fields configurable (a `tracker.config.json`), so the same tool works for jobs, scholarships, university applications, and visas. Default config remains "jobs".
- Structured logging, error codes, secret redaction in logs.
- Dockerfile (multi-stage, non-root) and docker-compose (API + dashboard). Publish-ready npm package so `npx job-tracker-mcp` starts the stdio server (do not publish; prepare and verify with `npm pack` and a local install test).
- SECURITY.md and docs/threat-model.md updated for the new attack surface (HTTP API, integrations, URL fetching: SSRF protections required for `parse_job_posting`).
- GATE 6: `docker build` succeeds (or, if Docker is unavailable, the Dockerfile is validated with hadolint and you state this clearly); `npm pack` install test passes.

# PHASE 7 — Documentation and presentation
- Rewrite README: one-line pitch, why it exists, feature table, 3-command quick start, Claude Desktop/Cursor/VS Code config for Windows, macOS and Linux, architecture diagram (Mermaid), screenshots placeholders with exact capture instructions, tool reference table generated from the actual Zod schemas (script + CI check), badges (CI, coverage, license, npm).
- Add: CHANGELOG.md (Keep a Changelog), CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue and PR templates, ROADMAP.md, `docs/architecture.md`, `docs/api.md`, `docs/demo-script.md` (updated), `examples/` updated to every new tool.
- Bump version to 1.0.0 and tag notes in CHANGELOG.
- GATE 7: every link and command in the docs is verified; a fresh clone following the README quick start works end to end (test this literally in a temp directory).

# FINAL DEFINITION OF DONE (all must be true before you stop)
1. `npm ci && npm run typecheck && npm run lint && npm run test:coverage && npm run build` passes at the root and in the dashboard, with no warnings you can fix.
2. Overall coverage >= 85% lines for `src/core` and `src/tools`; all bugs in the Known Bugs list have regression tests.
3. E2E test proves every MCP tool works through a real MCP client against the built server.
4. Fresh-clone test: clone into a temp dir, follow the README, and the server + API + dashboard run.
5. No secrets, no hardcoded dates, no `TODO`/`FIXME` left, no skipped or commented-out tests.
6. PROGRESS.md shows every task done, with the verification command output summarized. Any credential-dependent feature is listed with exact setup steps.
7. `git log` is clean and follows Conventional Commits.

When you believe you are done, do a final self-audit: re-read this file top to bottom, and for each requirement write "PASS" or "FAIL" with evidence in PROGRESS.md. If any line is FAIL, fix it and re-audit. Only then reply with a final summary and a list of things I must do manually (credentials, deployment, screenshots).