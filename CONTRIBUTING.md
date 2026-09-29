# Contributing

Thanks for helping improve Job Tracker MCP.

## Development setup

1. Install Node.js 22 or newer and npm.
2. Run `npm ci`.
3. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
4. For dashboard changes, run the equivalent commands in `job-tracker-dashboard/job-tracker-dashboard`.

## Pull requests

- Keep changes focused and explain the user-visible behavior.
- Add or update tests for behavior changes.
- Update `docs/tool-reference.md` with `npm run generate:tools` when a tool contract changes.
- Do not commit runtime data, secrets, `dist/`, coverage output, or package tarballs.
- Use Conventional Commits such as `feat: add interview reminders` or `fix: reject private posting URLs`.

## Reporting security issues

Do not open a public issue for a vulnerability. Follow the reporting instructions in [SECURITY.md](SECURITY.md).
