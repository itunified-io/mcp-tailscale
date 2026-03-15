# 003 — Plugin API: createServer() Factory

## Status

Draft

## Date

2026-03-16

## GitHub Issue

[#37](https://github.com/itunified-io/mcp-tailscale/issues/37)

## Problem

`src/index.ts` is monolithic — server creation, tool registration, transport setup, and process lifecycle are all module-scoped side effects with zero exports. The enterprise edition (`mcp-tailscale-enterprise`) needs to import the server, tool definitions, and tool handlers to wrap them with middleware (audit, RBAC, SSO, policy) without forking the core.

## Solution

Extract a `createServer()` factory function and add typed middleware support.

### New Files

#### `src/types.ts`

Export shared types for tool handling and middleware:

```typescript
import { ITailscaleClient } from "./client/types.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export type ToolHandler = (
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
) => Promise<ToolResult>;

export type ToolMiddleware = (
  name: string,
  args: Record<string, unknown>,
  client: ITailscaleClient,
  next: ToolHandler,
) => Promise<ToolResult>;
```

#### `src/server.ts`

Extract server creation logic from `index.ts`:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ITailscaleClient } from "./client/types.js";
import { ToolHandler, ToolMiddleware, ToolResult } from "./types.js";

export interface CreateServerOptions {
  middleware?: ToolMiddleware;
  name?: string;
  version?: string;
}

export interface CreateServerResult {
  server: Server;
  client: ITailscaleClient;
  allToolDefinitions: Tool[];
  toolHandlers: Map<string, ToolHandler>;
}

export function createServer(options?: CreateServerOptions): CreateServerResult;
```

The function:
1. Creates `ITailscaleClient` via `createClientFromEnv()`
2. Assembles `allToolDefinitions` array (48 tools)
3. Builds `toolHandlers` Map
4. Creates MCP `Server` with name/version from options or defaults
5. Registers `ListTools` handler (returns all tool definitions)
6. Registers `CallTools` handler — if middleware provided, wraps handler: `middleware(name, args, client, originalHandler)`, otherwise calls handler directly
7. Returns `{ server, client, allToolDefinitions, toolHandlers }`

### Refactored `src/index.ts`

Becomes a thin CLI entry point:

```typescript
import { createServer } from "./server.js";
import { validateTransportConfig, createAuthMiddleware } from "./transport.js";
// ... transport imports

const { server } = createServer();

async function main() {
  // ... same transport logic as before
}

main().catch(/* ... */);
```

No behavior change for existing users.

### `package.json` Exports Map

```json
"exports": {
  ".": "./dist/index.js",
  "./server": "./dist/server.js",
  "./types": "./dist/types.js",
  "./client/*": "./dist/client/*.js",
  "./utils/*": "./dist/utils/*.js",
  "./transport": "./dist/transport.js"
}
```

## Prerequisites

- None (self-contained refactor)

## Execution Steps

1. Create `src/types.ts` with `ToolHandler`, `ToolMiddleware`, `ToolResult` types
2. Create `src/server.ts` with `createServer()` factory
3. Refactor `src/index.ts` to use `createServer()` internally
4. Add `exports` map to `package.json`
5. Run `npm test` — all existing tests must pass
6. Run `npm run build` — must succeed
7. Verify `npx tailscale-mcp` still works (backward compat)
8. Update CHANGELOG.md
9. Publish to npm

## Rollback

Revert the 3 changed files (`index.ts`, `package.json`) and 2 new files (`types.ts`, `server.ts`). No data migration, no API changes.

## Verification

- `npm test` passes (all 188 existing tests)
- `npm run build` succeeds
- `npx tailscale-mcp` works unchanged
- Enterprise can import: `import { createServer } from "tailscale-mcp/server"`
- Enterprise can import: `import { ToolMiddleware } from "tailscale-mcp/types"`
- Middleware is called when provided to `createServer({ middleware })`
