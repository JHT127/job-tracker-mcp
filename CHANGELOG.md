# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-29

### Added

- MCP tools for applications, contacts, interviews, insights, reporting, imports, and exports.
- SQLite and JSON storage with migration, history, undo, duplicate warnings, and concurrency protection.
- Streamable HTTP MCP transport and REST API with validation, rate limiting, OpenAPI, and webhooks.
- Configurable tracker types, structured redacted logging, integrations, Docker packaging, and dashboard support.
- Generated MCP tool reference and release documentation.

### Security

- Added API-key authentication support, secret redaction, SSRF protections for job-posting fetches, and non-root container packaging.
