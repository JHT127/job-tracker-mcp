import { McpServer } from "@modelcontextprotocol/server";
import { deleteApplicationInputSchema } from "../schemas/deleteApplication.js";
import { deleteApplication } from "../lib/applications.js";

export function registerDeleteApplicationTool(server: McpServer) {
  server.registerTool(
    "delete_application",
    {
      title: "Delete Job Application",
      description:
        "Deletes an existing application by its ID. Use when the user wants to remove a record (e.g. duplicate or added by mistake).",
      inputSchema: deleteApplicationInputSchema,
    },
    async (input) => {
      try {
        const deleted = await deleteApplication(input.id);
        return {
          content: [
            {
              type: "text",
              text: `Application deleted successfully.\n\n${JSON.stringify(deleted, null, 2)}`,
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unexpected error.";
        console.error(`[delete_application] ${message}`);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
        };
      }
    },
  );
}
