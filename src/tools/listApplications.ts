import { McpServer } from "@modelcontextprotocol/server";

import { getApplicationService } from "../core/runtime.js";
import { listApplicationsInputSchema } from "../schemas/list_applications.js";

export function registerListApplicationsTool(server: McpServer) {
  server.registerTool(
    "list_applications",
    {
      title: "List Job Applications",
      description:
        "Lists job applications, optionally filtered by status. Returns at most 50 applications.",
      inputSchema: listApplicationsInputSchema,
    },
    async (input) => {
      try {
        const { applications, total, truncated } =
          await getApplicationService().list(input.status);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  statusFilter: input.status ?? null,
                  applications,
                  total,
                  truncated,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        console.error("list_applications failed:", error);
        return {
          content: [
            {
              type: "text",
              text: "Could not read applications data.",
            },
          ],
        };
      }
    },
  );
}
