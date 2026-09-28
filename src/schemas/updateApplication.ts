import * as z from "zod/v4";

import {
  applicationSourceSchema,
  applicationStatusSchema,
} from "./applicationData.js";

const editableFieldsSchema = z.object({
  company: z.string().min(1).max(100).optional(),
  role: z.string().min(1).max(100).optional(),
  date_applied: z.iso.date().optional(),
  status: applicationStatusSchema.optional(),
  source: applicationSourceSchema.optional(),
  notes: z.string().max(500).optional(),
  salary: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  job_url: z.url().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  deadline: z.iso.date().optional(),
  resume_version: z.string().max(100).optional(),
});

export const updateApplicationInputSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .extend(editableFieldsSchema.shape)
  .refine(
    (input) => Object.keys(input).some((key) => key !== "id"),
    "At least one application field must be provided.",
  );
