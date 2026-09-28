import { interviewDataSchema } from "../schemas/interview.js";
import type {
  InterviewData,
  InterviewDataInput,
} from "../schemas/interview.js";
import type { TrackerRepository } from "./repository.js";

const MAX_INTERVIEWS = 100;
const DAY_IN_MILLISECONDS = 86_400_000;

export type AddInterviewInput = Omit<InterviewDataInput, "id">;

export class InterviewService {
  constructor(
    private readonly repository: TrackerRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async add(input: AddInterviewInput): Promise<InterviewData> {
    const applications = await this.repository.getAll();
    if (
      !applications.some(
        (application) => application.id === input.application_id,
      )
    ) {
      throw new Error(`No application found with id: ${input.application_id}`);
    }

    return this.repository.updateInterviews((interviews) => {
      const highestId = interviews.reduce((highest, interview) => {
        const number = Number(interview.id.slice(4));
        return Number.isFinite(number) ? Math.max(highest, number) : highest;
      }, 0);
      const interview = interviewDataSchema.parse({
        ...input,
        id: `int-${String(highestId + 1).padStart(3, "0")}`,
        prep_notes: input.prep_notes ?? "",
      });

      return { interviews: [...interviews, interview], result: interview };
    });
  }

  async listUpcoming(
    options: {
      daysAhead?: number;
      limit?: number;
    } = {},
  ): Promise<{
    interviews: InterviewData[];
    total: number;
    truncated: boolean;
  }> {
    const daysAhead = Math.min(Math.max(options.daysAhead ?? 30, 1), 365);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), MAX_INTERVIEWS);
    const now = this.now().getTime();
    const end = now + daysAhead * DAY_IN_MILLISECONDS;
    const upcoming = (await this.repository.getInterviews())
      .filter((interview) => {
        const interviewTime = new Date(interview.date).getTime();
        return interviewTime >= now && interviewTime <= end;
      })
      .sort(
        (left, right) =>
          new Date(left.date).getTime() - new Date(right.date).getTime() ||
          left.id.localeCompare(right.id),
      );

    return {
      interviews: upcoming.slice(0, limit),
      total: upcoming.length,
      truncated: upcoming.length > limit,
    };
  }
}
