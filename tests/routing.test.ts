/**
 * Tests for HexaGate Unified Routing Framework
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UnifiedRouter,
  ClearnetHandler,
  TorHandler,
  I2PHandler,
  GNUnetHandler,
  DVPNHandler,
  CustomNetworkHandler
} from '../src/routing/index.js';

describe('UnifiedRouter', () => {
  let router: UnifiedRouter;

  beforeEach(() => {
    router = new UnifiedRouter();
  });

  describe('Handler Registration', () => {
    it('should have clearnet handler by default', () => {
      expect(router.getRegisteredNetworks()).toContain('clearnet');
    });

    it('should register new handlers', () => {
      router.registerHandler(new TorHandler());
      expect(router.getRegisteredNetworks()).toContain('tor');
    });

    it('should unregister handlers', () => {
      router.registerHandler(new TorHandler());
      const result = router.unregisterHandler('tor');
      expect(result).toBe(true);
      expect(router.getRegisteredNetworks()).not.toContain('tor');
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = router.unregisterHandler('tor');
      expect(result).toBe(false);
    });
  });

  describe('Routing', () => {
    it('should route through clearnet by default', async () => {
      const response = await router.route({ url: 'https://example.com' });
      expect(response.success).toBe(true);
      expect(response.networkUsed).toBe('clearnet');
      expect(response.resolvedAddress).toBe('https://example.com');
    });

    it('should route through preferred network', async () => {
      router.registerHandler(new TorHandler());
      const response = await router.route({
        url: 'https://example.com',
        preferredNetwork: 'tor'
      });
      expect(response.success).toBe(true);
      expect(response.networkUsed).toBe('tor');
    });

    it('should return error for unregistered network', async () => {
      const response = await router.route({
        url: 'https://example.com',
        preferredNetwork: 'i2p'
      });
      expect(response.success).toBe(false);
      expect(response.error).toContain('No handler registered');
    });
  });

  describe('Security Level Selection', () => {
    beforeEach(() => {
      router.registerHandler(new TorHandler());
      router.registerHandler(new I2PHandler());
      router.registerHandler(new DVPNHandler());
      router.registerHandler(new GNUnetHandler());
    });

    it('should select Tor for maximum security', () => {
      const network = router.selectNetworkForSecurity('maximum');
      expect(network).toBe('tor');
    });

    it('should select dVPN for elevated security', () => {
      const network = router.selectNetworkForSecurity('elevated');
      expect(network).toBe('dvpn');
    });

    it('should select default for standard security', () => {
      const network = router.selectNetworkForSecurity('standard');
      expect(network).toBe('clearnet');
    });
  });

  describe('Connection Management', () => {
    it('should connect all handlers', async () => {
      router.registerHandler(new TorHandler());
      const results = await router.connectAll();
      expect(results.get('clearnet')).toBe(true);
      expect(results.get('tor')).toBe(true);
    });

    it('should disconnect all handlers', async () => {
      await router.connectAll();
      await router.disconnectAll();
      const handler = router.getHandler('clearnet');
      expect(handler?.getState()).toBe('disconnected');
    });
  });
});

describe('Network Handlers', () => {
  describe('ClearnetHandler', () => {
    it('should route directly', async () => {
      const handler = new ClearnetHandler();
      await handler.connect();
      const address = await handler.route('https://example.com');
      expect(address).toBe('https://example.com');
    });
  });

  describe('TorHandler', () => {
    it('should route through SOCKS proxy', async () => {
      const handler = new TorHandler();
      await handler.connect();
      const address = await handler.route('https://example.onion');
      expect(address).toContain('socks5://');
    });

    it('should use custom proxy', async () => {
      const handler = new TorHandler({ proxy: 'socks5://127.0.0.1:9150' });
      await handler.connect();
      expect(handler.getSocksProxy()).toBe('socks5://127.0.0.1:9150');
    });
  });

  describe('I2PHandler', () => {
    it('should route through HTTP proxy', async () => {
      const handler = new I2PHandler();
      await handler.connect();
      const address = await handler.route('example.i2p');
      expect(address).toContain('http://127.0.0.1:4444');
    });
  });

  describe('GNUnetHandler', () => {
    it('should route with gnunet protocol', async () => {
      const handler = new GNUnetHandler();
      await handler.connect();
      const address = await handler.route('example');
      expect(address).toBe('gnunet://example');
    });
  });

  describe('DVPNHandler', () => {
    it('should route through dVPN endpoint', async () => {
      const handler = new DVPNHandler();
      await handler.connect();
      const address = await handler.route('example.com');
      expect(address).toContain('dvpn://');
    });
  });

  describe('CustomNetworkHandler', () => {
    it('should use custom prefix', async () => {
      const handler = new CustomNetworkHandler({ routePrefix: 'mesh://' });
      await handler.connect();
      const address = await handler.route('node1');
      expect(address).toBe('mesh://node1');
    });
  });
});
