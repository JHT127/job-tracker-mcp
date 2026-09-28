import { describe, expect, it } from "vitest";

import { InterviewService } from "../core/interviewService.js";
import {
  MemoryRepository,
  makeApplication,
} from "./helpers/applicationFixtures.js";

const fixedNow = new Date("2026-08-10T12:00:00.000Z");

describe("InterviewService", () => {
  it("adds an interview with generated id and notes default", async () => {
    const service = new InterviewService(
      new MemoryRepository([makeApplication()]),
      () => new Date(fixedNow),
    );

    const interview = await service.add({
      application_id: "app-001",
      date: "2026-08-12T15:00:00.000Z",
      type: "technical",
    });

    expect(interview.id).toBe("int-001");
    expect(interview.prep_notes).toBe("");
  });

  it("increments interview ids and preserves supplied interviewer/prep details", async () => {
    const service = new InterviewService(
      new MemoryRepository(
        [makeApplication()],
        [],
        [
          {
            id: "int-006",
            application_id: "app-001",
            date: "2026-08-11T09:00:00.000Z",
            type: "phone",
            prep_notes: "Initial screen",
          },
        ],
      ),
    );

    const interview = await service.add({
      application_id: "app-001",
      date: "2026-08-13T15:00:00.000Z",
      type: "behavioral",
      interviewer: "Taylor Example",
      prep_notes: "Prepare STAR examples",
    });

    expect(interview.id).toBe("int-007");
    expect(interview.interviewer).toBe("Taylor Example");
    expect(interview.prep_notes).toBe("Prepare STAR examples");
  });

  it("rejects an interview for an unknown application", async () => {
    const service = new InterviewService(new MemoryRepository());

    await expect(
      service.add({
        application_id: "app-404",
        date: "2026-08-12T15:00:00.000Z",
        type: "technical",
      }),
    ).rejects.toThrow("No application found");
  });

  it("lists upcoming interviews chronologically within the clock horizon", async () => {
    const service = new InterviewService(
      new MemoryRepository(
        [],
        [],
        [
          {
            id: "int-001",
            application_id: "app-001",
            date: "2026-08-09T10:00:00.000Z",
            type: "phone",
            prep_notes: "Past",
          },
          {
            id: "int-003",
            application_id: "app-001",
            date: "2026-08-12T12:00:00.000Z",
            type: "technical",
            prep_notes: "Later",
          },
          {
            id: "int-002",
            application_id: "app-001",
            date: "2026-08-10T12:00:00.000Z",
            type: "behavioral",
            prep_notes: "Now",
          },
          {
            id: "int-004",
            application_id: "app-001",
            date: "2026-09-20T12:00:00.000Z",
            type: "onsite",
            prep_notes: "Too far",
          },
        ],
      ),
      () => new Date(fixedNow),
    );

    const result = await service.listUpcoming({ daysAhead: 7, limit: 1 });

    expect(result.total).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.interviews.map((interview) => interview.id)).toEqual([
      "int-002",
    ]);
  });

  it("returns an empty upcoming list when none are in range", async () => {
    const service = new InterviewService(
      new MemoryRepository(),
      () => new Date(fixedNow),
    );

    expect(await service.listUpcoming({ daysAhead: 1 })).toEqual({
      interviews: [],
      total: 0,
      truncated: false,
    });
  });
});
