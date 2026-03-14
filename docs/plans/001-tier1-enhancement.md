# Design Doc 001: Tier 1 Enhancement — OAuth, Users, Webhooks, Tailnet Settings Write

**Issue:** [#7](https://github.com/itunified-io/mcp-tailscale/issues/7)
**Status:** Accepted
**Date:** 2026-03-14

## Problem

mcp-tailscale currently has 35 tools covering 6 domains (devices, DNS, ACL, keys, tailnet, diagnostics). Several Tailscale API v2 endpoints remain uncovered:

1. **Auth:** Only API key (Bearer token) supported — no OAuth client credentials
2. **Users:** No user management tools (list, get)
3. **Webhooks:** No webhook management tools (CRUD)
4. **Tailnet settings:** Read-only (`tailnet_settings_get`) — no write/update

## Solution

Add OAuth client credentials auth support and 7 new tools across 3 domains, bringing the total from 35 to 42 tools.

### 1. OAuth Client Credentials Auth

**API:** `POST https://api.tailscale.com/api/v2/oauth/token`

Add a new `TailscaleOAuthClient` that extends or wraps the existing `TailscaleClient`:

```
src/client/
  tailscale-client.ts       # Existing — API key Bearer auth
  tailscale-oauth-client.ts # New — OAuth client credentials
  client-factory.ts         # New — selects client based on env vars
  types.ts                  # Updated — add OAuth types
```

**Environment variables:**
- `TAILSCALE_OAUTH_CLIENT_ID` — OAuth client ID
- `TAILSCALE_OAUTH_CLIENT_SECRET` — OAuth client secret
- `TAILSCALE_OAUTH_SCOPES` — comma-separated scopes (optional, default: all)

**Logic:**
1. On startup, `client-factory.ts` checks for OAuth env vars first, then API key
2. If OAuth: create `TailscaleOAuthClient` which auto-fetches token, caches it, auto-refreshes before expiry
3. If API key: create existing `TailscaleClient` (no change)
4. Both implement the same interface — tools don't know which auth is in use

**Token flow:**
```
POST /api/v2/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={TAILSCALE_OAUTH_CLIENT_ID}
&client_secret={TAILSCALE_OAUTH_CLIENT_SECRET}

Response: { access_token, token_type, expires_in, scope }
```

**Token refresh:** Cache token, refresh when `expires_in` minus 60s buffer is reached.

### 2. User Management (+2 tools)

**New file:** `src/tools/users.ts`

| Tool | Method | Endpoint | Parameters |
|------|--------|----------|------------|
| `tailscale_user_list` | GET | `/tailnet/{tailnet}/users` | `type?` (member, shared), `role?` (owner, admin, member, etc.) |
| `tailscale_user_get` | GET | `/users/{userId}` | `userId` (required) |

**Types to add to `types.ts`:**
```typescript
interface TailscaleUser {
  id: string;
  displayName: string;
  loginName: string;
  profilePicURL: string;
  tailnetId: string;
  created: string;
  type: "member" | "shared";
  role: "owner" | "admin" | "member" | "auditor" | "it-admin" | "network-admin" | "billing-admin";
  status: "active" | "idle" | "suspended";
  deviceCount: number;
  lastSeen: string;
  currentlyConnected: boolean;
}
```

### 3. Webhook Management (+4 tools)

**New file:** `src/tools/webhooks.ts`

| Tool | Method | Endpoint | Parameters |
|------|--------|----------|------------|
| `tailscale_webhook_list` | GET | `/tailnet/{tailnet}/webhooks` | — |
| `tailscale_webhook_create` | POST | `/tailnet/{tailnet}/webhooks` | `endpointUrl`, `providerType?` (slack, mattermost, googlechat, discord, generic), `subscriptions` (event types array) |
| `tailscale_webhook_get` | GET | `/webhooks/{webhookId}` | `webhookId` |
| `tailscale_webhook_delete` | DELETE | `/webhooks/{webhookId}` | `webhookId`, `confirm: true` |

**Types to add:**
```typescript
interface TailscaleWebhook {
  endpointId: string;
  endpointUrl: string;
  providerType: "slack" | "mattermost" | "googlechat" | "discord" | "generic";
  creatorId: string;
  created: string;
  lastModified: string;
  subscriptions: TailscaleWebhookSubscription[];
  secret?: string; // Only returned on create
}

interface TailscaleWebhookSubscription {
  type: string; // e.g., "nodeCreated", "nodeDeleted", "nodeApproved", "policyUpdate", "userCreated", "userDeleted"
}
```

**Webhook event types:** `nodeCreated`, `nodeApproved`, `nodeNeedsApproval`, `nodeKeyExpiringInOneDay`, `nodeKeyExpired`, `nodeDeleted`, `policyUpdate`, `userCreated`, `userDeleted`, `userApproved`, `userSuspended`, `userRestored`, `userRoleUpdated`, `subnetIPForwardingNotEnabled`, `exitNodeIPForwardingNotEnabled`.

### 4. Tailnet Settings Write (+1 tool)

**Modify:** `src/tools/tailnet.ts`

| Tool | Method | Endpoint | Parameters |
|------|--------|----------|------------|
| `tailscale_tailnet_settings_update` | PATCH | `/tailnet/{tailnet}/settings` | Partial settings object, `confirm: true` |

**Settable fields:**
```typescript
interface TailnetSettingsUpdate {
  devicesApprovalOn?: boolean;
  devicesAutoUpdatesOn?: boolean;
  devicesKeyDurationDays?: number;
  usersApprovalOn?: boolean;
  usersRoleAllowedToJoinExternalTailnets?: string;
  networkFlowLoggingOn?: boolean;
  regionalRoutingOn?: boolean;
  postureIdentityCollectionOn?: boolean;
}
```

## File Changes Summary

| Action | Path | Description |
|--------|------|-------------|
| Create | `src/client/tailscale-oauth-client.ts` | OAuth client credentials client |
| Create | `src/client/client-factory.ts` | Client selection logic |
| Create | `src/tools/users.ts` | User management tools (2) |
| Create | `src/tools/webhooks.ts` | Webhook management tools (4) |
| Modify | `src/tools/tailnet.ts` | Add `tailscale_tailnet_settings_update` |
| Modify | `src/client/types.ts` | Add User, Webhook, OAuth types |
| Modify | `src/client/tailscale-client.ts` | Extract interface for client factory |
| Modify | `src/index.ts` | Register new tools, use client factory |
| Modify | `src/utils/validation.ts` | Add user ID, webhook ID schemas |
| Create | `tests/tools/users.test.ts` | User tool unit tests |
| Create | `tests/tools/webhooks.test.ts` | Webhook tool unit tests |
| Modify | `tests/tools/tailnet.test.ts` | Add settings update tests |
| Create | `tests/client/oauth-client.test.ts` | OAuth client unit tests |
| Modify | `docs/api-reference.md` | Add new endpoint mappings |
| Modify | `README.md` | Update tool count (35→42), add domains |
| Modify | `.env.example` | Add OAuth env vars |

## Implementation Order

1. **OAuth client** — foundational auth change, no new tools, all existing tools benefit
2. **Users** — simplest new domain (2 read-only tools)
3. **Webhooks** — 4 tools including destructive delete
4. **Tailnet settings write** — single tool addition to existing domain

Each step is a separate PR with its own tests.

## Prerequisites

- Tailscale OAuth client created at [Tailscale Admin Console](https://login.tailscale.com/admin/settings/oauth)
- OAuth client needs appropriate scopes for user/webhook management

## Rollback

Each PR is independent. Rollback = revert the specific PR merge commit.

OAuth is additive (API key still works). New tools are additive (existing tools unchanged).

## Verification

- `npm test` — all unit tests pass
- `npm run build` — clean TypeScript compilation
- `/ts-test` — live test skill covers all 42 tools
- Manual: verify OAuth token refresh works (set short expiry, observe auto-refresh)

## Post-Implementation

- Update `docs/testing/mcp-live-test-plans.md` in infrastructure repo
- Update infrastructure CLAUDE.md tool count (35→42)
- Tag release with CalVer
