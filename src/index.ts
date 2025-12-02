/**
 * HexaGate - Next-generation, security-first browser framework
 * 
 * HexaGate unifies clearnet, Tor, I2P, GNUnet, dVPNs and emerging networks
 * into a single routing framework. It provides human-readable handles,
 * encrypted spaces for task isolation, and agent integration via Hexstrike MCP.
 */

// Core types
export * from './types/index.js';

// Unified Routing Framework
export {
  UnifiedRouter,
  NetworkHandler,
  ClearnetHandler,
  TorHandler,
  I2PHandler,
  GNUnetHandler,
  DVPNHandler,
  CustomNetworkHandler
} from './routing/index.js';

// Handle System
export {
  HandleResolver,
  HandleParser
} from './handles/index.js';

// Encrypted Spaces
export {
  SpaceManager,
  SpaceEncryption
} from './spaces/index.js';

// Hexstrike MCP (Agent Framework)
export {
  AgentRegistry,
  AgentPermissionBuilder,
  AgentTaskManager
} from './hexstrike/index.js';
export type { AgentContext, AgentTask } from './hexstrike/index.js';

// Security
export {
  PolicyManager,
  PKIManager,
  SecurityLevelManager
} from './security/index.js';
export type {
  ConnectionContext,
  PolicyEvaluationResult,
  PolicyViolation,
  CertificateVerificationResult,
  SecurityLevelConfig
} from './security/index.js';

// Wallets
export {
  WalletManager,
  MockCryptoWallet,
  MockTradFiWallet
} from './wallets/index.js';
export type {
  CryptoWalletAdapter,
  TradFiWalletAdapter,
  CryptoTransaction,
  TradFiTransaction
} from './wallets/index.js';

/**
 * HexaGate - Main facade class for the browser framework
 */
import { UnifiedRouter, ClearnetHandler, TorHandler, I2PHandler, GNUnetHandler, DVPNHandler } from './routing/index.js';
import { HandleResolver } from './handles/index.js';
import { SpaceManager } from './spaces/index.js';
import { AgentRegistry, AgentTaskManager } from './hexstrike/index.js';
import { PolicyManager, PKIManager, SecurityLevelManager } from './security/index.js';
import { WalletManager } from './wallets/index.js';
import type { NetworkType, SecurityLevel, RoutingRequest, RoutingResponse } from './types/index.js';

export class HexaGate {
  public readonly router: UnifiedRouter;
  public readonly handles: HandleResolver;
  public readonly spaces: SpaceManager;
  public readonly agents: AgentRegistry;
  public readonly tasks: AgentTaskManager;
  public readonly policies: PolicyManager;
  public readonly pki: PKIManager;
  public readonly security: SecurityLevelManager;
  public readonly wallets: WalletManager;

  private initialized: boolean = false;

  constructor() {
    this.router = new UnifiedRouter();
    this.handles = new HandleResolver();
    this.spaces = new SpaceManager();
    this.agents = new AgentRegistry();
    this.tasks = new AgentTaskManager();
    this.policies = new PolicyManager();
    this.pki = new PKIManager();
    this.security = new SecurityLevelManager();
    this.wallets = new WalletManager();
  }

  /**
   * Initialize HexaGate with network handlers
   */
  async initialize(enabledNetworks: NetworkType[] = ['clearnet']): Promise<void> {
    // Register network handlers based on configuration
    if (enabledNetworks.includes('clearnet')) {
      this.router.registerHandler(new ClearnetHandler());
    }
    if (enabledNetworks.includes('tor')) {
      this.router.registerHandler(new TorHandler());
    }
    if (enabledNetworks.includes('i2p')) {
      this.router.registerHandler(new I2PHandler());
    }
    if (enabledNetworks.includes('gnunet')) {
      this.router.registerHandler(new GNUnetHandler());
    }
    if (enabledNetworks.includes('dvpn')) {
      this.router.registerHandler(new DVPNHandler());
    }

    // Connect all handlers
    await this.router.connectAll();
    this.initialized = true;
  }

  /**
   * Check if HexaGate is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Navigate to a handle or URL
   */
  async navigate(request: RoutingRequest): Promise<RoutingResponse> {
    if (!this.initialized) {
      throw new Error('HexaGate not initialized. Call initialize() first.');
    }

    // Create a new request object to avoid mutating the original
    const routingRequest: RoutingRequest = { ...request };

    // If a handle is provided, resolve it first
    if (routingRequest.handle) {
      const resolved = this.handles.resolve(routingRequest.handle);
      if (resolved) {
        routingRequest.url = resolved.address;
        routingRequest.handle = undefined; // Clear handle so router uses URL
        routingRequest.preferredNetwork = routingRequest.preferredNetwork ?? resolved.networkType;
      }
    }

    // Select network based on security level if not specified
    if (!routingRequest.preferredNetwork && routingRequest.securityLevel) {
      routingRequest.preferredNetwork = this.router.selectNetworkForSecurity(routingRequest.securityLevel);
    }

    // Route the request
    return this.router.route(routingRequest);
  }

  /**
   * Set security level
   */
  setSecurityLevel(level: SecurityLevel): void {
    this.security.setLevel(level);
  }

  /**
   * Get current security level
   */
  getSecurityLevel(): SecurityLevel {
    return this.security.getCurrentLevel();
  }

  /**
   * Shutdown HexaGate
   */
  async shutdown(): Promise<void> {
    await this.router.disconnectAll();
    this.initialized = false;
  }

  /**
   * Get version information
   */
  static getVersion(): string {
    return '1.0.0';
  }

  /**
   * Get framework description
   */
  static getDescription(): string {
    return 'HexaGate - Next-generation, security-first browser framework';
  }
}
