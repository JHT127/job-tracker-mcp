#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { registerAddApplicationTool } from "./tools/addApplication.js";
import { registerDeleteApplicationTool } from "./tools/deleteApplication.js";
import { registerGetNextActionsTool } from "./tools/getNextActions.js";
import { registerListApplicationsTool } from "./tools/listApplications.js";
import { registerUpdateStatusTool } from "./tools/updateStatus.js";
import { registerSearchApplicationsTool } from "./tools/searchApplications.js";
import { registerUpdateApplicationTool } from "./tools/updateApplication.js";
import { registerUndoLastChangeTool } from "./tools/undoLastChange.js";

function createServer(): McpServer {
  const server = new McpServer({
    name: "job-application-tracker",
    version: "0.1.0",
  });

  registerAddApplicationTool(server);
  registerDeleteApplicationTool(server);
  registerListApplicationsTool(server);
  registerUpdateStatusTool(server);
  registerGetNextActionsTool(server);
  registerSearchApplicationsTool(server);
  registerUpdateApplicationTool(server);
  registerUndoLastChangeTool(server);
  return server;
}

void serveStdio(createServer);
console.error("job-application-tracker MCP server running on stdio");
