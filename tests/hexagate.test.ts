/**
 * Tests for HexaGate Main Interface
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HexaGate } from '../src/index.js';

describe('HexaGate', () => {
  let hexagate: HexaGate;

  beforeEach(() => {
    hexagate = new HexaGate();
  });

  afterEach(async () => {
    if (hexagate.isInitialized()) {
      await hexagate.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should not be initialized by default', () => {
      expect(hexagate.isInitialized()).toBe(false);
    });

    it('should initialize with default networks', async () => {
      await hexagate.initialize();
      expect(hexagate.isInitialized()).toBe(true);
      expect(hexagate.router.getRegisteredNetworks()).toContain('clearnet');
    });

    it('should initialize with specified networks', async () => {
      await hexagate.initialize(['clearnet', 'tor', 'i2p']);
      expect(hexagate.router.getRegisteredNetworks()).toContain('tor');
      expect(hexagate.router.getRegisteredNetworks()).toContain('i2p');
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      await hexagate.initialize(['clearnet', 'tor']);
    });

    it('should navigate to URL', async () => {
      const response = await hexagate.navigate({ url: 'https://example.com' });
      expect(response.success).toBe(true);
      expect(response.networkUsed).toBe('clearnet');
    });

    it('should navigate using handle', async () => {
      hexagate.handles.registerHandle('example', 'clearnet', 'https://example.com');
      const response = await hexagate.navigate({ handle: 'example' });
      expect(response.success).toBe(true);
      expect(response.resolvedAddress).toBe('https://example.com');
    });

    it('should select network based on security level', async () => {
      const response = await hexagate.navigate({
        url: 'https://example.com',
        securityLevel: 'maximum'
      });
      expect(response.networkUsed).toBe('tor');
    });

    it('should throw if not initialized', async () => {
      const uninitializedHexagate = new HexaGate();
      await expect(uninitializedHexagate.navigate({ url: 'https://example.com' }))
        .rejects.toThrow('not initialized');
    });
  });

  describe('Security Level', () => {
    it('should set security level', () => {
      hexagate.setSecurityLevel('elevated');
      expect(hexagate.getSecurityLevel()).toBe('elevated');
    });

    it('should default to standard level', () => {
      expect(hexagate.getSecurityLevel()).toBe('standard');
    });
  });

  describe('Components', () => {
    it('should have router component', () => {
      expect(hexagate.router).toBeDefined();
    });

    it('should have handles component', () => {
      expect(hexagate.handles).toBeDefined();
    });

    it('should have spaces component', () => {
      expect(hexagate.spaces).toBeDefined();
    });

    it('should have agents component', () => {
      expect(hexagate.agents).toBeDefined();
    });

    it('should have tasks component', () => {
      expect(hexagate.tasks).toBeDefined();
    });

    it('should have policies component', () => {
      expect(hexagate.policies).toBeDefined();
    });

    it('should have pki component', () => {
      expect(hexagate.pki).toBeDefined();
    });

    it('should have security component', () => {
      expect(hexagate.security).toBeDefined();
    });

    it('should have wallets component', () => {
      expect(hexagate.wallets).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown and disconnect handlers', async () => {
      await hexagate.initialize();
      await hexagate.shutdown();
      expect(hexagate.isInitialized()).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should return version', () => {
      expect(HexaGate.getVersion()).toBe('1.0.0');
    });

    it('should return description', () => {
      expect(HexaGate.getDescription()).toContain('HexaGate');
    });
  });
});

describe('Integration', () => {
  let hexagate: HexaGate;

  beforeEach(async () => {
    hexagate = new HexaGate();
    await hexagate.initialize(['clearnet', 'tor']);
  });

  afterEach(async () => {
    await hexagate.shutdown();
  });

  it('should create space and add task', () => {
    const space = hexagate.spaces.createSpace('Research', 'elevated');
    const task = hexagate.spaces.addTask(space.id, 'OSINT Task', 'tor');
    expect(task?.networkType).toBe('tor');
  });

  it('should register agent and create task', () => {
    const agent = hexagate.agents.registerAgent(
      'osint',
      'ResearchBot',
      'Research automation',
      { networkAccess: ['tor'], spaceAccess: [], canExecuteCommands: false, canAccessWallets: false }
    );
    
    const task = hexagate.tasks.createTask(agent.id, 'osint', { target: 'example.com' });
    expect(task.agentId).toBe(agent.id);
  });

  it('should evaluate security policies', () => {
    const result = hexagate.policies.evaluateConnection({
      url: 'https://secure.example.com',
      tlsVersion: '1.3',
      cipherSuite: 'TLS_AES_256_GCM_SHA384'
    });
    expect(result.allowed).toBe(true);
  });

  it('should manage wallets', () => {
    const wallet = hexagate.wallets.createWallet('crypto', 'ETH Wallet');
    hexagate.wallets.connectWallet(wallet.id, '0x123...', 'pubkey');
    
    const connected = hexagate.wallets.getConnectedWallets();
    expect(connected.length).toBe(1);
  });
});
