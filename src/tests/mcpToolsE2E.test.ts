import { describe, expect, it } from "vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";

import { createServer } from "../index.js";

type ToolResult = {
  isError?: boolean;
  content?: Array<{ type: string; text?: string }>;
};

function textFrom(result: ToolResult): string {
  return result.content?.find((item) => item.type === "text")?.text ?? "";
}

describe("MCP tool client workflow", () => {
  it("lists and invokes every registered tool through the official client", async () => {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "e2e-test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const listed = await client.listTools();
    const toolNames = listed.tools.map((tool) => tool.name).sort();
    expect(toolNames).toHaveLength(25);

    const invoke = async (name: string, args: Record<string, unknown> = {}) => {
      const result = (await client.callTool({
        name,
        arguments: args,
      })) as ToolResult;
      expect(result.isError ?? false, `${name} returned an MCP error`).toBe(
        false,
      );
      return result;
    };

    const today = new Date().toISOString().slice(0, 10);
    const added = await invoke("add_application", {
      company: "E2E Example Labs",
      role: "Platform Engineer",
      date_applied: today,
      source: "referral",
    });
    const addedApplication = JSON.parse(
      textFrom(added).split("\n\n").pop() ?? "{}",
    );
    const applicationId = addedApplication.id as string;

    const contact = await invoke("add_contact", {
      person: "E2E Recruiter",
      company: "E2E Example Labs",
    });
    const contactData = JSON.parse(textFrom(contact));
    const contactId = contactData.id as string;

    await invoke("list_applications");
    await invoke("search_applications", { query: "E2E" });
    await invoke("update_application", {
      id: applicationId,
      notes: "Updated by E2E",
    });
    await invoke("update_status", {
      id: applicationId,
      new_status: "interview",
    });
    await invoke("undo_last_change", { id: applicationId });
    await invoke("delete_application", { id: applicationId, confirm: true });
    await invoke("get_next_actions", { limit: 5 });
    await invoke("get_stale_applications", { days_threshold: 1, limit: 5 });
    await invoke("get_conversion_stats");
    await invoke("get_health_score");
    await invoke("list_contacts");
    await invoke("link_contact_to_application", {
      contact_id: contactId,
      application_id: "app-001",
    });
    await invoke("get_reconnect_suggestions", { days_threshold: 1, limit: 5 });
    await invoke("add_interview", {
      application_id: "app-001",
      date: new Date(Date.now() + 86_400_000).toISOString(),
      type: "technical",
      interviewer: "E2E Interviewer",
    });
    await invoke("list_upcoming_interviews", { days_ahead: 30, limit: 5 });
    await invoke("parse_job_posting", {
      text: "Example Labs is hiring a Platform Engineer in a remote role.",
    });
    await invoke("match_cv_to_job", {
      cv_text: "TypeScript Node.js testing",
      job_description: "We need TypeScript and Node.js experience.",
    });
    await invoke("draft_followup_email", { application_id: "app-001" });
    await invoke("draft_thank_you", { application_id: "app-001" });
    await invoke("generate_interview_prep", { application_id: "app-001" });
    await invoke("weekly_report");
    await invoke("bulk_import", {
      csv: `company,role,date_applied,status\nE2E Imported,Engineer,${today},applied`,
    });
    await invoke("export", { format: "json", limit: 10 });

    expect(toolNames).toEqual([
      "add_application",
      "add_contact",
      "add_interview",
      "bulk_import",
      "delete_application",
      "draft_followup_email",
      "draft_thank_you",
      "export",
      "generate_interview_prep",
      "get_conversion_stats",
      "get_health_score",
      "get_next_actions",
      "get_reconnect_suggestions",
      "get_stale_applications",
      "link_contact_to_application",
      "list_applications",
      "list_contacts",
      "list_upcoming_interviews",
      "match_cv_to_job",
      "parse_job_posting",
      "search_applications",
      "undo_last_change",
      "update_application",
      "update_status",
      "weekly_report",
    ]);

    await client.close();
    await server.close();
  });
});
