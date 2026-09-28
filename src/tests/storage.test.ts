import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApplicationRepository } from "../core/createRepository.js";
import { getApplicationService } from "../core/runtime.js";
import { JsonFileRepository } from "../core/jsonFileRepository.js";
import { SqliteRepository } from "../core/sqliteRepository.js";

describe("repository selection", () => {
  let directory: string;
  let previousStorage: string | undefined;

  beforeEach(async () => {
    directory = await fs.mkdtemp(join(tmpdir(), "job-tracker-storage-"));
    previousStorage = process.env.STORAGE;
  });

  afterEach(async () => {
    if (previousStorage === undefined) {
      delete process.env.STORAGE;
    } else {
      process.env.STORAGE = previousStorage;
    }
    await fs.rm(directory, { recursive: true, force: true });
  });

  it("constructs the JSON repository when selected", () => {
    const repository = createApplicationRepository("json", {
      json: {
        dataPath: join(directory, "applications.json"),
        samplePath: join(directory, "sample.json"),
      },
    });

    expect(repository).toBeInstanceOf(JsonFileRepository);
  });

  it("constructs SQLite by default and when selected explicitly", async () => {
    await fs.writeFile(join(directory, "sample.json"), "[]", "utf8");
    const repository = createApplicationRepository("sqlite", {
      sqlite: {
        databasePath: join(directory, "applications.sqlite"),
        legacyDataPath: join(directory, "applications.json"),
        samplePath: join(directory, "sample.json"),
      },
    });

    expect(repository).toBeInstanceOf(SqliteRepository);
    repository.close?.();

    delete process.env.STORAGE;
    const defaultRepository = createApplicationRepository(undefined, {
      sqlite: {
        databasePath: join(directory, "default.sqlite"),
        legacyDataPath: join(directory, "missing.json"),
        samplePath: join(directory, "sample.json"),
      },
    });
    expect(defaultRepository).toBeInstanceOf(SqliteRepository);
    defaultRepository.close?.();
  });

  it("uses STORAGE when the caller omits the backend argument", () => {
    process.env.STORAGE = "json";

    const repository = createApplicationRepository(undefined, {
      json: {
        dataPath: join(directory, "applications.json"),
        samplePath: join(directory, "sample.json"),
      },
    });

    expect(repository).toBeInstanceOf(JsonFileRepository);
  });

  it("rejects unsupported storage values", () => {
    expect(() => createApplicationRepository("memory")).toThrow(
      "Unsupported STORAGE value: memory",
    );
  });

  it("closes the SQLite handle when initialization fails", () => {
    expect(() =>
      createApplicationRepository("sqlite", {
        sqlite: {
          databasePath: join(directory, "broken.sqlite"),
          legacyDataPath: join(directory, "missing.json"),
          samplePath: join(directory, "missing-sample.json"),
        },
      }),
    ).toThrow();
  });

  it("lazily returns a shared application service instance", () => {
    process.env.STORAGE = "json";

    const service = getApplicationService();

    expect(getApplicationService()).toBe(service);
  });
});
