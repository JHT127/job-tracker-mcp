import * as z from "zod/v4";

import { applicationStatusSchema } from "./applicationData.js";

export const getStaleApplicationsInputSchema = z.object({
  days_threshold: z.number().int().min(1).max(365).default(14),
  status: applicationStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const getConversionStatsInputSchema = z.object({});
export const getHealthScoreInputSchema = z.object({});

export const parseJobPostingInputSchema = z
  .object({
    text: z.string().min(1).max(100_000).optional(),
    url: z.url().optional(),
    create_application: z.boolean().default(false),
    date_applied: z.iso.date().optional(),
  })
  .refine((input) => Boolean(input.text || input.url), {
    message: "Provide posting text or a URL.",
  })
  .refine((input) => !input.create_application || Boolean(input.date_applied), {
    message: "date_applied is required when create_application is true.",
    path: ["date_applied"],
  });

export const matchCvToJobInputSchema = z.object({
  cv_text: z.string().min(1).max(100_000),
  job_description: z.string().min(1).max(100_000),
});

export const applicationMessageInputSchema = z.object({
  application_id: z.string().regex(/^app-\d+$/),
  contact_id: z
    .string()
    .regex(/^con-\d+$/)
    .optional(),
});

export const draftThankYouInputSchema = z.object({
  application_id: z.string().regex(/^app-\d+$/),
  interviewer: z.string().max(100).optional(),
});

export const generateInterviewPrepInputSchema = z.object({
  application_id: z.string().regex(/^app-\d+$/),
});

export const weeklyReportInputSchema = z.object({});

export const bulkImportInputSchema = z.object({
  csv: z.string().min(1).max(1_000_000),
});

export const exportInputSchema = z.object({
  format: z.enum(["json", "markdown", "csv"]).default("json"),
  status: applicationStatusSchema.optional(),
  limit: z.number().int().min(1).max(1000).default(500),
});
