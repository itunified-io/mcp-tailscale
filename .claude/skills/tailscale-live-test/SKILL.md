---
name: ts-test
description: Live integration test for all Tailscale MCP tools — read + safe writes with cleanup
disable-model-invocation: true
---

# Tailscale Live Test (/ts-test)

Run live integration tests against the Tailscale API to verify all MCP tools work correctly.

**Usage:** `/ts-test` (all domains) or `/ts-test <domain>` (single domain)
**Available domains:** devices, dns, acl, keys, tailnet, diagnostics

## Test Protocol

### For each test:
1. Call the MCP tool with test parameters
2. Verify the response is valid (no errors, expected structure)
3. For WRITE tests: verify the entry was created, then CLEANUP and verify removal
4. Record result: PASS / FAIL / SKIP / ERROR

### Bug Handling
If a tool returns an unexpected error or wrong data:
1. Record the failure with: tool name, input params, expected vs actual result
2. Create a GitHub issue in this repo with label `bug` including the failure details
3. Continue testing remaining tools — do NOT stop on first failure

### Cleanup Rules
- All WRITE tests MUST have a matching CLEANUP step
- Test entries use identifiable descriptions (e.g., `mcp-live-test` in key description)
- After all tests in a domain: verify NO test entries remain
- If cleanup fails: report as CRITICAL in results and attempt manual cleanup

## Test Matrix

### Devices Domain (domain: `devices`)

**Read tests:**
1. `tailscale_device_list` — list devices, expect ≥1 device
2. `tailscale_device_get` — get first device from list by ID
3. `tailscale_device_routes_get` — get routes for first device
4. `tailscale_device_posture_get` — get posture attributes for first device

**SKIP:** `tailscale_device_delete` — destructive, would remove device from tailnet
**SKIP:** `tailscale_device_authorize` — would authorize a pending device
**SKIP:** `tailscale_device_routes_set` — would change live device routes
**SKIP:** `tailscale_device_tags_set` — would change device tags
**SKIP:** `tailscale_device_posture_set` — would set posture attributes

### DNS Domain (domain: `dns`)

**Read tests:**
1. `tailscale_dns_nameservers_get` — get global nameservers
2. `tailscale_dns_searchpaths_get` — get search paths
3. `tailscale_dns_splitdns_get` — get split DNS configuration
4. `tailscale_dns_preferences_get` — get MagicDNS preferences

**SKIP:** `tailscale_dns_nameservers_set` — would change live global nameservers
**SKIP:** `tailscale_dns_searchpaths_set` — would change live search paths
**SKIP:** `tailscale_dns_splitdns_set` — would change live split DNS routes
**SKIP:** `tailscale_dns_preferences_set` — would change MagicDNS settings

### ACL Domain (domain: `acl`)

**Read tests:**
1. `tailscale_acl_get` — get current ACL policy (expect HuJSON response)
2. `tailscale_acl_validate` — validate current ACL (expect success/valid response)
3. `tailscale_acl_test` — test ACL with empty test suite `[]` (expect pass)

**SKIP:** `tailscale_acl_set` — would overwrite live ACL policy
**SKIP:** `tailscale_acl_preview` — requires proposed ACL body

### Keys Domain (domain: `keys`)

**Read test:**
1. `tailscale_key_list` — list existing auth keys

**Write + Cleanup cycle — Auth Key:**
2. `tailscale_key_create` — create auth key: `capabilities.devices.create.reusable` = false, `capabilities.devices.create.ephemeral` = true, `expirySeconds` = 3600, `description` = `mcp-live-test`
3. `tailscale_key_get` — VERIFY: get key by ID from step 2, confirm description matches
4. `tailscale_key_delete` — CLEANUP: delete key by ID, confirm `true`
5. `tailscale_key_list` — VERIFY: confirm test key no longer appears

### Tailnet Domain (domain: `tailnet`)

**Read tests:**
1. `tailscale_tailnet_settings_get` — get tailnet settings
2. `tailscale_tailnet_contacts_get` — get tailnet contacts
3. `tailscale_tailnet_lock_status` — get tailnet lock status

**SKIP:** `tailscale_tailnet_contacts_set` — would change tailnet contacts

### Diagnostics Domain (domain: `diagnostics`)

**Read tests:**
1. `tailscale_status` — get overall tailscale status
2. `tailscale_api_verify` — verify API connectivity and token validity
3. `tailscale_derp_map` — get DERP relay map (expect regions array)
4. `tailscale_log_stream_get` — get log stream configuration

**SKIP:** `tailscale_log_stream_set` — would change log streaming destination

## Results Dashboard

After all tests complete, present results in this format:

```
## Tailscale Live Test Results — [DATE]

### Summary
- Total tools: 35
- Tested: [N] | Skipped: [N]
- PASS: [N] | FAIL: [N] | ERROR: [N]
- Write+Cleanup cycles: [N] completed, [N] failed
- Bugs created: [N] (list issue URLs)

### Per Domain
| Domain | Tools | Tested | Pass | Fail | Skip |
|--------|-------|--------|------|------|------|
| Devices | 9 | ... | ... | ... | ... |
| DNS | 8 | ... | ... | ... | ... |
| ACL | 5 | ... | ... | ... | ... |
| Keys | 4 | ... | ... | ... | ... |
| Tailnet | 4 | ... | ... | ... | ... |
| Diagnostics | 5 | ... | ... | ... | ... |

### Failures (if any)
| Tool | Input | Expected | Actual | Issue |
|------|-------|----------|--------|-------|
| ... | ... | ... | ... | #XX |

### Cleanup Status
- [ ] All test entries removed
- [ ] No `mcp-live-test` entries remain in any domain
```

## Slack Reporting

Post a concise summary to Slack (channel provided by the caller):

```
🧪 Tailscale Live Test — [DATE]
Tested: [N]/35 | ✅ [N] Pass | ❌ [N] Fail | ⏭️ [N] Skip
Write+Cleanup: [N]/[N] clean
Bugs: [N] created ([issue URLs])
```

## Important
- This is a TEST skill — it creates and deletes test entries. Never leave test data behind.
- The test auth key is created as ephemeral + single-use with 1h expiry — minimal risk even if cleanup fails.
- If a CLEANUP step fails, try again. If it still fails, report as CRITICAL.
- Some API endpoints may return different structures depending on tailnet configuration — handle gracefully.
- The `tailscale_acl_test` tool should be called with an empty test array `[]` to validate without modifying anything.
