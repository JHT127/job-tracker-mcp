import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import * as z from "zod/v4";

const defaultTrackerDefinitions = {
  defaultTracker: "jobs",
  trackers: {
    jobs: {
      statuses: ["applied", "interview", "offer", "rejected", "no_response"],
      fields: [
        "company",
        "role",
        "date_applied",
        "status",
        "source",
        "notes",
        "salary",
        "location",
        "work_mode",
        "job_url",
        "priority",
        "tags",
        "deadline",
        "resume_version",
      ],
      defaults: {
        status: "applied",
        source: "linkedin",
      },
    },
    scholarships: {
      statuses: ["applied", "reviewing", "awarded", "rejected"],
      fields: ["program", "deadline", "amount", "status"],
      defaults: {
        status: "applied",
      },
    },
    university: {
      statuses: [
        "applied",
        "under_review",
        "accepted",
        "waitlisted",
        "rejected",
      ],
      fields: ["school", "program", "deadline", "status"],
      defaults: {
        status: "applied",
      },
    },
    visas: {
      statuses: ["draft", "submitted", "waiting", "approved", "rejected"],
      fields: ["country", "visa_type", "deadline", "status"],
      defaults: {
        status: "draft",
      },
    },
  },
} as const;

const trackerEntrySchema = z.object({
  statuses: z.array(z.string()).min(1),
  fields: z.array(z.string()).min(1),
  defaults: z.record(z.string(), z.string()).default({}),
});

export const trackerConfigSchema = z.object({
  defaultTracker: z.string().default(defaultTrackerDefinitions.defaultTracker),
  trackers: z.record(z.string(), trackerEntrySchema),
});

export type TrackerConfig = z.infer<typeof trackerConfigSchema>;

const redactedKeys = new Set([
  "authorization",
  "x-api-key",
  "apikey",
  "api_key",
  "api-key",
  "token",
  "secret",
  "password",
  "cookie",
  "set-cookie",
]);

export function sanitizeLogData(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    const entity = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(entity).map(([key, entry]) => {
        const normalizedKey = key.toLowerCase();
        const shouldRedact =
          redactedKeys.has(normalizedKey) ||
          normalizedKey.includes("secret") ||
          normalizedKey.includes("token") ||
          normalizedKey.includes("password") ||
          normalizedKey.includes("api-key");

        return [
          key,
          shouldRedact ? "[REDACTED]" : sanitizeLogData(entry, seen),
        ];
      }),
    );
  }

  return value;
}

export function resolveTrackerConfigPath(customPath?: string): string {
  if (customPath) {
    return path.resolve(customPath);
  }

  const envPath = process.env.TRACKER_CONFIG_PATH;
  if (envPath) {
    return path.resolve(envPath);
  }

  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );

  const defaultConfigPath = path.join(projectRoot, "tracker.config.json");
  return defaultConfigPath;
}

export function loadTrackerConfig(customPath?: string): TrackerConfig {
  const configPath = resolveTrackerConfigPath(customPath);
  const rawConfig = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, "utf8"))
    : {};

  const mergedConfig = {
    ...defaultTrackerDefinitions,
    ...rawConfig,
    trackers: {
      ...defaultTrackerDefinitions.trackers,
      ...(rawConfig.trackers ?? {}),
    },
  };

  const parsedConfig = trackerConfigSchema.parse(mergedConfig);
  trackerConfig = parsedConfig;
  return parsedConfig;
}

export let trackerConfig: TrackerConfig = trackerConfigSchema.parse(
  defaultTrackerDefinitions,
);

trackerConfig = loadTrackerConfig();

export function getTrackerConfig(
  trackerName = process.env.TRACKER_TYPE ?? trackerConfig.defaultTracker,
) {
  return (
    trackerConfig.trackers[trackerName] ??
    trackerConfig.trackers[trackerConfig.defaultTracker]
  );
}

export function getTrackerStatusSchema(
  trackerName = process.env.TRACKER_TYPE ?? trackerConfig.defaultTracker,
) {
  const statuses = getTrackerConfig(trackerName).statuses;
  return z.enum(statuses as [string, ...string[]]);
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  redact: {
    paths: [
      "authorization",
      "x-api-key",
      "apikey",
      "api_key",
      "apiKey",
      "token",
      "secret",
      "password",
      "cookie",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
