import { describe, expect, it } from "vitest";

import { ContactService } from "../core/contactService.js";
import type { ContactData } from "../schemas/contact.js";
import {
  MemoryRepository,
  makeApplication,
} from "./helpers/applicationFixtures.js";

const fixedNow = new Date("2026-08-10T12:00:00.000Z");

function makeContact(overrides: Partial<ContactData> = {}): ContactData {
  return {
    id: "con-001",
    person: "Alex Example",
    company: "Example Labs",
    notes: "",
    application_ids: [],
    ...overrides,
  };
}

describe("ContactService", () => {
  it("adds contacts with generated ids and defaults", async () => {
    const service = new ContactService(new MemoryRepository());

    const contact = await service.add({
      person: "Alex Example",
      company: "Example Labs",
    });

    expect(contact.id).toBe("con-001");
    expect(contact.notes).toBe("");
    expect(contact.application_ids).toEqual([]);
  });

  it("generates ids from the highest numeric contact id", async () => {
    const service = new ContactService(
      new MemoryRepository(
        [],
        [makeContact({ id: "con-009" }), makeContact({ id: "con-003" })],
      ),
    );

    const contact = await service.add({
      person: "Sam Example",
      company: "Sample Co",
    });

    expect(contact.id).toBe("con-010");
  });

  it("filters contacts by company and reports bounded pagination", async () => {
    const contacts = Array.from({ length: 3 }, (_, index) =>
      makeContact({
        id: `con-${String(index + 1).padStart(3, "0")}`,
        company: index === 2 ? "Other Co" : "Example Labs",
      }),
    );
    const service = new ContactService(new MemoryRepository([], contacts));

    expect(await service.list({ company: "example", limit: 1 })).toEqual({
      contacts: [contacts[0]],
      total: 2,
      truncated: true,
    });
    expect((await service.list({ limit: 1000 })).contacts).toHaveLength(3);
  });

  it("links contacts to existing applications idempotently", async () => {
    const contact = makeContact();
    const service = new ContactService(
      new MemoryRepository([makeApplication()], [contact]),
    );

    const first = await service.linkToApplication("con-001", "app-001");
    const second = await service.linkToApplication("con-001", "app-001");

    expect(first.application_ids).toEqual(["app-001"]);
    expect(second.application_ids).toEqual(["app-001"]);
  });

  it("reports missing contacts and applications when linking", async () => {
    const service = new ContactService(
      new MemoryRepository([makeApplication()], [makeContact()]),
    );

    await expect(
      service.linkToApplication("con-404", "app-001"),
    ).rejects.toThrow("No contact found");
    await expect(
      service.linkToApplication("con-001", "app-404"),
    ).rejects.toThrow("No application found");
  });

  it("suggests contacts without a message or past the threshold in priority order", async () => {
    const service = new ContactService(
      new MemoryRepository(
        [],
        [
          makeContact({ id: "con-001", last_message_date: "2026-08-01" }),
          makeContact({ id: "con-002", company: "No Date" }),
          makeContact({ id: "con-003", last_message_date: "2026-08-05" }),
          makeContact({ id: "con-004", last_message_date: "2026-08-10" }),
        ],
      ),
      () => new Date(fixedNow),
    );

    const suggestions = await service.getReconnectSuggestions({
      daysThreshold: 5,
      limit: 2,
    });

    expect(suggestions.map((suggestion) => suggestion.contact.id)).toEqual([
      "con-002",
      "con-001",
    ]);
    expect(suggestions[0].reason).toContain("No previous message");
    expect(suggestions[1].daysSinceContact).toBe(9);
  });
});
