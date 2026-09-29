import { McpServer } from "@modelcontextprotocol/server";

import { getApplicationService } from "../core/runtime.js";
import { updateApplicationInputSchema } from "../schemas/updateApplication.js";

export function registerUpdateApplicationTool(server: McpServer) {
  server.registerTool(
    "update_application",
    {
      title: "Update Job Application",
      description: "Updates any editable field on an existing application.",
      inputSchema: updateApplicationInputSchema,
    },
    async (input) => {
      try {
        const { id, ...changes } = input;
        const updated = await getApplicationService().update(id, changes);
        return {
          content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unexpected error.";
        console.error(`[update_application] ${message}`);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
        };
      }
    },
  );
}
