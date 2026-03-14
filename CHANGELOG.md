# Changelog

All notable changes to this project will be documented in this file.
This project uses [Calendar Versioning](https://calver.org/) (`YYYY.MM.DD.TS`).


## v2026.03.14.1

- 35 tools across 6 domains: Devices (9), DNS (8), ACL (5), Keys (4), Tailnet (4), Diagnostics (5) (#1)
- TailscaleClient with Bearer token auth, tailnet-scoped API paths, direct JSON responses (#1)
- 6 skills: dns-management, health (/ts-health), device-management, acl-management, key-management, onboarding (#1)
- 110 unit tests with vitest, all passing (#1)
- Zod input validation on all tools, structured error handling with TailscaleApiError (#1)

## v2026.03.13.1

- Initial project scaffold: TailscaleClient, validation schemas, error handling
- Repository setup: package.json, tsconfig, CLAUDE.md, README, SECURITY.md (#1)
