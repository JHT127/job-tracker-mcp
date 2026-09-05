import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  applicationsDataSchema,
  ApplicationData,
} from "../schemas/applicationData.js";

const DATA_PATH = fileURLToPath(
  new URL("../../data/applications.json", import.meta.url)
);

// Maximum number of applications returned by listApplications.
const MAX_APPLICATIONS = 50;

export async function loadApplications(): Promise<ApplicationData[]> {
  try {
    const file = await fs.readFile(DATA_PATH, "utf8");

    const data = JSON.parse(file);

    return applicationsDataSchema.parse(data);
  } catch {
    console.error("Failed to load applications data.");
    throw new Error("Could not read applications data.");
  }
}

export async function saveApplications(
  applications: ApplicationData[]
): Promise<void> {
  await fs.writeFile(
    DATA_PATH,
    JSON.stringify(applications, null, 2),
    "utf8"
  );
}

export async function addApplication(
  application: ApplicationData
): Promise<ApplicationData> {
  const applications = await loadApplications();

  const duplicate = applications.some(
    (app) => app.id === application.id
  );

  if (duplicate) {
    throw new Error(
      `Application with id ${application.id} already exists.`
    );
  }

  applications.push(application);

  applications.sort(
    (a, b) =>
      new Date(a.date_applied).getTime() -
      new Date(b.date_applied).getTime()
  );

  await saveApplications(applications);

  return application;
}

export async function generateApplicationId(): Promise<string> {
  const applications = await loadApplications();

  if (applications.length === 0) {
    return "app-001";
  }

  // Use the highest existing numeric id, not the last array element —
  // the array is sorted by date_applied, so the last element is not
  // guaranteed to have the highest id.
  const maxNumber = applications.reduce((max, app) => {
    const num = Number(app.id.replace("app-", ""));
    return num > max ? num : max;
  }, 0);

  return `app-${String(maxNumber + 1).padStart(3, "0")}`;
}

const VALID_STATUSES: ApplicationData["status"][] = [
  "applied",
  "interview",
  "offer",
  "rejected",
  "no_response",
];

export async function updateApplicationStatus(
  id: string,
  newStatus: ApplicationData["status"]
): Promise<ApplicationData> {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }
  const applications = await loadApplications();
  const application = applications.find((app) => app.id === id);
  if (!application) {
    throw new Error(`No application found with id: ${id}`);
  }
  application.status = newStatus;
  await saveApplications(applications);
  return application;
}

export async function deleteApplication(
  id: string
): Promise<ApplicationData> {
  const applications = await loadApplications();

  const index = applications.findIndex((app) => app.id === id);

  if (index === -1) {
    throw new Error(`No application found with id: ${id}`);
  }

  const [removed] = applications.splice(index, 1);

  await saveApplications(applications);

  return removed;
}

export async function listApplications(
  status?: ApplicationData["status"]
): Promise<{
  applications: ApplicationData[];
  total: number;
  truncated: boolean;
}> {
  const applications = await loadApplications();

  const filteredApplications = status
    ? applications.filter((app) => app.status === status)
    : applications;

  const total = filteredApplications.length;

  const truncated = total > MAX_APPLICATIONS;

  return {
    applications: filteredApplications.slice(0, MAX_APPLICATIONS),
    total,
    truncated,
  };
}

export async function searchApplications(query: string) {
  const applications = await loadApplications(); 
  const q = query.trim().toLowerCase();

  return applications.filter(
    (app) =>
      app.company.toLowerCase().includes(q) ||
      app.role.toLowerCase().includes(q)
  );
}