# mcp-tailscale

[![GitHub release](https://img.shields.io/github/v/release/itunified-io/mcp-tailscale?style=flat-square)](https://github.com/itunified-io/mcp-tailscale/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![CalVer](https://img.shields.io/badge/calver-YYYY.0M.DD.MICRO-22bfae?style=flat-square)](https://calver.org)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![Glama](https://glama.ai/mcp/servers/itunified-io/mcp-tailscale/badges/score.svg)](https://glama.ai/mcp/servers/itunified-io/mcp-tailscale)

Slim Tailscale MCP Server for managing devices, DNS/Split DNS, ACL policies, auth keys, users, webhooks, and tailnet settings via Tailscale API v2.

**No SSH. No shell execution. API-only. 4 runtime dependencies.**

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Claude Code Integration](#claude-code-integration)
- [Skills](#skills)
- [SSE Transport](#sse-transport)
- [Configuration](#configuration)
- [Tools](#tools)
- [Development](#development)
- [License](#license)

## Features

48 tools across 9 domains:

- **Devices** — List, get, delete, authorize, expire, rename devices; manage routes, tags, and posture attributes
- **DNS** — Global nameservers, search paths, split DNS configuration, MagicDNS preferences
- **ACL** — Get, set, preview, validate, and test ACL policies
- **Keys** — List, get, create, and revoke auth keys
- **Tailnet** — Settings (read/write), contacts, Tailnet Lock status
- **Users** — List and get tailnet users with role/type filtering
- **Webhooks** — Create, list, get, and delete webhook endpoints
- **Posture Integrations** — List, get, create, and delete third-party posture provider integrations
- **Diagnostics** — Tailnet status summary, API connectivity check, log streaming, DERP map

**Authentication:** API key or OAuth client credentials (auto-refresh)

## Quick Start

```bash
npm install
cp .env.example .env   # Edit with your Tailscale API key and tailnet name
npm run build
node dist/index.js     # stdio transport for MCP
```

## Claude Code Integration

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "tailscale": {
      "command": "node",
      "args": ["/path/to/mcp-tailscale/dist/index.js"],
      "env": {
        "TAILSCALE_API_KEY": "your-api-key-here",
        "TAILSCALE_TAILNET": "your-tailnet-name"
      },
      "comment": "Or use OAuth: TAILSCALE_OAUTH_CLIENT_ID + TAILSCALE_OAUTH_CLIENT_SECRET instead of TAILSCALE_API_KEY"
    }
  }
}
```

## Skills

Claude Code skills compose MCP tools into higher-level workflows. See [`.claude/skills/README.md`](.claude/skills/README.md) for detailed documentation.

| Skill | Slash Command | Description |
|-------|--------------|-------------|
| tailscale-health | `/ts-health` | Tailnet health dashboard — devices, DNS, ACL, keys, connectivity |
| tailscale-live-test | `/ts-test` | Live integration test — read + safe writes with cleanup |
| tailscale-acl-management | — | ACL policy management — view, edit, validate, test, drift detection |
| tailscale-device-management | — | Device management — list, authorize, routes, tags, posture |
| tailscale-dns-management | — | DNS management — split DNS, nameservers, search paths, MagicDNS |
| tailscale-key-management | — | Auth key management — create, list, rotate, revoke |
| tailscale-onboarding | — | New device onboarding — auth key, authorize, tags, routes, verify |

## SSE Transport

By default, mcp-tailscale uses stdio transport. To enable HTTP/SSE:

```bash
export TAILSCALE_MCP_TRANSPORT=sse
export TAILSCALE_MCP_AUTH_TOKEN=your-secret-token
export TAILSCALE_MCP_PORT=3000      # optional, default: 3000
export TAILSCALE_MCP_HOST=localhost  # optional, default: localhost
node dist/index.js
```

All requests require `Authorization: Bearer <token>`. The server will not start without `TAILSCALE_MCP_AUTH_TOKEN`.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TAILSCALE_API_KEY` | Yes* | — | Tailscale API key (from admin console > Settings > Keys) |
| `TAILSCALE_OAUTH_CLIENT_ID` | Yes* | — | OAuth client ID (from admin console > Settings > OAuth) |
| `TAILSCALE_OAUTH_CLIENT_SECRET` | Yes* | — | OAuth client secret |
| `TAILSCALE_TAILNET` | Yes | — | Tailnet name (e.g., `example.com` or your org name) |
| `TAILSCALE_API_URL` | No | `https://api.tailscale.com` | API base URL (override for testing) |
| `TAILSCALE_TIMEOUT` | No | `30000` | Request timeout in milliseconds |

*\*Either `TAILSCALE_API_KEY` or both `TAILSCALE_OAUTH_CLIENT_ID` + `TAILSCALE_OAUTH_CLIENT_SECRET` must be set. OAuth takes priority when both are configured.*

### Authentication

**API Key:** Create at `login.tailscale.com/admin/settings/keys`. The key needs read/write access to the resources you want to manage.

**OAuth Client Credentials:** Create at `login.tailscale.com/admin/settings/oauth`. OAuth tokens auto-refresh before expiry. Recommended for automated/service integrations.

## Tools

### Devices (11 tools)

| Tool | Description |
|------|-------------|
| `tailscale_device_list` | List all devices in the tailnet |
| `tailscale_device_get` | Get device details by ID |
| `tailscale_device_delete` | Delete a device (requires `confirm: true`) |
| `tailscale_device_authorize` | Authorize a pending device |
| `tailscale_device_routes_get` | Get advertised and enabled routes |
| `tailscale_device_routes_set` | Set enabled subnet routes |
| `tailscale_device_tags_set` | Set ACL tags on a device |
| `tailscale_device_posture_get` | Get custom posture attributes |
| `tailscale_device_posture_set` | Set a custom posture attribute |
| `tailscale_device_expire` | Expire a device key (requires `confirm: true`) |
| `tailscale_device_rename` | Set a custom display name for a device |

### DNS (8 tools)

| Tool | Description |
|------|-------------|
| `tailscale_dns_nameservers_get` | Get global DNS nameservers |
| `tailscale_dns_nameservers_set` | Set global DNS nameservers |
| `tailscale_dns_searchpaths_get` | Get DNS search paths |
| `tailscale_dns_searchpaths_set` | Set DNS search paths |
| `tailscale_dns_splitdns_get` | Get split DNS configuration |
| `tailscale_dns_splitdns_set` | Update split DNS configuration (PATCH) |
| `tailscale_dns_preferences_get` | Get DNS preferences (MagicDNS) |
| `tailscale_dns_preferences_set` | Set DNS preferences |

### ACL (5 tools)

| Tool | Description |
|------|-------------|
| `tailscale_acl_get` | Get the current ACL policy |
| `tailscale_acl_set` | Replace the ACL policy (requires `confirm: true`) |
| `tailscale_acl_preview` | Preview ACL policy for a user or IP |
| `tailscale_acl_validate` | Validate an ACL policy without applying |
| `tailscale_acl_test` | Run ACL tests defined in the policy |

### Keys (4 tools)

| Tool | Description |
|------|-------------|
| `tailscale_key_list` | List all auth keys |
| `tailscale_key_get` | Get auth key details |
| `tailscale_key_create` | Create a new auth key |
| `tailscale_key_delete` | Delete an auth key (requires `confirm: true`) |

### Tailnet (5 tools)

| Tool | Description |
|------|-------------|
| `tailscale_tailnet_settings_get` | Get tailnet settings |
| `tailscale_tailnet_settings_update` | Update tailnet settings (requires `confirm: true`) |
| `tailscale_tailnet_contacts_get` | Get tailnet contact emails |
| `tailscale_tailnet_contacts_set` | Update tailnet contacts (requires `confirm: true`) |
| `tailscale_tailnet_lock_status` | Get Tailnet Lock status |

### Users (2 tools)

| Tool | Description |
|------|-------------|
| `tailscale_user_list` | List all users (filter by type/role) |
| `tailscale_user_get` | Get user details by ID |

### Webhooks (4 tools)

| Tool | Description |
|------|-------------|
| `tailscale_webhook_list` | List all webhook endpoints |
| `tailscale_webhook_create` | Create a webhook endpoint |
| `tailscale_webhook_get` | Get webhook details by ID |
| `tailscale_webhook_delete` | Delete a webhook (requires `confirm: true`) |

### Posture Integrations (4 tools)

| Tool | Description |
|------|-------------|
| `tailscale_posture_integration_list` | List all posture provider integrations |
| `tailscale_posture_integration_get` | Get posture integration details by ID |
| `tailscale_posture_integration_create` | Create a posture provider integration |
| `tailscale_posture_integration_delete` | Delete a posture integration (requires `confirm: true`) |

### Diagnostics (5 tools)

| Tool | Description |
|------|-------------|
| `tailscale_status` | Tailnet status summary (device counts, online/offline) |
| `tailscale_api_verify` | Verify API connectivity and authentication |
| `tailscale_log_stream_get` | Get log streaming configuration |
| `tailscale_log_stream_set` | Set log streaming configuration (requires `confirm: true`) |
| `tailscale_derp_map` | Get DERP relay map |

## Development

```bash
npm run build      # Compile TypeScript
npm test           # Run unit tests (vitest)
npm run typecheck  # Type check only (no emit)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
See [docs/api-reference.md](docs/api-reference.md) for the Tailscale API v2 endpoint mapping.

## License

This project is dual-licensed:

- **Open Source**: [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) — free for open-source and non-commercial use
- **Commercial**: Available for proprietary integrations — see [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md)

If you use mcp-tailscale in a proprietary product or SaaS offering, a commercial license is required. Support development by [sponsoring us on GitHub](https://github.com/sponsors/itunified-io).
