import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

type Tool = {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<
      string,
      { type?: string; enum?: string[]; description?: string }
    >;
    required?: string[];
  };
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "docs", "tool-reference.md");

function renderTool(tool: Tool): string {
  const properties = Object.entries(tool.inputSchema?.properties ?? {});
  const inputs = properties.length
    ? properties
        .map(([name, schema]) => {
          const type = schema.enum
            ? schema.enum.join(" | ")
            : (schema.type ?? "unknown");
          const required = tool.inputSchema?.required?.includes(name)
            ? "yes"
            : "no";
          return `| \`${name}\` | ${type} | ${required} | ${schema.description ?? ""} |`;
        })
        .join("\n")
    : "| _none_ | - | - | No input fields. |";

  return `### \`${tool.name}\`\n\n${tool.description ?? ""}\n\n| Input | Type | Required | Notes |\n| --- | --- | :---: | --- |\n${inputs}`;
}

export async function generateToolReference(): Promise<string> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(root, "dist", "index.js")],
  });
  const client = new Client({
    name: "tool-reference-generator",
    version: "1.0.0",
  });
  await client.connect(transport);
  const result = await client.listTools();
  await transport.close();

  const tools = [...(result.tools as Tool[])].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  return `# MCP Tool Reference\n\nGenerated from the live MCP server schemas. Run \`npm run generate:tools\` after changing a tool contract.\n\nTool count: **${tools.length}**\n\n${tools.map(renderTool).join("\n\n")}\n`;
}

const generated = await generateToolReference();
if (process.argv.includes("--check")) {
  const current = (await readFile(outputPath, "utf8")).replaceAll("\r\n", "\n");
  if (current !== generated) {
    console.error(
      "docs/tool-reference.md is stale; run npm run generate:tools",
    );
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, generated, "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}
