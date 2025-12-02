/**
 * HexaGate Encrypted Spaces
 * Provides task isolation with encryption for secure browsing sessions.
 */

import * as crypto from 'crypto';
import type { 
  Space, 
  SpaceTask, 
  EncryptedData, 
  SecurityLevel, 
  NetworkType 
} from '../types/index.js';

/**
 * Space Manager - Manages encrypted browsing spaces
 */
export class SpaceManager {
  private spaces: Map<string, Space> = new Map();
  private activeSpaceId: string | null = null;

  /**
   * Create a new encrypted space
   */
  createSpace(name: string, securityLevel: SecurityLevel = 'standard'): Space {
    const encryptionKey = this.generateEncryptionKey();
    
    const space: Space = {
      id: this.generateSpaceId(),
      name,
      encryptionKey,
      securityLevel,
      tasks: [],
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    this.spaces.set(space.id, space);
    return space;
  }

  /**
   * Get a space by ID
   */
  getSpace(id: string): Space | null {
    const space = this.spaces.get(id);
    if (space) {
      space.lastAccessedAt = new Date();
    }
    return space ?? null;
  }

  /**
   * Delete a space and all its tasks
   */
  deleteSpace(id: string): boolean {
    if (this.activeSpaceId === id) {
      this.activeSpaceId = null;
    }
    return this.spaces.delete(id);
  }

  /**
   * Set the active space
   */
  setActiveSpace(id: string): boolean {
    if (!this.spaces.has(id)) {
      return false;
    }
    this.activeSpaceId = id;
    return true;
  }

  /**
   * Get the currently active space
   */
  getActiveSpace(): Space | null {
    return this.activeSpaceId ? this.getSpace(this.activeSpaceId) : null;
  }

  /**
   * List all spaces
   */
  listSpaces(): Space[] {
    return Array.from(this.spaces.values());
  }

  /**
   * Add a task to a space
   */
  addTask(
    spaceId: string,
    name: string,
    networkType: NetworkType,
    handle?: string
  ): SpaceTask | null {
    const space = this.spaces.get(spaceId);
    if (!space) {
      return null;
    }

    const task: SpaceTask = {
      id: this.generateTaskId(),
      name,
      networkType,
      handle,
      state: 'active',
      data: this.createEmptyEncryptedData()
    };

    space.tasks.push(task);
    space.lastAccessedAt = new Date();
    return task;
  }

  /**
   * Update task state
   */
  updateTaskState(
    spaceId: string,
    taskId: string,
    state: SpaceTask['state']
  ): boolean {
    const space = this.spaces.get(spaceId);
    if (!space) {
      return false;
    }

    const task = space.tasks.find(t => t.id === taskId);
    if (!task) {
      return false;
    }

    task.state = state;
    space.lastAccessedAt = new Date();
    return true;
  }

  /**
   * Remove a task from a space
   */
  removeTask(spaceId: string, taskId: string): boolean {
    const space = this.spaces.get(spaceId);
    if (!space) {
      return false;
    }

    const initialLength = space.tasks.length;
    space.tasks = space.tasks.filter(t => t.id !== taskId);
    space.lastAccessedAt = new Date();
    return space.tasks.length < initialLength;
  }

  /**
   * Get tasks in a space
   */
  getTasks(spaceId: string): SpaceTask[] {
    return this.spaces.get(spaceId)?.tasks ?? [];
  }

  /**
   * Get space count
   */
  getSpaceCount(): number {
    return this.spaces.size;
  }

  private generateSpaceId(): string {
    return `space_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private createEmptyEncryptedData(): EncryptedData {
    return {
      ciphertext: '',
      iv: '',
      authTag: '',
      algorithm: 'aes-256-gcm'
    };
  }
}

/**
 * Space Encryption - Handles encryption/decryption of space data
 */
export class SpaceEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;

  /**
   * Encrypt data for a space
   */
  static encrypt(data: string, key: string): EncryptedData {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = crypto.randomBytes(this.IV_LENGTH);
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);
    
    let ciphertext = cipher.update(data, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.ALGORITHM
    };
  }

  /**
   * Decrypt space data
   */
  static decrypt(encryptedData: EncryptedData, key: string): string {
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  /**
   * Generate a new encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Derive a key from a password
   */
  static deriveKey(password: string, salt: string): string {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      32,
      'sha512'
    ).toString('hex');
  }

  /**
   * Generate a random salt
   */
  static generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
