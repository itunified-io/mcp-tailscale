---
name: tailscale-health
description: Tailnet health dashboard — devices, DNS, ACL, keys, connectivity
disable-model-invocation: true
---

# Tailscale Health Dashboard

Workflow skill for generating a comprehensive tailnet health snapshot. Invoked via `/ts-health` or when the user asks for a Tailscale status overview. Used by the scheduled monitoring agent and on-demand by operators.

---

## Workflow: Generate Health Dashboard

### Phase 1 — Gather Data in Parallel

Maximize concurrent tool calls. Fire all of these simultaneously:

- `tailscale_api_verify` — verify API connectivity
- `tailscale_status` — device count, online/offline summary
- `tailscale_device_list` — all devices with status details
- `tailscale_dns_splitdns_get` — split DNS routes
- `tailscale_dns_nameservers_get` — global nameservers
- `tailscale_dns_preferences_get` — MagicDNS status
- `tailscale_key_list` — auth keys with expiry info
- `tailscale_tailnet_lock_status` — tailnet lock status
- `tailscale_derp_map` — relay regions

### Phase 2 — Format Dashboard

Produce a structured dashboard with the following sections:

---

**🌐 Tailnet Overview**
- Tailnet: your-tailnet-name
- Devices: X total (Y online, Z offline)

---

**📱 Devices**

| Name | IP | OS | Online | Last Seen | Key Expiry |
|------|----|----|--------|-----------|-----------|
| server-1 | 100.x.x.x | linux | ✅ | 2m ago | 2026-06-01 |

---

**🔀 DNS**

| Domain | Nameservers |
|--------|------------|
| home.lab | 10.10.0.1 |

- Global nameservers: 1.1.1.1, 8.8.8.8
- MagicDNS: Enabled / Disabled

---

**🔑 Auth Keys**

| Description | Reusable | Ephemeral | Expires | Status |
|-------------|----------|-----------|---------|--------|
| server-key | ✅ | ❌ | 2026-06-01 | ✅ valid |

---

**🛡️ Tailnet Lock**: Enabled / Disabled

---

**🌍 DERP Relay Regions**: X regions available

---

### Phase 3 — Severity Assessment

Evaluate all collected data and assign an overall severity level:

**🟢 HEALTHY** — All of the following are true:
- API key is valid
- All expected devices are online
- No expired auth keys
- Split DNS is configured
- MagicDNS is enabled
- Tailnet lock status is known

**🟡 WARNING** — Any of the following:
- One or more devices offline for >24 hours
- Auth keys expiring within 7 days
- MagicDNS is disabled
- No split DNS routes configured
- Devices with key expiry approaching

**🔴 CRITICAL** — Any of the following:
- API key is invalid or expired
- All devices are offline
- No DNS configuration at all
- Multiple expired auth keys still active

Display the overall severity prominently at the top of the report.

---

### Phase 4 — Slack Notification Routing (Scheduled Agent Use)

After assessment, route the notification as follows:

- **🟢 HEALTHY**: Post summary to `#infra-monitoring` only.
- **🟡 WARNING**: Post summary to `#infra-monitoring` AND `#infra-alerts`.
- **🔴 CRITICAL**: Post summary to `#infra-monitoring` AND `#infra-alerts` AND send a direct message to the operator on duty.

All Slack messages must include:
- Severity level with emoji
- Timestamp of the check
- Brief summary of findings (2-3 lines)
- Link or note to run `/ts-health` for full details

---

## Rules

- Always run data gathering in parallel — never sequentially.
- This skill is read-only; it never modifies Tailscale configuration.
- If the API key is invalid, report CRITICAL immediately and skip all further tool calls.
- Scheduled agents using this skill must not take remediation actions — only report and notify.
- The dashboard is a point-in-time snapshot; include the check timestamp in all reports.

---

## Key Tools

- `tailscale_api_verify` — verify API connectivity
- `tailscale_status` — quick device count summary
- `tailscale_device_list` — detailed device information
- `tailscale_dns_splitdns_get` — split DNS routes
- `tailscale_dns_nameservers_get` — global nameservers
- `tailscale_dns_preferences_get` — MagicDNS status
- `tailscale_key_list` — auth key listing with expiry
- `tailscale_tailnet_lock_status` — tailnet lock status
- `tailscale_derp_map` — relay region mapping
