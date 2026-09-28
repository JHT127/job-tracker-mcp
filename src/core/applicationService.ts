import {
  applicationDataSchema,
  applicationStatusSchema,
} from "../schemas/applicationData.js";
import type {
  ApplicationData,
  ApplicationDataInput,
  ApplicationStatus,
} from "../schemas/applicationData.js";
import { buildNextActions, type NextActionOptions } from "./nextActions.js";
import type { ApplicationRepository } from "./repository.js";
import { summarizeApplications } from "./stats.js";

const MAX_APPLICATIONS = 50;
const UNDO_HISTORY_LIMIT = 20;

type EditableField =
  | "company"
  | "role"
  | "date_applied"
  | "status"
  | "source"
  | "notes"
  | "salary"
  | "location"
  | "work_mode"
  | "job_url"
  | "priority"
  | "tags"
  | "deadline"
  | "resume_version";

export type NewApplicationInput = Omit<
  ApplicationDataInput,
  "id" | "updated_at" | "history" | "undo_stack"
>;

export type UpdateApplicationInput = Partial<
  Pick<ApplicationData, EditableField>
>;

export interface AddApplicationResult {
  application: ApplicationData;
  duplicateWarning?: string;
}

export class ApplicationService {
  constructor(
    private readonly repository: ApplicationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(status?: ApplicationStatus): Promise<{
    applications: ApplicationData[];
    total: number;
    truncated: boolean;
  }> {
    const all = await this.repository.getAll();
    const filtered = status
      ? all.filter((application) => application.status === status)
      : all;

    return {
      applications: filtered.slice(0, MAX_APPLICATIONS),
      total: filtered.length,
      truncated: filtered.length > MAX_APPLICATIONS,
    };
  }

  async search(query: string): Promise<ApplicationData[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const applications = await this.repository.getAll();
    return applications.filter(
      (application) =>
        application.company.toLocaleLowerCase().includes(normalizedQuery) ||
        application.role.toLocaleLowerCase().includes(normalizedQuery),
    );
  }

  async getNextActions(
    options: NextActionOptions & { status?: ApplicationStatus } = {},
  ) {
    let applications = await this.repository.getAll();
    if (options.status) {
      applications = applications.filter(
        (application) => application.status === options.status,
      );
    }

    return buildNextActions(applications, {
      ...options,
      now: options.now ?? this.now(),
    });
  }

  async getStats() {
    return summarizeApplications(await this.repository.getAll());
  }

  async getAll(): Promise<ApplicationData[]> {
    return this.repository.getAll();
  }

  async add(input: NewApplicationInput): Promise<AddApplicationResult> {
    const timestamp = this.now().toISOString();

    return this.repository.update((applications) => {
      const status = input.status ?? "applied";
      const application = applicationDataSchema.parse({
        ...input,
        id: this.nextId(applications),
        status,
        source: input.source ?? "cold_apply",
        notes: input.notes ?? "",
        updated_at: timestamp,
        history: [{ status, timestamp }],
        priority: input.priority ?? "normal",
        tags: input.tags ?? [],
        undo_stack: [],
      });
      const duplicate = applications.some(
        (existing) =>
          existing.company.trim().toLocaleLowerCase() ===
            application.company.trim().toLocaleLowerCase() &&
          existing.role.trim().toLocaleLowerCase() ===
            application.role.trim().toLocaleLowerCase(),
      );

      return {
        applications: [...applications, application],
        result: {
          application,
          ...(duplicate
            ? {
                duplicateWarning: `A similar application already exists for ${application.company} — ${application.role}.`,
              }
            : {}),
        },
      };
    });
  }

  async update(
    id: string,
    changes: UpdateApplicationInput,
  ): Promise<ApplicationData> {
    const timestamp = this.now().toISOString();

    return this.repository.update((applications) => {
      const current = applications.find((application) => application.id === id);
      if (!current) {
        throw new Error(`No application found with id: ${id}`);
      }

      if (Object.keys(changes).length === 0) {
        throw new Error("At least one application field must be provided.");
      }

      const updated = applicationDataSchema.parse({
        ...current,
        ...changes,
        updated_at: timestamp,
        history:
          changes.status && changes.status !== current.status
            ? [...current.history, { status: changes.status, timestamp }]
            : current.history,
        undo_stack: [
          ...current.undo_stack.slice(-(UNDO_HISTORY_LIMIT - 1)),
          { timestamp, previous: this.captureEditableFields(current) },
        ],
      });

      return {
        applications: applications.map((application) =>
          application.id === id ? updated : application,
        ),
        result: updated,
      };
    });
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<ApplicationData> {
    return this.update(id, { status });
  }

  async delete(id: string, confirmed = false): Promise<ApplicationData> {
    if (!confirmed) {
      throw new Error(
        "Deletion requires explicit confirmation: set confirm to true.",
      );
    }

    return this.repository.update((applications) => {
      const deleted = applications.find((application) => application.id === id);
      if (!deleted) {
        throw new Error(`No application found with id: ${id}`);
      }

      return {
        applications: applications.filter(
          (application) => application.id !== id,
        ),
        result: deleted,
      };
    });
  }

  async undoLastChange(id: string): Promise<ApplicationData> {
    const timestamp = this.now().toISOString();

    return this.repository.update((applications) => {
      const current = applications.find((application) => application.id === id);
      if (!current) {
        throw new Error(`No application found with id: ${id}`);
      }

      const lastChange = current.undo_stack.at(-1);
      if (!lastChange) {
        throw new Error(`No previous change to undo for application ${id}.`);
      }

      const previousStatus = lastChange.previous.status;
      const parsedStatus = applicationStatusSchema.safeParse(previousStatus);
      const history =
        parsedStatus.success && parsedStatus.data !== current.status
          ? [...current.history, { status: parsedStatus.data, timestamp }]
          : current.history;
      const restored = applicationDataSchema.parse({
        ...current,
        ...lastChange.previous,
        updated_at: timestamp,
        history,
        undo_stack: current.undo_stack.slice(0, -1),
      });

      return {
        applications: applications.map((application) =>
          application.id === id ? restored : application,
        ),
        result: restored,
      };
    });
  }

  private nextId(applications: readonly ApplicationData[]): string {
    const highestId = applications.reduce((highest, application) => {
      const number = Number(application.id.slice(4));
      return Number.isFinite(number) ? Math.max(highest, number) : highest;
    }, 0);

    return `app-${String(highestId + 1).padStart(3, "0")}`;
  }

  private captureEditableFields(
    application: ApplicationData,
  ): Record<string, unknown> {
    const {
      company,
      role,
      date_applied,
      status,
      source,
      notes,
      salary,
      location,
      work_mode,
      job_url,
      priority,
      tags,
      deadline,
      resume_version,
    } = application;

    return {
      company,
      role,
      date_applied,
      status,
      source,
      notes,
      salary,
      location,
      work_mode,
      job_url,
      priority,
      tags,
      deadline,
      resume_version,
    };
  }
}
