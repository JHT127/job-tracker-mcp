import { JsonFileRepository } from "./jsonFileRepository.js";
import type { JsonFileRepositoryOptions } from "./jsonFileRepository.js";
import { SqliteRepository } from "./sqliteRepository.js";
import type { SqliteRepositoryOptions } from "./sqliteRepository.js";
import type { ApplicationRepository } from "./repository.js";

export interface RepositoryOptions {
  json?: JsonFileRepositoryOptions;
  sqlite?: SqliteRepositoryOptions;
}

export function createApplicationRepository(
  storage = process.env.STORAGE ?? "sqlite",
  options: RepositoryOptions = {},
): ApplicationRepository {
  if (storage === "json") {
    return new JsonFileRepository(options.json);
  }

  if (storage === "sqlite") {
    return new SqliteRepository(options.sqlite);
  }

  throw new Error(`Unsupported STORAGE value: ${storage}`);
}
