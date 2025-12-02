/**
 * HexaGate Unified Routing Framework
 * Provides an abstraction layer for routing through multiple networks.
 */

import type { 
  NetworkType, 
  NetworkConfig, 
  ConnectionState, 
  RoutingRequest, 
  RoutingResponse,
  SecurityLevel 
} from '../types/index.js';

/**
 * Abstract base class for network handlers
 */
export abstract class NetworkHandler {
  protected config: NetworkConfig;
  protected state: ConnectionState = 'disconnected';

  constructor(config: NetworkConfig) {
    this.config = config;
  }

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract route(address: string): Promise<string>;
  
  getState(): ConnectionState {
    return this.state;
  }

  getType(): NetworkType {
    return this.config.type;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * Clearnet (standard internet) handler
 */
export class ClearnetHandler extends NetworkHandler {
  constructor(config?: Partial<NetworkConfig>) {
    super({
      type: 'clearnet',
      enabled: true,
      ...config
    });
  }

  async connect(): Promise<boolean> {
    this.state = 'connecting';
    // Clearnet is always available
    this.state = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
  }

  async route(address: string): Promise<string> {
    // Direct routing for clearnet
    return address;
  }
}

/**
 * Tor network handler
 */
export class TorHandler extends NetworkHandler {
  private socksProxy: string;

  constructor(config?: Partial<NetworkConfig>) {
    super({
      type: 'tor',
      enabled: true,
      proxy: 'socks5://127.0.0.1:9050',
      ...config
    });
    this.socksProxy = this.config.proxy ?? 'socks5://127.0.0.1:9050';
  }

  async connect(): Promise<boolean> {
    this.state = 'connecting';
    // In production, this would establish connection to Tor SOCKS proxy
    // For now, we simulate the connection
    this.state = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
  }

  async route(address: string): Promise<string> {
    // Route through Tor SOCKS proxy
    return `${this.socksProxy}/${address}`;
  }

  getSocksProxy(): string {
    return this.socksProxy;
  }
}

/**
 * I2P network handler
 */
export class I2PHandler extends NetworkHandler {
  private i2pProxy: string;

  constructor(config?: Partial<NetworkConfig>) {
    super({
      type: 'i2p',
      enabled: true,
      proxy: 'http://127.0.0.1:4444',
      ...config
    });
    this.i2pProxy = this.config.proxy ?? 'http://127.0.0.1:4444';
  }

  async connect(): Promise<boolean> {
    this.state = 'connecting';
    this.state = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
  }

  async route(address: string): Promise<string> {
    // Route through I2P HTTP proxy
    return `${this.i2pProxy}/${address}`;
  }
}

/**
 * GNUnet handler
 */
export class GNUnetHandler extends NetworkHandler {
  constructor(config?: Partial<NetworkConfig>) {
    super({
      type: 'gnunet',
      enabled: true,
      ...config
    });
  }

  async connect(): Promise<boolean> {
    this.state = 'connecting';
    this.state = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
  }

  async route(address: string): Promise<string> {
    // GNUnet uses GNS (GNU Name System)
    return `gnunet://${address}`;
  }
}

/**
 * Decentralized VPN handler
 */
export class DVPNHandler extends NetworkHandler {
  private endpoint: string;

  constructor(config?: Partial<NetworkConfig>) {
    super({
      type: 'dvpn',
      enabled: true,
      ...config
    });
    this.endpoint = (config?.options as { endpoint?: string })?.endpoint ?? 'dvpn://node';
  }

  async connect(): Promise<boolean> {
    this.state = 'connecting';
    this.state = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
  }

  async route(address: string): Promise<string> {
    return `${this.endpoint}/${address}`;
  }
}

/**
 * Custom network handler for emerging networks
 */
export class CustomNetworkHandler extends NetworkHandler {
  private routePrefix: string;

  constructor(config: Partial<NetworkConfig> & { routePrefix?: string }) {
    super({
      type: 'custom',
      enabled: true,
      ...config
    });
    this.routePrefix = config.routePrefix ?? 'custom://';
  }

  async connect(): Promise<boolean> {
    this.state = 'connecting';
    this.state = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.state = 'disconnected';
  }

  async route(address: string): Promise<string> {
    return `${this.routePrefix}${address}`;
  }
}

/**
 * Unified Router - Main routing orchestrator
 * Routes requests through the appropriate network based on configuration and security requirements
 */
export class UnifiedRouter {
  private handlers: Map<NetworkType, NetworkHandler> = new Map();
  private defaultNetwork: NetworkType = 'clearnet';

  constructor() {
    // Initialize default handlers
    this.registerHandler(new ClearnetHandler());
  }

  /**
   * Register a network handler
   */
  registerHandler(handler: NetworkHandler): void {
    this.handlers.set(handler.getType(), handler);
  }

  /**
   * Unregister a network handler
   */
  unregisterHandler(type: NetworkType): boolean {
    return this.handlers.delete(type);
  }

  /**
   * Get a registered handler
   */
  getHandler(type: NetworkType): NetworkHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Get all registered network types
   */
  getRegisteredNetworks(): NetworkType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Set the default network for routing
   */
  setDefaultNetwork(type: NetworkType): void {
    if (!this.handlers.has(type)) {
      throw new Error(`Network handler for ${type} is not registered`);
    }
    this.defaultNetwork = type;
  }

  /**
   * Route a request through the unified routing framework
   */
  async route(request: RoutingRequest): Promise<RoutingResponse> {
    const networkType = request.preferredNetwork ?? this.defaultNetwork;
    const handler = this.handlers.get(networkType);

    if (!handler) {
      return {
        success: false,
        networkUsed: networkType,
        resolvedAddress: '',
        connectionId: '',
        error: `No handler registered for network type: ${networkType}`
      };
    }

    if (!handler.isEnabled()) {
      return {
        success: false,
        networkUsed: networkType,
        resolvedAddress: '',
        connectionId: '',
        error: `Network ${networkType} is disabled`
      };
    }

    try {
      // Ensure handler is connected
      if (handler.getState() !== 'connected') {
        await handler.connect();
      }

      const address = request.handle ?? request.url ?? '';
      const resolvedAddress = await handler.route(address);
      const connectionId = this.generateConnectionId();

      return {
        success: true,
        networkUsed: networkType,
        resolvedAddress,
        connectionId,
        metadata: {
          securityLevel: request.securityLevel ?? 'standard',
          spaceId: request.spaceId
        }
      };
    } catch (error) {
      return {
        success: false,
        networkUsed: networkType,
        resolvedAddress: '',
        connectionId: '',
        error: error instanceof Error ? error.message : 'Unknown routing error'
      };
    }
  }

  /**
   * Connect all registered handlers
   */
  async connectAll(): Promise<Map<NetworkType, boolean>> {
    const results = new Map<NetworkType, boolean>();
    
    for (const [type, handler] of this.handlers) {
      if (handler.isEnabled()) {
        results.set(type, await handler.connect());
      } else {
        results.set(type, false);
      }
    }
    
    return results;
  }

  /**
   * Disconnect all handlers
   */
  async disconnectAll(): Promise<void> {
    for (const handler of this.handlers.values()) {
      await handler.disconnect();
    }
  }

  /**
   * Select the best network based on security level
   */
  selectNetworkForSecurity(level: SecurityLevel): NetworkType {
    switch (level) {
      case 'maximum':
        // Prefer Tor or I2P for maximum security
        if (this.handlers.has('tor')) return 'tor';
        if (this.handlers.has('i2p')) return 'i2p';
        break;
      case 'elevated':
        // Prefer dVPN or GNUnet for elevated security
        if (this.handlers.has('dvpn')) return 'dvpn';
        if (this.handlers.has('gnunet')) return 'gnunet';
        if (this.handlers.has('tor')) return 'tor';
        break;
      default:
        // Standard security uses default network
        break;
    }
    return this.defaultNetwork;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

