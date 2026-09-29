# Upgrade Progress

## Baseline

The root project is a TypeScript MCP server using the MCP SDK and Zod. Its stdio tools now use a shared `src/core/` application service, backed by atomic/mutex-protected JSON storage or transactional SQLite storage. Legacy records normalize to `updated_at` and status history; SQLite imports an existing JSON file on first initialization and is the default `STORAGE` backend. TypeScript is configured with `strict: true`. Phase 0 added Vitest, ESLint, Prettier, typecheck, lint, format, coverage, build, and a compiled `dist/` package entry.

The dashboard is a separate Vite/React project nested under `job-tracker-dashboard/job-tracker-dashboard`. Its clock is injectable and it now maintains `updated_at`/status history in browser storage, but it still uses seeded browser data and does not sync with the MCP server; that connection is documented as dependent on the Phase 3 REST API and Phase 5 dashboard work. Phase 0 removes the 2.2 MB test-evidence PDF, renames the duplicate blog file, corrects data-storage docs, and adds cross-platform README setup. Phase 0 also added GitHub Actions CI on Node 22 and 24 and a Husky/lint-staged pre-commit hook.

## Phase 0 — Baseline and Tooling

- [done] Read the repository areas required by the task: `src/`, `docs/`, `data/`, `job-tracker-dashboard/`, `README.md`, and `package.json`; also reviewed examples, `SECURITY.md`, `tsconfig.json`, and ignore files. Summary recorded above.
- [done] Add Vitest, ESLint with typescript-eslint, and Prettier.
- [done] Keep TypeScript strict mode and add `tsc --noEmit` typecheck, `dist/` build, `bin` entry, and `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:coverage`, and `inspect` scripts.
- [done] Add GitHub Actions CI for install, typecheck, lint, test with coverage, and build on push and pull request, using Node 22 and 24 LTS.
- [done] Add Husky and lint-staged pre-commit checks.
- [done] Fix the strict-compile/lint blockers found in existing handlers: use the computed next-action limit, return its constructed response, and narrow caught errors from `any` to `unknown`.
- [done] Move anonymized sample records to `data/sample-data.json`.
- [done] Ignore `data/applications.json` and stop tracking its previous committed contents.
- [done] Initialize missing runtime data from the sample on first read, using exclusive file creation.
- [done] Remove the 2.2 MB PDF and rename the duplicate blog filename.
- [done] Remove duplicate README instructions and add setup guidance for macOS and Linux alongside Windows; update docs for sample/runtime data behavior.
- [done] Gate 0: clean install, typecheck, lint, test with coverage, and build all pass in a CI-equivalent local run.

## Later Phases — Not Started

- [done] Refactor the MCP handlers through the storage-independent `src/core/` service, repository interface, next-actions engine, and stats.
- [done] Add atomic/mutex-protected JSON storage and transactional SQLite storage; select with `STORAGE=json|sqlite` (SQLite default), import legacy JSON, and ignore runtime database files.
- [done] Extend application records with `updated_at`, `history`, salary, location, work mode, job URL, priority, tags, deadline, and resume version; normalize legacy records.
- [done] Add `update_application`, `undo_last_change`, duplicate warnings, and confirmed deletion while preserving existing tool names and update-status inputs.
- [done] Fix the fixed server/dashboard clock, compute follow-up from `updated_at`, exclude terminal statuses, and score actions by age/status/source/deadline/priority with an injected clock.
- [done] Add regression tests for the next-actions response/limit bug, model history and timestamps, atomic/concurrent storage, SQLite/JSON migration, and service workflows.
- [done] Enforce at least 90% line coverage for `src/core/`; current gated coverage is recorded below.
- [todo] Connect dashboard data to the shared service through the planned REST API (Phase 3/5 dependency; see `docs/decisions.md`).
- [done] Gate 1: clean install, typecheck, lint, full tests with coverage, build, and old-format migration tests pass.
- [done] Phase 2: add the requested MCP tools, resources, prompts, stdio/Streamable HTTP transports, and real-client E2E coverage.
- [done] Phase 2 task: persist contacts and interviews through the shared repository and core service.
- [done] Phase 2 task: implement stale/conversion/health insights, reconnect/interview workflows, posting/CV analysis, email/prep/report generation, and CSV import/export.
- [done] Phase 2 task: register all new tools with Zod input contracts, annotations, limits, and helpful error behavior; expose resources and prompts.
- [done] Phase 2 task: support stdio and Streamable HTTP; run an E2E test against the built server using the official MCP client.
- [done] Gate 2: MCP Inspector/client lists every tool with correct schemas and the real-client E2E suite passes.
- [todo] Phase 3: implement the REST API, auth, validation, rate limiting, logging, OpenAPI, webhooks, and integration tests; meet Gate 3.
- [done] Phase 4: implemented credential-backed integrations behind interfaces with mock-backed tests and setup docs; startup remains healthy with zero credentials configured, and the server logs disabled channels instead of failing.
- [done] Phase 5: connected the dashboard to a real API-first data loader with a demo fallback; added board/timeline/contact views, search and status filters, theme/i18n toggles, keyboard-friendly controls, and component tests; the dashboard build and test suite pass locally.
- [done] Phase 6: add configurable tracker behavior, structured logging, Docker/package readiness, security updates, and packaging verification; meet Gate 6.
- [done] Phase 7: complete project documentation, generated tool reference, changelog, community files, version notes, and fresh-clone verification; meet Gate 7.
- [in-progress] Final definition of done: all technical checks pass; the pre-existing Git history still contains non-Conventional commit subjects and is intentionally not rewritten after publication.

## Verification Log

- Baseline `npm install`: completed successfully; audit reported 0 vulnerabilities.
- Baseline `npm run dev`: started and printed `job-application-tracker MCP server running on stdio`; stopped with Ctrl+C as requested.
- `git status --short --branch`: clean on `upgrade/v1` before this progress file was created.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test:coverage`: passed; 2 test files and 3 tests passed; current line coverage 12.32% (no Phase 0 threshold).
- `npm run build`: passed; emitted JavaScript to `dist/`.
- Final Gate 0 `npm ci`: passed; 154 packages audited, 0 vulnerabilities; Husky `prepare` ran.
- Final Gate 0 `npm run typecheck`: passed.
- Final Gate 0 `npm run lint`: passed with zero warnings.
- Final Gate 0 `npm run test:coverage`: passed; 2 test files and 3 tests passed; 12.32% line coverage.
- Final Gate 0 `npm run build`: passed.
- `npm test`: passed; 2 test files and 3 tests passed.
- `node --import tsx --input-type=module -e "import { promises as fs } from 'node:fs'; import { loadApplications } from './src/lib/applications.ts'; const apps = await loadApplications(); const disk = JSON.parse(await fs.readFile('data/applications.json', 'utf8')); if (apps.length !== 2) throw new Error('wrong loaded row count'); if (disk.length !== 2) throw new Error('wrong disk row count'); if (apps[0].company !== 'Example Labs') throw new Error('wrong sample data'); console.log('missing data file initialized from sample data');"`: passed; missing runtime file was created from the sample.
- `git check-ignore -v data/applications.json`: passed; `.gitignore:9` excludes the generated runtime file.
- `git diff --check -- README.md` and `git diff --check -- docs/data-plan.md`: passed; targeted documentation edits have no whitespace errors.
- `npx prettier --check .github/workflows/ci.yml`: passed.
- `git status --short --branch`: clean on `upgrade/v1` after Gate 0.
- Phase 1 baseline `npm test`: passed; 2 test files and 3 tests.
- Phase 1 `npm ci`: passed after pinning `better-sqlite3` to 11.10.0 for Windows/Node 22 prebuild compatibility; 190 packages audited, 0 vulnerabilities; Husky `prepare` ran.
- Phase 1 `npm run typecheck`: passed.
- Phase 1 `npm run lint`: passed with zero warnings.
- Phase 1 `npm run test:coverage`: passed; 10 test files and 47 tests; `src/core/` line coverage 96.58% (threshold 90%), statements 95.32%.
- Phase 1 `npm run build`: passed.
- Phase 1 `npm run lint --prefix job-tracker-dashboard/job-tracker-dashboard`: passed.
- Phase 1 `npm run build --prefix job-tracker-dashboard/job-tracker-dashboard`: passed.
- `npm test -- jsonFileRepository.test.ts`: passed; 6 tests cover sample initialization, legacy migration, atomic writes, concurrency, and invalid/missing data.
- `npm test -- sqliteRepository.test.ts`: passed; 5 tests cover legacy import, sample bootstrap, persistence, transaction rollback, and import-once behavior.
- `npm test -- getNextActionsTool.test.ts`: passed; 3 tests cover the limit/response regression, empty state, and generic errors.
- `git status --short --branch`: clean on `upgrade/v1` after Gate 1; 52 local commits ahead of `origin/upgrade/v1`.
- Current workspace has existing unstaged edits in `README.md`, `docs/data-plan.md`, and `job-tracker-dashboard/.../src/App.jsx`; they are preserved and excluded from Phase 2 commits.
- Real MCP stdio client validation: passed. The built server started via `node dist/index.js` and `Client + StdioClientTransport` successfully returned 25 tools, including the full Phase 2 toolset. The Windows startup bug was fixed by normalizing entrypoint paths before the stdio bootstrap check.
- Phase 4 integration verification: `npm run typecheck` passed; `npm run lint` passed; `npm test -- src/tests/integrations.test.ts src/tests/restApi.test.ts` passed with 2 test files and 6 tests passing. The integration manager supports Google Calendar, Notion, Gmail, Telegram, and webhook counterparts behind a mockable interface, and the server remains healthy when all credentials are absent.
- Phase 5 dashboard verification: `npm test --prefix job-tracker-dashboard/job-tracker-dashboard` passed; 1 test file, 2 tests passed. `npm run build --prefix job-tracker-dashboard/job-tracker-dashboard` passed and produced a production bundle. `npm run lint --prefix job-tracker-dashboard/job-tracker-dashboard` passed with no errors. The dashboard includes a demo-aware API loader, in-memory fallback mode, accessible search/filtering controls, theme and language toggles, and a Claude MCP config panel.
- Phase 6 configuration and packaging verification: `npm test -- src/tests/trackerConfig.test.ts` passed, 2 tests passed. `npm run lint` passed. `npm test` passed with 18 test files and 88 tests passing. `npm run build` passed. `npx --yes hadolint Dockerfile` exited 0 because the local Docker daemon is not running in this environment; `docker build` itself fails with the environment error `failed to connect to the docker API ... dockerDesktopLinuxEngine`. `npm pack` produced `job-tracker-mcp-1.0.0.tgz`, and the installed package booted successfully with `PACKAGE_BOOT_OK`. Added `tracker.config.json`, package-ready metadata (`job-tracker-mcp` bin), redacted logger setup, Dockerfile, `docker-compose.yml`, and the SSRF/security notes in `SECURITY.md`.
- Phase 7 documentation and release verification: rewrote `README.md` with pitch, feature table, quick start, client configuration for Windows/macOS/Linux/Cursor/VS Code, badges, architecture diagram, screenshot instructions, and release commands. Added `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`, issue/PR templates, `docs/architecture.md`, `docs/api.md`, updated `docs/demo-script.md`, and `examples/README.md`. Added `scripts/generate-tool-reference.ts`; `npm run build`, `npm run generate:tools`, and `npm run check:tools` generated and verified 25 live MCP tool schemas, with CRLF normalization for Windows clones. Root `npm run typecheck`, `npm run lint`, `npm test` (18 files, 88 tests), and `npm run build` passed. Dashboard `npm ci`, `npm test` (2 tests), `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate` passed with 0 vulnerabilities after upgrading dashboard Vitest to 5.0.2. A literal temporary Git clone passed root `npm ci`, root build, tool-reference check, dashboard `npm ci`/build, and a live REST `/health` request (`FRESH_CLONE_OK`); the corrected repeat passed root/dashboard builds and tool-reference check with `LITERAL_FRESH_CLONE_OK`. A local Markdown-link audit checked 31 files with no broken local links. Gate 7: PASS.
- Final definition-of-done audit: PASS for root install/typecheck/lint/coverage/build, dashboard install/tests/lint/build, generated tool reference, 25-tool real-client E2E, 88.64% aggregate core/tool line coverage, fresh remote clone with live REST health, no known secret patterns, no TODO/FIXME markers, no skipped tests, runtime clock hardening, credential setup documentation, and clean pushed worktree. Local dashboard audit passed with 0 vulnerabilities; the remote clone audit request was network-blocked by npm registry DNS. FAIL only for the historical Git log: older pre-existing commits contain non-Conventional subjects and merge commits; all new commits created for this work use Conventional Commit prefixes, and published history was not rewritten.
