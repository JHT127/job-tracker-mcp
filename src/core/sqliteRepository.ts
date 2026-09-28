import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applicationDataSchema,
  applicationsDataSchema,
} from "../schemas/applicationData.js";
import type { ApplicationData } from "../schemas/applicationData.js";
import type {
  ApplicationRepository,
  RepositoryMutation,
} from "./repository.js";

export interface SqliteRepositoryOptions {
  databasePath?: string;
  legacyDataPath?: string;
  samplePath?: string;
}

const DEFAULT_DATABASE_PATH = fileURLToPath(
  new URL("../../data/applications.sqlite", import.meta.url),
);
const DEFAULT_LEGACY_DATA_PATH = fileURLToPath(
  new URL("../../data/applications.json", import.meta.url),
);
const DEFAULT_SAMPLE_PATH = fileURLToPath(
  new URL("../../data/sample-data.json", import.meta.url),
);

function parseApplications(contents: string): ApplicationData[] {
  const parsed: unknown = JSON.parse(contents);
  return applicationsDataSchema.parse(parsed);
}

export class SqliteRepository implements ApplicationRepository {
  private readonly database: Database.Database;

  constructor(options: SqliteRepositoryOptions = {}) {
    const databasePath = resolve(options.databasePath ?? DEFAULT_DATABASE_PATH);
    const legacyDataPath = resolve(
      options.legacyDataPath ?? DEFAULT_LEGACY_DATA_PATH,
    );
    const samplePath = resolve(options.samplePath ?? DEFAULT_SAMPLE_PATH);

    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.applyMigrations();
    this.importInitialData(legacyDataPath, samplePath);
  }

  async getAll(): Promise<ApplicationData[]> {
    return this.readAll();
  }

  async update<T>(
    mutate: (applications: readonly ApplicationData[]) => RepositoryMutation<T>,
  ): Promise<T> {
    const transaction = this.database.transaction(() => {
      const mutation = mutate(this.readAll());
      if (mutation.write !== false) {
        this.writeAll(mutation.applications);
      }
      return mutation.result;
    });

    return transaction();
  }

  close(): void {
    this.database.close();
  }

  private applyMigrations(): void {
    const currentVersion = Number(
      this.database.pragma("user_version", { simple: true }),
    );

    if (currentVersion < 1) {
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY NOT NULL,
          data TEXT NOT NULL
        );
      `);
      this.database.pragma("user_version = 1");
    }
  }

  private importInitialData(legacyDataPath: string, samplePath: string): void {
    const count = this.database
      .prepare("SELECT COUNT(*) AS count FROM applications")
      .get() as { count: number };

    if (count.count > 0) {
      return;
    }

    const bootstrapPath = existsSync(legacyDataPath)
      ? legacyDataPath
      : samplePath;
    const applications = parseApplications(readFileSync(bootstrapPath, "utf8"));
    this.database.transaction(() => this.writeAll(applications))();
  }

  private readAll(): ApplicationData[] {
    const rows = this.database
      .prepare("SELECT data FROM applications ORDER BY id")
      .all() as Array<{ data: string }>;

    return rows.map((row) => {
      const parsed: unknown = JSON.parse(row.data);
      return applicationDataSchema.parse(parsed);
    });
  }

  private writeAll(applications: ApplicationData[]): void {
    const clear = this.database.prepare("DELETE FROM applications");
    const insert = this.database.prepare(
      "INSERT INTO applications (id, data) VALUES (?, ?)",
    );

    clear.run();

    for (const application of applications) {
      insert.run(application.id, JSON.stringify(application));
    }
  }
}
