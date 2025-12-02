/**
 * HexaGate Handle System
 * Replaces traditional URLs with human-readable handles.
 */

import type { Handle, HandleMetadata, NetworkType } from '../types/index.js';

/**
 * Handle Resolver - Maps human-readable handles to network addresses
 */
export class HandleResolver {
  private handles: Map<string, Handle> = new Map();
  private aliasMap: Map<string, string> = new Map();

  /**
   * Register a new handle
   */
  registerHandle(
    name: string,
    networkType: NetworkType,
    address: string,
    metadata?: HandleMetadata
  ): Handle {
    const normalizedName = this.normalizeHandleName(name);
    
    if (this.handles.has(normalizedName)) {
      throw new Error(`Handle "${name}" is already registered`);
    }

    const handle: Handle = {
      id: this.generateHandleId(),
      name: normalizedName,
      networkType,
      address,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.handles.set(normalizedName, handle);
    return handle;
  }

  /**
   * Update an existing handle
   */
  updateHandle(
    name: string,
    updates: Partial<Pick<Handle, 'address' | 'networkType' | 'metadata'>>
  ): Handle | null {
    const normalizedName = this.normalizeHandleName(name);
    const handle = this.handles.get(normalizedName);

    if (!handle) {
      return null;
    }

    const updatedHandle: Handle = {
      ...handle,
      ...updates,
      updatedAt: new Date()
    };

    this.handles.set(normalizedName, updatedHandle);
    return updatedHandle;
  }

  /**
   * Resolve a handle to its network address
   */
  resolve(name: string): Handle | null {
    const normalizedName = this.normalizeHandleName(name);
    
    // Check for alias first
    const aliasTarget = this.aliasMap.get(normalizedName);
    if (aliasTarget) {
      return this.handles.get(aliasTarget) ?? null;
    }

    return this.handles.get(normalizedName) ?? null;
  }

  /**
   * Remove a handle
   */
  removeHandle(name: string): boolean {
    const normalizedName = this.normalizeHandleName(name);
    
    // Remove any aliases pointing to this handle
    for (const [alias, target] of this.aliasMap) {
      if (target === normalizedName) {
        this.aliasMap.delete(alias);
      }
    }

    return this.handles.delete(normalizedName);
  }

  /**
   * Create an alias for an existing handle
   */
  createAlias(alias: string, targetHandle: string): boolean {
    const normalizedAlias = this.normalizeHandleName(alias);
    const normalizedTarget = this.normalizeHandleName(targetHandle);

    if (this.handles.has(normalizedAlias)) {
      throw new Error(`"${alias}" is already registered as a handle`);
    }

    if (!this.handles.has(normalizedTarget)) {
      throw new Error(`Target handle "${targetHandle}" does not exist`);
    }

    this.aliasMap.set(normalizedAlias, normalizedTarget);
    return true;
  }

  /**
   * Remove an alias
   */
  removeAlias(alias: string): boolean {
    return this.aliasMap.delete(this.normalizeHandleName(alias));
  }

  /**
   * List all registered handles
   */
  listHandles(): Handle[] {
    return Array.from(this.handles.values());
  }

  /**
   * Search handles by name pattern
   */
  searchHandles(pattern: string): Handle[] {
    const normalizedPattern = pattern.toLowerCase();
    return this.listHandles().filter(handle =>
      handle.name.includes(normalizedPattern) ||
      handle.metadata?.description?.toLowerCase().includes(normalizedPattern) ||
      handle.metadata?.tags?.some(tag => tag.toLowerCase().includes(normalizedPattern))
    );
  }

  /**
   * Get handles by network type
   */
  getHandlesByNetwork(networkType: NetworkType): Handle[] {
    return this.listHandles().filter(handle => handle.networkType === networkType);
  }

  /**
   * Validate handle name format
   */
  isValidHandleName(name: string): boolean {
    // Handle names must be alphanumeric with hyphens/underscores
    // Must start with a letter, length 3-64 characters
    const handleRegex = /^[a-zA-Z][a-zA-Z0-9_-]{2,63}$/;
    return handleRegex.test(name);
  }

  /**
   * Check if a handle exists
   */
  hasHandle(name: string): boolean {
    const normalizedName = this.normalizeHandleName(name);
    return this.handles.has(normalizedName) || this.aliasMap.has(normalizedName);
  }

  /**
   * Get total number of registered handles
   */
  getHandleCount(): number {
    return this.handles.size;
  }

  /**
   * Export handles for backup
   */
  exportHandles(): Handle[] {
    return this.listHandles();
  }

  /**
   * Import handles from backup
   */
  importHandles(handles: Handle[]): number {
    let imported = 0;
    for (const handle of handles) {
      const normalizedName = this.normalizeHandleName(handle.name);
      if (!this.handles.has(normalizedName)) {
        this.handles.set(normalizedName, {
          ...handle,
          id: this.generateHandleId(),
          createdAt: new Date(handle.createdAt),
          updatedAt: new Date()
        });
        imported++;
      }
    }
    return imported;
  }

  private normalizeHandleName(name: string): string {
    return name.toLowerCase().trim();
  }

  private generateHandleId(): string {
    return `handle_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Handle Parser - Parses handle strings with optional network prefixes
 */
export class HandleParser {
  private static readonly NETWORK_PREFIXES: Record<string, NetworkType> = {
    'tor:': 'tor',
    'i2p:': 'i2p',
    'gnu:': 'gnunet',
    'vpn:': 'dvpn',
    'net:': 'clearnet',
    'custom:': 'custom'
  };

  /**
   * Parse a handle string into components
   */
  static parse(input: string): { name: string; networkType?: NetworkType } {
    for (const [prefix, networkType] of Object.entries(this.NETWORK_PREFIXES)) {
      if (input.toLowerCase().startsWith(prefix)) {
        return {
          name: input.substring(prefix.length),
          networkType
        };
      }
    }
    
    return { name: input };
  }

  /**
   * Format a handle with network prefix
   */
  static format(name: string, networkType: NetworkType): string {
    const prefix = Object.entries(this.NETWORK_PREFIXES)
      .find(([_, type]) => type === networkType)?.[0];
    
    return prefix ? `${prefix}${name}` : name;
  }
}
