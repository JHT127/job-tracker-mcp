# Notifications

This project includes notification integrations for Telegram and generic URLs.

## Required environment variables

- `TELEGRAM_BOT_TOKEN`
- `WEBHOOK_URL`

## Setup steps

1. Create a Telegram bot with BotFather.
2. Save the token in `TELEGRAM_BOT_TOKEN`.
3. Optionally set `WEBHOOK_URL` for Slack, Discord, or another outbound webhook endpoint.
4. Restart the server; the notification channel will appear as enabled if configured.

If both values are absent, notification channels remain disabled but the rest of the server still runs.
