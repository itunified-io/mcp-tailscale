# Changelog

All notable changes to this project will be documented in this file.
This project uses [Calendar Versioning](https://calver.org/) (`YYYY.MM.DD.TS`).


## v2026.03.14.4

- **Tier 1 Enhancement: OAuth, Users, Webhooks, Tailnet Settings Write** (#7)
  - Add OAuth client credentials auth support (`TAILSCALE_OAUTH_CLIENT_ID` + `TAILSCALE_OAUTH_CLIENT_SECRET`)
  - Add `ITailscaleClient` interface and `client-factory.ts` for dual auth (OAuth > API key)
  - Add user management tools: `tailscale_user_list`, `tailscale_user_get` (+2 tools)
  - Add webhook management tools: `tailscale_webhook_list`, `tailscale_webhook_create`, `tailscale_webhook_get`, `tailscale_webhook_delete` (+4 tools)
  - Add `tailscale_tailnet_settings_update` tool (+1 tool)
  - Total: 35 → 42 tools across 8 domains
  - 149 unit tests (was 110)
  - Update README, CLAUDE.md, api-reference.md, .env.example
  - Add design doc `docs/plans/001-tier1-enhancement.md`

## v2026.03.14.3

- Add acceptance criteria gate to CLAUDE.md PR Workflow (ADR-0017) (#8)

## v2026.03.14.2

- Clarify license: internal/commercial use requires commercial license (#5)

## v2026.03.14.1

- 35 tools across 6 domains: Devices (9), DNS (8), ACL (5), Keys (4), Tailnet (4), Diagnostics (5) (#1)
- TailscaleClient with Bearer token auth, tailnet-scoped API paths, direct JSON responses (#1)
- 6 skills: dns-management, health (/ts-health), device-management, acl-management, key-management, onboarding (#1)
- 110 unit tests with vitest, all passing (#1)
- Zod input validation on all tools, structured error handling with TailscaleApiError (#1)

## v2026.03.13.1

- Initial project scaffold: TailscaleClient, validation schemas, error handling
- Repository setup: package.json, tsconfig, CLAUDE.md, README, SECURITY.md (#1)
