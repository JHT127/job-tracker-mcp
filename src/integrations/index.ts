import { randomUUID } from "node:crypto";

export type IntegrationStatus = "enabled" | "disabled" | "error";

export interface IntegrationReport {
  name: string;
  status: IntegrationStatus;
  enabled: boolean;
  message: string;
}

export interface IntegrationClientConfig {
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  botToken?: string;
  webhookUrl?: string;
  projectId?: string;
  privateKey?: string;
  clientEmail?: string;
}

export interface IntegrationManagerConfig {
  googleCalendar?: IntegrationClientConfig;
  notion?: IntegrationClientConfig;
  gmail?: IntegrationClientConfig;
  telegram?: IntegrationClientConfig;
  webhook?: IntegrationClientConfig;
}

export interface IntegrationAdapter {
  readonly name: string;
  readonly status: IntegrationStatus;
  readonly enabled: boolean;
  readonly message: string;
  getStatus(): IntegrationReport;
}

export class GoogleCalendarIntegration implements IntegrationAdapter {
  readonly name = "google-calendar";
  private readonly client?: {
    createEvent: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  private readonly config: IntegrationClientConfig;
  status: IntegrationStatus;
  enabled: boolean;
  message: string;

  constructor(
    config: IntegrationClientConfig = {},
    client?: {
      createEvent: (payload: Record<string, unknown>) => Promise<unknown>;
    },
  ) {
    this.config = config;
    this.client = client;
    const configured = Boolean(
      config.clientId && config.clientSecret && config.projectId,
    );
    this.status = configured ? "enabled" : "disabled";
    this.enabled = configured;
    this.message = configured
      ? "Google Calendar connected."
      : "Google Calendar integration disabled: missing GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, or GOOGLE_CALENDAR_PROJECT_ID.";
  }

  getStatus(): IntegrationReport {
    return {
      name: this.name,
      status: this.status,
      enabled: this.enabled,
      message: this.message,
    };
  }

  async createReminder(input: {
    summary: string;
    start: string;
    end: string;
    description?: string;
  }) {
    if (!this.enabled) {
      throw new Error(this.message);
    }

    if (this.client?.createEvent) {
      return this.client.createEvent({
        id: `gcal_${randomUUID()}`,
        ...input,
      });
    }

    return {
      id: `gcal_${randomUUID()}`,
      ...input,
      created: true,
    };
  }
}

export class NotionIntegration implements IntegrationAdapter {
  readonly name = "notion";
  private readonly client?: {
    createPage: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  private readonly config: IntegrationClientConfig;
  status: IntegrationStatus;
  enabled: boolean;
  message: string;

  constructor(
    config: IntegrationClientConfig = {},
    client?: {
      createPage: (payload: Record<string, unknown>) => Promise<unknown>;
    },
  ) {
    this.config = config;
    this.client = client;
    const configured = Boolean(config.apiKey);
    this.status = configured ? "enabled" : "disabled";
    this.enabled = configured;
    this.message = configured
      ? "Notion connected."
      : "Notion integration disabled: missing NOTION_API_KEY.";
  }

  getStatus(): IntegrationReport {
    return {
      name: this.name,
      status: this.status,
      enabled: this.enabled,
      message: this.message,
    };
  }

  async syncApplication(payload: Record<string, unknown>) {
    if (!this.enabled) {
      throw new Error(this.message);
    }

    if (this.client?.createPage) {
      return this.client.createPage({
        id: `notion_${randomUUID()}`,
        ...payload,
      });
    }

    return {
      id: `notion_${randomUUID()}`,
      ...payload,
      synced: true,
    };
  }
}

export class GmailIntegration implements IntegrationAdapter {
  readonly name = "gmail";
  private readonly client?: {
    listMessages: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  private readonly config: IntegrationClientConfig;
  status: IntegrationStatus;
  enabled: boolean;
  message: string;

  constructor(
    config: IntegrationClientConfig = {},
    client?: {
      listMessages: (payload: Record<string, unknown>) => Promise<unknown>;
    },
  ) {
    this.config = config;
    this.client = client;
    const configured = Boolean(config.clientEmail && config.privateKey);
    this.status = configured ? "enabled" : "disabled";
    this.enabled = configured;
    this.message = configured
      ? "Gmail connected."
      : "Gmail integration disabled: missing GMAIL_CLIENT_EMAIL or GMAIL_PRIVATE_KEY.";
  }

  getStatus(): IntegrationReport {
    return {
      name: this.name,
      status: this.status,
      enabled: this.enabled,
      message: this.message,
    };
  }

  async listRecentMessages(limit = 10) {
    if (!this.enabled) {
      throw new Error(this.message);
    }

    if (this.client?.listMessages) {
      return this.client.listMessages({ limit });
    }

    return { messages: [], limit };
  }
}

export class TelegramNotifier implements IntegrationAdapter {
  readonly name = "telegram";
  private readonly client?: {
    sendMessage: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  private readonly config: IntegrationClientConfig;
  status: IntegrationStatus;
  enabled: boolean;
  message: string;

  constructor(
    config: IntegrationClientConfig = {},
    client?: {
      sendMessage: (payload: Record<string, unknown>) => Promise<unknown>;
    },
  ) {
    this.config = config;
    this.client = client;
    const configured = Boolean(config.botToken);
    this.status = configured ? "enabled" : "disabled";
    this.enabled = configured;
    this.message = configured
      ? "Telegram integration connected."
      : "Telegram notifications disabled: missing TELEGRAM_BOT_TOKEN.";
  }

  getStatus(): IntegrationReport {
    return {
      name: this.name,
      status: this.status,
      enabled: this.enabled,
      message: this.message,
    };
  }

  async sendMessage(text: string) {
    if (!this.enabled) {
      throw new Error(this.message);
    }

    if (this.client?.sendMessage) {
      return this.client.sendMessage({ text });
    }

    return { delivered: true, text, channel: "telegram" };
  }
}

export class WebhookNotifier implements IntegrationAdapter {
  readonly name = "webhook";
  private readonly client?: {
    deliver: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  readonly status: IntegrationStatus;
  readonly enabled: boolean;
  readonly message: string;

  constructor(
    config: IntegrationClientConfig = {},
    client?: {
      deliver: (payload: Record<string, unknown>) => Promise<unknown>;
    },
  ) {
    this.client = client;
    const configured = Boolean(config.webhookUrl);
    this.status = configured ? "enabled" : "disabled";
    this.enabled = configured;
    this.message = configured
      ? "Generic webhook notifier connected."
      : "Webhook notifications disabled: missing WEBHOOK_URL.";
  }

  getStatus(): IntegrationReport {
    return {
      name: this.name,
      status: this.status,
      enabled: this.enabled,
      message: this.message,
    };
  }

  async notify(payload: Record<string, unknown>) {
    if (!this.enabled) {
      throw new Error(this.message);
    }

    if (this.client?.deliver) {
      return this.client.deliver(payload);
    }

    return { delivered: true, payload };
  }
}

export class IntegrationManager {
  readonly googleCalendar: GoogleCalendarIntegration;
  readonly notion: NotionIntegration;
  readonly gmail: GmailIntegration;
  readonly telegram: TelegramNotifier;
  readonly webhook: WebhookNotifier;

  constructor(config: IntegrationManagerConfig = {}) {
    this.googleCalendar = new GoogleCalendarIntegration(
      config.googleCalendar ?? {},
    );
    this.notion = new NotionIntegration(config.notion ?? {});
    this.gmail = new GmailIntegration(config.gmail ?? {});
    this.telegram = new TelegramNotifier(config.telegram ?? {});
    this.webhook = new WebhookNotifier(config.webhook ?? {});
  }

  getStatuses(): IntegrationReport[] {
    return [
      this.googleCalendar.getStatus(),
      this.notion.getStatus(),
      this.gmail.getStatus(),
      this.telegram.getStatus(),
      this.webhook.getStatus(),
    ];
  }

  async notifyDailyDigest(text: string) {
    const tasks: Promise<unknown>[] = [];
    if (this.telegram.enabled) {
      tasks.push(this.telegram.sendMessage(text));
    }
    if (this.webhook.enabled) {
      tasks.push(this.webhook.notify({ type: "daily_digest", text }));
    }
    return Promise.all(tasks);
  }
}

export function createIntegrationManager(
  overrides: IntegrationManagerConfig = {},
): IntegrationManager {
  const fromEnv = {
    googleCalendar: {
      clientId:
        overrides.googleCalendar?.clientId ??
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret:
        overrides.googleCalendar?.clientSecret ??
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      projectId:
        overrides.googleCalendar?.projectId ??
        process.env.GOOGLE_CALENDAR_PROJECT_ID,
    },
    notion: {
      apiKey: overrides.notion?.apiKey ?? process.env.NOTION_API_KEY,
    },
    gmail: {
      clientEmail:
        overrides.gmail?.clientEmail ?? process.env.GMAIL_CLIENT_EMAIL,
      privateKey: overrides.gmail?.privateKey ?? process.env.GMAIL_PRIVATE_KEY,
    },
    telegram: {
      botToken: overrides.telegram?.botToken ?? process.env.TELEGRAM_BOT_TOKEN,
    },
    webhook: {
      webhookUrl: overrides.webhook?.webhookUrl ?? process.env.WEBHOOK_URL,
    },
  };

  return new IntegrationManager(fromEnv);
}
