---
name: tailscale-key-management
description: Manage Tailscale auth keys — create, list, rotate, revoke with expiry tracking
---

# Tailscale Key Management

Workflow skill for managing Tailscale auth keys including creation, listing, rotation, revocation, and expiry tracking.

---

## Workflow 1: List Keys

1. Call `tailscale_key_list` to retrieve all auth keys.
2. Format as a table:

   | Description | Reusable | Ephemeral | Preauth | Expires | Status |
   |-------------|----------|-----------|---------|---------|--------|
   | server-key | ✅ | ❌ | ✅ | 2026-06-01 | ✅ valid |
   | ci-runner | ❌ | ✅ | ✅ | 2026-03-20 | ⚠️ expiring |

3. Flag expired keys with ❌ and keys expiring within 7 days with ⚠️.
4. Show total count and breakdown by status.

---

## Workflow 2: Key Details

1. Call `tailscale_key_get` with the key ID.
2. Display:
   - Description, creation date, expiry date
   - Capabilities: reusable, ephemeral, preauthorized
   - Tags assigned to devices created with this key
   - Usage count (if available)
   - Revocation status

---

## Workflow 3: Create Key

1. Gather options from the user:
   - **Reusable**: can the key be used multiple times? (default: false)
   - **Ephemeral**: do devices created with this key auto-expire? (default: false)
   - **Preauthorized**: skip manual device authorization? (default: false)
   - **Tags**: ACL tags for devices (e.g., `tag:server`, `tag:ci`)
   - **Expiry**: seconds until key expires (default: 90 days = 7776000)
   - **Description**: human-readable name for the key
2. Call `tailscale_key_create` with the gathered options.
3. **⚠️ IMPORTANT**: Display the key value prominently — it is shown ONLY ONCE and cannot be retrieved later.
4. Warn the user to save the key securely immediately.
5. Show the install command: `tailscale up --authkey=<key>`

---

## Workflow 4: Revoke Key

1. Call `tailscale_key_list` to show all keys.
2. User selects which key to revoke.
3. Show key details for confirmation.
4. **Require explicit user confirmation** — revoked keys cannot be un-revoked.
5. Call `tailscale_key_delete` with confirm=true.
6. Verify: `tailscale_key_list` to confirm revocation.

---

## Workflow 5: Key Rotation Audit

1. Call `tailscale_key_list`.
2. Identify:
   - Expired keys still in the list
   - Keys expiring within 7 days
   - Long-lived reusable keys (security concern)
3. Recommend rotation for expiring keys.
4. Suggest creating replacement keys before revoking old ones.

---

## Rules

- Key value is shown only once at creation — always warn the user to save it immediately.
- Expired keys should be highlighted prominently in any listing.
- Keys expiring within 7 days are flagged as WARNING.
- Reusable + non-ephemeral keys are higher security risk — note this when creating.
- Destructive actions (revoke) require explicit user confirmation.
- Always verify after mutations using a read operation.

---

## Key Tools

- `tailscale_key_list` — list all auth keys with status
- `tailscale_key_get` — get key details
- `tailscale_key_create` — create a new auth key
- `tailscale_key_delete` — revoke/delete an auth key (requires confirm)
