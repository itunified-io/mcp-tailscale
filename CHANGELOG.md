# Changelog

All notable changes to this project will be documented in this file.
This project uses [Calendar Versioning](https://calver.org/) (`YYYY.MM.DD.TS`).


## v2026.03.16.4

- **Add pre-publish security scan** (#39)
  - Add `scripts/prepublish-check.js` — blocks `npm publish` if forbidden files (`.mcpregistry_*`, `.env`, `.pem`, `.key`, `credentials`) are in the tarball
  - Add `prepublishOnly` npm hook: build + test + security scan before every publish
  - Update `.npmignore` with comprehensive security exclusions
  - Implements ADR-0026

## v2026.03.16.3

- **Plugin API: extract `createServer()` factory for enterprise extensibility** (#37)
  - Add `src/types.ts` with `ToolHandler`, `ToolMiddleware`, and `ToolResult` types
  - Add `src/server.ts` with `createServer()` factory supporting optional middleware
  - Refactor `src/index.ts` to use `createServer()` internally (zero behavior change)
  - Add `exports` map to `package.json` for subpath imports (`/server`, `/types`, `/client/*`, `/utils/*`, `/transport`)
  - Add design doc `docs/plans/003-plugin-api.md`
  - 199 unit tests (was 188)

## v2026.03.16.2

- Add ADR-0024 reference to `.gitignore` and MCP Registry Tokens entry to CLAUDE.md security section (#35)

## v2026.03.16.1

- Register on official MCP Registry as `io.github.itunified-io/tailscale` (#12)
- Add `server.json` metadata for MCP registry publishing
- Add `mcpName` field to package.json for registry validation
- Bump version to `2026.3.16`, publish `tailscale-mcp@2026.3.16` to npm
- Add `.mcpregistry_*` to `.gitignore`

## v2026.03.15.5

- Publish to npm as `tailscale-mcp`, add `.npmignore`, `bin` entry, expanded keywords (#12)
- Rename package from `@itunified/mcp-tailscale` to `tailscale-mcp` (npm free org cannot publish public scoped packages)
- Update package.json version to `2026.3.15`, description aligned with product positioning

## v2026.03.15.4

- Add product positioning docs: restructured README, ROADMAP.md, ARCHITECTURE.md, PRODUCT_PACKAGING.md (#29)

## v2026.03.15.3

- Switch Glama badge from score to card format (#11)

## v2026.03.15.2

- Add Glama registry badge to README (#11)

## v2026.03.15.1

- fix: use `/acl/validate` endpoint for `acl_test` tool — nonexistent `/acl/test` returned 404 (#17)
- fix: remove unsupported `"generic"` webhook provider type, make `providerType` optional (#18)

## v2026.03.14.9

- Add skill documentation to README and `.claude/skills/README.md` per ADR-0022 (#23)

## v2026.03.14.8

- Add `docs/superpowers/` to `.gitignore` per ADR-0021 (#21)

## v2026.03.14.7

- Update design doc 001 status from Draft to Accepted (#19)

## v2026.03.14.6

- **Tier 2 Enhancement: HTTP/SSE transport with Bearer token auth** (#14)
  - Add SSE transport as opt-in alternative to stdio (`TAILSCALE_MCP_TRANSPORT=sse`)
  - Mandatory `TAILSCALE_MCP_AUTH_TOKEN` for SSE — server refuses to start without it
  - Timing-safe token comparison via `crypto.timingSafeEqual()`
  - Add `express` dependency (runtime deps: 3 → 4)
  - 188 unit tests (was 178)
  - Design doc: `docs/plans/002-tier2-enhancement.md`

## v2026.03.14.5

- **Tier 2 Enhancement: Device expire/rename + posture integration tools** (#13)
  - Add `tailscale_device_expire` — force device key expiry (+1 tool)
  - Add `tailscale_device_rename` — set device display name (+1 tool)
  - Add posture integration tools: `tailscale_posture_integration_list`, `tailscale_posture_integration_get`, `tailscale_posture_integration_create`, `tailscale_posture_integration_delete` (+4 tools)
  - Total: 42 → 48 tools across 9 domains
  - 178 unit tests (was 158)
  - Design doc: `docs/plans/002-tier2-enhancement.md`

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
