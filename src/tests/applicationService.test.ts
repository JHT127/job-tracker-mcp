import { describe, expect, it } from "vitest";

import { ApplicationService } from "../core/applicationService.js";
import {
  MemoryRepository,
  makeApplication,
} from "./helpers/applicationFixtures.js";

const fixedNow = new Date("2026-08-01T10:00:00.000Z");

function createService(applications = []) {
  return new ApplicationService(
    new MemoryRepository(applications),
    () => new Date(fixedNow),
  );
}

describe("ApplicationService", () => {
  it("adds records with defaults and a status history entry", async () => {
    const service = createService();

    const result = await service.add({
      company: "Example Labs",
      role: "Developer",
      date_applied: "2026-07-31",
    });

    expect(result.application.id).toBe("app-001");
    expect(result.application.status).toBe("applied");
    expect(result.application.source).toBe("cold_apply");
    expect(result.application.notes).toBe("");
    expect(result.application.updated_at).toBe(fixedNow.toISOString());
    expect(result.application.history).toEqual([
      { status: "applied", timestamp: fixedNow.toISOString() },
    ]);
    expect(result.duplicateWarning).toBeUndefined();
  });

  it("warns about a similar application but still adds it", async () => {
    const service = createService([makeApplication()]);

    const result = await service.add({
      company: " example labs ",
      role: "SOFTWARE ENGINEER",
      date_applied: "2026-07-30",
    });

    expect(result.duplicateWarning).toContain("similar application");
    expect((await service.list()).total).toBe(2);
  });

  it("generates an id from the highest existing numeric id", async () => {
    const service = createService([
      makeApplication({ id: "app-015" }),
      makeApplication({ id: "app-003", company: "Other Labs" }),
    ]);

    const result = await service.add({
      company: "New Labs",
      role: "Analyst",
      date_applied: "2026-07-29",
    });

    expect(result.application.id).toBe("app-016");
  });

  it("lists and caps records after applying a status filter", async () => {
    const applications = Array.from({ length: 51 }, (_, index) =>
      makeApplication({
        id: `app-${String(index + 1).padStart(3, "0")}`,
        status: index === 50 ? "interview" : "applied",
      }),
    );
    const service = createService(applications);

    const all = await service.list();
    const interviews = await service.list("interview");

    expect(all.applications).toHaveLength(50);
    expect(all.total).toBe(51);
    expect(all.truncated).toBe(true);
    expect(interviews.applications).toHaveLength(1);
    expect(interviews.truncated).toBe(false);
  });

  it("searches company and role case-insensitively and ignores empty input", async () => {
    const service = createService([
      makeApplication(),
      makeApplication({
        id: "app-002",
        company: "Other Inc",
        role: "Platform Engineer",
      }),
    ]);

    expect(await service.search("  EXAMPLE ")).toHaveLength(1);
    expect(await service.search("platform")).toHaveLength(1);
    expect(await service.search("  ")).toEqual([]);
  });

  it("updates fields, timestamp, and status history while preserving legacy fields", async () => {
    const service = createService([makeApplication()]);

    const updated = await service.update("app-001", {
      status: "interview",
      location: "Ramallah",
      priority: "high",
    });

    expect(updated.status).toBe("interview");
    expect(updated.location).toBe("Ramallah");
    expect(updated.priority).toBe("high");
    expect(updated.updated_at).toBe(fixedNow.toISOString());
    expect(updated.history).toEqual([
      { status: "applied", timestamp: "2026-07-01T00:00:00.000Z" },
      { status: "interview", timestamp: fixedNow.toISOString() },
    ]);
    expect(updated.company).toBe("Example Labs");
    expect(updated.undo_stack).toHaveLength(1);
  });

  it("does not add a duplicate history entry when the status is unchanged", async () => {
    const original = makeApplication();
    const service = createService([original]);

    const updated = await service.updateStatus(original.id, original.status);

    expect(updated.history).toEqual(original.history);
    expect(updated.updated_at).toBe(fixedNow.toISOString());
  });

  it("rejects empty updates, invalid records, and missing ids", async () => {
    const service = createService([makeApplication()]);

    await expect(service.update("app-001", {})).rejects.toThrow(
      "At least one application field",
    );
    await expect(service.update("app-001", { company: "" })).rejects.toThrow();
    await expect(
      service.update("app-999", { notes: "Updated" }),
    ).rejects.toThrow("No application found");
  });

  it("undoes the previous field and status change", async () => {
    const service = createService([makeApplication()]);
    await service.update("app-001", {
      status: "interview",
      notes: "Scheduled",
    });

    const restored = await service.undoLastChange("app-001");

    expect(restored.status).toBe("applied");
    expect(restored.notes).toBe("Sample note");
    expect(restored.updated_at).toBe(fixedNow.toISOString());
    expect(restored.undo_stack).toHaveLength(0);
    expect(restored.history.at(-1)).toEqual({
      status: "applied",
      timestamp: fixedNow.toISOString(),
    });
  });

  it("reports missing records and empty undo history", async () => {
    const service = createService([makeApplication()]);

    await expect(service.undoLastChange("app-001")).rejects.toThrow(
      "No previous change to undo",
    );
    await expect(service.undoLastChange("app-999")).rejects.toThrow(
      "No application found",
    );
  });

  it("requires deletion confirmation and deletes only after confirmation", async () => {
    const service = createService([makeApplication()]);

    await expect(service.delete("app-001")).rejects.toThrow(
      "requires explicit confirmation",
    );
    expect((await service.list()).total).toBe(1);
    expect((await service.delete("app-001", true)).id).toBe("app-001");
    expect((await service.list()).total).toBe(0);
    await expect(service.delete("app-001", true)).rejects.toThrow(
      "No application found",
    );
  });

  it("exposes deterministic actions and statistics through the core service", async () => {
    const service = createService([
      makeApplication(),
      makeApplication({
        id: "app-002",
        company: "Closed Co",
        status: "rejected",
        source: "referral",
      }),
    ]);

    const actions = await service.getNextActions();
    const stats = await service.getStats();
    const all = await service.getAll();

    expect(actions.map((action) => action.application_id)).toEqual(["app-001"]);
    expect(stats.total).toBe(2);
    expect(stats.byStatus.rejected).toBe(1);
    expect(all).toHaveLength(2);
  });
});
