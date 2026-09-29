#!/usr/bin/env node
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";
import * as z from "zod/v4";
import {
  McpServer,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { logger } from "./lib/trackerConfig.js";
import { applicationStatusSchema } from "./schemas/applicationData.js";
import { addContactInputSchema } from "./schemas/contact.js";
import { addInterviewInputSchema } from "./schemas/interview.js";
import {
  getApplicationService,
  getContactService,
  getInterviewService,
} from "./core/runtime.js";
import { createIntegrationManager } from "./integrations/index.js";
import { registerAddApplicationTool } from "./tools/addApplication.js";
import { registerDeleteApplicationTool } from "./tools/deleteApplication.js";
import { registerGetNextActionsTool } from "./tools/getNextActions.js";
import { registerListApplicationsTool } from "./tools/listApplications.js";
import { registerUpdateStatusTool } from "./tools/updateStatus.js";
import { registerSearchApplicationsTool } from "./tools/searchApplications.js";
import { registerUpdateApplicationTool } from "./tools/updateApplication.js";
import { registerUndoLastChangeTool } from "./tools/undoLastChange.js";
import {
  registerPhase2Prompts,
  registerPhase2Resources,
  registerPhase2Tools,
} from "./tools/phase2.js";

const integrationManager = createIntegrationManager();
logger.info(
  { integrations: integrationManager.getStatuses() },
  "integration configuration loaded",
);

const REST_PATH_PREFIXES = [
  "/applications",
  "/contacts",
  "/interviews",
  "/stats",
  "/next-actions",
  "/health",
  "/docs",
  "/openapi.json",
  "/webhooks",
  "/export",
  "/import",
];

const appCreateSchema = z.object({
  company: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  date_applied: z.iso.date(),
  status: applicationStatusSchema.optional(),
  source: z
    .enum([
      "cold_apply",
      "linkedin",
      "referral",
      "company_website",
      "career_fair",
    ])
    .optional(),
  notes: z.string().max(500).optional(),
  salary: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  job_url: z.url().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  deadline: z.iso.date().optional(),
  resume_version: z.string().max(100).optional(),
});

const appPatchSchema = appCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one application field must be provided.",
  });

const statusPatchSchema = z.object({ status: applicationStatusSchema });
const webhookRegisterSchema = z.object({
  url: z.url(),
  secret: z.string().min(1).max(200).optional(),
  events: z.array(z.string()).default(["application.status_changed"]),
});

const webhookRegistry = new Map<
  string,
  { url: string; secret?: string; events: string[] }
>();

function jsonError(
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    }),
  };
}

function jsonSuccess(
  statusCode: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function getClientIp(request: http.IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return request.socket.remoteAddress ?? "unknown";
}

const rateLimitMap = new Map<string, number[]>();

function enforceRateLimit(request: http.IncomingMessage): boolean {
  const limit = Number(process.env.API_RATE_LIMIT ?? 120);
  const windowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
  const key = getClientIp(request);
  const now = Date.now();
  const hits = (rateLimitMap.get(key) ?? []).filter(
    (timestamp) => timestamp > now - windowMs,
  );
  hits.push(now);
  rateLimitMap.set(key, hits);
  return hits.length <= limit;
}

export function isServerEntryPoint(entry: string | undefined): boolean {
  const normalized = entry?.replace(/\\/g, "/");
  if (!normalized) {
    return false;
  }

  return (
    normalized.endsWith("/src/index.ts") ||
    normalized.endsWith("/dist/index.js") ||
    normalized === "src/index.ts" ||
    normalized === "dist/index.js"
  );
}

export function createOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Job Application Tracker API",
      version: "1.0.0",
      description:
        "REST API for job applications, contacts, interviews, and reports.",
    },
    servers: [
      { url: "http://localhost:3001", description: "Local development server" },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Health check",
          responses: { "200": { description: "Healthy" } },
        },
      },
      "/applications": {
        get: {
          summary: "List applications",
          responses: { "200": { description: "Applications" } },
        },
        post: {
          summary: "Create application",
          responses: { "201": { description: "Created" } },
        },
      },
      "/applications/{id}": {
        get: {
          summary: "Get application",
          responses: { "200": { description: "Application" } },
        },
        patch: {
          summary: "Update application",
          responses: { "200": { description: "Updated" } },
        },
        delete: {
          summary: "Delete application",
          responses: { "200": { description: "Deleted" } },
        },
      },
      "/applications/{id}/status": {
        patch: {
          summary: "Update application status",
          responses: { "200": { description: "Updated" } },
        },
      },
      "/contacts": {
        get: {
          summary: "List contacts",
          responses: { "200": { description: "Contacts" } },
        },
        post: {
          summary: "Create contact",
          responses: { "201": { description: "Created" } },
        },
      },
      "/interviews": {
        get: {
          summary: "List interviews",
          responses: { "200": { description: "Interviews" } },
        },
        post: {
          summary: "Create interview",
          responses: { "201": { description: "Created" } },
        },
      },
      "/stats": {
        get: {
          summary: "Get stats",
          responses: { "200": { description: "Stats" } },
        },
      },
      "/next-actions": {
        get: {
          summary: "Get next actions",
          responses: { "200": { description: "Actions" } },
        },
      },
      "/webhooks": {
        post: {
          summary: "Register webhook",
          responses: { "201": { description: "Created" } },
        },
      },
    },
  };
}

async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    return {};
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

async function dispatchWebhook(
  event: string,
  applicationId: string,
  payload: Record<string, unknown>,
) {
  for (const subscription of webhookRegistry.values()) {
    if (!subscription.events.includes(event)) {
      continue;
    }

    const body = JSON.stringify({ event, applicationId, ...payload });
    const signature = subscription.secret
      ? createHmac("sha256", subscription.secret).update(body).digest("hex")
      : undefined;

    try {
      await fetch(subscription.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature
            ? { "x-jobtracker-signature": `sha256=${signature}` }
            : {}),
        },
        body,
      });
    } catch (error) {
      logger.warn(
        { err: error, url: subscription.url },
        "Webhook delivery failed",
      );
    }
  }
}

export async function handleRestApiRequest(
  request: http.IncomingMessage,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const url = new URL(request.url ?? "/", "http://localhost");
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return { statusCode: 204, headers: { ...corsHeaders }, body: "" };
  }

  const apiKey = process.env.API_KEY;
  if (apiKey && request.headers["x-api-key"] !== apiKey) {
    return jsonError(
      "UNAUTHORIZED",
      "A valid X-API-Key header is required.",
      401,
    );
  }

  if (!enforceRateLimit(request)) {
    return jsonError(
      "RATE_LIMITED",
      "Too many requests. Please retry later.",
      429,
    );
  }

  try {
    if (url.pathname === "/health") {
      return jsonSuccess(
        200,
        { ok: true, status: "healthy", timestamp: new Date().toISOString() },
        corsHeaders,
      );
    }

    if (url.pathname === "/docs") {
      return jsonSuccess(200, createOpenApiSpec(), corsHeaders);
    }

    if (url.pathname === "/openapi.json") {
      return jsonSuccess(200, createOpenApiSpec(), corsHeaders);
    }

    if (url.pathname === "/stats") {
      return jsonSuccess(
        200,
        await getApplicationService().getStats(),
        corsHeaders,
      );
    }

    if (url.pathname === "/next-actions") {
      const status = url.searchParams.get("status") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const actions = await getApplicationService().getNextActions({
        ...(status
          ? { status: status as z.infer<typeof applicationStatusSchema> }
          : {}),
        ...(Number.isFinite(limit) ? { limit } : {}),
      });
      return jsonSuccess(200, { actions, total: actions.length }, corsHeaders);
    }

    if (url.pathname === "/applications" && request.method === "GET") {
      const status = url.searchParams.get("status") as z.infer<
        typeof applicationStatusSchema
      > | null;
      const result = await getApplicationService().list(status ?? undefined);
      return jsonSuccess(200, result, corsHeaders);
    }

    if (url.pathname === "/applications" && request.method === "POST") {
      const payload = appCreateSchema.parse(await readJsonBody(request));
      const result = await getApplicationService().add(payload);
      return jsonSuccess(201, result, corsHeaders);
    }

    if (url.pathname === "/contacts" && request.method === "GET") {
      const company = url.searchParams.get("company") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const result = await getContactService().list({
        company,
        limit: Number.isFinite(limit) ? limit : 50,
      });
      return jsonSuccess(200, result, corsHeaders);
    }

    if (url.pathname === "/contacts" && request.method === "POST") {
      const payload = addContactInputSchema.parse(await readJsonBody(request));
      const result = await getContactService().add(payload);
      return jsonSuccess(201, result, corsHeaders);
    }

    if (url.pathname === "/interviews" && request.method === "GET") {
      const daysAhead = Number(url.searchParams.get("days_ahead") ?? 30);
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const result = await getInterviewService().listUpcoming({
        daysAhead,
        limit,
      });
      return jsonSuccess(200, result, corsHeaders);
    }

    if (url.pathname === "/interviews" && request.method === "POST") {
      const payload = addInterviewInputSchema.parse(
        await readJsonBody(request),
      );
      const result = await getInterviewService().add(payload);
      return jsonSuccess(201, result, corsHeaders);
    }

    if (url.pathname === "/export" && request.method === "GET") {
      const format = (
        url.searchParams.get("format") ?? "json"
      ).toLocaleLowerCase();
      const status = url.searchParams.get("status") ?? undefined;
      const applications = await getApplicationService().getAll();
      const filtered = status
        ? applications.filter((item) => item.status === status)
        : applications;
      const output =
        format === "csv"
          ? [
              [
                "id",
                "company",
                "role",
                "date_applied",
                "status",
                "source",
                "notes",
              ],
              ...filtered.map((item) => [
                item.id,
                item.company,
                item.role,
                item.date_applied,
                item.status,
                item.source,
                item.notes,
              ]),
            ]
              .map((row) =>
                row
                  .map(
                    (value) => `"${String(value ?? "").replaceAll('"', '""')}"`,
                  )
                  .join(","),
              )
              .join("\n")
          : filtered;
      return jsonSuccess(
        200,
        { format, total: filtered.length, data: output },
        corsHeaders,
      );
    }

    if (url.pathname === "/import" && request.method === "POST") {
      const body = z
        .object({ csv: z.string().min(1) })
        .parse(await readJsonBody(request));
      const rows = body.csv.trim().split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) {
        return jsonError(
          "INVALID_CSV",
          "CSV import requires a header row and at least one data row.",
          400,
        );
      }
      const imported = [] as Array<{
        row: number;
        application: unknown;
        warning?: string;
      }>;
      for (let index = 1; index < rows.length; index += 1) {
        const [company, role, date_applied, status] = rows[index].split(",");
        const application = await getApplicationService().add({
          company: company ?? "",
          role: role ?? "",
          date_applied: date_applied ?? new Date().toISOString().slice(0, 10),
          status:
            (status as z.infer<typeof applicationStatusSchema>) ?? "applied",
        });
        imported.push({
          row: index + 1,
          application: application.application,
          ...(application.duplicateWarning
            ? { warning: application.duplicateWarning }
            : {}),
        });
      }
      return jsonSuccess(
        200,
        { imported: imported.length, applications: imported },
        corsHeaders,
      );
    }

    if (url.pathname === "/webhooks" && request.method === "POST") {
      const payload = webhookRegisterSchema.parse(await readJsonBody(request));
      const id = randomUUID();
      webhookRegistry.set(id, {
        url: payload.url,
        secret: payload.secret,
        events: payload.events,
      });
      return jsonSuccess(
        201,
        { id, url: payload.url, events: payload.events },
        corsHeaders,
      );
    }

    const applicationMatch = /^\/applications\/([^/]+)$/.exec(url.pathname);
    if (applicationMatch) {
      const id = applicationMatch[1];
      if (request.method === "GET") {
        const app = (await getApplicationService().getAll()).find(
          (item) => item.id === id,
        );
        if (!app) {
          return jsonError(
            "NOT_FOUND",
            `No application found with id: ${id}`,
            404,
          );
        }
        return jsonSuccess(200, app, corsHeaders);
      }

      if (request.method === "PATCH") {
        const payload = appPatchSchema.parse(await readJsonBody(request));
        const result = await getApplicationService().update(id, payload);
        return jsonSuccess(200, result, corsHeaders);
      }

      if (request.method === "DELETE") {
        const payload = (await readJsonBody(request)) as { confirm?: boolean };
        const result = await getApplicationService().delete(
          id,
          payload.confirm === true,
        );
        return jsonSuccess(200, result, corsHeaders);
      }
    }

    const statusMatch = /^\/applications\/([^/]+)\/status$/.exec(url.pathname);
    if (statusMatch && request.method === "PATCH") {
      const id = statusMatch[1];
      const payload = statusPatchSchema.parse(await readJsonBody(request));
      const current = (await getApplicationService().getAll()).find(
        (item) => item.id === id,
      );
      const application = await getApplicationService().updateStatus(
        id,
        payload.status,
      );
      await dispatchWebhook("application.status_changed", application.id, {
        previousStatus: current?.status,
        status: application.status,
        timestamp: new Date().toISOString(),
      });
      return jsonSuccess(200, application, corsHeaders);
    }

    const contactMatch = /^\/contacts\/([^/]+)$/.exec(url.pathname);
    if (contactMatch && request.method === "GET") {
      const contact = (await getContactService().list()).contacts.find(
        (item) => item.id === contactMatch[1],
      );
      if (!contact) {
        return jsonError(
          "NOT_FOUND",
          `No contact found with id: ${contactMatch[1]}`,
          404,
        );
      }
      return jsonSuccess(200, contact, corsHeaders);
    }

    return jsonError(
      "NOT_FOUND",
      `Route not found: ${request.method} ${url.pathname}`,
      404,
    );
  } catch (error) {
    logger.warn({ err: error }, "REST API request failed");
    if (error instanceof z.ZodError) {
      return jsonError(
        "VALIDATION_ERROR",
        "Request validation failed.",
        400,
        error.issues,
      );
    }
    if (error instanceof Error) {
      return jsonError("INTERNAL_ERROR", error.message, 500);
    }
    return jsonError("INTERNAL_ERROR", "Unexpected server error.", 500);
  }
}

export async function startRestApiServer(
  port = Number(process.env.REST_API_PORT ?? 3001),
) {
  const httpServer = http.createServer(async (request, response) => {
    try {
      const result = await handleRestApiRequest(request);
      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
    } catch (error) {
      const payload = jsonError(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "HTTP server error",
        500,
      );
      response.writeHead(payload.statusCode, payload.headers);
      response.end(payload.body);
    }
  });

  await new Promise<void>((resolve) =>
    httpServer.listen(port, "127.0.0.1", resolve),
  );
  logger.info(
    `job-application-tracker REST API running on http://127.0.0.1:${port}`,
  );
  return httpServer;
}

export function createServer(): McpServer {
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
  registerPhase2Tools(server);
  registerPhase2Resources(server);
  registerPhase2Prompts(server);
  return server;
}

export async function startHttpServer(
  port = Number(process.env.MCP_HTTP_PORT ?? 3000),
) {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      if (
        REST_PATH_PREFIXES.some(
          (prefix) =>
            requestUrl.pathname === prefix ||
            requestUrl.pathname.startsWith(`${prefix}/`),
        )
      ) {
        const result = await handleRestApiRequest(request);
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
        return;
      }

      const httpRequest = new Request(requestUrl, {
        method: request.method,
        headers: new Headers(request.headers as Record<string, string>),
        body:
          request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await new Promise<string>((resolve, reject) => {
                const chunks: Buffer[] = [];
                request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                request.on("end", () =>
                  resolve(Buffer.concat(chunks).toString("utf8")),
                );
                request.on("error", reject);
              }),
      });
      const httpResponse = await transport.handleRequest(httpRequest);
      response.statusCode = httpResponse.status;
      httpResponse.headers.forEach((value, key) => {
        response.setHeader(key, value);
      });
      response.end(Buffer.from(await httpResponse.arrayBuffer()));
    } catch (error) {
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : "HTTP server error",
        }),
      );
    }
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  console.error(
    `job-application-tracker MCP server running on HTTP port ${port}`,
  );
  return httpServer;
}

if (isServerEntryPoint(process.argv[1])) {
  if (process.env.MCP_HTTP_MODE === "true") {
    void startHttpServer();
  } else if (process.env.REST_API_MODE === "true") {
    void startRestApiServer();
  } else {
    void serveStdio(createServer);
    console.error("job-application-tracker MCP server running on stdio");
  }
}
