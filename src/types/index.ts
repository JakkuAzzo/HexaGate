/**
 * HexaGate Core Types
 * Defines the fundamental types used throughout the HexaGate browser framework.
 */

/** Supported network types in the unified routing framework */
export type NetworkType = 
  | 'clearnet'
  | 'tor'
  | 'i2p'
  | 'gnunet'
  | 'dvpn'
  | 'custom';

/** Security level for connections and spaces */
export type SecurityLevel = 'standard' | 'elevated' | 'maximum';

/** Connection state for network handlers */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Wallet types supported by HexaGate */
export type WalletType = 'crypto' | 'tradfi';

/** Agent types for Hexstrike MCP */
export type AgentType = 'automation' | 'osint' | 'research' | 'custom';

/**
 * Network configuration for routing
 */
export interface NetworkConfig {
  type: NetworkType;
  enabled: boolean;
  proxy?: string;
  port?: number;
  options?: Record<string, unknown>;
}

/**
 * Human-readable handle mapping
 */
export interface Handle {
  id: string;
  name: string;
  networkType: NetworkType;
  address: string;
  metadata?: HandleMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface HandleMetadata {
  description?: string;
  tags?: string[];
  verified?: boolean;
  publicKey?: string;
}

/**
 * Encrypted Space configuration
 */
export interface Space {
  id: string;
  name: string;
  encryptionKey: string;
  securityLevel: SecurityLevel;
  tasks: SpaceTask[];
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface SpaceTask {
  id: string;
  name: string;
  networkType: NetworkType;
  handle?: string;
  state: 'active' | 'suspended' | 'completed';
  data: EncryptedData;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
}

/**
 * Hexstrike MCP Agent definition
 */
export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  enabled: boolean;
  permissions: AgentPermissions;
  config: Record<string, unknown>;
}

export interface AgentPermissions {
  networkAccess: NetworkType[];
  spaceAccess: string[];
  canExecuteCommands: boolean;
  canAccessWallets: boolean;
}

/**
 * Security policy definitions
 */
export interface SecurityPolicy {
  id: string;
  name: string;
  rules: SecurityRule[];
  enforcementLevel: 'warn' | 'block' | 'strict';
}

export interface SecurityRule {
  type: 'anti-downgrade' | 'certificate' | 'network' | 'custom';
  condition: string;
  action: 'allow' | 'deny' | 'prompt';
  metadata?: Record<string, unknown>;
}

/**
 * PKI certificate information
 */
export interface Certificate {
  id: string;
  subject: string;
  issuer: string;
  publicKey: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  isPrivate: boolean;
  trusted: boolean;
}

/**
 * Wallet interface
 */
export interface Wallet {
  id: string;
  type: WalletType;
  name: string;
  address?: string;
  publicKey?: string;
  connected: boolean;
  balance?: WalletBalance;
}

export interface WalletBalance {
  currency: string;
  amount: string;
  lastUpdated: Date;
}

/**
 * Routing request and response types
 */
export interface RoutingRequest {
  handle?: string;
  url?: string;
  preferredNetwork?: NetworkType;
  securityLevel?: SecurityLevel;
  spaceId?: string;
}

export interface RoutingResponse {
  success: boolean;
  networkUsed: NetworkType;
  resolvedAddress: string;
  connectionId: string;
  metadata?: Record<string, unknown>;
  error?: string;
}
