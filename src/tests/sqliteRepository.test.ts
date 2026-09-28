import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SqliteRepository } from "../core/sqliteRepository.js";
import { makeApplication } from "./helpers/applicationFixtures.js";

describe("SqliteRepository", () => {
  let directory: string;
  let databasePath: string;
  let legacyDataPath: string;
  let samplePath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), "job-tracker-sqlite-"));
    databasePath = join(directory, "applications.sqlite");
    legacyDataPath = join(directory, "applications.json");
    samplePath = join(directory, "sample-data.json");
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("imports and migrates an existing legacy JSON file", async () => {
    await fs.writeFile(
      legacyDataPath,
      JSON.stringify([
        {
          id: "app-001",
          company: "Old Records Ltd",
          role: "Developer",
          date_applied: "2025-04-02",
          status: "applied",
          source: "linkedin",
          notes: "legacy",
        },
      ]),
      "utf8",
    );
    await fs.writeFile(samplePath, "[]", "utf8");
    const repository = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });

    const imported = await repository.getAll();

    expect(imported).toHaveLength(1);
    expect(imported[0].company).toBe("Old Records Ltd");
    expect(imported[0].updated_at).toBe("2025-04-02T00:00:00.000Z");
    expect(imported[0].history).toEqual([
      { status: "applied", timestamp: "2025-04-02T00:00:00.000Z" },
    ]);
    repository.close();
  });

  it("uses sample data when no prior JSON file exists", async () => {
    await fs.writeFile(
      samplePath,
      JSON.stringify([makeApplication({ id: "app-007" })]),
      "utf8",
    );
    const repository = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });

    expect((await repository.getAll())[0].id).toBe("app-007");
    repository.close();
  });

  it("persists transactional updates after reopening the database", async () => {
    await fs.writeFile(samplePath, JSON.stringify([makeApplication()]), "utf8");
    const first = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });
    await first.update((applications) => ({
      applications: applications.map((application) => ({
        ...application,
        notes: "saved in sqlite",
      })),
      result: undefined,
    }));
    first.close();

    const reopened = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });
    expect((await reopened.getAll())[0].notes).toBe("saved in sqlite");
    reopened.close();
  });

  it("rolls back a failed replacement and leaves existing rows intact", async () => {
    const original = makeApplication();
    await fs.writeFile(samplePath, JSON.stringify([original]), "utf8");
    const repository = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });

    await expect(
      repository.update(() => ({
        applications: [original, original],
        result: undefined,
      })),
    ).rejects.toThrow();

    expect(await repository.getAll()).toEqual([original]);
    repository.close();
  });

  it("does not re-import changed JSON when the database already has records", async () => {
    await fs.writeFile(samplePath, JSON.stringify([makeApplication()]), "utf8");
    const first = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });
    await first.update((applications) => ({
      applications: applications.map((application) => ({
        ...application,
        notes: "database is authoritative",
      })),
      result: undefined,
    }));
    first.close();
    await fs.writeFile(
      legacyDataPath,
      JSON.stringify([makeApplication({ company: "New JSON" })]),
      "utf8",
    );

    const reopened = new SqliteRepository({
      databasePath,
      legacyDataPath,
      samplePath,
    });

    expect((await reopened.getAll())[0].notes).toBe(
      "database is authoritative",
    );
    reopened.close();
  });
});
