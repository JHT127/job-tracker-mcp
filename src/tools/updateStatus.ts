import { McpServer } from "@modelcontextprotocol/server";
import { updateStatusInputSchema } from "../schemas/updateStatus.js";
import { updateApplicationStatus } from "../lib/applications.js";

export function registerUpdateStatusTool(server: McpServer) {
  server.registerTool(
    "update_status",
    {
      description:
        "Updates the status of an existing application. Use when the user reports a change (interview, rejection, offer).",
      inputSchema: updateStatusInputSchema,
    },
    async (input) => {
      try {
        const updated = await updateApplicationStatus(
          input.id,
          input.new_status,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unexpected error.";
        console.error(`[update_status] ${message}`);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
        };
      }
    },
  );
}
