import { McpServer } from "@modelcontextprotocol/server";

import { getApplicationService } from "../core/runtime.js";
import { getNextActionsInputSchema } from "../schemas/getNextActions.js";
export { buildNextActions } from "../core/nextActions.js";

export function registerGetNextActionsTool(server: McpServer) {
  server.registerTool(
    "get_next_actions",
    {
      title: "Get Next Actions",
      description:
        "Returns prioritized next actions for stale applications and recent status changes.",
      inputSchema: getNextActionsInputSchema,
    },
    async (input) => {
      try {
        const allActions = await getApplicationService().getNextActions({
          status: input.status,
        });

        // Defense in depth: clamp even if schema-level cap is bypassed/changed.
        const requestedLimit = input.limit ?? 10;
        const effectiveLimit = Math.min(Math.max(1, requestedLimit), 10);

        const total = allActions.length;
        const truncated = total > effectiveLimit;
        const actions = allActions.slice(0, effectiveLimit);

        if (actions.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No next actions right now — nothing stale or recently updated.",
              },
            ],
          };
        }

        const response = {
          statusFilter: input.status ?? null,
          total,
          truncated,
          limit: effectiveLimit,
          actions,
        };

        // If we truncated the results, be explicit about it in the returned text.
        const text =
          JSON.stringify(response, null, 2) +
          (truncated
            ? "\n\n(Note: results truncated to the requested limit)"
            : "");

        return {
          content: [
            {
              type: "text",
              text,
            },
          ],
        };
      } catch (error: unknown) {
        console.error("[get_next_actions] error", error);

        return {
          content: [
            {
              type: "text",
              text: "Unable to compute next actions.",
            },
          ],
        };
      }
    },
  );
}
