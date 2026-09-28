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

  const actions = buildNextActions(applications);

  expect(
    actions.some(
      (action) =>
        action.reason.includes("stale") ||
        action.reason.includes("days without"),
    ),
  ).toBe(true);
  expect(actions.some((action) => action.reason.includes("recently"))).toBe(
    true,
  );
});
