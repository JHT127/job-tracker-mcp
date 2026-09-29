import { describe, expect, it } from "vitest";

import { addApplicationInputSchema } from "../schemas/addApplication.js";
import { deleteApplicationInputSchema } from "../schemas/deleteApplication.js";
import { updateApplicationInputSchema } from "../schemas/updateApplication.js";
import { updateStatusInputSchema } from "../schemas/updateStatus.js";

describe("application input schemas", () => {
  it("preserves legacy add inputs and defaults optional fields", () => {
    const input = addApplicationInputSchema.parse({
      company: "Example Labs",
      role: "Software Engineer",
      date_applied: "2026-07-01",
    });

    expect(input.status).toBe("applied");
    expect(input.source).toBe("cold_apply");
    expect(input.priority).toBe("normal");
    expect(input.tags).toEqual([]);
  });

  it("accepts the extended application fields", () => {
    const input = addApplicationInputSchema.parse({
      company: "Example Labs",
      role: "Software Engineer",
      date_applied: "2026-07-01",
      salary: "$80,000",
      location: "Ramallah",
      work_mode: "hybrid",
      job_url: "https://example.com/role",
      priority: "high",
      tags: ["typescript", "platform"],
      deadline: "2026-08-01",
      resume_version: "backend-v2",
    });

    expect(input.work_mode).toBe("hybrid");
    expect(input.tags).toEqual(["typescript", "platform"]);
    expect(input.deadline).toBe("2026-08-01");
  });

  it("requires at least one editable field for update_application", () => {
    expect(() =>
      updateApplicationInputSchema.parse({ id: "app-001" }),
    ).toThrow();
    expect(
      updateApplicationInputSchema.parse({
        id: "app-001",
        priority: "high",
        tags: ["remote"],
      }).priority,
    ).toBe("high");
    expect(() =>
      updateApplicationInputSchema.parse({
        id: "app-001",
        work_mode: "flexible",
      }),
    ).toThrow();
  });

  it("defaults delete confirmation to false and accepts explicit confirmation", () => {
    expect(deleteApplicationInputSchema.parse({ id: "app-001" }).confirm).toBe(
      false,
    );
    expect(
      deleteApplicationInputSchema.parse({ id: "app-001", confirm: true })
        .confirm,
    ).toBe(true);
  });

  it("allows no_response through the backwards-compatible update_status schema", () => {
    expect(
      updateStatusInputSchema.parse({
        id: "app-001",
        new_status: "no_response",
      }).new_status,
    ).toBe("no_response");
  });
});
