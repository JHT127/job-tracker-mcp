import { expect, test } from "vitest";

import { applicationsDataSchema } from "../schemas/applicationData.js";
import { buildNextActions } from "./getNextActions.js";

test("buildNextActions flags stale applications and recent status changes", () => {
  const applications = applicationsDataSchema.parse([
    {
      id: "app-1",
      company: "Orion VLSI Technologies",
      role: "Software Engineer",
      date_applied: "2026-07-01",
      status: "applied" as const,
      source: "linkedin" as const,
      notes: "No response yet",
    },
    {
      id: "app-2",
      company: "Exalt Technologies",
      role: "Frontend Developer",
      date_applied: "2026-07-28",
      status: "interview" as const,
      source: "referral" as const,
      notes: "Interview scheduled",
    },
  ]);

  const actions = buildNextActions(applications, {
    now: new Date("2026-07-31T00:00:00.000Z"),
  });

  expect(
    actions.some(
      (action) =>
        action.reason.includes("No status update") ||
        action.reason.includes("days"),
    ),
  ).toBe(true);
  expect(
    actions.some((action) => action.reason.includes("Recently updated")),
  ).toBe(true);
});
