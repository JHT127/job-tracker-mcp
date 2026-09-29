import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { applicationsDataSchema } from "../schemas/applicationData.js";
import type { ApplicationData } from "../schemas/applicationData.js";
import { contactsDataSchema } from "../schemas/contact.js";
import type { ContactData } from "../schemas/contact.js";
import { interviewsDataSchema } from "../schemas/interview.js";
import type { InterviewData } from "../schemas/interview.js";
import { AsyncMutex, type TrackerRepository } from "./repository.js";

export interface JsonFileRepositoryOptions {
  dataPath?: string;
  samplePath?: string;
  contactsPath?: string;
  interviewsPath?: string;
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

export class JsonFileRepository implements TrackerRepository {
  private readonly dataPath: string;
  private readonly samplePath: string;
  private readonly contactsPath: string;
  private readonly interviewsPath: string;
  private readonly mutex: AsyncMutex;

  constructor(options: JsonFileRepositoryOptions = {}) {
    this.dataPath = resolve(options.dataPath ?? DEFAULT_DATA_PATH);
    this.samplePath = resolve(options.samplePath ?? DEFAULT_SAMPLE_PATH);
    this.contactsPath = resolve(
      options.contactsPath ?? join(dirname(this.dataPath), "contacts.json"),
    );
    this.interviewsPath = resolve(
      options.interviewsPath ?? join(dirname(this.dataPath), "interviews.json"),
    );
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
        await this.writeAtomically(this.dataPath, mutation.applications);
      }

      return mutation.result;
    });
  }

  async getContacts(): Promise<ContactData[]> {
    return this.mutex.runExclusive(() =>
      this.readCollection(this.contactsPath, (data) =>
        contactsDataSchema.parse(data),
      ),
    );
  }

  async updateContacts<T>(
    mutate: (contacts: readonly ContactData[]) => {
      contacts: ContactData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const mutation = mutate(
        await this.readCollection(this.contactsPath, (data) =>
          contactsDataSchema.parse(data),
        ),
      );
      if (mutation.write !== false) {
        await this.writeAtomically(this.contactsPath, mutation.contacts);
      }
      return mutation.result;
    });
  }

  async getInterviews(): Promise<InterviewData[]> {
    return this.mutex.runExclusive(() =>
      this.readCollection(this.interviewsPath, (data) =>
        interviewsDataSchema.parse(data),
      ),
    );
  }

  async updateInterviews<T>(
    mutate: (interviews: readonly InterviewData[]) => {
      interviews: InterviewData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T> {
    return this.mutex.runExclusive(async () => {
      const mutation = mutate(
        await this.readCollection(this.interviewsPath, (data) =>
          interviewsDataSchema.parse(data),
        ),
      );
      if (mutation.write !== false) {
        await this.writeAtomically(this.interviewsPath, mutation.interviews);
      }
      return mutation.result;
    });
  }

  private async readCollection<T>(
    path: string,
    parse: (data: unknown) => T,
  ): Promise<T> {
    try {
      const contents = await fs.readFile(path, "utf8");
      return parse(JSON.parse(contents));
    } catch (error) {
      if (hasErrorCode(error, "ENOENT")) {
        return parse([]);
      }
      throw error;
    }
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
      await this.writeAtomically(this.dataPath, applications);
    }

    return applications;
  }

  private async writeAtomically<T>(path: string, data: T): Promise<void> {
    await fs.mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;

    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx",
      });
      await fs.rename(temporaryPath, path);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  }
}
