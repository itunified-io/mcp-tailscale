# mcp-tailscale

[![GitHub release](https://img.shields.io/github/v/release/itunified-io/mcp-tailscale?style=flat-square)](https://github.com/itunified-io/mcp-tailscale/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square)](LICENSE)
[![CalVer](https://img.shields.io/badge/calver-YYYY.0M.DD.MICRO-22bfae?style=flat-square)](https://calver.org)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)](https://www.typescriptlang.org/)

Slim Tailscale MCP Server for managing devices, DNS/Split DNS, ACL policies, auth keys, and tailnet settings via Tailscale API v2.

**No SSH. No shell execution. API-only. 3 runtime dependencies.**

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Claude Code Integration](#claude-code-integration)
- [Configuration](#configuration)
- [Tools](#tools)
- [Development](#development)
- [License](#license)

## Features

35 tools across 6 domains:

- **Devices** — List, get, delete, authorize devices; manage routes, tags, and posture attributes
- **DNS** — Global nameservers, search paths, split DNS configuration, MagicDNS preferences
- **ACL** — Get, set, preview, validate, and test ACL policies
- **Keys** — List, get, create, and revoke auth keys
- **Tailnet** — Settings, contacts, Tailnet Lock status
- **Diagnostics** — Tailnet status summary, API connectivity check, log streaming, DERP map

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
      }
    }
  }
}
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TAILSCALE_API_KEY` | Yes | — | Tailscale API key (from admin console > Settings > Keys) |
| `TAILSCALE_TAILNET` | Yes | — | Tailnet name (e.g., `example.com` or your org name) |
| `TAILSCALE_API_URL` | No | `https://api.tailscale.com` | API base URL (override for testing) |
| `TAILSCALE_TIMEOUT` | No | `30000` | Request timeout in milliseconds |

### API Key Permissions

Create an API key at `login.tailscale.com/admin/settings/keys`. The key needs read/write access to the resources you want to manage.

## Tools

### Devices (9 tools)

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

### Tailnet (4 tools)

| Tool | Description |
|------|-------------|
| `tailscale_tailnet_settings_get` | Get tailnet settings |
| `tailscale_tailnet_contacts_get` | Get tailnet contact emails |
| `tailscale_tailnet_contacts_set` | Update tailnet contacts (requires `confirm: true`) |
| `tailscale_tailnet_lock_status` | Get Tailnet Lock status |

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
