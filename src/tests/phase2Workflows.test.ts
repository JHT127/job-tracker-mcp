import { describe, expect, it } from "vitest";

import {
  buildWeeklyReport,
  draftFollowUpEmail,
  draftThankYou,
  exportApplications,
  generateInterviewPrep,
  getConversionStats,
  getHealthScore,
  getStaleApplications,
  matchCvToJob,
  parseApplicationsCsv,
  parseJobPostingText,
} from "../core/phase2Workflows.js";
import { makeApplication } from "./helpers/applicationFixtures.js";

const now = new Date("2026-08-10T12:00:00.000Z");

describe("Phase 2 workflow helpers", () => {
  it("selects stale non-terminal applications with bounded threshold and stable ordering", () => {
    const applications = [
      makeApplication({
        id: "app-001",
        updated_at: "2026-07-01T00:00:00.000Z",
      }),
      makeApplication({
        id: "app-002",
        updated_at: "2026-08-05T00:00:00.000Z",
      }),
      makeApplication({
        id: "app-003",
        status: "offer",
        updated_at: "2026-06-01T00:00:00.000Z",
      }),
      makeApplication({
        id: "app-004",
        status: "rejected",
        updated_at: "2026-06-01T00:00:00.000Z",
      }),
    ];

    const stale = getStaleApplications(applications, 14, now);

    expect(stale.map((entry) => entry.application.id)).toEqual(["app-001"]);
    expect(stale[0].daysSinceUpdate).toBe(40);
    expect(getStaleApplications(applications, 1_000, now)).toEqual([]);
  });

  it("calculates conversion rates by source, including empty sources", () => {
    const result = getConversionStats([
      makeApplication({ status: "applied", source: "referral" }),
      makeApplication({
        id: "app-002",
        status: "interview",
        source: "referral",
      }),
      makeApplication({
        id: "app-003",
        status: "rejected",
        source: "linkedin",
      }),
    ]);

    expect(result.total).toBe(3);
    expect(result.by_source.referral).toEqual({
      applications: 2,
      responded: 1,
      interviews: 1,
      response_rate: 0.5,
      interview_rate: 0.5,
    });
    expect(result.by_source.cold_apply.response_rate).toBe(0);
    expect(getConversionStats([]).total).toBe(0);
  });

  it("returns a bounded health score and handles an empty tracker", () => {
    expect(getHealthScore([])).toEqual({
      score: 0,
      reasons: ["No applications are recorded yet."],
    });
    const health = getHealthScore([
      makeApplication(),
      makeApplication({ id: "app-002", status: "interview" }),
    ]);
    expect(health.score).toBeGreaterThanOrEqual(0);
    expect(health.score).toBeLessThanOrEqual(100);
    expect(health.reasons).toHaveLength(3);
  });

  it("parses job posting heading, labels, salary, and requirements", () => {
    expect(
      parseJobPostingText(
        [
          "Senior Engineer at Example Labs",
          "Location: Remote",
          "Salary: $120,000-$150,000 per year",
          "Requirements:",
          "- TypeScript experience",
          "- System design",
        ].join("\n"),
      ),
    ).toEqual({
      company: "Example Labs",
      role: "Senior Engineer",
      location: "Remote",
      salary: "$120,000-$150,000 per year",
      requirements: ["TypeScript experience", "System design"],
    });
    expect(parseJobPostingText("")).toEqual({ requirements: [] });
  });

  it("matches known skills deterministically and reports missing keywords", () => {
    expect(
      matchCvToJob(
        "Built React apps with TypeScript and SQL",
        "We need React, TypeScript, SQL, AWS, Docker, and system design",
      ),
    ).toEqual({
      matched_skills: ["typescript", "react", "sql"],
      skill_gaps: ["aws", "docker", "system design"],
      suggested_keywords: ["aws", "docker", "system design"],
    });
    expect(matchCvToJob("No keywords", "No listed skills")).toEqual({
      matched_skills: [],
      skill_gaps: [],
      suggested_keywords: [],
    });
  });

  it("drafts follow-up and thank-you messages with optional contact names", () => {
    const application = makeApplication();
    const contact = {
      id: "con-001",
      person: "Alex Example",
      company: "Example Labs",
      notes: "",
      application_ids: ["app-001"],
    };

    expect(draftFollowUpEmail(application, contact).body).toContain(
      "Hi Alex Example",
    );
    expect(draftFollowUpEmail(application).subject).toContain("Example Labs");
    expect(draftThankYou(application, "Taylor").body).toContain("Hi Taylor");
    expect(draftThankYou(application).subject).toContain("Software Engineer");
  });

  it("creates a structured interview preparation checklist", () => {
    const prep = generateInterviewPrep(makeApplication());
    expect(prep.checklist.length).toBeGreaterThan(0);
    expect(prep.checklist[0]).toContain("Software Engineer");
    expect(prep.star_prompts).toHaveLength(3);
  });

  it("builds a weekly report with recent records, status changes, and deadlines", () => {
    const applications = [
      makeApplication({
        date_applied: "2026-08-09",
        updated_at: "2026-08-10T00:00:00.000Z",
        history: [
          { status: "applied", timestamp: "2026-08-09T00:00:00.000Z" },
          { status: "interview", timestamp: "2026-08-10T00:00:00.000Z" },
        ],
        deadline: "2026-08-12",
      }),
      makeApplication({
        id: "app-002",
        date_applied: "2026-08-01",
        updated_at: "2026-08-01T00:00:00.000Z",
        deadline: "2026-08-20",
      }),
    ];

    const report = buildWeeklyReport(applications, now);

    expect(report.period_start).toBe("2026-08-04");
    expect(report.period_end).toBe("2026-08-10");
    expect(report.new_applications).toBe(1);
    expect(report.status_changes).toBe(1);
    expect(
      report.upcoming_deadlines.map((application) => application.id),
    ).toEqual(["app-001", "app-002"]);
  });

  it("parses valid CSV rows, reports invalid rows, and handles malformed CSV", () => {
    const imported = parseApplicationsCsv(
      "company,role,date_applied,status,source,notes\nExample Labs,Engineer,2026-08-01,applied,referral,Hello\nBad,,,,,\n",
    );

    expect(imported.applications).toHaveLength(1);
    expect(imported.applications[0].company).toBe("Example Labs");
    expect(imported.applications[0].source).toBe("referral");
    expect(imported.errors).toHaveLength(1);
    expect(parseApplicationsCsv('company,"broken').errors[0].row).toBe(0);
    expect(parseApplicationsCsv("").applications).toEqual([]);
  });

  it("exports JSON, Markdown, and CSV including empty data", () => {
    const applications = [makeApplication({ company: "Example, Labs" })];

    expect(JSON.parse(exportApplications(applications, "json"))).toHaveLength(
      1,
    );
    expect(exportApplications(applications, "markdown")).toContain(
      "| Example, Labs |",
    );
    const csv = exportApplications(applications, "csv");
    expect(csv).toContain("company");
    expect(csv).toContain('"Example, Labs"');
    expect(exportApplications([], "markdown")).toContain("| Company |");
    expect(exportApplications([], "csv")).toContain("company");
  });
});
