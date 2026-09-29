# Demo Script — Job Application Tracker MCP

> This script reflects the current SQLite-by-default server, REST API, dashboard, and expanded MCP toolset. Use fictional data for public demos.

## Demo Overview

**Total time:** 3–5 minutes

The demo shows how a user can interact with the Job Application Tracker MCP server using natural-language requests. The model converts the user's request into MCP tool calls, while the server validates the input and stores application data locally.

---

## 0:00–0:40 — The Problem

### What to say

> Managing multiple job applications can become difficult. Users need to keep track of companies, job roles, application dates, sources, statuses, and follow-up actions.
>
> The Job Application Tracker MCP server provides a simple way to manage this information through natural-language requests. The data is stored locally in a JSON file, so the project does not require external APIs or paid services.

### Key points

- Job applications can be difficult to track manually.
- Important information can become scattered.
- Users need to know which applications need follow-up.
- The MCP server provides tools to manage this information.

---

## 0:40–1:10 — Architecture

### Slide 3: Architecture

```text
User
  ↓
Claude Desktop / MCP Client
  ↓
MCP Server
  ↓
┌──────────────────────────────┐
│          MCP Tools           │
│                              │
│  add_application             │
│  list_applications           │
│  update_status               │
│  get_next_actions            │
└──────────────────────────────┘
  ↓
SQLite repository (JSON is an optional fallback)
```

### What to say

> The user sends a natural-language request through Claude Desktop or another MCP client. The model decides which MCP tool is needed and sends the appropriate arguments to the server.
>
> The server validates the input using Zod and works with the local applications JSON file. The project does not depend on external APIs or API keys.

---

# 1:10–3:30 — Live Demo

## Live Prompt 1 — Add an Application

### User prompt

> I just applied to Google for a Frontend Developer role through LinkedIn. Can you log it?

### Expected tool call

```text
add_application
```

### Expected arguments

```json
{
  "company": "Google",
  "role": "Frontend Developer",
  "date_applied": "2026-08-17",
  "status": "applied",
  "source": "linkedin"
}
```

### What to explain

> Here the model recognizes that the user wants to add a new application, so it calls `add_application`.
>
> The tool validates the company, role, date, status, and source before storing the application.

### Expected final response

> Logged it — Google, Frontend Developer, applied today via LinkedIn.

---

## Live Prompt 2 — Filter Applications

### User prompt

> What have I applied to so far that I haven't heard back from?

### Expected tool call

```text
list_applications
```

### Expected arguments

```json
{
  "status": "applied"
}
```

### What to explain

> The model understands that "haven't heard back" corresponds to applications that are still in the `applied` status, so it calls `list_applications` with a status filter.

### Expected result

The server returns the applications that are currently marked as `applied`.

### Expected final response

> You've got 3 applications sitting at "applied" with no response yet: Google, Orion VLSI Technologies, and Exalt Technologies.

---

# Backup Demo — Next Actions

If one of the main live prompts cannot be demonstrated, use Conversation C.

### Backup user prompt

> What should I be doing next on my job search?

### Expected tool call

```text
get_next_actions
```

### Expected arguments

```json
{}
```

### Expected behavior

The tool identifies applications that may require follow-up or other actions.

### Optional follow-up

If the user asks to update an application:

> Yes, update Exalt to interview status.

### Expected tool call

```text
update_status
```

### Expected arguments

```json
{
  "id": "app-002",
  "new_status": "interview"
}
```

---

# 3:30–4:30 — Dashboard and API

### What to say

> The dashboard consumes the REST API and can also run as a hosted demo with in-memory sample data. The same core services power MCP, REST, and dashboard workflows.
>
> Any future integrations would still need to follow the same security and validation principles used in the current project.

### Future improvements

- Show the board and timeline views.
- Switch dark mode and Arabic RTL mode.
- Open the Connect Claude panel.
- Show the generated tool reference at `docs/tool-reference.md`.

---

## Hosted dashboard walkthrough

Open https://jht127.github.io/job-tracker-mcp/ and verify:

- Dashboard overview with populated application cards.
- Timeline view showing status events.
- Contacts view with sample contacts.
- Search and status filtering.
- Dark theme and Arabic RTL layout.
- Claude configuration panel with the local path redacted.

The hosted build uses fictional in-memory data and does not require backend credentials.

# 4:30–5:00 — Questions

### What to say

> That is the main workflow of the Job Application Tracker MCP server. It provides focused tools for adding applications, viewing applications, updating statuses, and identifying next actions while keeping the data local.
>
> Thank you. I'm happy to answer any questions.

---

# Offline Backup Plan

The application data is stored locally in:

```text
data/applications.json
```

The project does not require external APIs or API keys.

If Wi-Fi is unavailable:

1. Start the MCP server locally.
2. Use the local `applications.json` data.
3. Run the prepared prompts through the local MCP setup.
4. If the MCP client cannot be used, open the hosted dashboard demo and explain the expected tool calls.

The backup demonstrates the same core workflow without depending on an external API.

---
