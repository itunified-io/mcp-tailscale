# Tailscale API v2 Endpoint Reference

This document maps MCP tools to the Tailscale API v2 endpoints they use.

Base URL: `https://api.tailscale.com/api/v2`
Authentication: `Authorization: Bearer <api-key>`

## Devices

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_device_list` | GET | `/tailnet/{tailnet}/devices` |
| `tailscale_device_get` | GET | `/device/{deviceId}` |
| `tailscale_device_delete` | DELETE | `/device/{deviceId}` |
| `tailscale_device_authorize` | POST | `/device/{deviceId}/authorized` |
| `tailscale_device_routes_get` | GET | `/device/{deviceId}/routes` |
| `tailscale_device_routes_set` | POST | `/device/{deviceId}/routes` |
| `tailscale_device_tags_set` | POST | `/device/{deviceId}/tags` |
| `tailscale_device_posture_get` | GET | `/device/{deviceId}/attributes` |
| `tailscale_device_posture_set` | POST | `/device/{deviceId}/attributes/{attributeKey}` |

## DNS

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_dns_nameservers_get` | GET | `/tailnet/{tailnet}/dns/nameservers` |
| `tailscale_dns_nameservers_set` | POST | `/tailnet/{tailnet}/dns/nameservers` |
| `tailscale_dns_searchpaths_get` | GET | `/tailnet/{tailnet}/dns/searchpaths` |
| `tailscale_dns_searchpaths_set` | POST | `/tailnet/{tailnet}/dns/searchpaths` |
| `tailscale_dns_splitdns_get` | GET | `/tailnet/{tailnet}/dns/split-dns` |
| `tailscale_dns_splitdns_set` | PATCH | `/tailnet/{tailnet}/dns/split-dns` |
| `tailscale_dns_preferences_get` | GET | `/tailnet/{tailnet}/dns/preferences` |
| `tailscale_dns_preferences_set` | POST | `/tailnet/{tailnet}/dns/preferences` |

## ACL

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_acl_get` | GET | `/tailnet/{tailnet}/acl` |
| `tailscale_acl_set` | POST | `/tailnet/{tailnet}/acl` |
| `tailscale_acl_preview` | POST | `/tailnet/{tailnet}/acl/preview` |
| `tailscale_acl_validate` | POST | `/tailnet/{tailnet}/acl/validate` |
| `tailscale_acl_test` | POST | `/tailnet/{tailnet}/acl/test` |

## Auth Keys

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_key_list` | GET | `/tailnet/{tailnet}/keys` |
| `tailscale_key_get` | GET | `/tailnet/{tailnet}/keys/{keyId}` |
| `tailscale_key_create` | POST | `/tailnet/{tailnet}/keys` |
| `tailscale_key_delete` | DELETE | `/tailnet/{tailnet}/keys/{keyId}` |

## Tailnet

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_tailnet_settings_get` | GET | `/tailnet/{tailnet}/settings` |
| `tailscale_tailnet_contacts_get` | GET | `/tailnet/{tailnet}/contacts` |
| `tailscale_tailnet_contacts_set` | PATCH | `/tailnet/{tailnet}/contacts` |
| `tailscale_tailnet_lock_status` | GET | `/tailnet/{tailnet}/lock/status` |

## Diagnostics

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_status` | GET | `/tailnet/{tailnet}/devices` (composite) |
| `tailscale_api_verify` | GET | `/tailnet/{tailnet}/devices` (connectivity check) |
| `tailscale_log_stream_get` | GET | `/tailnet/{tailnet}/logging/{logType}/stream` |
| `tailscale_log_stream_set` | PUT | `/tailnet/{tailnet}/logging/{logType}/stream` |
| `tailscale_derp_map` | GET | `/tailnet/{tailnet}/derp-map` |

## Notes

- **Tailnet identifier**: Use your organization's tailnet name (e.g., `example.com`) or `-` for the default tailnet. Set via `TAILSCALE_TAILNET` environment variable.
- **Device IDs**: Tailscale device IDs are numeric strings. Obtain them via `tailscale_device_list`.
- **Response format**: The Tailscale API returns direct JSON objects (no `{ success, result }` wrapper like some other APIs).
- **Destructive operations**: `tailscale_device_delete`, `tailscale_key_delete`, `tailscale_acl_set`, `tailscale_tailnet_contacts_set`, and `tailscale_log_stream_set` require `confirm: true`.
- **PATCH vs POST**: Split DNS uses PATCH (partial update), while nameservers and search paths use POST (full replacement).
