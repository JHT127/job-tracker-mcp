import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

import { addApplicationInputSchema } from "../schemas/addApplication.js";
import type {
  ApplicationData,
  ApplicationStatus,
} from "../schemas/applicationData.js";
import type { ContactData } from "../schemas/contact.js";
import { summarizeApplications } from "./stats.js";

const DAY_IN_MILLISECONDS = 86_400_000;
const TERMINAL_STATUSES = new Set<ApplicationStatus>(["offer", "rejected"]);
const SKILL_TERMS = [
  "typescript",
  "javascript",
  "python",
  "java",
  "c++",
  "react",
  "node.js",
  "sql",
  "postgresql",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "machine learning",
  "communication",
  "leadership",
  "git",
  "linux",
  "rest api",
  "system design",
];

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getStaleApplications(
  applications: readonly ApplicationData[],
  daysThreshold: number,
  now: Date = new Date(),
): Array<{ application: ApplicationData; daysSinceUpdate: number }> {
  const threshold = Math.min(Math.max(Math.trunc(daysThreshold), 1), 365);
  return applications
    .filter((application) => !TERMINAL_STATUSES.has(application.status))
    .map((application) => ({
      application,
      daysSinceUpdate: Math.max(
        0,
        Math.floor(
          (utcDay(now) - utcDay(new Date(application.updated_at))) /
            DAY_IN_MILLISECONDS,
        ),
      ),
    }))
    .filter((entry) => entry.daysSinceUpdate >= threshold)
    .sort(
      (left, right) =>
        right.daysSinceUpdate - left.daysSinceUpdate ||
        left.application.id.localeCompare(right.application.id),
    );
}

export function getConversionStats(applications: readonly ApplicationData[]) {
  const stats = summarizeApplications(applications);
  const bySource = Object.fromEntries(
    Object.entries(stats.bySource).map(([source, count]) => {
      const sourceApplications = applications.filter(
        (application) => application.source === source,
      );
      const responded = sourceApplications.filter((application) =>
        ["interview", "offer", "rejected"].includes(application.status),
      ).length;
      const interviews = sourceApplications.filter((application) =>
        ["interview", "offer"].includes(application.status),
      ).length;

      return [
        source,
        {
          applications: count,
          responded,
          interviews,
          response_rate: count === 0 ? 0 : responded / count,
          interview_rate: count === 0 ? 0 : interviews / count,
        },
      ];
    }),
  );

  return { total: stats.total, by_source: bySource };
}

export function getHealthScore(applications: readonly ApplicationData[]): {
  score: number;
  reasons: string[];
} {
  if (applications.length === 0) {
    return { score: 0, reasons: ["No applications are recorded yet."] };
  }

  const stats = summarizeApplications(applications);
  const activeApplications = applications.filter(
    (application) => !TERMINAL_STATUSES.has(application.status),
  );
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.min(applications.length / 10, 1) * 25 +
          stats.responseRate * 35 +
          Math.min(stats.byStatus.interview + stats.byStatus.offer, 3) * 10 +
          (activeApplications.length > 0 ? 10 : 0),
      ),
    ),
  );
  const reasons = [
    `${applications.length} application${applications.length === 1 ? " is" : "s are"} tracked.`,
    `${Math.round(stats.responseRate * 100)}% of applications have received a response.`,
    `${stats.byStatus.interview + stats.byStatus.offer} application${stats.byStatus.interview + stats.byStatus.offer === 1 ? " is" : "s are"} at interview or offer stage.`,
  ];

  return { score, reasons };
}

export interface ParsedJobPosting {
  company?: string;
  role?: string;
  location?: string;
  salary?: string;
  requirements: string[];
}

export function parseJobPostingText(text: string): ParsedJobPosting {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const heading = lines[0] ?? "";
  const roleMatch = heading.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  const companyMatch = text.match(/(?:company|employer)\s*:\s*([^\r\n]+)/i);
  const company = companyMatch?.[1] ?? roleMatch?.[2];
  const locationMatch = text.match(/location\s*:\s*([^\r\n]+)/i);
  const salaryMatch = text.match(
    /\$\s?\d[\d,]*(?:\s?[-–]\s?\$?\d[\d,]*)?(?:\s*(?:per year|\/year|annually|hourly|\/hour))?/i,
  );
  const requirements = lines
    .filter((line) => /^(?:[-*•]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^(?:[-*•]|\d+[.)])\s+/, ""))
    .slice(0, 30);

  return {
    ...(company ? { company: company.trim() } : {}),
    ...(roleMatch?.[1] ? { role: roleMatch[1].trim() } : {}),
    ...(locationMatch?.[1] ? { location: locationMatch[1].trim() } : {}),
    ...(salaryMatch?.[0] ? { salary: salaryMatch[0].trim() } : {}),
    requirements,
  };
}

export function matchCvToJob(
  cvText: string,
  jobDescription: string,
): {
  matched_skills: string[];
  skill_gaps: string[];
  suggested_keywords: string[];
} {
  const cv = cvText.toLocaleLowerCase();
  const job = jobDescription.toLocaleLowerCase();
  const requiredSkills = SKILL_TERMS.filter((skill) => job.includes(skill));
  const matchedSkills = requiredSkills.filter((skill) => cv.includes(skill));
  const skillGaps = requiredSkills.filter((skill) => !cv.includes(skill));

  return {
    matched_skills: matchedSkills,
    skill_gaps: skillGaps,
    suggested_keywords: skillGaps,
  };
}

export function draftFollowUpEmail(
  application: ApplicationData,
  contact?: ContactData,
): { subject: string; body: string } {
  const greeting = contact?.person ? `Hi ${contact.person},` : "Hello,";
  return {
    subject: `Following up on ${application.role} at ${application.company}`,
    body: `${greeting}\n\nI’m following up on my ${application.role} application at ${application.company}, submitted on ${application.date_applied}. I remain interested in the opportunity and would appreciate any update you can share.\n\nThank you,\n[Your name]`,
  };
}

export function draftThankYou(
  application: ApplicationData,
  interviewer?: string,
): { subject: string; body: string } {
  const greeting = interviewer ? `Hi ${interviewer},` : "Hello,";
  return {
    subject: `Thank you for discussing ${application.role}`,
    body: `${greeting}\n\nThank you for speaking with me about the ${application.role} role at ${application.company}. I enjoyed learning more about the opportunity and remain very interested.\n\nBest,\n[Your name]`,
  };
}

export function generateInterviewPrep(application: ApplicationData): {
  checklist: string[];
  star_prompts: string[];
} {
  return {
    checklist: [
      `Review the role requirements for ${application.role}.`,
      `Prepare a concise introduction tailored to ${application.company}.`,
      "Prepare questions about the team, success measures, and next steps.",
      "Review the application notes and relevant work samples.",
    ],
    star_prompts: [
      "Describe a challenging problem you solved and your measurable result.",
      "Describe a time you handled disagreement or difficult feedback.",
      "Describe how you prioritized competing deadlines.",
    ],
  };
}

export function buildWeeklyReport(
  applications: readonly ApplicationData[],
  now: Date = new Date(),
): {
  period_start: string;
  period_end: string;
  new_applications: number;
  status_changes: number;
  upcoming_deadlines: ApplicationData[];
  pipeline: ReturnType<typeof summarizeApplications>;
} {
  const endDay = utcDay(now);
  const startDay = endDay - 6 * DAY_IN_MILLISECONDS;
  const recentApplications = applications.filter((application) => {
    const appliedDay = utcDay(
      new Date(`${application.date_applied}T00:00:00.000Z`),
    );
    return appliedDay >= startDay && appliedDay <= endDay;
  });
  const statusChanges = applications.reduce(
    (count, application) =>
      count +
      application.history.slice(1).filter((entry) => {
        const changedDay = utcDay(new Date(entry.timestamp));
        return changedDay >= startDay && changedDay <= endDay;
      }).length,
    0,
  );
  const upcomingDeadlines = applications
    .filter((application) =>
      application.deadline
        ? utcDay(new Date(`${application.deadline}T00:00:00.000Z`)) >= endDay
        : false,
    )
    .sort((left, right) =>
      (left.deadline ?? "").localeCompare(right.deadline ?? ""),
    );

  return {
    period_start: new Date(startDay).toISOString().slice(0, 10),
    period_end: new Date(endDay).toISOString().slice(0, 10),
    new_applications: recentApplications.length,
    status_changes: statusChanges,
    upcoming_deadlines: upcomingDeadlines,
    pipeline: summarizeApplications(applications),
  };
}

export interface CsvImportResult {
  applications: Array<{
    company: string;
    role: string;
    date_applied: string;
    status: ApplicationStatus;
    source: ApplicationData["source"];
    notes: string;
  }>;
  errors: Array<{ row: number; message: string }>;
}

export function parseApplicationsCsv(csv: string): CsvImportResult {
  let rows: Array<Record<string, string>>;
  try {
    rows = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Array<Record<string, string>>;
  } catch (error) {
    return {
      applications: [],
      errors: [
        {
          row: 0,
          message:
            error instanceof Error ? error.message : "Invalid CSV input.",
        },
      ],
    };
  }

  const applications: CsvImportResult["applications"] = [];
  const errors: CsvImportResult["errors"] = [];
  rows.forEach((row, index) => {
    const parsed = addApplicationInputSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        row: index + 2,
        message: parsed.error.issues[0]?.message ?? "Invalid row.",
      });
      return;
    }
    applications.push({
      company: parsed.data.company,
      role: parsed.data.role,
      date_applied: parsed.data.date_applied,
      status: parsed.data.status,
      source: parsed.data.source,
      notes: parsed.data.notes ?? "",
    });
  });

  return { applications, errors };
}

export function exportApplications(
  applications: readonly ApplicationData[],
  format: "json" | "markdown" | "csv",
): string {
  if (format === "json") {
    return JSON.stringify(applications, null, 2);
  }
  if (format === "markdown") {
    const rows = applications.map(
      (application) =>
        `| ${application.company} | ${application.role} | ${application.status} | ${application.date_applied} |`,
    );
    return [
      "| Company | Role | Status | Applied |",
      "| --- | --- | --- | --- |",
      ...rows,
    ].join("\n");
  }

  const columns = [
    "id",
    "company",
    "role",
    "date_applied",
    "status",
    "source",
    "notes",
    "updated_at",
    "salary",
    "location",
    "work_mode",
    "job_url",
    "priority",
    "tags",
    "deadline",
    "resume_version",
  ];

  return stringify(
    applications.map((application) => ({
      id: application.id,
      company: application.company,
      role: application.role,
      date_applied: application.date_applied,
      status: application.status,
      source: application.source,
      notes: application.notes,
      updated_at: application.updated_at,
      salary: application.salary ?? "",
      location: application.location ?? "",
      work_mode: application.work_mode ?? "",
      job_url: application.job_url ?? "",
      priority: application.priority,
      tags: application.tags.join("|"),
      deadline: application.deadline ?? "",
      resume_version: application.resume_version ?? "",
    })),
    { header: true, columns },
  );
}
