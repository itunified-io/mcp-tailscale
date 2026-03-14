// Tailscale API v2 response and entity types

export interface TailscaleConfig {
  apiKey: string;
  tailnet: string;
  apiUrl?: string;
  timeout?: number;
}

// Device types
export interface Device {
  id: string;
  addresses: string[];
  name: string;
  hostname: string;
  user: string;
  os: string;
  created: string;
  lastSeen: string;
  keyExpiryDisabled: boolean;
  expires: string;
  authorized: boolean;
  isExternal: boolean;
  updateAvailable: boolean;
  machineKey: string;
  nodeKey: string;
  blocksIncomingConnections: boolean;
  enabledRoutes: string[];
  advertisedRoutes: string[];
  clientConnectivity: {
    endpoints: string[];
    derp: string;
    mappingVariesByDestIP: boolean;
    latency: Record<string, { latencyMs: number }>;
    clientSupports: Record<string, boolean>;
  } | null;
  tags: string[];
  tailnetLockError: string;
  tailnetLockKey: string;
  postureIdentity?: {
    serialNumbers?: string[];
    disabled?: boolean;
  };
}

export interface DeviceListResponse {
  devices: Device[];
}

// DNS types
export interface DnsNameservers {
  dns: string[];
  magicDNS: boolean;
}

export interface SplitDnsConfig {
  [domain: string]: string[];
}

export interface DnsSearchPaths {
  searchPaths: string[];
}

export interface DnsPreferences {
  magicDNS: boolean;
}

// ACL types
export interface AclPolicy {
  acls: Array<{
    action: string;
    src: string[];
    dst: string[];
    proto?: string;
  }>;
  groups?: Record<string, string[]>;
  hosts?: Record<string, string>;
  tagOwners?: Record<string, string[]>;
  autoApprovers?: {
    routes?: Record<string, string[]>;
    exitNode?: string[];
  };
  ssh?: Array<{
    action: string;
    src: string[];
    dst: string[];
    users: string[];
  }>;
  tests?: Array<{
    src: string;
    accept?: string[];
    deny?: string[];
  }>;
}

export interface AclPreviewResult {
  matches: Array<{
    user: string;
    src: string;
    dst: string;
    allowed: boolean;
  }>;
}

export interface AclValidationResult {
  message: string;
}

export interface AclTestResult {
  results: Array<{
    user: string;
    errors: string[];
    passed: boolean;
  }>;
}

// Key types
export interface AuthKey {
  id: string;
  key?: string;
  description: string;
  created: string;
  expires: string;
  revoked: string;
  invalid: boolean;
  capabilities: {
    devices: {
      create: {
        reusable: boolean;
        ephemeral: boolean;
        preauthorized: boolean;
        tags: string[];
      };
    };
  };
}

export interface AuthKeyListResponse {
  keys: AuthKey[];
}

export interface AuthKeyCreateRequest {
  capabilities: {
    devices: {
      create: {
        reusable: boolean;
        ephemeral: boolean;
        preauthorized: boolean;
        tags: string[];
      };
    };
  };
  expirySeconds?: number;
  description?: string;
}

// Tailnet types
export interface TailnetSettings {
  devicesApprovalOn: boolean;
  devicesAutoUpdatesOn: boolean;
  devicesKeyDurationDays: number;
  usersApprovalOn: boolean;
  usersRoleAllowedToJoin: string;
  networkFlowLoggingOn: boolean;
  regionalRoutingOn: boolean;
  postureIdentityCollectionOn: boolean;
}

export interface TailnetContacts {
  account: { email: string };
  support: { email: string };
  security: { email: string };
}

export interface TailnetLockStatus {
  enabled: boolean;
  nodeKey: string;
  publicKey: string;
}

// Diagnostics types
export interface TailnetStatus {
  deviceCount: number;
  onlineDevices: number;
  offlineDevices: number;
}

export interface DerpRegion {
  regionId: number;
  regionCode: string;
  regionName: string;
  nodes: Array<{
    name: string;
    regionId: number;
    hostName: string;
    ipv4: string;
    ipv6: string;
  }>;
}

export interface DerpMap {
  regions: Record<string, DerpRegion>;
}

export interface LogStreamConfig {
  logType: string;
  destinationType: string;
  url: string;
}

// Device posture types
export interface PostureAttributes {
  [key: string]: string | boolean | number;
}

export interface DevicePostureResponse {
  attributes: PostureAttributes;
}

// Device routes
export interface DeviceRoutes {
  advertisedRoutes: string[];
  enabledRoutes: string[];
}
