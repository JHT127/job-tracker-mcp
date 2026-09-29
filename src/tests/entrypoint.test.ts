import { describe, expect, it } from "vitest";

import { isServerEntryPoint } from "../index.js";

describe("server entrypoint detection", () => {
  it("accepts POSIX source and build paths", () => {
    expect(isServerEntryPoint("/workspace/src/index.ts")).toBe(true);
    expect(isServerEntryPoint("/workspace/dist/index.js")).toBe(true);
  });

  it("accepts Windows-style build paths", () => {
    expect(
      isServerEntryPoint(
        "C:\\Users\\SKY\\Documents\\my-first-mcp-main (1)\\my-first-mcp-main\\dist\\index.js",
      ),
    ).toBe(true);
  });
});
