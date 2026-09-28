import * as z from "zod/v4";

export const undoLastChangeInputSchema = z.object({
  id: z.string().min(1).max(100),
});
