# Peer Review Checklist

## Review Areas

- [x] Zod schemas and input validation
- [x] Error handling
- [x] Secrets and .env
- [x] Data allowlists
- [x] README
- [x] Demo path
- [x] P0 tools

## Peer Reviewer

Dareen Abualhaj

## Review Session

Live testing session via MCP Inspector (job-application-tracker server),
conducted with Shahd Raed, Razan Froukh, Taima Nazzal , Joud Thaher and Dareen Abualhaj — 8/13/2026
(Google Meet, screenshot attached with submission).

## Tool-Level Testing Notes

Tested live via MCP Inspector with Dareen Abualhaj, 8/13/2026
(Google Meet session with Shahd Raed and Razan Froukh also present).

### 1. add_application

- Valid input: company: "Exalt Technologies", role: "Backend",
  date_applied: "2026-08-10", status: "applied", source: "cold_apply"
  → "Application added successfully." New record created with id: "app-004"
- Invalid input: date_applied in wrong format (not YYYY-MM-DD)
  → Tool Error: "Invalid arguments for tool add_application: date_applied:
  Date must be in YYYY-MM-DD format." (rejected by Zod before handler runs)

### 2. list_applications

- Valid input: statusFilter: "applied"
  → Returned 1 matching application (app-003, Exalt Technologies),
  total: 1, truncated: false

### 3. update_status

- Valid input: id: "app-003", status: "offer"
  → Application updated successfully, status field changed to "offer"
- Invalid input: id: "app-005" (non-existent)
  → Error: "No application found with id: app-005"
- Invalid input: id: "" (empty string)
  → Tool Error: "Invalid arguments for tool update_status: id: Too small:
  expected string to have >=1 characters"

### 4. get_next_actions

- Valid input: statusFilter: "offer", limit: 3
  → Returned action: "Follow up with Exalt Technologies" (app-003),
  reason: stale application, 741 days without an update

## Peer Review Feedback (from Dareen)

Overall the P0 tools are working correctly with no critical issues found.
Main recommendations:

- Update README so a new user with no prior knowledge can clone, set up,
  and run the project (setup steps, dependencies, env variables, usage).
- Update application sorting to sort by `date_applied` instead of
  insertion order.
- Confirm `.env` is excluded via `.gitignore` and no secrets are exposed
  in the repository.

## Action Items

| Action                                          | Owner       | Due Date      | Status    |
| ----------------------------------------------- | ----------- | ------------- | --------- |
| Improve README setup and usage instructions     | All members | End of Week 4 | Completed |
| Sort applications by date_applied               | Razan       | End of Week 4 | Completed |
| Reconfirm .env exclusion and no secrets in repo | All members | End of Week 4 | Completed |

## Security Verification

- [x] `.env` excluded via `.gitignore`
- [x] `.env.local` excluded via `.gitignore`
- [x] Repository scanned for API keys, secrets, tokens (`rg` scan, no matches)
- [x] No P0 security issues identified

## Completed Fixes

- Updated README.md with setup, structure, tools, data storage, and
  Inspector verification instructions.
  Commit: https://github.com/JHT127/job-tracker-mcp/commit/baf781f
- Updated `addApplication()` to sort by `date_applied`.
  Commit: https://github.com/JHT127/job-tracker-mcp/commit/fd65d96
- Hardening PR (validation, error handling, SECURITY.md):
  https://github.com/JHT127/job-tracker-mcp/pull/12

## P0 Findings

No P0 or critical security issues identified during peer review.
All action items completed by end of Week 4.
