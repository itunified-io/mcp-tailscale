# mcp-tailscale — CLAUDE.md

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Code Conventions](#code-conventions)
- [Security](#security)
- [Design/Plan Documents — MANDATORY](#designplan-documents--mandatory)
- [CHANGELOG.md — MANDATORY](#changelogmd--mandatory)
- [Versioning & Releases (CalVer)](#versioning--releases-calver)
- [Git Workflow](#git-workflow)
- [Language](#language)
- [Development Setup](#development-setup)
- [Testing](#testing)

## Project Overview

Slim Tailscale MCP Server for managing devices, DNS/Split DNS, ACL policies, auth keys, users, webhooks, and tailnet settings via Tailscale API v2.

**No SSH. No shell execution. API-only. 3 runtime dependencies.**

## Architecture

```
src/
  index.ts                   # MCP Server entry point (stdio transport only)
  client/
    tailscale-client.ts      # Axios HTTP client (API key Bearer token auth)
    tailscale-oauth-client.ts # OAuth client credentials auth (auto-refresh)
    client-factory.ts        # Client selection (OAuth > API key) from env vars
    types.ts                 # Tailscale API v2 response types + ITailscaleClient interface
  tools/
    devices.ts               # Device management tools (9 tools)
    dns.ts                   # DNS nameservers, search paths, split DNS, preferences (8 tools)
    acl.ts                   # ACL policy management (5 tools)
    keys.ts                  # Auth key management (4 tools)
    tailnet.ts               # Tailnet settings (read/write), contacts, lock status (5 tools)
    users.ts                 # User management tools (2 tools)
    webhooks.ts              # Webhook management tools (4 tools)
    diagnostics.ts           # Status, API verify, log streaming, DERP map (5 tools)
  utils/
    validation.ts            # Shared Zod schemas (device IDs, CIDR, domains, etc.)
    errors.ts                # Tailscale error extraction and TailscaleApiError
tests/                       # Vitest unit tests
docs/
  plans/                     # Design/plan documents
  api-reference.md           # Tailscale API v2 endpoint mapping
```

## Code Conventions

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig.json)
- All tool parameters validated with Zod schemas
- Generically typed API client (`get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`, `deleteVoid()`, `postVoid()`)
- No `any` types — use `unknown` and narrow

### Tool Design
- **Granular tools**: one MCP tool per operation (e.g., `tailscale_device_routes_set`)
- Tool naming: `tailscale_<domain>_<action>`
- Each tool has its own Zod input schema and clear description
- Destructive operations require `confirm: true` parameter
- Response format: always `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }`

### Tailscale API Specifics
- Auth: Bearer token (API key), not Global API Key
- Base URL: `https://api.tailscale.com/api/v2`
- Response format: Direct JSON — no `{ success, errors, result }` wrapper
- Tailnet required: Most endpoints use `/tailnet/{tailnet}/` prefix
- Device endpoints: `/device/{deviceId}/` (not tailnet-scoped)

### Dependencies
- **3 runtime dependencies only**: `@modelcontextprotocol/sdk`, `axios`, `zod`
- No SSH libraries, no Redis, no PostgreSQL
- Dev: `typescript`, `vitest`, `@types/node`

## Security

- **Transport**: stdio only (no SSE, no HTTP endpoint)
- **Authentication**: API Key exclusively via environment variables. Never hardcoded, logged, or committed.
- **No SSH**: Exclusively Tailscale REST API v2
- **Input validation**: Zod schemas for all tool parameters
- **Error handling**: No credential leaks in error messages (Bearer token never appears in logs or errors)
- **Credentials**: Never hardcoded, never logged, never in git
- **Secret Redaction — MANDATORY**: When using `grep`, `cat`, `sed`, `awk`, shell scripts, or any tool that reads/displays file contents containing secrets (`.env`, credentials, API keys, tokens, passwords), **ALWAYS redact the secret values** in output. Never display raw secret values in terminal output, logs, conversation context, or commit messages.
- **Public Repo Documentation Policy — MANDATORY**: This is a **public repository**. All documentation, code examples, test data, and commit messages MUST use only generic placeholders:
  - Tailnet names: `your-tailnet-name`, `example.com`
  - Device IDs: `123456789`
  - API keys: `your-api-key-here`, `tskey-api-test`
  - Emails: `admin@example.com`, `user@example.com`
  - IPs: `100.64.0.1`, `10.0.0.0/8` (Tailscale CGNAT range is acceptable as generic example)
  - **NEVER** include real tailnet names, device IDs, API keys, or internal topology
  - Infrastructure-specific documentation belongs in the private `itunified-io/infrastructure` repo

## Design/Plan Documents — MANDATORY

- **Every significant change MUST have a design/plan document** in `docs/plans/`
- Naming: `docs/plans/<NNN>-<short-description>.md`
- The design doc MUST be referenced in the corresponding GitHub issue (bidirectional link)
- Design docs contain: problem, solution, prerequisites, execution steps, rollback, verification
- Trivial changes (typos, minor doc updates) are exempt

## CHANGELOG.md — MANDATORY

- **`CHANGELOG.md` MUST exist and MUST be kept up to date**
- **Every PR merge MUST add a new entry** before tagging/releasing
- Format: CalVer date header (`## v2026.03.13.1`) followed by a list of changes with issue references
- Never skip CHANGELOG updates — they are the source of truth for what changed and when

## Versioning & Releases (CalVer)

- Schema: `YYYY.MM.DD.TS` (e.g., `2026.03.13.1`)
- `package.json`: npm-compatible without leading zeros (`2026.3.13`)
- Git tags: `v2026.03.13.1` (leading zeros for sorting)

### Release Workflow — MANDATORY after every PR merge
1. **Update CHANGELOG.md** with new version entry
2. Update `package.json` version if date changed
3. Create annotated git tag: `git tag -a v2026.03.13.1 -m "v2026.03.13.1: <summary>"`
4. Push tag: `git push origin --tags`
5. Create GitHub release: `gh release create v2026.03.13.1 --title "v2026.03.13.1 — <title>" --notes "<release notes>"`
6. Release notes must list what changed and reference closed issues

## Git Workflow

- **NEVER work on main** — all changes via feature branches + PR
- **Branching**: `feature/<issue-nr>-<description>`, `fix/<issue-nr>-<description>`, `chore/<description>`
- **Worktree naming**: `.claude/worktrees/<branch-name>`
- **GitHub Issues mandatory**: every change must have an associated GH issue
- **Commit messages**: must reference GH issue — `feat: add device posture tools (#3)` or `fix: handle 404 on device delete (#5)`
- **No commit without issue reference** (exceptions: initial setup, typo fixes)
- **PR workflow**: feature branch -> `gh pr create` -> review -> merge into main
- **Acceptance Criteria Gate — MANDATORY** (see [ADR-0017](https://github.com/itunified-io/infrastructure/blob/main/docs/adr/0017-acceptance-criteria-before-merge.md)):
  - All acceptance criteria in the associated GH issue MUST be checked and verified as successful before merge to `main`
  - Verification is active: criteria must be actually tested, not assumed to pass
  - Includes: tests pass (`npm test`), build succeeds (`npm run build`), live tests pass (`/ts-test`), CHANGELOG updated, docs updated
  - If any criterion cannot be satisfied, the PR must NOT be merged
- **After PR merge: branch/worktree cleanup is mandatory** — `git branch -d <branch>`, `git remote prune origin`, remove worktree

### Bug Fixes — MANDATORY Workflow
- **Every bug fix MUST have a GitHub issue** with appropriate labels (`bug`, scope labels)
- Issue-first: create issue → branch (`fix/<issue-nr>-<description>`) → fix → PR → merge
- Bug fix commits must reference the issue: `fix: <description> (#<nr>)`
- CHANGELOG entry required for every bug fix

## Language

- All documentation, code comments, commit messages: **English only**

## Development Setup

```bash
# Prerequisites: Node.js >= 20, npm

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Tailscale API key and tailnet name

# Build
npm run build

# Test
npm test

# Run (stdio transport)
node dist/index.js
```

## Testing

- Unit tests with vitest (mocked API responses)
- Zod schema validation for invalid inputs
- Error handling for API errors (401, 403, 404, 500)
- Run: `npm test`
