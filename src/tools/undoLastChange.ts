import { McpServer } from "@modelcontextprotocol/server";

import { getApplicationService } from "../core/runtime.js";
import { undoLastChangeInputSchema } from "../schemas/undoLastChange.js";

export function registerUndoLastChangeTool(server: McpServer) {
  server.registerTool(
    "undo_last_change",
    {
      title: "Undo Last Application Change",
      description: "Restores the previous editable state of an application.",
      inputSchema: undoLastChangeInputSchema,
    },
    async (input) => {
      try {
        const restored = await getApplicationService().undoLastChange(input.id);
        return {
          content: [{ type: "text", text: JSON.stringify(restored, null, 2) }],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unexpected error.";
        console.error(`[undo_last_change] ${message}`);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
        };
      }
    },
  );
}
