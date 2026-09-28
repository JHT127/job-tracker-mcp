import { applicationDataSchema } from "../../schemas/applicationData.js";
import type {
  ApplicationData,
  ApplicationDataInput,
} from "../../schemas/applicationData.js";
import type {
  ApplicationRepository,
  RepositoryMutation,
} from "../../core/repository.js";

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

export class MemoryRepository implements ApplicationRepository {
  constructor(private applications: ApplicationData[] = []) {}

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
}
