# Gmail integration

This project includes a Gmail adapter that can read recent email threads and recommend status changes without mutating anything automatically.

## Required environment variables

- `GMAIL_CLIENT_EMAIL`
- `GMAIL_PRIVATE_KEY`

## Setup steps

1. Create a Google Cloud service account.
2. Grant Gmail read-only access and download the JSON credentials.
3. Copy the service account email and private key into the environment.
4. Restart the server.

When the credentials are absent, the integration is disabled and the application remains operational.
