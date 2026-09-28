import { ApplicationService } from "./applicationService.js";
import { ContactService } from "./contactService.js";
import { createApplicationRepository } from "./createRepository.js";
import { InterviewService } from "./interviewService.js";
import type { TrackerRepository } from "./repository.js";

let defaultRepository: TrackerRepository | undefined;
let defaultApplicationService: ApplicationService | undefined;
let defaultContactService: ContactService | undefined;
let defaultInterviewService: InterviewService | undefined;

export function getTrackerRepository(): TrackerRepository {
  defaultRepository ??= createApplicationRepository();
  return defaultRepository;
}

export function getApplicationService(): ApplicationService {
  defaultApplicationService ??= new ApplicationService(getTrackerRepository());
  return defaultApplicationService;
}

export function getContactService(): ContactService {
  defaultContactService ??= new ContactService(getTrackerRepository());
  return defaultContactService;
}

export function getInterviewService(): InterviewService {
  defaultInterviewService ??= new InterviewService(getTrackerRepository());
  return defaultInterviewService;
}
