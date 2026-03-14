---
name: tailscale-dns-management
description: Manage Tailscale DNS — split DNS routes, global nameservers, search paths, MagicDNS
---

# Tailscale DNS Management

Workflow skill for managing Tailscale DNS configuration including split DNS routes, global nameservers, search paths, and MagicDNS preferences.

---

## Workflow 1: View DNS Configuration

Gather all DNS data in parallel:

- `tailscale_dns_splitdns_get` — domain-to-nameserver mappings
- `tailscale_dns_nameservers_get` — global nameservers
- `tailscale_dns_searchpaths_get` — search paths
- `tailscale_dns_preferences_get` — MagicDNS status

Format as a structured dashboard:

**🔀 Split DNS Routes**

| Domain | Nameservers |
|--------|------------|
| home.lab | 10.10.0.1 |

**🌐 Global Nameservers**
- 1.1.1.1
- 8.8.8.8

**🔍 Search Paths**
- home.lab

**✨ MagicDNS**: Enabled / Disabled

---

## Workflow 2: Add Split DNS Route

1. Gather domain and nameserver(s) from the user.
2. Get current config: `tailscale_dns_splitdns_get`.
3. Show the current routes to confirm there are no conflicts.
4. Apply the new route: `tailscale_dns_splitdns_set` with the updated config (PATCH merges with existing).
5. Verify: `tailscale_dns_splitdns_get` to confirm the route was added.
6. Report success with the full updated split DNS table.

---

## Workflow 3: Remove Split DNS Route

1. Get current routes: `tailscale_dns_splitdns_get`.
2. Show routes and ask which domain to remove.
3. **Require explicit user confirmation** — split DNS changes affect all tailnet devices.
4. Set the domain to an empty array to remove: `tailscale_dns_splitdns_set` with `{ "domain": [] }`.
5. Verify: `tailscale_dns_splitdns_get` to confirm removal.

---

## Workflow 4: Update Global Nameservers

1. Get current nameservers: `tailscale_dns_nameservers_get`.
2. Show current list, ask user for the new list.
3. Confirm the change with the user.
4. Apply: `tailscale_dns_nameservers_set` with the new list.
5. Verify: `tailscale_dns_nameservers_get`.

---

## Workflow 5: Toggle MagicDNS

1. Get current state: `tailscale_dns_preferences_get`.
2. Show current MagicDNS status, confirm toggle with user.
3. Apply: `tailscale_dns_preferences_set` with the new boolean value.
4. Verify: `tailscale_dns_preferences_get`.

---

## Rules

- Split DNS changes affect ALL tailnet devices — always warn the user before applying.
- Always verify after changes using a read operation.
- Show both split DNS and global nameservers together for the full DNS picture.
- When adding a split DNS route, the PATCH method merges with existing routes (does not replace all).
- Removing a route requires setting the domain to an empty array.

---

## Key Tools

- `tailscale_dns_splitdns_get` / `tailscale_dns_splitdns_set` — split DNS route management
- `tailscale_dns_nameservers_get` / `tailscale_dns_nameservers_set` — global nameserver management
- `tailscale_dns_searchpaths_get` / `tailscale_dns_searchpaths_set` — search path management
- `tailscale_dns_preferences_get` / `tailscale_dns_preferences_set` — MagicDNS preferences
