---
name: tailscale-device-management
description: Manage Tailscale devices — list, authorize, configure routes, set tags, manage posture
---

# Tailscale Device Management

Workflow skill for managing Tailscale devices including listing, authorization, subnet route configuration, ACL tag assignment, and posture attribute management.

---

## Workflow 1: List Devices

1. Call `tailscale_device_list` to retrieve all devices.
2. Format as a table:

   | Name | IP | OS | Online | Tags | Key Expiry |
   |------|----|----|--------|------|-----------|
   | server-1 | 100.x.x.x | linux | ✅ | tag:server | 2026-06-01 |

3. Show total count and online/offline breakdown.
4. Flag devices offline >24h or with imminent key expiry.

---

## Workflow 2: Device Details

1. Call `tailscale_device_get` with the device ID.
2. Display comprehensive details:
   - Addresses, hostname, OS, user
   - Tags, routes (advertised + enabled)
   - Key expiry, authorization status
   - Client connectivity (DERP, endpoints)
   - Posture attributes

---

## Workflow 3: Authorize Device

1. Call `tailscale_device_list` to find pending devices.
2. If multiple pending, ask user to select which one.
3. Show device details and confirm authorization with user.
4. Call `tailscale_device_authorize` with the device ID.
5. Verify: `tailscale_device_get` to confirm authorized status.

---

## Workflow 4: Manage Subnet Routes

1. Call `tailscale_device_routes_get` to see advertised and enabled routes.
2. Display current state:

   | Route | Advertised | Enabled |
   |-------|-----------|---------|
   | 10.10.0.0/24 | ✅ | ❌ |
   | 0.0.0.0/0 (exit node) | ✅ | ❌ |

3. Ask user which routes to enable/disable.
4. **Warn about network topology impact** — route changes affect traffic flow.
5. Call `tailscale_device_routes_set` with the updated routes list.
6. Verify: `tailscale_device_routes_get`.

---

## Workflow 5: Set Tags

1. Show current tags: `tailscale_device_get`.
2. Gather new tags from user (format: `tag:server`, `tag:prod`).
3. **Warn about ACL impact** — tag changes affect access permissions.
4. Call `tailscale_device_tags_set` with the new tag list.
5. Verify: `tailscale_device_get`.

---

## Workflow 6: Manage Posture Attributes

1. View current posture: `tailscale_device_posture_get`.
2. To set a custom attribute: gather key and value from user.
3. Call `tailscale_device_posture_set` with key and value.
4. Verify: `tailscale_device_posture_get`.

---

## Workflow 7: Remove Device

1. Call `tailscale_device_get` to show device details.
2. **Warn if device is online** — removing an active device will disconnect it.
3. **Require explicit user confirmation** — this action is irreversible.
4. Call `tailscale_device_delete` with confirm=true.
5. Verify: `tailscale_device_list` to confirm removal.

---

## Rules

- Always show device online status before destructive actions.
- Route changes affect network topology — warn the user before applying.
- Tag changes affect ACL permissions — show the potential impact.
- Destructive actions (delete) require explicit user confirmation.
- Always verify after mutations using a read operation.

---

## Key Tools

- `tailscale_device_list` — list all devices
- `tailscale_device_get` — get device details
- `tailscale_device_delete` — remove device (requires confirm)
- `tailscale_device_authorize` — authorize pending device
- `tailscale_device_routes_get` / `tailscale_device_routes_set` — subnet route management
- `tailscale_device_tags_set` — set ACL tags
- `tailscale_device_posture_get` / `tailscale_device_posture_set` — posture attribute management
