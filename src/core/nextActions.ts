import type {
  ApplicationData,
  ApplicationStatus,
} from "../schemas/applicationData.js";

const DAY_IN_MILLISECONDS = 86_400_000;
const TERMINAL_STATUSES = new Set<ApplicationStatus>(["offer", "rejected"]);

const DEFAULT_FOLLOW_UP_DAYS: Partial<Record<ApplicationStatus, number>> = {
  applied: 14,
  interview: 7,
  no_response: 14,
};

const STATUS_WEIGHTS: Record<ApplicationStatus, number> = {
  applied: 4,
  interview: 10,
  offer: 0,
  rejected: 0,
  no_response: 6,
};

const SOURCE_WEIGHTS: Record<ApplicationData["source"], number> = {
  referral: 8,
  career_fair: 5,
  company_website: 3,
  linkedin: 2,
  cold_apply: 0,
};

const PRIORITY_WEIGHTS: Record<ApplicationData["priority"], number> = {
  low: 0,
  normal: 5,
  high: 12,
};

export interface NextAction {
  action: string;
  application_id: string;
  reason: string;
  score: number;
}

export interface NextActionOptions {
  now?: Date;
  followUpDaysByStatus?: Partial<Record<ApplicationStatus, number>>;
}

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function deadlineWeight(deadline: string | undefined, now: Date): number {
  if (!deadline) {
    return 0;
  }

  const daysUntilDeadline = Math.floor(
    (utcDay(new Date(`${deadline}T00:00:00.000Z`)) - utcDay(now)) /
      DAY_IN_MILLISECONDS,
  );

  if (daysUntilDeadline <= 0) return 18;
  if (daysUntilDeadline <= 3) return 12;
  if (daysUntilDeadline <= 7) return 6;
  return 0;
}

export function buildNextActions(
  applications: readonly ApplicationData[],
  options: NextActionOptions = {},
): NextAction[] {
  const now = options.now ?? new Date();
  const followUpDays = {
    ...DEFAULT_FOLLOW_UP_DAYS,
    ...options.followUpDaysByStatus,
  };

  return applications
    .flatMap((application): NextAction[] => {
      if (TERMINAL_STATUSES.has(application.status)) {
        return [];
      }

      const daysSinceUpdate = Math.max(
        0,
        Math.floor(
          (utcDay(now) - utcDay(new Date(application.updated_at))) /
            DAY_IN_MILLISECONDS,
        ),
      );
      const threshold = followUpDays[application.status];
      const stale = threshold !== undefined && daysSinceUpdate >= threshold;
      const recentlyUpdated = daysSinceUpdate <= 3;

      if (!stale && !recentlyUpdated) {
        return [];
      }

      const score =
        Math.min(daysSinceUpdate, 30) +
        STATUS_WEIGHTS[application.status] +
        SOURCE_WEIGHTS[application.source] +
        PRIORITY_WEIGHTS[application.priority] +
        deadlineWeight(application.deadline, now);

      return [
        {
          action: stale
            ? `Follow up with ${application.company}`
            : application.status === "interview"
              ? `Prepare for ${application.company}`
              : `Review ${application.company}`,
          application_id: application.id,
          reason: stale
            ? `No status update for ${daysSinceUpdate} days.`
            : `Recently updated to ${application.status}.`,
          score,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.application_id.localeCompare(right.application_id),
    );
}
