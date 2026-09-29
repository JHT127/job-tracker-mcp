import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { startRestApiServer } from "../index.js";

const originalApiKey = process.env.API_KEY;

async function withServer() {
  process.env.API_KEY = "test-key";
  const server = await startRestApiServer(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port };
}

afterEach(async () => {
  process.env.API_KEY = originalApiKey;
});

describe("REST API", () => {
  it("returns /health and the OpenAPI docs payload", async () => {
    const { server } = await withServer();

    const health = await request(server)
      .get("/health")
      .set("X-API-Key", "test-key");
    expect(health.status).toBe(200);
    expect(health.body.ok).toBe(true);

    const docs = await request(server)
      .get("/openapi.json")
      .set("X-API-Key", "test-key");
    expect(docs.status).toBe(200);
    expect(docs.body.openapi).toBe("3.1.0");

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("creates and updates applications with the API key", async () => {
    const { server } = await withServer();

    const created = await request(server)
      .post("/applications")
      .set("X-API-Key", "test-key")
      .send({
        company: "Alpha Labs",
        role: "Backend Engineer",
        date_applied: "2026-09-01",
      });

    expect(created.status).toBe(201);
    expect(created.body.application.company).toBe("Alpha Labs");

    const updated = await request(server)
      .patch(`/applications/${created.body.application.id}/status`)
      .set("X-API-Key", "test-key")
      .send({ status: "interview" });

    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("interview");

    const listed = await request(server)
      .get("/applications")
      .set("X-API-Key", "test-key");
    expect(listed.status).toBe(200);
    expect(
      listed.body.applications.some(
        (item: { id: string }) => item.id === created.body.application.id,
      ),
    ).toBe(true);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("rejects missing API keys and invalid payloads", async () => {
    const { server } = await withServer();

    const unauthorized = await request(server).get("/health");
    expect(unauthorized.status).toBe(401);

    const badPayload = await request(server)
      .post("/applications")
      .set("X-API-Key", "test-key")
      .send({ company: "No Role" });
    expect(badPayload.status).toBe(400);

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
});
