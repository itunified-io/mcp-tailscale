# Design Doc 002: Tier 2 Enhancement — Device Expire/Rename, Posture Integrations, HTTP/SSE Transport

**Issue:** #13 (tools, 42→48), #14 (SSE transport)
**Status:** Accepted
**Date:** 2026-03-14

## Problem

mcp-tailscale has 42 tools after Tier 1 (OAuth, users, webhooks, tailnet settings write). Several API gaps and architectural limitations remain:

1. **Device writes:** Missing `expire` and `rename` operations — two common device management tasks
2. **Posture integrations:** No tools for managing third-party posture provider integrations (CrowdStrike, Intune, Jamf, etc.)
3. **Transport:** stdio-only — no HTTP/SSE for web-based or remote MCP clients

## Solution

Two separate PRs:

### PR 1: Tools (42→48 tools)

Add 6 new tools across 2 areas: device management (+2) and posture integrations (+4).

### PR 2: Transport

Add HTTP/SSE as an opt-in transport with mandatory Bearer token auth.

---

## PR 1: New Tools

### 1.1 Device Expire (+1 tool)

**Tool:** `tailscale_device_expire`
**API:** `POST /device/{deviceId}/key`
**Body:** `{ "keyExpiryDisabled": false }`

Forces a device's key to expire, requiring the device to re-authenticate. Useful for revoking access without deleting the device.

> **Note:** The same endpoint can disable key expiry (`keyExpiryDisabled: true`), but this tool intentionally only supports expiring keys as a safety measure. Re-enabling key expiry (making keys never expire) is excluded by design and would require a separate tool if needed.

**Zod schema:**
```typescript
const DeviceExpireSchema = z.object({
  deviceId: DeviceIdSchema,
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to expire a device key" }),
  }),
});
```

**Tool definition:**
```typescript
{
  name: "tailscale_device_expire",
  description: "Expire a device's key, forcing it to re-authenticate. The device remains in the tailnet but loses connectivity until re-authenticated. Requires confirm: true.",
  inputSchema: {
    type: "object",
    properties: {
      deviceId: { type: "string", description: "Tailscale device ID" },
      confirm: { type: "boolean", description: "Must be true to confirm key expiry" },
    },
    required: ["deviceId", "confirm"],
  },
}
```

**Handler:**
```typescript
case "tailscale_device_expire": {
  const parsed = DeviceExpireSchema.parse(args);
  await client.postVoid(`/device/${parsed.deviceId}/key`, {
    keyExpiryDisabled: false,
  });
  return {
    content: [{ type: "text", text: JSON.stringify({ expired: true, deviceId: parsed.deviceId }, null, 2) }],
  };
}
```

### 1.2 Device Rename (+1 tool)

**Tool:** `tailscale_device_rename`
**API:** `POST /device/{deviceId}/name`
**Body:** `{ "name": "<new-name>" }`

Sets a custom device name (the "given name" in Tailscale). Does not change the hostname.

**Zod schema:**
```typescript
const DeviceRenameSchema = z.object({
  deviceId: DeviceIdSchema,
  name: z.string().min(1, "Device name is required").max(255, "Device name too long"),
});
```

**Tool definition:**
```typescript
{
  name: "tailscale_device_rename",
  description: "Set a custom display name for a device. This changes the device's 'given name' in Tailscale, not the machine hostname.",
  inputSchema: {
    type: "object",
    properties: {
      deviceId: { type: "string", description: "Tailscale device ID" },
      name: { type: "string", description: "New display name for the device" },
    },
    required: ["deviceId", "name"],
  },
}
```

**Handler:**
```typescript
case "tailscale_device_rename": {
  const parsed = DeviceRenameSchema.parse(args);
  await client.postVoid(`/device/${parsed.deviceId}/name`, {
    name: parsed.name,
  });
  return {
    content: [{ type: "text", text: JSON.stringify({ renamed: true, deviceId: parsed.deviceId, name: parsed.name }, null, 2) }],
  };
}
```

### 1.3 Posture Integration Management (+4 tools)

**New file:** `src/tools/posture.ts`

> **Deferred:** `tailscale_posture_integration_update` (PATCH) is excluded from this tier. While useful for secret rotation, excluding it keeps the CRUD pattern consistent with `webhooks.ts` (which also has no update tool). Can be added in a future enhancement if needed.

**Handler signature:**
```typescript
export async function handlePostureTool(
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
): Promise<{ content: Array<{ type: "text"; text: string }> }>
```

New types in `src/client/types.ts`:

```typescript
export interface PostureIntegration {
  id: string;
  provider: string;
  cloudId?: string;
  clientId?: string;
  tenantId?: string;
  created: string;
  lastModified: string;
}

export interface PostureIntegrationListResponse {
  integrations: PostureIntegration[];
}

export interface PostureIntegrationCreateRequest {
  provider: string;
  cloudId?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}
```

#### Tool: `tailscale_posture_integration_list`

**API:** `GET /tailnet/{tailnet}/posture/integrations`

Lists all configured third-party posture integrations (CrowdStrike, Intune, Jamf, Sentinelone, etc.).

```typescript
const PostureIntegrationListSchema = z.object({});
```

#### Tool: `tailscale_posture_integration_get`

**API:** `GET /tailnet/{tailnet}/posture/integrations/{integrationId}`

Gets details for a specific posture integration.

```typescript
const PostureIntegrationGetSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
});
```

#### Tool: `tailscale_posture_integration_create`

**API:** `POST /tailnet/{tailnet}/posture/integrations`

Creates a new posture provider integration. The required fields depend on the provider.

```typescript
// Note: verify provider list against current Tailscale API v2 docs at implementation time.
// "crowdstrike" and "falcon" may be aliases — confirm both are still valid.
const POSTURE_PROVIDERS = [
  "crowdstrike", "falcon", "intune", "jamfPro",
  "kandji", "kolide", "sentinelone",
] as const;

const PostureIntegrationCreateSchema = z.object({
  provider: z.enum(POSTURE_PROVIDERS),
  cloudId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  tenantId: z.string().optional(),
});
```

#### Tool: `tailscale_posture_integration_delete`

**API:** `DELETE /tailnet/{tailnet}/posture/integrations/{integrationId}`

Deletes a posture integration. Requires `confirm: true`.

```typescript
const PostureIntegrationDeleteSchema = z.object({
  integrationId: z.string().min(1, "Integration ID is required"),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "confirm must be true to delete a posture integration" }),
  }),
});
```

### 1.4 File Changes — PR 1

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/tools/devices.ts` | Add `tailscale_device_expire` and `tailscale_device_rename` (2 tools) |
| Create | `src/tools/posture.ts` | Posture integration management (4 tools) |
| Modify | `src/client/types.ts` | Add `PostureIntegration`, `PostureIntegrationListResponse`, `PostureIntegrationCreateRequest` |
| Modify | `src/index.ts` | Register posture tool definitions and handler |
| Modify | `tests/tools/devices.test.ts` | Add expire + rename tests |
| Create | `tests/tools/posture.test.ts` | Posture integration tool tests |
| Modify | `docs/api-reference.md` | Add 6 new tool-to-endpoint mappings |
| Modify | `README.md` | Update tool count (42→48), add posture domain |
| Modify | `CHANGELOG.md` | Add version entry |

### 1.5 Test Plan — PR 1

**Device tests (extend `devices.test.ts`):**
- `tailscale_device_expire`: success, requires confirm, handles API errors
- `tailscale_device_rename`: success, requires non-empty name, rejects too-long name, handles API errors

**Posture tests (new `posture.test.ts`):**
- Tool definitions: count (4), naming prefix (`tailscale_posture_integration_`), descriptions, input schemas
- `tailscale_posture_integration_list`: success, handles API errors
- `tailscale_posture_integration_get`: success, requires integrationId, handles API errors
- `tailscale_posture_integration_create`: success, validates provider enum, handles API errors
- `tailscale_posture_integration_delete`: success, requires confirm, requires integrationId, handles API errors
- Unknown tool: returns unknown message

---

## PR 2: HTTP/SSE Transport

### 2.1 Transport Selection

**Env vars:**
| Variable | Default | Description |
|----------|---------|-------------|
| `TAILSCALE_MCP_TRANSPORT` | `stdio` | Transport mode: `stdio` or `sse` |
| `TAILSCALE_MCP_PORT` | `3000` | HTTP server port (SSE mode only) |
| `TAILSCALE_MCP_HOST` | `localhost` | HTTP server bind address (SSE mode only) |
| `TAILSCALE_MCP_AUTH_TOKEN` | — | **Required** for SSE mode. Bearer token for auth. |

### 2.2 Startup Logic

```typescript
async function main() {
  const transportMode = process.env.TAILSCALE_MCP_TRANSPORT || "stdio";

  if (transportMode === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } else if (transportMode === "sse") {
    const authToken = process.env.TAILSCALE_MCP_AUTH_TOKEN;
    if (!authToken) {
      console.error("TAILSCALE_MCP_AUTH_TOKEN is required for SSE transport");
      process.exit(1);
    }

    const port = parseInt(process.env.TAILSCALE_MCP_PORT || "3000", 10);
    const host = process.env.TAILSCALE_MCP_HOST || "localhost";

    const app = express();
    // Bearer token auth middleware
    app.use((req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${authToken}`) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      next();
    });

    // Store SSE transports by sessionId for POST /messages routing
    const sseTransports = new Map<string, SSEServerTransport>();

    // SSE endpoint: creates per-connection transport
    app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport("/messages", res);
      sseTransports.set(transport.sessionId, transport);
      res.on("close", () => sseTransports.delete(transport.sessionId));
      await server.connect(transport);
    });

    // Client-to-server messages: route by sessionId to correct transport
    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = sseTransports.get(sessionId);
      if (!transport) { res.status(400).send("No transport for sessionId"); return; }
      await transport.handlePostMessage(req, res);
    });

    app.listen(port, host, () => {
      console.error(`MCP SSE server listening on ${host}:${port}`);
    });
  } else {
    console.error(`Unknown transport: ${transportMode}. Use 'stdio' or 'sse'.`);
    process.exit(1);
  }
}
```

### 2.3 Auth Middleware

Every HTTP request to the SSE endpoint must include:
```
Authorization: Bearer <TAILSCALE_MCP_AUTH_TOKEN>
```

Requests without a valid token receive `401 Unauthorized`. This is mandatory regardless of bind address (localhost or otherwise) — defense in depth for future vault migration.

**Security note:** Use `crypto.timingSafeEqual()` for token comparison to prevent timing attacks. The auth middleware must convert both strings to `Buffer` before comparing.

### 2.4 New Dependency

```json
{
  "dependencies": {
    "express": "^5.0.0"
  }
}
```

> **Note:** Express 5 ships its own TypeScript types — `@types/express` is not needed and should not be added. Verify at implementation time.

This brings runtime deps from 3 to 4. Express is conventional for MCP SSE servers and well-maintained.

### 2.5 File Changes — PR 2

| Action | Path | Description |
|--------|------|-------------|
| Modify | `src/index.ts` | Add transport selection, SSE setup, auth middleware |
| Modify | `package.json` | Add `express` (Express 5 ships its own types) |
| Modify | `.env.example` | Add `TAILSCALE_MCP_TRANSPORT`, `TAILSCALE_MCP_PORT`, `TAILSCALE_MCP_HOST`, `TAILSCALE_MCP_AUTH_TOKEN` |
| Modify | `README.md` | Add SSE transport documentation |
| Modify | `CHANGELOG.md` | Add version entry |
| Create | `tests/transport.test.ts` | Transport selection + auth tests |

### 2.6 Test Plan — PR 2

- Transport selection: defaults to stdio, selects SSE when env set, rejects unknown transport
- Auth validation: missing token exits with error, valid token passes, invalid token returns 401, missing Authorization header returns 401
- SSE startup: starts on configured port/host, refuses to start without auth token

---

## Implementation Order

1. **PR 1 — Tools** (no new dependencies, follows existing patterns)
   - Add device expire + rename to `devices.ts`
   - Create `posture.ts` with 4 tools
   - Register in `index.ts`
   - Tests
   - README, CHANGELOG updates

2. **PR 2 — Transport** (new dependency, architectural change)
   - Add `express` dependency
   - Refactor `index.ts` for transport selection
   - Auth middleware
   - Tests
   - README, CHANGELOG, `.env.example` updates

## Prerequisites

- Tier 1 merged and released (42 tools baseline) — DONE
- GitHub issue created for each PR before starting work

## Rollback

Each PR is independent. Rollback = revert the specific PR merge commit.

- PR 1: purely additive tools, no existing behavior changes
- PR 2: stdio remains default, SSE is opt-in — reverting removes SSE without affecting stdio users

## Verification

- `npm test` — all unit tests pass
- `npm run build` — clean TypeScript compilation
- `/ts-test` — live test skill covers new tools (will need test plan update)
- Manual: SSE transport test with `curl` or MCP client
- Auth: verify 401 for missing/invalid token, 200 for valid token

## Post-Implementation

- Update `docs/testing/mcp-live-test-plans.md` in infrastructure repo (add expire, rename, posture tools)
- Update infrastructure CLAUDE.md tool count (42→48)
- Update mcp-tailscale CLAUDE.md (add posture domain, SSE transport, update dep count 3→4, update transport section)
- Tag releases with CalVer
- Create GH issues for each PR before starting implementation
