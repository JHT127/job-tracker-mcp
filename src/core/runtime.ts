import { ApplicationService } from "./applicationService.js";
import { createApplicationRepository } from "./createRepository.js";

let defaultService: ApplicationService | undefined;

export function getApplicationService(): ApplicationService {
  defaultService ??= new ApplicationService(createApplicationRepository());
  return defaultService;
}
