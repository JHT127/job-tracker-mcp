import { describe, expect, it, vi } from "vitest";

import { fetchJobPostingText } from "../lib/fetchJobPosting.js";

describe("fetchJobPostingText", () => {
  it("fetches public HTTPS text with redirects disabled and a byte cap", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(
      async () =>
        new Response("Senior Engineer at Example Labs", {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    );

    const text = await fetchJobPostingText("https://jobs.example.com/role", {
      fetchImplementation,
      resolveHost: async () => ["93.184.216.34"],
      maxBytes: 100,
    });

    expect(text).toContain("Example Labs");
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("https://jobs.example.com/role"),
      expect.objectContaining({
        redirect: "error",
        headers: { "user-agent": "JobTrackerMCP/1.0" },
      }),
    );
  });

  it("rejects malformed, non-HTTPS, credentialed, custom-port, and local URLs", async () => {
    const options = {
      fetchImplementation: vi.fn<typeof fetch>(),
      resolveHost: vi.fn(async () => ["93.184.216.34"]),
    };

    await expect(fetchJobPostingText("not a URL", options)).rejects.toThrow(
      "valid HTTPS",
    );
    await expect(
      fetchJobPostingText("http://jobs.example.com/role", options),
    ).rejects.toThrow("Only HTTPS");
    await expect(
      fetchJobPostingText("https://user:pass@jobs.example.com/role", options),
    ).rejects.toThrow("Only HTTPS");
    await expect(
      fetchJobPostingText("https://jobs.example.com:8443/role", options),
    ).rejects.toThrow("Only HTTPS");
    await expect(
      fetchJobPostingText("https://localhost/role", options),
    ).rejects.toThrow("Private or local");
    await expect(
      fetchJobPostingText("https://192.168.1.10/role", options),
    ).rejects.toThrow("Private or local");
    expect(options.fetchImplementation).not.toHaveBeenCalled();
  });

  it("rejects DNS answers that include private addresses", async () => {
    await expect(
      fetchJobPostingText("https://jobs.example.com/role", {
        resolveHost: async () => ["93.184.216.34", "10.0.0.4"],
        fetchImplementation: vi.fn<typeof fetch>(),
      }),
    ).rejects.toThrow("public IP addresses");
  });

  it("rejects an empty DNS answer", async () => {
    await expect(
      fetchJobPostingText("https://jobs.example.com/role", {
        resolveHost: async () => [],
        fetchImplementation: vi.fn<typeof fetch>(),
      }),
    ).rejects.toThrow("public IP addresses");
  });

  it("rejects unsuccessful responses and non-text content", async () => {
    const resolveHost = async () => ["93.184.216.34"];

    await expect(
      fetchJobPostingText("https://jobs.example.com/role", {
        resolveHost,
        fetchImplementation: async () =>
          new Response("redirect", { status: 302 }),
      }),
    ).rejects.toThrow("HTTP 302");
    await expect(
      fetchJobPostingText("https://jobs.example.com/role", {
        resolveHost,
        fetchImplementation: async () =>
          new Response("binary", {
            headers: { "content-type": "application/pdf" },
          }),
      }),
    ).rejects.toThrow("must be text or HTML");
  });

  it("enforces content-length and streamed response size limits", async () => {
    const resolveHost = async () => ["93.184.216.34"];

    await expect(
      fetchJobPostingText("https://jobs.example.com/role", {
        maxBytes: 4,
        resolveHost,
        fetchImplementation: async () =>
          new Response("large body", {
            headers: {
              "content-type": "text/plain",
              "content-length": "10",
            },
          }),
      }),
    ).rejects.toThrow("size limit");

    await expect(
      fetchJobPostingText("https://jobs.example.com/role", {
        maxBytes: 4,
        resolveHost,
        fetchImplementation: async () =>
          new Response("large body", {
            headers: { "content-type": "text/plain" },
          }),
      }),
    ).rejects.toThrow("size limit");
  });
});
