import { z } from "zod";

/** Tailscale device ID — numeric string */
export const DeviceIdSchema = z
  .string()
  .min(1, "Device ID is required");

/** Tailscale tailnet name (e.g., 'example.com' or org name) */
export const TailnetSchema = z
  .string()
  .min(1, "Tailnet name is required");

/** Auth key ID */
export const KeyIdSchema = z
  .string()
  .min(1, "Auth key ID is required");

/** IPv4 address for nameserver */
export const IpAddressSchema = z
  .string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    "Invalid IPv4 address",
  );

/** Domain name */
export const DomainSchema = z
  .string()
  .regex(
    /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/,
    "Invalid domain name",
  );

/** ACL tag format (e.g., 'tag:server') */
export const TagSchema = z
  .string()
  .regex(/^tag:[a-zA-Z0-9_-]+$/, "Invalid tag format (expected 'tag:<name>')");

/** CIDR notation for subnet routes */
export const CidrSchema = z
  .string()
  .regex(
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/,
    "Invalid CIDR notation",
  );

/** Positive integer for expiry seconds */
export const ExpirySecondsSchema = z
  .number()
  .int()
  .positive("Expiry must be a positive integer");
