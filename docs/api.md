# API Reference

The REST API defaults to `http://127.0.0.1:3001` when `REST_API_MODE=true`.

## Start

```bash
REST_API_MODE=true npm run dev
```

On PowerShell:

```powershell
$env:REST_API_MODE="true"; npm run dev
```

## Routes

- `GET /health` checks server health.
- `GET|POST /applications` lists or creates applications.
- `GET|PATCH|DELETE /applications/:id` reads, updates, or deletes an application.
- `PATCH /applications/:id/status` changes status and dispatches matching webhooks.
- `GET|POST /contacts` manages contacts.
- `GET|POST /interviews` manages interviews.
- `GET /stats` returns tracker statistics.
- `GET /next-actions` returns prioritized follow-ups.
- `GET /openapi.json` returns the machine-readable API description.
- `POST /webhooks` registers status-change delivery targets.
- `GET /export` and `POST /import` handle data exchange.

Set `API_KEY` to require the `X-API-Key` header. Requests are rate limited with `API_RATE_LIMIT` and `API_RATE_LIMIT_WINDOW_MS`.
