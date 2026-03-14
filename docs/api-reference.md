# Tailscale API v2 Endpoint Reference

This document maps MCP tools to the Tailscale API v2 endpoints they use.

Base URL: `https://api.tailscale.com/api/v2`
Authentication: `Authorization: Bearer <api-key>` or OAuth client credentials

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
| `tailscale_device_expire` | POST | `/device/{deviceId}/key` |
| `tailscale_device_rename` | POST | `/device/{deviceId}/name` |

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
| `tailscale_tailnet_settings_update` | PATCH | `/tailnet/{tailnet}/settings` |

## Users

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_user_list` | GET | `/tailnet/{tailnet}/users` |
| `tailscale_user_get` | GET | `/users/{userId}` |

## Webhooks

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_webhook_list` | GET | `/tailnet/{tailnet}/webhooks` |
| `tailscale_webhook_create` | POST | `/tailnet/{tailnet}/webhooks` |
| `tailscale_webhook_get` | GET | `/webhooks/{webhookId}` |
| `tailscale_webhook_delete` | DELETE | `/webhooks/{webhookId}` |

## Posture Integrations

| Tool | Method | Endpoint |
|------|--------|----------|
| `tailscale_posture_integration_list` | GET | `/tailnet/{tailnet}/posture/integrations` |
| `tailscale_posture_integration_get` | GET | `/tailnet/{tailnet}/posture/integrations/{integrationId}` |
| `tailscale_posture_integration_create` | POST | `/tailnet/{tailnet}/posture/integrations` |
| `tailscale_posture_integration_delete` | DELETE | `/tailnet/{tailnet}/posture/integrations/{integrationId}` |

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
- **Authentication**: Supports API key (`TAILSCALE_API_KEY`) or OAuth client credentials (`TAILSCALE_OAUTH_CLIENT_ID` + `TAILSCALE_OAUTH_CLIENT_SECRET`). OAuth takes priority when both are configured.
- **Destructive operations**: `tailscale_device_delete`, `tailscale_device_expire`, `tailscale_key_delete`, `tailscale_acl_set`, `tailscale_tailnet_contacts_set`, `tailscale_tailnet_settings_update`, `tailscale_log_stream_set`, `tailscale_webhook_delete`, and `tailscale_posture_integration_delete` require `confirm: true`.
- **PATCH vs POST**: Split DNS and tailnet settings use PATCH (partial update), while nameservers and search paths use POST (full replacement).
