import * as z from "zod/v4";

export const applicationStatusSchema = z.enum([
  "applied",
  "interview",
  "offer",
  "rejected",
  "no_response",
]);

export const applicationSourceSchema = z.enum([
  "cold_apply",
  "linkedin",
  "referral",
  "company_website",
  "career_fair",
]);

export const statusHistoryEntrySchema = z.object({
  status: applicationStatusSchema,
  timestamp: z.iso.datetime(),
});

const undoEntrySchema = z.object({
  timestamp: z.iso.datetime(),
  previous: z.record(z.string(), z.unknown()),
});

const legacyApplicationDataSchema = z.object({
  id: z.string().regex(/^app-\d+$/, "Invalid application ID."),
  company: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  date_applied: z.iso.date(),
  status: applicationStatusSchema,
  source: applicationSourceSchema,
  notes: z.string().max(500),
  updated_at: z.iso.datetime().optional(),
  history: z.array(statusHistoryEntrySchema).optional(),
  salary: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  job_url: z.url().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  deadline: z.iso.date().optional(),
  resume_version: z.string().max(100).optional(),
  undo_stack: z.array(undoEntrySchema).optional(),
});

export const applicationDataSchema = legacyApplicationDataSchema.transform(
  (application) => {
    const updatedAt =
      application.updated_at ?? `${application.date_applied}T00:00:00.000Z`;

    return {
      ...application,
      updated_at: updatedAt,
      history: application.history ?? [
        { status: application.status, timestamp: updatedAt },
      ],
      priority: application.priority ?? "normal",
      tags: application.tags ?? [],
      undo_stack: application.undo_stack ?? [],
    };
  },
);

export const applicationsDataSchema = z.array(applicationDataSchema);

export type ApplicationData = z.output<typeof applicationDataSchema>;
export type ApplicationDataInput = z.input<typeof applicationDataSchema>;
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type ApplicationSource = z.infer<typeof applicationSourceSchema>;
