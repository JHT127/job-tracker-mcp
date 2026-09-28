import { McpServer } from "@modelcontextprotocol/server";

import { getApplicationService } from "../core/runtime.js";
import { addApplicationInputSchema } from "../schemas/addApplication.js";

export function registerAddApplicationTool(server: McpServer) {
  server.registerTool(
    "add_application",
    {
      title: "Add Job Application",
      description: "Add a new job application record to the tracker.",
      inputSchema: addApplicationInputSchema,
    },
    async (input) => {
      try {
        const result = await getApplicationService().add(input);
        const warning = result.duplicateWarning
          ? `Warning: ${result.duplicateWarning}\n\n`
          : "";

        return {
          content: [
            {
              type: "text",
              text:
                `${warning}Application added successfully.\n\n` +
                JSON.stringify(result.application, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        console.error("[add_application]", error);
        return {
          content: [
            {
              type: "text",
              text:
                error instanceof Error
                  ? error.message
                  : "Unable to add the application.",
            },
          ],
        };
      }
    },
  );
}
