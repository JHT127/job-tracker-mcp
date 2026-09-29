import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getTrackerStatusSchema,
  loadTrackerConfig,
  sanitizeLogData,
} from "../lib/trackerConfig.js";

describe("tracker configuration and logging", () => {
  it("loads the default jobs tracker and redacts secrets", () => {
    const config = loadTrackerConfig();
    expect(config.defaultTracker).toBe("jobs");
    expect(config.trackers.jobs.statuses).toContain("applied");
    expect(getTrackerStatusSchema("jobs").options).toContain("interview");
    expect(
      sanitizeLogData({
        Authorization: "Bearer secret-token",
        apiKey: "abc123",
        nested: { password: "hunter2", safe: "visible" },
      }),
    ).toMatchObject({
      Authorization: "[REDACTED]",
      apiKey: "[REDACTED]",
      nested: { password: "[REDACTED]", safe: "visible" },
    });
  });

  it("accepts a tracker override file for alternate workflows", () => {
    const configPath = path.join(
      tmpdir(),
      `tracker-config-${Date.now()}-${Math.random()}.json`,
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        defaultTracker: "scholarships",
        trackers: {
          scholarships: {
            statuses: ["applied", "awaiting_decision"],
            fields: ["program", "deadline"],
            defaults: { status: "applied" },
          },
        },
      }),
    );

    const config = loadTrackerConfig(configPath);
    expect(config.defaultTracker).toBe("scholarships");
    expect(config.trackers.scholarships.statuses).toEqual([
      "applied",
      "awaiting_decision",
    ]);
    expect(getTrackerStatusSchema("scholarships").options).toContain(
      "awaiting_decision",
    );
  });
});
