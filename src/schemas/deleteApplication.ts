import * as z from "zod/v4";

// Schema for the delete_application tool

export const deleteApplicationInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .describe("The unique ID of the application to delete."),
  confirm: z
    .boolean()
    .default(false)
    .describe("Set to true after the user confirms permanent deletion."),
});
