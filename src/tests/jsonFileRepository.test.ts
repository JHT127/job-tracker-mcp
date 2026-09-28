import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JsonFileRepository } from "../core/jsonFileRepository.js";
import { makeApplication } from "./helpers/applicationFixtures.js";

describe("JsonFileRepository", () => {
  let directory: string;
  let dataPath: string;
  let samplePath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), "job-tracker-json-"));
    dataPath = join(directory, "applications.json");
    samplePath = join(directory, "sample-data.json");
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("creates runtime data from the sample when the file is missing", async () => {
    const sample = [makeApplication({ id: "app-004" })];
    await fs.writeFile(samplePath, JSON.stringify(sample), "utf8");
    const repository = new JsonFileRepository({ dataPath, samplePath });

    const loaded = await repository.getAll();
    const persisted = JSON.parse(await fs.readFile(dataPath, "utf8"));

    expect(loaded).toEqual(sample);
    expect(persisted).toEqual(sample);
  });

  it("migrates a legacy JSON record and persists generated metadata", async () => {
    const legacy = [
      {
        id: "app-001",
        company: "Legacy Labs",
        role: "Engineer",
        date_applied: "2025-03-12",
        status: "interview",
        source: "referral",
        notes: "Old format",
      },
    ];
    await fs.writeFile(dataPath, JSON.stringify(legacy), "utf8");
    await fs.writeFile(samplePath, "[]", "utf8");
    const repository = new JsonFileRepository({ dataPath, samplePath });

    const migrated = await repository.getAll();
    const persisted = JSON.parse(await fs.readFile(dataPath, "utf8"));

    expect(migrated[0].updated_at).toBe("2025-03-12T00:00:00.000Z");
    expect(migrated[0].history).toEqual([
      { status: "interview", timestamp: "2025-03-12T00:00:00.000Z" },
    ]);
    expect(migrated[0].priority).toBe("normal");
    expect(migrated[0].tags).toEqual([]);
    expect(persisted[0].updated_at).toBe(migrated[0].updated_at);
    expect(persisted[0].history).toEqual(migrated[0].history);
  });

  it("atomically replaces records and leaves no temporary files", async () => {
    await fs.writeFile(samplePath, "[]", "utf8");
    const repository = new JsonFileRepository({ dataPath, samplePath });
    await repository.getAll();

    await repository.update((applications) => ({
      applications: [...applications, makeApplication({ id: "app-002" })],
      result: "saved",
    }));

    expect(await repository.getAll()).toHaveLength(1);
    expect(await fs.readdir(directory)).toEqual([
      "applications.json",
      "sample-data.json",
    ]);
  });

  it("serializes concurrent updates across repository instances", async () => {
    await fs.writeFile(samplePath, "[]", "utf8");
    const first = new JsonFileRepository({ dataPath, samplePath });
    const second = new JsonFileRepository({ dataPath, samplePath });
    await first.getAll();

    await Promise.all(
      Array.from({ length: 12 }, (_, index) => {
        const repository = index % 2 === 0 ? first : second;
        return repository.update((applications) => {
          const nextNumber = applications.length + 1;
          const application = makeApplication({
            id: `app-${String(nextNumber).padStart(3, "0")}`,
            company: `Company ${nextNumber}`,
          });
          return {
            applications: [...applications, application],
            result: application.id,
          };
        });
      }),
    );

    const applications = await first.getAll();
    expect(applications).toHaveLength(12);
    expect(
      new Set(applications.map((application) => application.id)).size,
    ).toBe(12);
  });

  it("does not replace malformed runtime data with the sample", async () => {
    await fs.writeFile(samplePath, "[]", "utf8");
    await fs.writeFile(dataPath, "not json", "utf8");
    const repository = new JsonFileRepository({ dataPath, samplePath });

    await expect(repository.getAll()).rejects.toThrow();
    expect(await fs.readFile(dataPath, "utf8")).toBe("not json");
  });

  it("reports a missing sample when no runtime file exists", async () => {
    const repository = new JsonFileRepository({ dataPath, samplePath });

    await expect(repository.getAll()).rejects.toThrow();
  });
});
