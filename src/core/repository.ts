import type { ApplicationData } from "../schemas/applicationData.js";
import type { ContactData } from "../schemas/contact.js";
import type { InterviewData } from "../schemas/interview.js";

export interface RepositoryMutation<T> {
  applications: ApplicationData[];
  result: T;
  write?: boolean;
}

export interface ApplicationRepository {
  getAll(): Promise<ApplicationData[]>;
  update<T>(
    mutate: (applications: readonly ApplicationData[]) => RepositoryMutation<T>,
  ): Promise<T>;
  close?(): void;
}

export interface ContactRepository {
  getContacts(): Promise<ContactData[]>;
  updateContacts<T>(
    mutate: (contacts: readonly ContactData[]) => {
      contacts: ContactData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T>;
}

export interface InterviewRepository {
  getInterviews(): Promise<InterviewData[]>;
  updateInterviews<T>(
    mutate: (interviews: readonly InterviewData[]) => {
      interviews: InterviewData[];
      result: T;
      write?: boolean;
    },
  ): Promise<T>;
}

export type TrackerRepository = ApplicationRepository &
  ContactRepository &
  InterviewRepository;

export class AsyncMutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(operation: () => Promise<T> | T): Promise<T> {
    let release = (): void => {};
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await operation();
    } finally {
      release();
    }
  }
}
