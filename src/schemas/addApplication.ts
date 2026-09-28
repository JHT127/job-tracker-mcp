import * as z from "zod/v4";
import {
  applicationSourceSchema,
  applicationStatusSchema,
} from "./applicationData.js";

export const addApplicationInputSchema = z.object({
  company: z
    .string()
    .min(1, "Company name cannot be empty.")
    .max(100, "Company name must be at most 100 characters.")
    .regex(/[a-zA-Z]/, "Company name must contain letters.")
    .describe("Company name where the user applied."),

  role: z
    .string()
    .min(1, "Job title cannot be empty.")
    .max(100, "Job title must be at most 100 characters.")
    .regex(/[a-zA-Z]/, "Job title must contain letters.")
    .describe("Job title or position the user applied for."),

  date_applied: z.iso
    .date("Date must be in YYYY-MM-DD format.")
    .describe("Application date in YYYY-MM-DD format."),

  status: applicationStatusSchema
    .default("applied")
    .describe("Current application status."),

  source: applicationSourceSchema
    .default("cold_apply")
    .describe("Where the application was submitted."),

  notes: z
    .string()
    .max(500, "Notes must be at most 500 characters.")
    .optional()
    .describe("Optional notes about this application."),

  salary: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  job_url: z.url().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  tags: z.array(z.string().min(1).max(50)).default([]),
  deadline: z.iso.date().optional(),
  resume_version: z.string().max(100).optional(),
});
