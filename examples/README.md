# Examples

The complete input contract for every MCP tool is generated in [the tool reference](../docs/tool-reference.md). The server currently exposes:

`add_application`, `add_contact`, `add_interview`, `bulk_import`, `delete_application`, `draft_followup_email`, `draft_thank_you`, `export`, `generate_interview_prep`, `get_conversion_stats`, `get_health_score`, `get_next_actions`, `get_reconnect_suggestions`, `get_stale_applications`, `link_contact_to_application`, `list_applications`, `list_contacts`, `list_upcoming_interviews`, `match_cv_to_job`, `parse_job_posting`, `search_applications`, `undo_last_change`, `update_application`, `update_status`, and `weekly_report`.

Use the JSON files in this directory as small request examples. Run `npm run generate:tools` after changing any schema or tool registration.
