# Upgrade Progress

## Baseline

The root project is a TypeScript MCP server using the MCP SDK and Zod. It registers stdio tools for adding, listing, searching, updating, deleting, and suggesting actions for job applications. The tools share `src/lib/applications.ts`; the runtime `data/applications.json` is now created from the anonymized `data/sample-data.json` when missing, and the runtime file is ignored by Git. TypeScript is configured with `strict: true`. Phase 0 has added Vitest, ESLint, Prettier, typecheck, lint, format, coverage, and build scripts; added a compiled `dist/` package entry; and migrated the existing tests to Vitest.

The dashboard is a separate Vite/React project nested under `job-tracker-dashboard/job-tracker-dashboard`. It uses a hardcoded seed, a fixed date, and browser storage; its own UI explicitly says edits do not sync with the MCP server. The docs describe both shipped tools and planned tools. The repository still contains a 2.2 MB test-evidence PDF and the duplicated filename `docs/blog-post-mcp-journey (2).md`; those and README cleanup remain in progress. Phase 0 adds GitHub Actions CI on Node 22 and 24 and a Husky/lint-staged pre-commit hook.

## Phase 0 — Baseline and Tooling

- [done] Read the repository areas required by the task: `src/`, `docs/`, `data/`, `job-tracker-dashboard/`, `README.md`, and `package.json`; also reviewed examples, `SECURITY.md`, `tsconfig.json`, and ignore files. Summary recorded above.
- [done] Add Vitest, ESLint with typescript-eslint, and Prettier.
- [done] Keep TypeScript strict mode and add `tsc --noEmit` typecheck, `dist/` build, `bin` entry, and `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:coverage`, and `inspect` scripts.
- [done] Add GitHub Actions CI for install, typecheck, lint, test with coverage, and build on push and pull request, using Node 22 and 24 LTS.
- [done] Add Husky and lint-staged pre-commit checks.
- [done] Move anonymized sample records to `data/sample-data.json`.
- [done] Ignore `data/applications.json` and stop tracking its previous committed contents.
- [done] Initialize missing runtime data from the sample on first read, using exclusive file creation.
- [in-progress] Remove the 2.2 MB PDF and rename the duplicate blog filename.
- [todo] Remove duplicate README instructions and add setup guidance for macOS and Linux alongside Windows.
- [todo] Gate 0: clean install, typecheck, lint, test, and build all pass in a CI-equivalent local run.

## Later Phases — Not Started

- [todo] Phase 1: fix known bugs; add shared core services and repository interface; support JSON and SQLite storage and migration; extend application fields/history; add editing, undo, duplicate warning, and delete confirmation; implement deterministic prioritized next actions; meet Gate 1 coverage and migration tests.
- [todo] Phase 2: implement the specified MCP tools, resources, prompts, transports, and end-to-end coverage; meet Gate 2.
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
- `npm run test:coverage`: passed; 2 test files and 3 tests passed; baseline line coverage 12.59% (no Phase 0 threshold).
- `npm run build`: passed; emitted JavaScript to `dist/`.
- `node --import tsx --input-type=module -e "import { promises as fs } from 'node:fs'; import { loadApplications } from './src/lib/applications.ts'; const apps = await loadApplications(); const disk = JSON.parse(await fs.readFile('data/applications.json', 'utf8')); if (apps.length !== 2) throw new Error('wrong loaded row count'); if (disk.length !== 2) throw new Error('wrong disk row count'); if (apps[0].company !== 'Example Labs') throw new Error('wrong sample data'); console.log('missing data file initialized from sample data');"`: passed; missing runtime file was created from the sample.
- `git check-ignore -v data/applications.json`: passed; `.gitignore:9` excludes the generated runtime file.
- Phase 0 clean-install verification (`npm ci`) and final combined gate: pending data/doc cleanup.
