# Notion integration

This project supports a Notion sync adapter behind an interface so the app can work without a live Notion connection.

## Required environment variables

- `NOTION_API_KEY`

## Setup steps

1. Create a Notion integration at notion.so.
2. Grant access to the target workspace.
3. Copy the integration token into `NOTION_API_KEY`.
4. Restart the server.

If the API key is absent, the integration remains disabled and the server continues to run normally.
