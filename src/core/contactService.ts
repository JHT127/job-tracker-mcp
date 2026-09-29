import type { ContactData } from "../schemas/contact.js";
import { contactDataSchema } from "../schemas/contact.js";
import type { TrackerRepository } from "./repository.js";

const MAX_CONTACTS = 100;
const DAY_IN_MILLISECONDS = 86_400_000;

function utcDay(date: Date | string): number {
  const value =
    typeof date === "string" ? new Date(`${date}T00:00:00.000Z`) : date;
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

export interface AddContactInput {
  person: string;
  company: string;
  linkedin?: string;
  last_message_date?: string;
  notes?: string;
}

export class ContactService {
  constructor(
    private readonly repository: TrackerRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async add(input: AddContactInput): Promise<ContactData> {
    return this.repository.updateContacts((contacts) => {
      const highestId = contacts.reduce((highest, contact) => {
        const number = Number(contact.id.slice(4));
        return Number.isFinite(number) ? Math.max(highest, number) : highest;
      }, 0);
      const contact = contactDataSchema.parse({
        ...input,
        id: `con-${String(highestId + 1).padStart(3, "0")}`,
        notes: input.notes ?? "",
        application_ids: [],
      });

      return { contacts: [...contacts, contact], result: contact };
    });
  }

  async list(options: { company?: string; limit?: number } = {}): Promise<{
    contacts: ContactData[];
    total: number;
    truncated: boolean;
  }> {
    const contacts = await this.repository.getContacts();
    const filtered = options.company
      ? contacts.filter((contact) =>
          contact.company
            .toLocaleLowerCase()
            .includes(options.company!.trim().toLocaleLowerCase()),
        )
      : contacts;
    const limit = Math.min(Math.max(options.limit ?? 50, 1), MAX_CONTACTS);

    return {
      contacts: filtered.slice(0, limit),
      total: filtered.length,
      truncated: filtered.length > limit,
    };
  }

  async linkToApplication(
    contactId: string,
    applicationId: string,
  ): Promise<ContactData> {
    const applications = await this.repository.getAll();
    if (!applications.some((application) => application.id === applicationId)) {
      throw new Error(`No application found with id: ${applicationId}`);
    }

    return this.repository.updateContacts((contacts) => {
      const contact = contacts.find((item) => item.id === contactId);
      if (!contact) {
        throw new Error(`No contact found with id: ${contactId}`);
      }

      const updated = contactDataSchema.parse({
        ...contact,
        application_ids: contact.application_ids.includes(applicationId)
          ? contact.application_ids
          : [...contact.application_ids, applicationId],
      });

      return {
        contacts: contacts.map((item) =>
          item.id === contactId ? updated : item,
        ),
        result: updated,
      };
    });
  }

  async getReconnectSuggestions(
    options: {
      daysThreshold?: number;
      limit?: number;
    } = {},
  ): Promise<
    Array<{ contact: ContactData; daysSinceContact: number; reason: string }>
  > {
    const threshold = Math.min(Math.max(options.daysThreshold ?? 30, 1), 365);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), MAX_CONTACTS);
    const today = utcDay(this.now());
    const contacts = await this.repository.getContacts();

    return contacts
      .map((contact) => {
        const daysSinceContact = contact.last_message_date
          ? Math.max(
              0,
              Math.floor(
                (today - utcDay(contact.last_message_date)) /
                  DAY_IN_MILLISECONDS,
              ),
            )
          : null;
        return { contact, daysSinceContact };
      })
      .filter(
        (entry) =>
          entry.daysSinceContact === null ||
          entry.daysSinceContact >= threshold,
      )
      .sort(
        (left, right) =>
          (right.daysSinceContact ?? Number.MAX_SAFE_INTEGER) -
            (left.daysSinceContact ?? Number.MAX_SAFE_INTEGER) ||
          left.contact.id.localeCompare(right.contact.id),
      )
      .slice(0, limit)
      .map(({ contact, daysSinceContact }) => ({
        contact,
        daysSinceContact: daysSinceContact ?? threshold,
        reason:
          daysSinceContact === null
            ? "No previous message is recorded."
            : `Last message was ${daysSinceContact} days ago.`,
      }));
  }
}
