import * as z from "zod/v4";

export const contactDataSchema = z.object({
  id: z.string().regex(/^con-\d+$/),
  person: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  linkedin: z.url().optional(),
  last_message_date: z.iso.date().optional(),
  notes: z.string().max(1000).default(""),
  application_ids: z.array(z.string().regex(/^app-\d+$/)).default([]),
});

export const contactsDataSchema = z.array(contactDataSchema);

export type ContactData = z.output<typeof contactDataSchema>;
export type ContactDataInput = z.input<typeof contactDataSchema>;

export const addContactInputSchema = z.object({
  person: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  linkedin: z.url().optional(),
  last_message_date: z.iso.date().optional(),
  notes: z.string().max(1000).optional(),
});

export const listContactsInputSchema = z.object({
  company: z.string().min(1).max(100).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const linkContactInputSchema = z.object({
  contact_id: z.string().regex(/^con-\d+$/),
  application_id: z.string().regex(/^app-\d+$/),
});

export const getReconnectSuggestionsInputSchema = z.object({
  days_threshold: z.number().int().min(1).max(365).default(30),
  limit: z.number().int().min(1).max(100).default(20),
});
