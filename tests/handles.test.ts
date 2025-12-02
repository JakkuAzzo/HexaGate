/**
 * Tests for HexaGate Handle System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HandleResolver, HandleParser } from '../src/handles/index.js';

describe('HandleResolver', () => {
  let resolver: HandleResolver;

  beforeEach(() => {
    resolver = new HandleResolver();
  });

  describe('Handle Registration', () => {
    it('should register a new handle', () => {
      const handle = resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      expect(handle.name).toBe('my-site');
      expect(handle.address).toBe('https://example.com');
      expect(handle.networkType).toBe('clearnet');
    });

    it('should throw when registering duplicate handle', () => {
      resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      expect(() => resolver.registerHandle('my-site', 'clearnet', 'https://other.com'))
        .toThrow('already registered');
    });

    it('should register handle with metadata', () => {
      const handle = resolver.registerHandle('my-site', 'tor', 'example.onion', {
        description: 'My hidden service',
        tags: ['personal', 'blog']
      });
      expect(handle.metadata?.description).toBe('My hidden service');
      expect(handle.metadata?.tags).toContain('blog');
    });
  });

  describe('Handle Resolution', () => {
    it('should resolve existing handle', () => {
      resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      const resolved = resolver.resolve('my-site');
      expect(resolved?.address).toBe('https://example.com');
    });

    it('should return null for non-existent handle', () => {
      const resolved = resolver.resolve('non-existent');
      expect(resolved).toBeNull();
    });

    it('should normalize handle names to lowercase', () => {
      resolver.registerHandle('My-Site', 'clearnet', 'https://example.com');
      const resolved = resolver.resolve('MY-SITE');
      expect(resolved?.address).toBe('https://example.com');
    });
  });

  describe('Handle Aliases', () => {
    it('should create alias for handle', () => {
      resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      const result = resolver.createAlias('site', 'my-site');
      expect(result).toBe(true);
    });

    it('should resolve alias to target handle', () => {
      resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      resolver.createAlias('site', 'my-site');
      const resolved = resolver.resolve('site');
      expect(resolved?.name).toBe('my-site');
    });

    it('should throw when creating alias with existing handle name', () => {
      resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      resolver.registerHandle('other', 'clearnet', 'https://other.com');
      expect(() => resolver.createAlias('other', 'my-site'))
        .toThrow('already registered');
    });
  });

  describe('Handle Updates', () => {
    it('should update handle address', () => {
      resolver.registerHandle('my-site', 'clearnet', 'https://example.com');
      const updated = resolver.updateHandle('my-site', { address: 'https://new.com' });
      expect(updated?.address).toBe('https://new.com');
    });

    it('should return null when updating non-existent handle', () => {
      const updated = resolver.updateHandle('non-existent', { address: 'https://new.com' });
      expect(updated).toBeNull();
    });
  });

  describe('Handle Search', () => {
    beforeEach(() => {
      resolver.registerHandle('personal-blog', 'clearnet', 'https://blog.com', {
        description: 'My personal blog',
        tags: ['blog', 'personal']
      });
      resolver.registerHandle('work-site', 'clearnet', 'https://work.com', {
        description: 'Work related site',
        tags: ['work', 'professional']
      });
    });

    it('should search by name', () => {
      const results = resolver.searchHandles('blog');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('personal-blog');
    });

    it('should search by description', () => {
      const results = resolver.searchHandles('work');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('work-site');
    });

    it('should search by tags', () => {
      const results = resolver.searchHandles('professional');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('work-site');
    });
  });

  describe('Handle Validation', () => {
    it('should validate correct handle names', () => {
      expect(resolver.isValidHandleName('my-site')).toBe(true);
      expect(resolver.isValidHandleName('my_site')).toBe(true);
      expect(resolver.isValidHandleName('MySite123')).toBe(true);
    });

    it('should reject invalid handle names', () => {
      expect(resolver.isValidHandleName('ab')).toBe(false); // too short
      expect(resolver.isValidHandleName('123site')).toBe(false); // starts with number
      expect(resolver.isValidHandleName('my site')).toBe(false); // contains space
    });
  });

  describe('Export/Import', () => {
    it('should export handles', () => {
      resolver.registerHandle('site1', 'clearnet', 'https://site1.com');
      resolver.registerHandle('site2', 'tor', 'site2.onion');
      const exported = resolver.exportHandles();
      expect(exported.length).toBe(2);
    });

    it('should import handles', () => {
      const handles = [
        {
          id: 'h1',
          name: 'imported-site',
          networkType: 'clearnet' as const,
          address: 'https://imported.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      const count = resolver.importHandles(handles);
      expect(count).toBe(1);
      expect(resolver.hasHandle('imported-site')).toBe(true);
    });
  });
});

describe('HandleParser', () => {
  describe('Parsing', () => {
    it('should parse handle without prefix', () => {
      const result = HandleParser.parse('my-site');
      expect(result.name).toBe('my-site');
      expect(result.networkType).toBeUndefined();
    });

    it('should parse Tor handle', () => {
      const result = HandleParser.parse('tor:hidden-service');
      expect(result.name).toBe('hidden-service');
      expect(result.networkType).toBe('tor');
    });

    it('should parse I2P handle', () => {
      const result = HandleParser.parse('i2p:eepsite');
      expect(result.name).toBe('eepsite');
      expect(result.networkType).toBe('i2p');
    });

    it('should parse GNUnet handle', () => {
      const result = HandleParser.parse('gnu:gns-name');
      expect(result.name).toBe('gns-name');
      expect(result.networkType).toBe('gnunet');
    });
  });

  describe('Formatting', () => {
    it('should format handle with network prefix', () => {
      const formatted = HandleParser.format('my-site', 'tor');
      expect(formatted).toBe('tor:my-site');
    });

    it('should return name only for unknown network', () => {
      const formatted = HandleParser.format('my-site', 'custom');
      expect(formatted).toBe('custom:my-site');
    });
  });
});
