# mcp-tailscale Skills Reference

## Overview

Claude Code skills compose multiple MCP tools into higher-level workflows. Skills are defined in `.claude/skills/<name>/SKILL.md` with YAML frontmatter and are auto-discovered by Claude Code.

**Slash command skills** (`disable-model-invocation: true`) are invoked explicitly by the user via `/command`. **Auto-invocable skills** are triggered automatically by Claude when relevant context is detected.

## Quick Reference

| Skill | Type | Slash Command | Description |
|-------|------|--------------|-------------|
| tailscale-health | Slash | `/ts-health` | Tailnet health dashboard — devices, DNS, ACL, keys, connectivity |
| tailscale-live-test | Slash | `/ts-test` | Live integration test — read + safe writes with cleanup |
| tailscale-acl-management | Auto | — | ACL policy management — view, edit, validate, test, drift detection |
| tailscale-device-management | Auto | — | Device management — list, authorize, routes, tags, posture |
| tailscale-dns-management | Auto | — | DNS management — split DNS, nameservers, search paths, MagicDNS |
| tailscale-key-management | Auto | — | Auth key management — create, list, rotate, revoke |
| tailscale-onboarding | Auto | — | New device onboarding — auth key, authorize, tags, routes, verify |

---

## Skill Details

### tailscale-health (`/ts-health`)

**Type:** Slash command
**Description:** Generates a comprehensive tailnet health snapshot covering device status, DNS configuration, ACL policy, auth keys, and connectivity. Used by scheduled monitoring agents and on-demand by operators.

**Tools used:**
- `tailscale_api_verify` — Verify API connectivity
- `tailscale_status` — Tailnet status summary
- `tailscale_device_list` — List all devices
- `tailscale_dns_nameservers_get` — Global nameservers
- `tailscale_dns_preferences_get` — MagicDNS status
- `tailscale_dns_splitdns_get` — Split DNS configuration
- `tailscale_key_list` — Auth key inventory
- `tailscale_derp_map` — DERP relay map
- `tailscale_tailnet_lock_status` — Tailnet Lock status

**Usage:** `/ts-health`

---

### tailscale-live-test (`/ts-test`)

**Type:** Slash command
**Description:** Runs live integration tests against the Tailscale API to verify all MCP tools work correctly. Tests read-only tools and performs safe write+cleanup cycles for keys and webhooks.

**Tools used:** All 48 tools across all domains (devices, DNS, ACL, keys, tailnet, users, webhooks, posture, diagnostics).

**Usage:** `/ts-test` (all domains) or `/ts-test dns` (single domain)

**Available domains:** `devices`, `dns`, `acl`, `keys`, `tailnet`, `users`, `webhooks`, `posture`, `diagnostics`

---

### tailscale-acl-management

**Type:** Auto-invocable
**Description:** Manages the Tailscale ACL policy including viewing, editing, validating, testing, previewing changes, and detecting drift against the Source of Truth file.

**Tools used:**
- `tailscale_acl_get` — Get current ACL policy
- `tailscale_acl_set` — Replace ACL policy
- `tailscale_acl_validate` — Validate without applying
- `tailscale_acl_test` — Run ACL test suite
- `tailscale_acl_preview` — Preview for a user or IP

**Triggers:** User asks to view, edit, validate, or test ACL policies, or check for drift.

---

### tailscale-device-management

**Type:** Auto-invocable
**Description:** Manages Tailscale devices including listing, authorization, subnet route configuration, ACL tag assignment, and posture attribute management.

**Tools used:**
- `tailscale_device_list` — List all devices
- `tailscale_device_get` — Get device details
- `tailscale_device_authorize` — Authorize pending device
- `tailscale_device_delete` — Delete a device
- `tailscale_device_routes_get` — Get advertised/enabled routes
- `tailscale_device_routes_set` — Set enabled routes
- `tailscale_device_tags_set` — Set ACL tags
- `tailscale_device_posture_get` — Get posture attributes
- `tailscale_device_posture_set` — Set posture attributes

**Triggers:** User asks to list, authorize, configure, tag, or manage devices.

---

### tailscale-dns-management

**Type:** Auto-invocable
**Description:** Manages Tailscale DNS configuration including split DNS routes, global nameservers, search paths, and MagicDNS preferences.

**Tools used:**
- `tailscale_dns_nameservers_get` / `tailscale_dns_nameservers_set` — Global nameservers
- `tailscale_dns_searchpaths_get` / `tailscale_dns_searchpaths_set` — Search paths
- `tailscale_dns_splitdns_get` / `tailscale_dns_splitdns_set` — Split DNS routes
- `tailscale_dns_preferences_get` / `tailscale_dns_preferences_set` — MagicDNS

**Triggers:** User asks to view or configure DNS settings, split DNS, nameservers, or MagicDNS.

---

### tailscale-key-management

**Type:** Auto-invocable
**Description:** Manages Tailscale auth keys including creation, listing, rotation, revocation, and expiry tracking.

**Tools used:**
- `tailscale_key_list` — List all auth keys
- `tailscale_key_get` — Get key details
- `tailscale_key_create` — Create new auth key
- `tailscale_key_delete` — Delete/revoke auth key

**Triggers:** User asks to create, list, rotate, or revoke auth keys.

---

### tailscale-onboarding

**Type:** Auto-invocable
**Description:** Guided multi-step workflow for adding a new device to the tailnet. Covers auth key creation, device authorization, tag assignment, route configuration, and connectivity verification.

**Tools used:**
- `tailscale_key_create` — Create auth key for new device
- `tailscale_device_list` — Check for new device joining
- `tailscale_device_get` — Verify device details
- `tailscale_device_authorize` — Authorize pending device
- `tailscale_device_tags_set` — Set ACL tags
- `tailscale_device_routes_get` / `tailscale_device_routes_set` — Configure routes
- `tailscale_device_posture_set` — Set posture attributes
- `tailscale_acl_test` — Verify access rules

**Triggers:** User wants to add a new device, onboard a server, or set up a new node.
