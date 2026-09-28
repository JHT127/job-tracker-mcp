# Upgrade Progress

## Baseline

The root project is a TypeScript MCP server using the MCP SDK and Zod. It registers stdio tools for adding, listing, searching, updating, deleting, and suggesting actions for job applications. The tools share `src/lib/applications.ts`, which reads and writes `data/applications.json`; a missing data file currently causes reads to fail. Existing tests use Node's built-in test runner, but the root `test` script is a placeholder and there are no root typecheck, lint, format, coverage, or build scripts. TypeScript is already configured with `strict: true`.

The dashboard is a separate Vite/React project nested under `job-tracker-dashboard/job-tracker-dashboard`. It uses a hardcoded seed, a fixed date, and browser storage; its own UI explicitly says edits do not sync with the MCP server. The docs describe both shipped tools and planned tools. The repo also contains committed application data, a 2.2 MB test-evidence PDF, and the duplicated filename `docs/blog-post-mcp-journey (2).md`. There is no `.github` directory or CI workflow. Root scripts currently include `dev`, `inspect`, and a placeholder `test`.

## Phase 0 — Baseline and Tooling

- [x] Read the repository areas required by the task: `src/`, `docs/`, `data/`, `job-tracker-dashboard/`, `README.md`, and `package.json`; also reviewed examples, `SECURITY.md`, `tsconfig.json`, and ignore files. Summary recorded above.
- [ ] Add Vitest, ESLint with typescript-eslint, and Prettier.
- [ ] Enable TypeScript strict mode and add `tsc --noEmit` typecheck, `dist/` build, `bin` entry, and `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:coverage`, and `inspect` scripts.
- [ ] Add GitHub Actions CI for install, typecheck, lint, test with coverage, and build on push and pull request, using a Node LTS matrix.
- [ ] Add Husky and lint-staged pre-commit checks.
- [ ] Clean repo hygiene: move sample records to `data/sample-data.json`, ignore `data/applications.json`, initialize the real data file from sample data on first run, and address the listed PDF, duplicated blog filename, real-looking data, duplicate README sections, and Windows-only setup instructions.
- [ ] Gate 0: clean install, typecheck, lint, test, and build all pass in a CI-equivalent local run.

## Later Phases — Not Started

- [ ] Phase 1: fix known bugs; add shared core services and repository interface; support JSON and SQLite storage and migration; extend application fields/history; add editing, undo, duplicate warning, and delete confirmation; implement deterministic prioritized next actions; meet Gate 1 coverage and migration tests.
- [ ] Phase 2: implement the specified MCP tools, resources, prompts, transports, and end-to-end coverage; meet Gate 2.
- [ ] Phase 3: implement the REST API, auth, validation, rate limiting, logging, OpenAPI, webhooks, and integration tests; meet Gate 3.
- [ ] Phase 4: implement credential-backed integrations behind interfaces with mocks and setup docs; ensure zero-credential startup; meet Gate 4.
- [ ] Phase 5: connect the dashboard to the API; add requested views, controls, accessibility, i18n, demo mode, component tests, and Playwright smoke test; meet Gate 5.
- [ ] Phase 6: add configurable tracker behavior, structured logging, Docker/package readiness, security updates, and packaging verification; meet Gate 6.
- [ ] Phase 7: complete project documentation, generated tool reference, changelog, community files, version notes, and fresh-clone verification; meet Gate 7.
- [ ] Final definition of done: verify all root and dashboard quality commands, coverage thresholds, MCP E2E, fresh clone, hygiene/security requirements, credential setup notes, and clean commit history; record a requirement-by-requirement audit here.

## Verification Log

- Baseline `npm install`: completed successfully; audit reported 0 vulnerabilities.
- Baseline `npm run dev`: started and printed `job-application-tracker MCP server running on stdio`; stopped with Ctrl+C as requested.
- `git status --short --branch`: clean on `upgrade/v1` before this progress file was created.
- Phase 0 verification commands: pending implementation.
