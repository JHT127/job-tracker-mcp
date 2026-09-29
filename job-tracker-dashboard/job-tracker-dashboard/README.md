# Job Tracker Dashboard

The React dashboard for [Job Tracker MCP](https://github.com/JHT127/job-tracker-mcp).

## Live demo

Open the hosted demo:

https://jht127.github.io/job-tracker-mcp/

The hosted build uses `VITE_DEMO=true` with fictional in-memory data. It does not require backend access or credentials.

## Local development

```bash
npm ci
npm run dev
```

For the production build used by GitHub Pages:

```bash
npm run build
```

The dashboard uses the REST API when `VITE_API_URL` is configured. It falls back to demo data when `VITE_DEMO=true` or the API is unavailable.

## Verification

```bash
npm test
npm run lint
npm run build
```

The main project documentation is in the repository root [README.md](../../README.md). The hosted-demo walkthrough is in [docs/demo-script.md](../../docs/demo-script.md).
