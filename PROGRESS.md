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
- [in-progress] Phase 2: add the requested MCP tools, resources, prompts, stdio/Streamable HTTP transports, and real-client E2E coverage.
- [todo] Phase 2 task: persist contacts and interviews through the shared repository and core service.
- [todo] Phase 2 task: implement stale/conversion/health insights, reconnect/interview workflows, posting/CV analysis, email/prep/report generation, and CSV import/export.
- [todo] Phase 2 task: register all new tools with Zod input contracts, annotations, limits, and helpful error behavior; expose resources and prompts.
- [todo] Phase 2 task: support stdio and Streamable HTTP; run an E2E test against the built server using the official MCP client.
- [todo] Gate 2: MCP Inspector/client lists every tool with correct schemas and the real-client E2E suite passes.
- [todo] Phase 3: implement the REST API, auth, validation, rate limiting, logging, OpenAPI, webhooks, and integration tests; meet Gate 3.
- [todo] Phase 4: implement credential-backed integrations behind interfaces with mocks and setup docs; ensure zero-credential startup; meet Gate 4.
- [todo] Phase 5: connect the dashboard to the API; add requested views, controls, accessibility, i18n, demo mode, component tests, and Playwright smoke test; meet Gate 5.
- [todo] Phase 6: add configurable tracker behavior, structured logging, Docker/package readiness, security updates, and packaging verification; meet Gate 6.
- [todo] Phase 7: complete project documentation, generated tool reference, changelog, community files, version notes, and fresh-clone verification; meet Gate 7.
- [todo] Final definition of done: verify all root and dashboard quality commands, coverage thresholds, MCP E2E, fresh clone, hygiene/security requirements, credential setup notes, and clean commit history; record a requirement-by-requirement audit here.

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
