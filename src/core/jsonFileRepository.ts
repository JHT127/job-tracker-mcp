import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { applicationsDataSchema } from "../schemas/applicationData.js";
import type { ApplicationData } from "../schemas/applicationData.js";
import { AsyncMutex, type ApplicationRepository } from "./repository.js";

export interface JsonFileRepositoryOptions {
  dataPath?: string;
  samplePath?: string;
}

const DEFAULT_DATA_PATH = fileURLToPath(
  new URL("../../data/applications.json", import.meta.url),
);
const DEFAULT_SAMPLE_PATH = fileURLToPath(
  new URL("../../data/sample-data.json", import.meta.url),
);
const locksByPath = new Map<string, AsyncMutex>();

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function getLock(path: string): AsyncMutex {
  let lock = locksByPath.get(path);
  if (!lock) {
    lock = new AsyncMutex();
    locksByPath.set(path, lock);
  }
  return lock;
}

export class JsonFileRepository implements ApplicationRepository {
  private readonly dataPath: string;
  private readonly samplePath: string;
  private readonly mutex: AsyncMutex;

  constructor(options: JsonFileRepositoryOptions = {}) {
    this.dataPath = resolve(options.dataPath ?? DEFAULT_DATA_PATH);
    this.samplePath = resolve(options.samplePath ?? DEFAULT_SAMPLE_PATH);
    this.mutex = getLock(this.dataPath);
  }

  async getAll(): Promise<ApplicationData[]> {
    return this.mutex.runExclusive(() => this.readAndMigrate());
  }

  async update<T>(
    mutate: (applications: readonly ApplicationData[]) => {
      applications: ApplicationData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const current = await this.readAndMigrate();
      const mutation = mutate(current);

      if (mutation.write !== false) {
        await this.writeAtomically(mutation.applications);
      }

      return mutation.result;
    });
  }

  private async readAndMigrate(): Promise<ApplicationData[]> {
    await fs.mkdir(dirname(this.dataPath), { recursive: true });

    let contents: string;
    try {
      contents = await fs.readFile(this.dataPath, "utf8");
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) {
        throw error;
      }

      const sample = await fs.readFile(this.samplePath, "utf8");
      try {
        await fs.writeFile(this.dataPath, sample, {
          encoding: "utf8",
          flag: "wx",
        });
      } catch (createError) {
        if (!hasErrorCode(createError, "EEXIST")) {
          throw createError;
        }
      }
      contents = await fs.readFile(this.dataPath, "utf8");
    }

    const legacyData: unknown = JSON.parse(contents);
    const applications = applicationsDataSchema.parse(legacyData);

    if (JSON.stringify(legacyData) !== JSON.stringify(applications)) {
      await this.writeAtomically(applications);
    }

    return applications;
  }

  private async writeAtomically(
    applications: ApplicationData[],
  ): Promise<void> {
    await fs.mkdir(dirname(this.dataPath), { recursive: true });
    const temporaryPath = `${this.dataPath}.${randomUUID()}.tmp`;

    try {
      await fs.writeFile(
        temporaryPath,
        `${JSON.stringify(applications, null, 2)}\n`,
        { encoding: "utf8", flag: "wx" },
      );
      await fs.rename(temporaryPath, this.dataPath);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  }
}
