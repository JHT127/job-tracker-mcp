import { z } from "zod";

export const searchApplicationsInputSchema = {
  query: z.string().min(1, "Query is required").max(100, "Query too long"),
};