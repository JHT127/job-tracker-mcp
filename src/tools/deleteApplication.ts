import { McpServer } from "@modelcontextprotocol/server";

import { getApplicationService } from "../core/runtime.js";
import { deleteApplicationInputSchema } from "../schemas/deleteApplication.js";

export function registerDeleteApplicationTool(server: McpServer) {
  server.registerTool(
    "delete_application",
    {
      title: "Delete Job Application",
      description:
        "Permanently deletes an application after the user confirms by setting confirm to true.",
      inputSchema: deleteApplicationInputSchema,
    },
    async (input) => {
      try {
        const deleted = await getApplicationService().delete(
          input.id,
          input.confirm,
        );
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
