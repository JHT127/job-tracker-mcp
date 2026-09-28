import type { McpServer } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationService } from "../core/applicationService.js";
import { getApplicationService } from "../core/runtime.js";
import type { ApplicationStatus } from "../schemas/applicationData.js";
import { registerGetNextActionsTool } from "../tools/getNextActions.js";

vi.mock("../core/runtime.js", () => ({
  getApplicationService: vi.fn(),
}));

type ToolInput = { limit?: number; status?: ApplicationStatus };
type ToolResponse = { content: Array<{ type: "text"; text: string }> };
type ToolHandler = (input: ToolInput) => Promise<ToolResponse>;

const actions = [
  {
    action: "Follow up with Example Labs",
    application_id: "app-001",
    reason: "No status update for 20 days.",
    score: 35,
  },
  {
    action: "Prepare for Sample Robotics",
    application_id: "app-002",
    reason: "Recently updated to interview.",
    score: 24,
  },
];

describe("get_next_actions MCP tool", () => {
  let handler: ToolHandler | undefined;
  const service = {
    getNextActions: vi.fn(),
  } as unknown as ApplicationService;

  beforeEach(() => {
    handler = undefined;
    vi.mocked(getApplicationService).mockReturnValue(service);
    service.getNextActions = vi.fn().mockResolvedValue(actions);

    const server = {
      registerTool: (
        _name: string,
        _definition: unknown,
        registeredHandler: unknown,
      ) => {
        handler = registeredHandler as ToolHandler;
      },
    } as unknown as McpServer;

    registerGetNextActionsTool(server);
  });

  it("returns the effective limit, total, truncation flag, and limited actions", async () => {
    const result = await handler?.({ limit: 1, status: "applied" });
    const text = result?.content[0].text ?? "{}";
    const response = JSON.parse(text.split("\n\n(Note:")[0]);

    expect(response).toEqual({
      statusFilter: "applied",
      total: 2,
      truncated: true,
      limit: 1,
      actions: [actions[0]],
    });
    expect(text).toContain("results truncated to the requested limit");
    expect(service.getNextActions).toHaveBeenCalledWith({ status: "applied" });
  });

  it("returns a human-readable empty state", async () => {
    service.getNextActions = vi.fn().mockResolvedValue([]);

    const result = await handler?.({});

    expect(result?.content[0].text).toContain("No next actions right now");
  });

  it("returns the established generic message when the core fails", async () => {
    service.getNextActions = vi
      .fn()
      .mockRejectedValue(new Error("storage failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await handler?.({});

    expect(result?.content[0].text).toBe("Unable to compute next actions.");
    errorSpy.mockRestore();
  });
});
