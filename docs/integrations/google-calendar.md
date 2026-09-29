# Google Calendar integration

This project supports Google Calendar integration behind a lightweight adapter interface. The feature is disabled unless the required credentials are set.

## Required environment variables

- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_CALENDAR_PROJECT_ID`

## Setup steps

1. Create or reuse a Google Cloud project.
2. Enable the Google Calendar API.
3. Create OAuth credentials for a desktop or web client.
4. Add the client ID, secret, and project ID to your shell or deployment environment.
5. Restart the server; the startup log will show the integration state.

When credentials are missing, the server still starts normally and logs a disabled status instead of failing.
