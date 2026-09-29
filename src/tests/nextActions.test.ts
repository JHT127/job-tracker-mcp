import { describe, expect, it } from "vitest";

import { buildNextActions } from "../core/nextActions.js";
import { makeApplication } from "./helpers/applicationFixtures.js";

const now = new Date("2026-08-01T09:30:00.000Z");

describe("buildNextActions", () => {
  it("uses updated_at, follows up stale applications, and prepares recent interviews", () => {
    const actions = buildNextActions(
      [
        makeApplication({ updated_at: "2026-07-01T00:00:00.000Z" }),
        makeApplication({
          id: "app-002",
          status: "interview",
          updated_at: "2026-07-31T23:00:00.000Z",
        }),
      ],
      { now },
    );

    expect(actions.map((action) => action.action)).toEqual([
      "Follow up with Example Labs",
      "Prepare for Example Labs",
    ]);
    expect(actions[0].reason).toContain("31 days");
    expect(actions[1].reason).toContain("Recently updated");
  });

  it("does not suggest terminal, fresh, or old-but-not-due applications", () => {
    const actions = buildNextActions(
      [
        makeApplication({
          status: "offer",
          updated_at: "2026-06-01T00:00:00.000Z",
        }),
        makeApplication({
          id: "app-002",
          status: "rejected",
          updated_at: "2026-06-01T00:00:00.000Z",
        }),
        makeApplication({
          id: "app-003",
          updated_at: "2026-07-31T00:00:00.000Z",
        }),
        makeApplication({
          id: "app-004",
          updated_at: "2026-07-25T00:00:00.000Z",
        }),
      ],
      { now },
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].application_id).toBe("app-003");
  });

  it("supports configurable per-status follow-up thresholds", () => {
    const application = makeApplication({
      updated_at: "2026-07-27T00:00:00.000Z",
    });

    expect(buildNextActions([application], { now })).toHaveLength(0);
    expect(
      buildNextActions([application], {
        now,
        followUpDaysByStatus: { applied: 2 },
      }),
    ).toHaveLength(1);
  });

  it("scores source, priority, deadline, status, and days waiting", () => {
    const lower = makeApplication({
      id: "app-001",
      updated_at: "2026-07-01T00:00:00.000Z",
    });
    const higher = makeApplication({
      id: "app-002",
      status: "interview",
      source: "referral",
      priority: "high",
      deadline: "2026-08-03",
      updated_at: "2026-07-01T00:00:00.000Z",
    });

    const actions = buildNextActions([lower, higher], { now });

    expect(actions[0].application_id).toBe("app-002");
    expect(actions[0].score).toBeGreaterThan(actions[1].score);
  });

  it("orders equal scores by application id and returns no actions for empty input", () => {
    const apps = [
      makeApplication({
        id: "app-010",
        updated_at: "2026-07-01T00:00:00.000Z",
      }),
      makeApplication({
        id: "app-002",
        updated_at: "2026-07-01T00:00:00.000Z",
      }),
    ];

    expect(
      buildNextActions(apps, { now }).map((action) => action.application_id),
    ).toEqual(["app-002", "app-010"]);
    expect(buildNextActions([])).toEqual([]);
  });
});
