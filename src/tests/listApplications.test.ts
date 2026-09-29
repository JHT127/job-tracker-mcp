import { describe, expect, it } from "vitest";

const MAX_APPLICATIONS = 50;

type Application = {
  id: string;
  company: string;
  role: string;
  date_applied: string;
  status: "applied" | "interview" | "offer" | "rejected" | "no_response";
  source: "cold_apply" | "linkedin" | "referral";
  notes: string;
};

function applyOutputCap(applications: Application[]) {
  const total = applications.length;
  const truncated = total > MAX_APPLICATIONS;

  return {
    applications: applications.slice(0, MAX_APPLICATIONS),
    total,
    truncated,
  };
}

describe("application output cap", () => {
  it("returns all applications when there are 50 or fewer", () => {
    const applications: Application[] = Array.from(
      { length: 50 },
      (_, index) => ({
        id: `app-${String(index + 1).padStart(3, "0")}`,
        company: `Company ${index + 1}`,
        role: "Software Engineer Intern",
        date_applied: "2026-07-01",
        status: "applied",
        source: "cold_apply",
        notes: "Test application",
      }),
    );

    const result = applyOutputCap(applications);

    expect(result.applications).toHaveLength(50);
    expect(result.total).toBe(50);
    expect(result.truncated).toBe(false);
  });

  it("returns only 50 applications when there are more than 50", () => {
    const applications: Application[] = Array.from(
      { length: 51 },
      (_, index) => ({
        id: `app-${String(index + 1).padStart(3, "0")}`,
        company: `Company ${index + 1}`,
        role: "Software Engineer Intern",
        date_applied: "2026-07-01",
        status: "applied",
        source: "cold_apply",
        notes: "Test application",
      }),
    );

    const result = applyOutputCap(applications);

    expect(result.applications).toHaveLength(50);
    expect(result.total).toBe(51);
    expect(result.truncated).toBe(true);
  });
});
