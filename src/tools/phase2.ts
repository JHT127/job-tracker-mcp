import {
  McpServer,
  ResourceTemplate,
  type StandardSchemaV1,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import * as z from "zod/v4";

import {
  buildWeeklyReport,
  draftFollowUpEmail,
  draftThankYou,
  exportApplications,
  generateInterviewPrep,
  getConversionStats,
  getHealthScore,
  getStaleApplications,
  matchCvToJob,
  parseApplicationsCsv,
  parseJobPostingText,
} from "../core/phase2Workflows.js";
import {
  getApplicationService,
  getContactService,
  getInterviewService,
  getTrackerRepository,
} from "../core/runtime.js";
import { fetchJobPostingText } from "../lib/fetchJobPosting.js";
import {
  addContactInputSchema,
  getReconnectSuggestionsInputSchema,
  linkContactInputSchema,
  listContactsInputSchema,
} from "../schemas/contact.js";
import {
  addInterviewInputSchema,
  listUpcomingInterviewsInputSchema,
} from "../schemas/interview.js";
import {
  applicationMessageInputSchema,
  bulkImportInputSchema,
  draftThankYouInputSchema,
  exportInputSchema,
  generateInterviewPrepInputSchema,
  getConversionStatsInputSchema,
  getHealthScoreInputSchema,
  getStaleApplicationsInputSchema,
  matchCvToJobInputSchema,
  parseJobPostingInputSchema,
  weeklyReportInputSchema,
} from "../schemas/phase2.js";

const READ_ONLY = { readOnlyHint: true };
const MUTATING = { readOnlyHint: false };

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

type Phase2ToolResult =
  ReturnType<typeof jsonResult> | ReturnType<typeof toolError>;

function registerToolSafely<TSchema extends StandardSchemaWithJSON>(
  server: McpServer,
  name: string,
  config: {
    title: string;
    description: string;
    inputSchema: TSchema;
    annotations?: {
      readOnlyHint?: boolean;
      destructiveHint?: boolean;
      idempotentHint?: boolean;
      openWorldHint?: boolean;
    };
  },
  handler: (
    input: StandardSchemaV1.InferOutput<TSchema>,
  ) => Promise<Phase2ToolResult>,
) {
  const callback = async (input: unknown) => handler(input as never);
  server.registerTool(name, config as never, callback as never);
}

export function registerPhase2Tools(server: McpServer): void {
  registerToolSafely(
    server,
    "get_stale_applications",
    {
      title: "Get Stale Applications",
      description:
        "Lists active applications without an update for the requested number of days.",
      inputSchema: getStaleApplicationsInputSchema,
      annotations: READ_ONLY,
    },
    async (input: {
      days_threshold: number;
      status?: string;
      limit: number;
    }) => {
      try {
        const applications = await getApplicationService().getAll();
        const stale = getStaleApplications(
          input.status
            ? applications.filter(
                (application) => application.status === input.status,
              )
            : applications,
          input.days_threshold,
        );
        return jsonResult({
          applications: stale.slice(0, input.limit),
          total: stale.length,
          truncated: stale.length > input.limit,
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "get_conversion_stats",
    {
      title: "Get Conversion Statistics",
      description:
        "Calculates response and interview conversion rates by application source.",
      inputSchema: getConversionStatsInputSchema,
      annotations: READ_ONLY,
    },
    async () => {
      try {
        return jsonResult(
          getConversionStats(await getApplicationService().getAll()),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "get_health_score",
    {
      title: "Get Job Search Health Score",
      description:
        "Returns a deterministic 0–100 tracker score with human-readable reasons.",
      inputSchema: getHealthScoreInputSchema,
      annotations: READ_ONLY,
    },
    async () => {
      try {
        return jsonResult(
          getHealthScore(await getApplicationService().getAll()),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "add_contact",
    {
      title: "Add Contact",
      description: "Adds a recruiter or networking contact to the tracker.",
      inputSchema: addContactInputSchema,
      annotations: MUTATING,
    },
    async (input) => {
      try {
        return jsonResult(await getContactService().add(input));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "list_contacts",
    {
      title: "List Contacts",
      description:
        "Lists contacts with an optional company filter and bounded limit.",
      inputSchema: listContactsInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        return jsonResult(await getContactService().list(input));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "link_contact_to_application",
    {
      title: "Link Contact to Application",
      description: "Associates a contact with an existing application.",
      inputSchema: linkContactInputSchema,
      annotations: MUTATING,
    },
    async (input) => {
      try {
        return jsonResult(
          await getContactService().linkToApplication(
            input.contact_id,
            input.application_id,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "get_reconnect_suggestions",
    {
      title: "Get Reconnect Suggestions",
      description: "Suggests contacts with no message or no recent message.",
      inputSchema: getReconnectSuggestionsInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        return jsonResult(
          await getContactService().getReconnectSuggestions({
            daysThreshold: input.days_threshold,
            limit: input.limit,
          }),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "add_interview",
    {
      title: "Add Interview",
      description: "Schedules an interview for an existing application.",
      inputSchema: addInterviewInputSchema,
      annotations: MUTATING,
    },
    async (input) => {
      try {
        return jsonResult(await getInterviewService().add(input));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "list_upcoming_interviews",
    {
      title: "List Upcoming Interviews",
      description: "Lists interviews within a bounded upcoming date window.",
      inputSchema: listUpcomingInterviewsInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        return jsonResult(
          await getInterviewService().listUpcoming({
            daysAhead: input.days_ahead,
            limit: input.limit,
          }),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "parse_job_posting",
    {
      title: "Parse Job Posting",
      description:
        "Extracts role details from supplied text or a bounded HTTPS URL; may add an application when requested.",
      inputSchema: parseJobPostingInputSchema,
      annotations: { readOnlyHint: false },
    },
    async (input) => {
      try {
        const text = input.text ?? (await fetchJobPostingText(input.url!));
        const posting = parseJobPostingText(text);
        if (!input.create_application) {
          return jsonResult(posting);
        }
        if (!posting.company || !posting.role || !input.date_applied) {
          return toolError(
            new Error(
              "Posting must contain a company and role, and date_applied is required to create an application.",
            ),
          );
        }
        const created = await getApplicationService().add({
          company: posting.company,
          role: posting.role,
          date_applied: input.date_applied,
          ...(posting.salary ? { salary: posting.salary } : {}),
          ...(posting.location ? { location: posting.location } : {}),
        });
        return jsonResult({ ...posting, application: created.application });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "match_cv_to_job",
    {
      title: "Match CV to Job",
      description:
        "Compares CV and job text with deterministic skill matching and reports gaps/keywords.",
      inputSchema: matchCvToJobInputSchema,
      annotations: READ_ONLY,
    },
    async (input) =>
      jsonResult(matchCvToJob(input.cv_text, input.job_description)),
  );

  registerToolSafely(
    server,
    "draft_followup_email",
    {
      title: "Draft Follow-up Email",
      description:
        "Drafts a follow-up message from an application and optional linked contact.",
      inputSchema: applicationMessageInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const applications = await getApplicationService().getAll();
        const application = applications.find(
          (item) => item.id === input.application_id,
        );
        if (!application) {
          throw new Error(
            `No application found with id: ${input.application_id}`,
          );
        }
        const contact = input.contact_id
          ? (await getTrackerRepository().getContacts()).find(
              (item) => item.id === input.contact_id,
            )
          : undefined;
        if (input.contact_id && !contact) {
          throw new Error(`No contact found with id: ${input.contact_id}`);
        }
        return jsonResult(draftFollowUpEmail(application, contact));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "draft_thank_you",
    {
      title: "Draft Interview Thank-you",
      description: "Drafts a thank-you message for an interview conversation.",
      inputSchema: draftThankYouInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const application = (await getApplicationService().getAll()).find(
          (item) => item.id === input.application_id,
        );
        if (!application) {
          throw new Error(
            `No application found with id: ${input.application_id}`,
          );
        }
        return jsonResult(draftThankYou(application, input.interviewer));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "generate_interview_prep",
    {
      title: "Generate Interview Preparation",
      description:
        "Creates a role-specific checklist and STAR prompts for an application.",
      inputSchema: generateInterviewPrepInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const application = (await getApplicationService().getAll()).find(
          (item) => item.id === input.application_id,
        );
        if (!application) {
          throw new Error(
            `No application found with id: ${input.application_id}`,
          );
        }
        return jsonResult(generateInterviewPrep(application));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "weekly_report",
    {
      title: "Generate Weekly Report",
      description:
        "Summarizes recent applications, status changes, deadlines, and pipeline health.",
      inputSchema: weeklyReportInputSchema,
      annotations: READ_ONLY,
    },
    async () => {
      try {
        return jsonResult(
          buildWeeklyReport(await getApplicationService().getAll()),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  registerToolSafely(
    server,
    "bulk_import",
    {
      title: "Bulk Import Applications",
      description:
        "Validates a bounded CSV export and imports valid application rows.",
      inputSchema: bulkImportInputSchema,
      annotations: MUTATING,
    },
    async (input) => {
      const parsed = parseApplicationsCsv(input.csv);
      const imported: unknown[] = [];
      const errors = [...parsed.errors];
      for (const [index, application] of parsed.applications.entries()) {
        try {
          const result = await getApplicationService().add(application);
          imported.push({
            row: index + 2,
            application: result.application,
            ...(result.duplicateWarning
              ? { warning: result.duplicateWarning }
              : {}),
          });
        } catch (error) {
          errors.push({
            row: index + 2,
            message:
              error instanceof Error ? error.message : "Unable to import row.",
          });
        }
      }
      return jsonResult({
        imported: imported.length,
        applications: imported,
        errors,
      });
    },
  );

  registerToolSafely(
    server,
    "export",
    {
      title: "Export Applications",
      description:
        "Exports applications as JSON, Markdown, or CSV with optional status filtering.",
      inputSchema: exportInputSchema,
      annotations: READ_ONLY,
    },
    async (input) => {
      try {
        const allApplications = await getApplicationService().getAll();
        const filtered = input.status
          ? allApplications.filter(
              (application) => application.status === input.status,
            )
          : allApplications;
        const selected = filtered.slice(0, input.limit);
        return jsonResult({
          format: input.format,
          total: filtered.length,
          truncated: filtered.length > input.limit,
          data: exportApplications(selected, input.format),
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

export function registerPhase2Resources(server: McpServer): void {
  server.registerResource(
    "all-applications",
    "applications://all",
    {
      title: "All Applications",
      description: "All application records.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await getApplicationService().getAll(), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "application-by-id",
    new ResourceTemplate("applications://{id}", { list: undefined }),
    {
      title: "Application",
      description: "A single application record.",
      mimeType: "application/json",
    },
    async (
      uri: URL,
      variables: Record<string, string | string[] | undefined>,
    ) => {
      const resourceId = Array.isArray(variables["id"])
        ? variables["id"][0]
        : variables["id"];
      const application = (await getApplicationService().getAll()).find(
        (item) => item.id === resourceId,
      );
      if (!application) {
        throw new Error(`No application found with id: ${resourceId}`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(application, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "stats-summary",
    "stats://summary",
    {
      title: "Application Summary",
      description: "Application pipeline summary statistics.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            await getApplicationService().getStats(),
            null,
            2,
          ),
        },
      ],
    }),
  );
}

export function registerPhase2Prompts(server: McpServer): void {
  server.registerPrompt(
    "weekly-review",
    {
      title: "Weekly Job Search Review",
      description:
        "Review pipeline progress, follow-ups, and upcoming deadlines.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Review my weekly job-search report, identify the most important follow-ups and deadlines, and suggest a focused plan for next week.",
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "prepare-interview",
    {
      title: "Prepare for an Interview",
      description:
        "Use an application record to organize an interview preparation session.",
      argsSchema: z.object({ application_id: z.string().regex(/^app-\d+$/) }),
    },
    ({ application_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Prepare me for the interview associated with ${application_id}. Read the application and generate interview preparation, likely questions, and STAR examples.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "what-should-i-do-today",
    {
      title: "What Should I Do Today?",
      description: "Review next actions and turn them into a prioritized plan.",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Review my next actions and upcoming interviews. Recommend the three most useful actions for today and explain why.",
          },
        },
      ],
    }),
  );
}
