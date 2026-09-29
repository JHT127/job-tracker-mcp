# MCP Tool Reference

Generated from the live MCP server schemas. Run `npm run generate:tools` after changing a tool contract.

Tool count: **25**

### `add_application`

Add a new job application record to the tracker.

| Input            | Type       | Required  | Notes                                       |
| ---------------- | ---------- | :-------: | ------------------------------------------- |
| `company`        | string     |    yes    | Company name where the user applied.        |
| `role`           | string     |    yes    | Job title or position the user applied for. |
| `date_applied`   | string     |    yes    | Application date in YYYY-MM-DD format.      |
| `status`         | applied    | interview | offer                                       | rejected        | no_response | no  | Current application status.          |
| `source`         | cold_apply | linkedin  | referral                                    | company_website | career_fair | no  | Where the application was submitted. |
| `notes`          | string     |    no     | Optional notes about this application.      |
| `salary`         | string     |    no     |                                             |
| `location`       | string     |    no     |                                             |
| `work_mode`      | remote     |  hybrid   | onsite                                      | no              |             |
| `job_url`        | string     |    no     |                                             |
| `priority`       | low        |  normal   | high                                        | no              |             |
| `tags`           | array      |    no     |                                             |
| `deadline`       | string     |    no     |                                             |
| `resume_version` | string     |    no     |                                             |

### `add_contact`

Adds a recruiter or networking contact to the tracker.

| Input               | Type   | Required | Notes |
| ------------------- | ------ | :------: | ----- |
| `person`            | string |   yes    |       |
| `company`           | string |   yes    |       |
| `linkedin`          | string |    no    |       |
| `last_message_date` | string |    no    |       |
| `notes`             | string |    no    |       |

### `add_interview`

Schedules an interview for an existing application.

| Input            | Type   | Required  | Notes      |
| ---------------- | ------ | :-------: | ---------- |
| `application_id` | string |    yes    |            |
| `date`           | string |    yes    |            |
| `type`           | phone  | technical | behavioral | onsite | other | yes |     |
| `interviewer`    | string |    no     |            |
| `prep_notes`     | string |    no     |            |

### `bulk_import`

Validates a bounded CSV export and imports valid application rows.

| Input | Type   | Required | Notes |
| ----- | ------ | :------: | ----- |
| `csv` | string |   yes    |       |

### `delete_application`

Permanently deletes an application after the user confirms by setting confirm to true.

| Input     | Type    | Required | Notes                                                   |
| --------- | ------- | :------: | ------------------------------------------------------- |
| `id`      | string  |   yes    | The unique ID of the application to delete.             |
| `confirm` | boolean |    no    | Set to true after the user confirms permanent deletion. |

### `draft_followup_email`

Drafts a follow-up message from an application and optional linked contact.

| Input            | Type   | Required | Notes |
| ---------------- | ------ | :------: | ----- |
| `application_id` | string |   yes    |       |
| `contact_id`     | string |    no    |       |

### `draft_thank_you`

Drafts a thank-you message for an interview conversation.

| Input            | Type   | Required | Notes |
| ---------------- | ------ | :------: | ----- |
| `application_id` | string |   yes    |       |
| `interviewer`    | string |    no    |       |

### `export`

Exports applications as JSON, Markdown, or CSV with optional status filtering.

| Input    | Type    | Required  | Notes |
| -------- | ------- | :-------: | ----- |
| `format` | json    | markdown  | csv   | no       |             |
| `status` | applied | interview | offer | rejected | no_response | no  |     |
| `limit`  | integer |    no     |       |

### `generate_interview_prep`

Creates a role-specific checklist and STAR prompts for an application.

| Input            | Type   | Required | Notes |
| ---------------- | ------ | :------: | ----- |
| `application_id` | string |   yes    |       |

### `get_conversion_stats`

Calculates response and interview conversion rates by application source.

| Input  | Type | Required | Notes            |
| ------ | ---- | :------: | ---------------- |
| _none_ | -    |    -     | No input fields. |

### `get_health_score`

Returns a deterministic 0–100 tracker score with human-readable reasons.

| Input  | Type | Required | Notes            |
| ------ | ---- | :------: | ---------------- |
| _none_ | -    |    -     | No input fields. |

### `get_next_actions`

Returns prioritized next actions for stale applications and recent status changes.

| Input    | Type    | Required  | Notes                                              |
| -------- | ------- | :-------: | -------------------------------------------------- |
| `limit`  | integer |    no     | Optional maximum number of next actions to return. |
| `status` | applied | interview | offer                                              | rejected | no_response | no  | Optional status filter for the returned actions. |

### `get_reconnect_suggestions`

Suggests contacts with no message or no recent message.

| Input            | Type    | Required | Notes |
| ---------------- | ------- | :------: | ----- |
| `days_threshold` | integer |    no    |       |
| `limit`          | integer |    no    |       |

### `get_stale_applications`

Lists active applications without an update for the requested number of days.

| Input            | Type    | Required  | Notes |
| ---------------- | ------- | :-------: | ----- |
| `days_threshold` | integer |    no     |       |
| `status`         | applied | interview | offer | rejected | no_response | no  |     |
| `limit`          | integer |    no     |       |

### `link_contact_to_application`

Associates a contact with an existing application.

| Input            | Type   | Required | Notes |
| ---------------- | ------ | :------: | ----- |
| `contact_id`     | string |   yes    |       |
| `application_id` | string |   yes    |       |

### `list_applications`

Lists job applications, optionally filtered by status. Returns at most 50 applications.

| Input    | Type    | Required  | Notes |
| -------- | ------- | :-------: | ----- |
| `status` | applied | interview | offer | rejected | no_response | no  | Optional application status to filter the returned applications. If omitted, all applications are returned. |

### `list_contacts`

Lists contacts with an optional company filter and bounded limit.

| Input     | Type    | Required | Notes |
| --------- | ------- | :------: | ----- |
| `company` | string  |    no    |       |
| `limit`   | integer |    no    |       |

### `list_upcoming_interviews`

Lists interviews within a bounded upcoming date window.

| Input        | Type    | Required | Notes |
| ------------ | ------- | :------: | ----- |
| `days_ahead` | integer |    no    |       |
| `limit`      | integer |    no    |       |

### `match_cv_to_job`

Compares CV and job text with deterministic skill matching and reports gaps/keywords.

| Input             | Type   | Required | Notes |
| ----------------- | ------ | :------: | ----- |
| `cv_text`         | string |   yes    |       |
| `job_description` | string |   yes    |       |

### `parse_job_posting`

Extracts role details from supplied text or a bounded HTTPS URL; may add an application when requested.

| Input                | Type    | Required | Notes |
| -------------------- | ------- | :------: | ----- |
| `text`               | string  |    no    |       |
| `url`                | string  |    no    |       |
| `create_application` | boolean |    no    |       |
| `date_applied`       | string  |    no    |       |

### `search_applications`

Searches applications by company or role keyword. Read-only.

| Input   | Type   | Required | Notes |
| ------- | ------ | :------: | ----- |
| `query` | string |   yes    |       |

### `undo_last_change`

Restores the previous editable state of an application.

| Input | Type   | Required | Notes |
| ----- | ------ | :------: | ----- |
| `id`  | string |   yes    |       |

### `update_application`

Updates any editable field on an existing application.

| Input            | Type       | Required  | Notes    |
| ---------------- | ---------- | :-------: | -------- |
| `id`             | string     |    yes    |          |
| `company`        | string     |    no     |          |
| `role`           | string     |    no     |          |
| `date_applied`   | string     |    no     |          |
| `status`         | applied    | interview | offer    | rejected        | no_response | no  |     |
| `source`         | cold_apply | linkedin  | referral | company_website | career_fair | no  |     |
| `notes`          | string     |    no     |          |
| `salary`         | string     |    no     |          |
| `location`       | string     |    no     |          |
| `work_mode`      | remote     |  hybrid   | onsite   | no              |             |
| `job_url`        | string     |    no     |          |
| `priority`       | low        |  normal   | high     | no              |             |
| `tags`           | array      |    no     |          |
| `deadline`       | string     |    no     |          |
| `resume_version` | string     |    no     |          |

### `update_status`

Updates the status of an existing application. Use when the user reports a change (interview, rejection, offer).

| Input        | Type    | Required  | Notes                                       |
| ------------ | ------- | :-------: | ------------------------------------------- |
| `id`         | string  |    yes    | The unique ID of the application to update. |
| `new_status` | applied | interview | offer                                       | rejected | no_response | yes | The new status to set for this application (e.g.rejection). |

### `weekly_report`

Summarizes recent applications, status changes, deadlines, and pipeline health.

| Input  | Type | Required | Notes            |
| ------ | ---- | :------: | ---------------- |
| _none_ | -    |    -     | No input fields. |
