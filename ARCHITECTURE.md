# Architecture

This document describes the architecture of mcp-tailscale — from the current single-runtime design to the target multi-component architecture.

## Current Architecture

mcp-tailscale is a single-process MCP server that translates MCP tool calls into Tailscale API v2 requests.

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Client                               │
│              (Claude Code, AI Agent, Custom)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MCP Protocol (stdio or SSE)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    mcp-tailscale Runtime                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐  │
│  │Transport │  │  Tool    │  │     Tailscale Client         │  │
│  │ stdio/SSE│──│ Registry │──│  (API Key or OAuth)          │  │
│  │  + Auth  │  │ 48 tools │  │  Bearer token, auto-refresh  │  │
│  └──────────┘  └──────────┘  └──────────────┬───────────────┘  │
│                                              │                  │
│  ┌──────────┐  ┌──────────┐                  │                  │
│  │Validation│  │  Error   │                  │                  │
│  │   (Zod)  │  │ Handling │                  │                  │
│  └──────────┘  └──────────┘                  │                  │
└──────────────────────────────────────────────┼──────────────────┘
                                               │ HTTPS
                                               ▼
                                ┌──────────────────────────┐
                                │   Tailscale API v2       │
                                │ api.tailscale.com        │
                                └──────────────┬───────────┘
                                               │
                                               ▼
                                ┌──────────────────────────┐
                                │   Your Tailnet           │
                                │  Devices, DNS, ACL, ...  │
                                └──────────────────────────┘
```

### Components

| Component | File | Responsibility |
|-----------|------|----------------|
| Transport | `src/index.ts`, `src/transport.ts` | stdio/SSE transport, Bearer auth middleware |
| Tool Registry | `src/tools/*.ts` | 48 tools across 9 domains, Zod input schemas |
| Tailscale Client | `src/client/tailscale-client.ts` | HTTP client, API key Bearer auth |
| OAuth Client | `src/client/tailscale-oauth-client.ts` | OAuth credentials, token auto-refresh |
| Client Factory | `src/client/client-factory.ts` | Selects auth method (OAuth > API key) |
| Validation | `src/utils/validation.ts` | Shared Zod schemas (device IDs, CIDR, domains) |
| Error Handling | `src/utils/errors.ts` | TailscaleApiError, credential-safe messages |
| Types | `src/client/types.ts` | API response types, ITailscaleClient interface |

### Data Flow

```
1. MCP Client sends tool call (e.g., tailscale_device_list)
2. Transport layer receives and routes to tool handler
3. Zod schema validates input parameters
4. Tool handler calls TailscaleClient method
5. Client adds Bearer token, sends HTTPS request to api.tailscale.com
6. API response is typed and returned as JSON text content
7. On error: TailscaleApiError extracts message without leaking credentials
```

## Target Architecture

As mcp-tailscale evolves from a single runtime into a product platform, the architecture separates into three distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Clients                              │
│         Claude Code  ·  AI Agents  ·  Custom Apps               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ MCP Protocol
                           ▼
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                    Cloud Layer (Future)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Admin       │  │   Fleet      │  │    Observability     │  │
│  │  Console     │  │   Manager    │  │    (Logs, Metrics)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                           │
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                Enterprise Layer                                 │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   RBAC   │  │   SSO    │  │  Audit   │  │   Policy     │   │
│  │          │  │OIDC/SAML │  │  Events  │  │   Engine     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    Core Runtime (OSS)                            │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐  │
│  │Transport │  │  Tool    │  │     API Clients              │  │
│  │ stdio/SSE│  │ Registry │  │  Tailscale · (Extensible)    │  │
│  └──────────┘  └──────────┘  └──────────────────────────────┘  │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐  │
│  │Validation│  │  Error   │  │     Plugin / Connector SDK   │  │
│  │   (Zod)  │  │ Handling │  │  (Future)                    │  │
│  └──────────┘  └──────────┘  └──────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
                ┌──────────────────────────┐
                │   Infrastructure APIs    │
                │  Tailscale · (Others)    │
                └──────────────────────────┘
```

### Layer Responsibilities

| Layer | Scope | Repository | License |
|-------|-------|------------|---------|
| **Core Runtime** | Execution — MCP protocol, tool registry, API clients, validation | `mcp-tailscale` (public) | AGPL-3.0 |
| **Enterprise** | Governance — RBAC, SSO, audit, policy engine, multi-tenancy | Private (future) | Commercial |
| **Cloud** | Operations — Hosted control plane, fleet management, observability | Private (future) | Commercial SaaS |

### Boundary Definitions

**Core Runtime** is the execution engine. It handles:
- MCP protocol negotiation (stdio/SSE)
- Tool discovery and invocation
- Input validation and error handling
- API client authentication and requests
- Plugin/connector lifecycle (future)

**Enterprise Layer** wraps the Core Runtime with governance:
- Who can use which tools (RBAC)
- How users authenticate (SSO)
- What happened and when (Audit)
- What is allowed and what is not (Policy)
- Isolation between teams (Multi-tenancy)

**Cloud Layer** manages fleets of Enterprise instances:
- Deployment and scaling of gateway instances
- Centralized monitoring and alerting
- Configuration management across instances
- Usage tracking and billing

### Security Model

```
MCP Client
    │
    ▼
Transport Auth ──── Bearer token (SSE) or process isolation (stdio)
    │
    ▼
[Enterprise: RBAC] ── Role check: does this identity have access to this tool?
    │
    ▼
[Enterprise: Policy] ── Policy check: is this operation allowed right now?
    │
    ▼
Tool Execution ──── Zod validates input, tool handler runs
    │
    ▼
[Enterprise: Audit] ── Log: who, what, when, result
    │
    ▼
API Client Auth ──── Bearer token (API key) or OAuth (auto-refresh)
    │
    ▼
Tailscale API ──── HTTPS to api.tailscale.com
```

Items in `[brackets]` are enterprise layer additions — the Core Runtime operates without them.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Node.js ≥ 20 | Native ES modules, broad MCP SDK support |
| Language | TypeScript (strict) | Type safety, IDE support, refactoring confidence |
| Validation | Zod | Runtime + compile-time validation, composable schemas |
| HTTP Client | Axios | Interceptors for auth, timeout, error handling |
| Transport | stdio + SSE (Express) | stdio for local, SSE for remote/multi-client |
| Testing | Vitest | Fast, TypeScript-native, ESM support |
| Auth | API key + OAuth | API key for humans, OAuth for services |

## File Structure

```
src/
  index.ts                    # Entry point — server setup, tool registration
  transport.ts                # Transport config + SSE auth middleware
  client/
    tailscale-client.ts       # API key HTTP client
    tailscale-oauth-client.ts # OAuth client (auto-refresh)
    client-factory.ts         # Auth method selection
    types.ts                  # API types + ITailscaleClient interface
  tools/
    devices.ts                # 11 device management tools
    dns.ts                    # 8 DNS tools
    acl.ts                    # 5 ACL tools
    keys.ts                   # 4 auth key tools
    tailnet.ts                # 5 tailnet tools
    users.ts                  # 2 user tools
    webhooks.ts               # 4 webhook tools
    posture.ts                # 4 posture integration tools
    diagnostics.ts            # 5 diagnostics tools
  utils/
    validation.ts             # Shared Zod schemas
    errors.ts                 # Error extraction, TailscaleApiError
tests/                        # Vitest unit tests (mocked API)
docs/
  plans/                      # Design documents
  api-reference.md            # Tailscale API v2 endpoint mapping
```
