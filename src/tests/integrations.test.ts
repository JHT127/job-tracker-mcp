import { describe, expect, it } from "vitest";

import {
  GmailIntegration,
  GoogleCalendarIntegration,
  IntegrationManager,
  NotionIntegration,
  TelegramNotifier,
  WebhookNotifier,
  createIntegrationManager,
} from "../integrations/index.js";

describe("integrations", () => {
  it("starts with zero integrations configured and disables missing credentials", () => {
    const manager = createIntegrationManager({});
    const statuses = manager.getStatuses();

    expect(statuses.every((status) => status.enabled === false)).toBe(true);
    expect(statuses.some((status) => status.name === "google-calendar")).toBe(
      true,
    );
    expect(
      statuses.find((status) => status.name === "telegram")?.message,
    ).toContain("missing TELEGRAM_BOT_TOKEN");
  });

  it("allows mock-backed integrations to be enabled and exercised", async () => {
    const googleCalendar = new GoogleCalendarIntegration(
      {
        clientId: "client-id",
        clientSecret: "secret",
        projectId: "project-123",
      },
      {
        createEvent: async (payload) => ({ id: "event-1", payload }),
      },
    );
    const notion = new NotionIntegration(
      { apiKey: "secret-key" },
      { createPage: async (payload) => ({ id: "page-1", payload }) },
    );
    const gmail = new GmailIntegration(
      { clientEmail: "me@example.com", privateKey: "private-key" },
      { listMessages: async (payload) => ({ messages: [], payload }) },
    );
    const telegram = new TelegramNotifier(
      { botToken: "telegram-token" },
      { sendMessage: async (payload) => ({ ok: true, payload }) },
    );
    const webhook = new WebhookNotifier(
      { webhookUrl: "https://example.test/hook" },
      { deliver: async (payload) => ({ ok: true, payload }) },
    );

    const googleResult = await googleCalendar.createReminder({
      summary: "Interview reminder",
      start: "2026-10-01T10:00:00Z",
      end: "2026-10-01T10:30:00Z",
      description: "Coffee chat",
    });
    const notionResult = await notion.syncApplication({ title: "Example app" });
    const gmailResult = await gmail.listRecentMessages(5);
    const telegramResult = await telegram.sendMessage("Daily digest");
    const webhookResult = await webhook.notify({ type: "status_update" });

    expect(googleResult).toMatchObject({
      payload: { summary: "Interview reminder" },
    });
    expect(notionResult).toMatchObject({
      payload: { title: "Example app" },
    });
    expect(gmailResult).toMatchObject({
      payload: { limit: 5 },
    });
    expect(telegramResult).toMatchObject({ payload: { text: "Daily digest" } });
    expect(webhookResult).toMatchObject({ payload: { type: "status_update" } });
    expect(googleCalendar.getStatus().enabled).toBe(true);
  });

  it("keeps the manager healthy without external credentials", async () => {
    const manager = new IntegrationManager({});
    expect(
      manager.getStatuses().every((entry) => entry.enabled === false),
    ).toBe(true);
    await expect(manager.notifyDailyDigest("Nothing to do")).resolves.toEqual(
      [],
    );
  });
});
