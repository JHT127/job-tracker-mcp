import { describe, expect, it } from "vitest";

import { summarizeApplications } from "../core/stats.js";
import { makeApplication } from "./helpers/applicationFixtures.js";

describe("summarizeApplications", () => {
  it("returns zero rates and complete empty buckets for no records", () => {
    const stats = summarizeApplications([]);

    expect(stats.total).toBe(0);
    expect(stats.responded).toBe(0);
    expect(stats.responseRate).toBe(0);
    expect(stats.interviewRate).toBe(0);
    expect(stats.byStatus).toEqual({
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      no_response: 0,
    });
    expect(stats.bySource.cold_apply).toBe(0);
    expect(stats.bySource.referral).toBe(0);
  });

  it("counts statuses and sources and calculates response rates", () => {
    const stats = summarizeApplications([
      makeApplication(),
      makeApplication({
        id: "app-002",
        status: "interview",
        source: "referral",
      }),
      makeApplication({ id: "app-003", status: "offer", source: "linkedin" }),
      makeApplication({
        id: "app-004",
        status: "rejected",
        source: "referral",
      }),
      makeApplication({
        id: "app-005",
        status: "no_response",
        source: "company_website",
      }),
    ]);

    expect(stats.total).toBe(5);
    expect(stats.responded).toBe(3);
    expect(stats.responseRate).toBe(0.6);
    expect(stats.interviewRate).toBe(0.4);
    expect(stats.bySource.referral).toBe(2);
    expect(stats.byStatus.no_response).toBe(1);
  });
});
