import {
  applicationStatusSchema,
  applicationSourceSchema,
} from "../schemas/applicationData.js";
import type {
  ApplicationData,
  ApplicationSource,
  ApplicationStatus,
} from "../schemas/applicationData.js";

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  bySource: Record<ApplicationSource, number>;
  responded: number;
  responseRate: number;
  interviewRate: number;
}

export function summarizeApplications(
  applications: readonly ApplicationData[],
): ApplicationStats {
  const byStatus = Object.fromEntries(
    applicationStatusSchema.options.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;
  const bySource = Object.fromEntries(
    applicationSourceSchema.options.map((source) => [source, 0]),
  ) as Record<ApplicationSource, number>;

  for (const application of applications) {
    byStatus[application.status] += 1;
    bySource[application.source] += 1;
  }

  const responded = byStatus.interview + byStatus.offer + byStatus.rejected;
  const interviews = byStatus.interview + byStatus.offer;

  return {
    total: applications.length,
    byStatus,
    bySource,
    responded,
    responseRate:
      applications.length === 0 ? 0 : responded / applications.length,
    interviewRate:
      applications.length === 0 ? 0 : interviews / applications.length,
  };
}
