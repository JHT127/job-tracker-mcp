import * as z from "zod/v4";

export const interviewTypeSchema = z.enum([
  "phone",
  "technical",
  "behavioral",
  "onsite",
  "other",
]);

export const interviewDataSchema = z.object({
  id: z.string().regex(/^int-\d+$/),
  application_id: z.string().regex(/^app-\d+$/),
  date: z.iso.datetime(),
  type: interviewTypeSchema,
  interviewer: z.string().max(100).optional(),
  prep_notes: z.string().max(2000).default(""),
});

export const interviewsDataSchema = z.array(interviewDataSchema);

export type InterviewData = z.output<typeof interviewDataSchema>;
export type InterviewDataInput = z.input<typeof interviewDataSchema>;

export const addInterviewInputSchema = z.object({
  application_id: z.string().regex(/^app-\d+$/),
  date: z.iso.datetime(),
  type: interviewTypeSchema,
  interviewer: z.string().max(100).optional(),
  prep_notes: z.string().max(2000).optional(),
});

export const listUpcomingInterviewsInputSchema = z.object({
  days_ahead: z.number().int().min(1).max(365).default(30),
  limit: z.number().int().min(1).max(100).default(20),
});
