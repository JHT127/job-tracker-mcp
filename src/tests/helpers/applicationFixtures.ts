import { applicationDataSchema } from "../../schemas/applicationData.js";
import type {
  ApplicationData,
  ApplicationDataInput,
} from "../../schemas/applicationData.js";
import type {
  RepositoryMutation,
  TrackerRepository,
} from "../../core/repository.js";
import type { ContactData } from "../../schemas/contact.js";
import type { InterviewData } from "../../schemas/interview.js";

export function makeApplication(
  overrides: Partial<ApplicationDataInput> = {},
): ApplicationData {
  return applicationDataSchema.parse({
    id: "app-001",
    company: "Example Labs",
    role: "Software Engineer",
    date_applied: "2026-07-01",
    status: "applied",
    source: "cold_apply",
    notes: "Sample note",
    ...overrides,
  });
}

export class MemoryRepository implements TrackerRepository {
  constructor(
    private applications: ApplicationData[] = [],
    private contacts: ContactData[] = [],
    private interviews: InterviewData[] = [],
  ) {}

  async getAll(): Promise<ApplicationData[]> {
    return structuredClone(this.applications);
  }

  async update<T>(
    mutate: (applications: readonly ApplicationData[]) => RepositoryMutation<T>,
  ): Promise<T> {
    const mutation = mutate(structuredClone(this.applications));
    if (mutation.write !== false) {
      this.applications = structuredClone(mutation.applications);
    }
    return mutation.result;
  }

  async getContacts(): Promise<ContactData[]> {
    return structuredClone(this.contacts);
  }

  async updateContacts<T>(
    mutate: (contacts: readonly ContactData[]) => {
      contacts: ContactData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T> {
    const mutation = mutate(structuredClone(this.contacts));
    if (mutation.write !== false) {
      this.contacts = structuredClone(mutation.contacts);
    }
    return mutation.result;
  }

  async getInterviews(): Promise<InterviewData[]> {
    return structuredClone(this.interviews);
  }

  async updateInterviews<T>(
    mutate: (interviews: readonly InterviewData[]) => {
      interviews: InterviewData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T> {
    const mutation = mutate(structuredClone(this.interviews));
    if (mutation.write !== false) {
      this.interviews = structuredClone(mutation.interviews);
    }
    return mutation.result;
  }
}
