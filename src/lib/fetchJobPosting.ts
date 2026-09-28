import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_MAX_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MILLISECONDS = 8_000;

export interface JobPostingFetchOptions {
  maxBytes?: number;
  timeoutMilliseconds?: number;
  fetchImplementation?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function isPrivateIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return isPrivateIpv4(address);
  }
  if (version === 0) {
    return false;
  }
  if (version !== 6) {
    return true;
  }

  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIp(normalized.slice(7));
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

async function resolvePublicAddresses(hostname: string): Promise<string[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  return results.map((result) => result.address);
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) {
    throw new Error("Job posting response has no body.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`Job posting exceeds the ${maxBytes}-byte size limit.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export async function fetchJobPostingText(
  rawUrl: string,
  options: JobPostingFetchOptions = {},
): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Provide a valid HTTPS job posting URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error(
      "Only HTTPS URLs without credentials or custom ports are allowed.",
    );
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    isPrivateIp(hostname)
  ) {
    throw new Error("Private or local job posting hosts are not allowed.");
  }

  const addresses = await (options.resolveHost ?? resolvePublicAddresses)(
    hostname,
  );
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new Error(
      "Job posting host must resolve only to public IP addresses.",
    );
  }

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const response = await (options.fetchImplementation ?? fetch)(url, {
    redirect: "error",
    signal: AbortSignal.timeout(
      options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS,
    ),
    headers: { "user-agent": "JobTrackerMCP/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Job posting request failed with HTTP ${response.status}.`);
  }
  if (
    response.headers.get("content-type") &&
    !response.headers.get("content-type")?.toLowerCase().includes("text/")
  ) {
    throw new Error("Job posting response must be text or HTML.");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Job posting exceeds the ${maxBytes}-byte size limit.`);
  }

  return readBodyWithLimit(response, maxBytes);
}
