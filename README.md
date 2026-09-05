# Job Application Tracker MCP

A Model Context Protocol (MCP) server for managing job application records.

The server allows an MCP client such as MCP Inspector to:

* Add job applications.
* List stored applications.
* Search applications by company or role.
* Update application statuses.
* Delete applications.
* Get suggested next actions.

Application data is stored locally in:

```text
./data/applications.json
```

The project does not require external APIs, databases, API keys, or network services.

Built as part of [NextFlows Academy](https://nextflows.ai/academy/portal/dashboard?cohort=ac421725-af45-4094-a108-f8485d13fe67) — Building MCP AI Engines program.
## Requirements

Before installing the project, make sure you have:

* Node.js
* npm

Check your installed versions:

```bash
node --version
npm --version
```

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd my-first-mcp
```

Install the project dependencies:

```bash
npm install
```

## Run the Server

Start the MCP server with:

```bash
npm run dev
```

The server communicates over stdio, so it may continue running without displaying normal terminal output.

To stop the server:

```text
Ctrl+C
```

## Run MCP Inspector

MCP Inspector can be used to connect to the server and test its tools.

Run:

```bash
npm run inspect
```

The direct Inspector command is:

```bash
npm run inspect
```

In MCP Inspector:

1. Open the Tools section.
2. Confirm the tools are listed:

   * `add_application`
   * `list_applications`
   * `search_applications`
   * `update_status`
   * `delete_application`
   * `get_next_actions`
3. Test each tool with valid input.
4. Test invalid input and confirm that validation rejects it.

### Example validation test

For `add_application`, an empty role should be rejected:

```json
{
  "company": "Google",
  "role": "",
  "date_applied": "2026-08-12",
  "status": "applied",
  "source": "linkedin"
}
```

After Inspector starts:

1. Open the Tools section.
2. Confirm that the MCP tools are available.
3. Call the tools with valid inputs.
4. Test invalid inputs and confirm that validation errors are returned.

## Connect to Claude Desktop

Claude Desktop can run this local MCP server over stdio.

### Windows

1. Install and update Claude Desktop.
2. Make sure Node.js and npm are available.
3. Open Claude Desktop and go to **Settings → Developer → Edit Config**.
4. Add the following MCP server configuration. Replace `YOUR_WINDOWS_USERNAME` with your Windows username:

```json
{
  "mcpServers": {
    "my-first-mcp": {
      "command": "C:/Program Files/nodejs/npx.cmd",
      "args": [
        "-y",
        "tsx",
        "C:/Users/YOUR_WINDOWS_USERNAME/Desktop/my-first-mcp/src/index.ts"
      ],
      "cwd": "C:/Users/YOUR_WINDOWS_USERNAME/Desktop/my-first-mcp"
    }
  }
}
```

5. Save the configuration.
6. Fully quit Claude Desktop and open it again.
7. Open a new chat and confirm that `my-first-mcp` is running in the tools/connectors section.
8. Approve tool calls when Claude asks for permission.

### Verify the connection

Try these example prompts:

```text
List all my job applications.
```

```text
Add a job application for Google for the Software Engineer role.
The application date is 2026-08-12, the status is applied, and the source is linkedin.
```

```text
Search my applications for Google.
```

```text
What are my next actions for my job applications?
```

On Windows, if Claude cannot find `npx`, use the full path to `npx.cmd`, for example:

```text
C:/Program Files/nodejs/npx.cmd
```

The `cwd` should point to the repository root, while the `src/index.ts` argument above uses an absolute path so Claude Desktop can start the server even when its own working directory is different.

## Available Tools

| Tool                    | Description                                                | Read-only |
| ----------------------- | ------------------------------------------------------------ | :-------: |
| `add_application`       | Adds a new job application to the tracker.                   |           |
| `list_applications`     | Lists stored job applications.                                | ✅        |
| `search_applications`   | Searches applications by company or role keyword.             | ✅        |
| `update_status`         | Updates the status of an existing application.                |           |
| `delete_application`    | Deletes an existing application by its ID.                    |           |
| `get_next_actions`      | Returns suggested next actions based on application data.     | ✅        |

### `add_application`

Adds a new job application.

The input is validated using Zod before the application is stored.

Validation includes:

* Company name is required.
* Role is required.
* Company and role are limited to 100 characters.
* Company and role must contain letters.
* `date_applied` must use `YYYY-MM-DD`.
* `status` must be one of the supported values.
* `source` must be one of the supported values.
* `notes` is optional and limited to 500 characters.

Example input:

```json
{
  "company": "Google",
  "role": "Software Engineer",
  "date_applied": "2026-08-12",
  "status": "applied",
  "source": "linkedin",
  "notes": "Applied through the company job portal."
}
```

### `list_applications`

Returns stored job applications from:

```text
./data/applications.json
```

The tool validates application data before returning it and limits the amount of output returned.

### `search_applications`

Searches stored job applications by a keyword, matching against the `company` or `role` fields (case-insensitive, partial match). This tool is **read-only** and does not modify `./data/applications.json`.

**Input:**

| Field   | Type   | Required | Notes              |
| ------- | ------ | :------: | ------------------- |
| `query` | string |    Yes   | 1–100 characters.   |

**Behavior:**

1. Validates `query` against the schema.
2. Reads all applications from `./data/applications.json`.
3. Filters records where `company` or `role` contains `query` (case-insensitive).
4. Returns matching records as JSON, or a plain message if none match.

Example input:

```json
{ "query": "google" }
```

Example output:

```json
[
  {
    "id": "app-002",
    "company": "Google",
    "role": "Backend Developer",
    "date_applied": "2026-08-19",
    "status": "applied",
    "source": "linkedin",
    "notes": ""
  }
]
```

If no applications match, the tool returns:

```text
No matching applications found.
```

### `update_status`

Updates the status of an existing application.

Supported statuses are:

```text
applied
interview
offer
rejected
no_response
```

If the application ID does not exist, the tool returns a clear error.

### `delete_application`

Deletes an existing application record by its ID. Use this to remove a record added by mistake or a duplicate entry.

**Input:**

| Field | Type   | Required | Notes                              |
| ----- | ------ | :------: | ----------------------------------- |
| `id`  | string |    Yes   | The unique ID of the application. |

If the application ID does not exist, the tool returns a clear error instead of modifying the file.

Example input:

```json
{ "id": "app-004" }
```

### `get_next_actions`

Provides suggested next actions based on the stored job application data.

## Example Prompts

The following prompts can be used when testing the server through an MCP client:

```text
Add a job application for Google for the Software Engineer role.
The application date is 2026-08-12, the status is applied, and the source is linkedin.
```

```text
List all my job applications.
```

```text
Search my applications for companies with "tech" in the name.
```

```text
Update application app-001 to interview status.
```

```text
Delete application app-004.
```

```text
What are my next actions for my job applications?
```

## Troubleshooting

### 1. `npm` or `node` is not recognized

**Cause:** Node.js or npm is not installed or is not available in the system PATH.

**Solution:** Install Node.js, restart the terminal, and verify:

```bash
node --version
npm --version
```

### 2. `Cannot find module` or missing dependency errors

**Cause:** Project dependencies have not been installed.

**Solution:** From the project directory, run:

```bash
npm install
```

Then start the server again:

```bash
npm run dev
```

### 3. MCP tool input validation error

**Cause:** The supplied tool input does not match the required schema. For example, a required field such as `role` may be empty or a status/source value may not be supported.

**Solution:** Check the tool requirements and provide valid values.

For example, this invalid input:

```json
{
  "company": "Google",
  "role": "",
  "date_applied": "2026-08-12",
  "status": "applied",
  "source": "linkedin"
}
```

should be rejected because the role is empty.

## Application Statuses

The supported application statuses are:

```text
applied
interview
offer
rejected
no_response
```

## Application Sources

The supported application sources are:

```text
cold_apply
linkedin
referral
company_website
career_fair
```

## Data Storage

Application data is stored in a local JSON file:

```text
./data/applications.json
```

Example application:

```json
{
  "id": "app-001",
  "company": "Example Company",
  "role": "Software Engineer",
  "date_applied": "2026-08-12",
  "status": "applied",
  "source": "linkedin",
  "notes": ""
}
```

The project does not use an external database or API.

## Security

Security hardening was performed during Week 4.

The project includes:

* Zod input validation.
* Length limits on user-provided fields.
* Allowlisted status and source values.
* Restricted local file access.
* Output limits for tools that return multiple records.
* Short error messages without raw stack traces.
* `.env` and `.env.local` excluded through `.gitignore`.
* No external APIs or API keys are required.

Additional security details are available in:

```text
docs/threat-model.md
SECURITY.md
```

## Project Documentation

Additional documentation is available in the `docs` directory:

* `project-choice.md` — Project selection and scope.
* `design.md` — Tool and server design.
* `data-plan.md` — Data storage and data handling plan.
* `threat-model.md` — Security threats and mitigations.
* `review-checklist.md` — Peer review results and action items.

Example conversations showing the server in use with a model are in [`examples/conversations.md`](./examples/conversations.md).

## Project Structure

```text
my-first-mcp/
├── data/
│   └── applications.json
│
├── docs/
│   ├── data-plan.md
│   ├── design.md
│   ├── project-choice.md
│   ├── review-checklist.md
│   ├── test-plan.md
│   └── threat-model.md
│
├── examples/
│   ├── add_application.json
│   ├── get_next_actions.json
│   ├── list_applications.json
│   ├── search_applications.json
│   └── update_status.json
│
├── src/
│   ├── lib/
│   │   └── applications.ts
│   │
│   ├── schemas/
│   │   ├── addApplication.ts
│   │   ├── applicationData.ts
│   │   ├── getNextActions.ts
│   │   ├── listApplications.ts
│   │   ├── searchApplications.ts
│   │   └── updateStatus.ts
│   │
│   ├── tests/
│   │   └── listApplications.test.ts
│   │
│   ├── tools/
│   │   ├── addApplication.ts
│   │   ├── deleteApplication.ts
│   │   ├── getNextActions.ts
│   │   ├── getNextActions.test.ts
│   │   ├── listApplications.ts
│   │   ├── searchApplications.ts
│   │   ├── updateStatus.ts
│   │   └── ...
│   │
│   └── index.ts
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── SECURITY.md
└── tsconfig.json
```

## Team

* Taima Nazzal
* Shahd Shwekeyeh
* Joud Thaher
* Razan Froukh

## License

This project is licensed under the ISC License.