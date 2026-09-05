import { McpServer } from "@modelcontextprotocol/server";

import { searchApplications } from "../lib/applications.js";

import { searchApplicationsInputSchema } from "../schemas/searchApplications.js";

export function registerSearchApplicationsTool(server: McpServer) {
  server.registerTool(
    "search_applications",
    {
      title: "Search Job Applications",

      description:
        "Searches applications by company or role keyword. Read-only.",

      inputSchema: searchApplicationsInputSchema,
    },

    async (input) => {
      try {
        const results = await searchApplications(input.query);

        return {
          content: [
            {
              type: "text",

              text:
                results.length > 0
                  ? JSON.stringify(results, null, 2)
                  : "No matching applications found.",
            },
          ],
        };
      } catch (error) {
        console.error("[search_applications]", error);

        return {
          content: [
            {
              type: "text",

              text:
                error instanceof Error
                  ? error.message
                  : "Unable to search applications.",
            },
          ],
        };
      }
    }
  );
}