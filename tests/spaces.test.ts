/**
 * Tests for HexaGate Encrypted Spaces
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpaceManager, SpaceEncryption } from '../src/spaces/index.js';

describe('SpaceManager', () => {
  let manager: SpaceManager;

  beforeEach(() => {
    manager = new SpaceManager();
  });

  describe('Space Creation', () => {
    it('should create a new space', () => {
      const space = manager.createSpace('Work');
      expect(space.name).toBe('Work');
      expect(space.encryptionKey).toBeDefined();
      expect(space.tasks).toEqual([]);
    });

    it('should create space with security level', () => {
      const space = manager.createSpace('Secure', 'maximum');
      expect(space.securityLevel).toBe('maximum');
    });

    it('should generate unique encryption key', () => {
      const space1 = manager.createSpace('Space1');
      const space2 = manager.createSpace('Space2');
      expect(space1.encryptionKey).not.toBe(space2.encryptionKey);
    });
  });

  describe('Space Management', () => {
    it('should get space by ID', () => {
      const created = manager.createSpace('Test');
      const retrieved = manager.getSpace(created.id);
      expect(retrieved?.name).toBe('Test');
    });

    it('should return null for non-existent space', () => {
      const space = manager.getSpace('non-existent');
      expect(space).toBeNull();
    });

    it('should delete space', () => {
      const space = manager.createSpace('ToDelete');
      const result = manager.deleteSpace(space.id);
      expect(result).toBe(true);
      expect(manager.getSpace(space.id)).toBeNull();
    });

    it('should list all spaces', () => {
      manager.createSpace('Space1');
      manager.createSpace('Space2');
      const spaces = manager.listSpaces();
      expect(spaces.length).toBe(2);
    });
  });

  describe('Active Space', () => {
    it('should set and get active space', () => {
      const space = manager.createSpace('Active');
      manager.setActiveSpace(space.id);
      expect(manager.getActiveSpace()?.id).toBe(space.id);
    });

    it('should return null when no active space', () => {
      expect(manager.getActiveSpace()).toBeNull();
    });

    it('should clear active space on deletion', () => {
      const space = manager.createSpace('ToDelete');
      manager.setActiveSpace(space.id);
      manager.deleteSpace(space.id);
      expect(manager.getActiveSpace()).toBeNull();
    });
  });

  describe('Task Management', () => {
    let spaceId: string;

    beforeEach(() => {
      const space = manager.createSpace('TaskSpace');
      spaceId = space.id;
    });

    it('should add task to space', () => {
      const task = manager.addTask(spaceId, 'Research', 'clearnet');
      expect(task?.name).toBe('Research');
      expect(task?.state).toBe('active');
    });

    it('should return null when adding task to non-existent space', () => {
      const task = manager.addTask('non-existent', 'Task', 'clearnet');
      expect(task).toBeNull();
    });

    it('should get tasks from space', () => {
      manager.addTask(spaceId, 'Task1', 'clearnet');
      manager.addTask(spaceId, 'Task2', 'tor');
      const tasks = manager.getTasks(spaceId);
      expect(tasks.length).toBe(2);
    });

    it('should update task state', () => {
      const task = manager.addTask(spaceId, 'Task', 'clearnet');
      const result = manager.updateTaskState(spaceId, task!.id, 'completed');
      expect(result).toBe(true);
      const tasks = manager.getTasks(spaceId);
      expect(tasks[0].state).toBe('completed');
    });

    it('should remove task from space', () => {
      const task = manager.addTask(spaceId, 'ToRemove', 'clearnet');
      const result = manager.removeTask(spaceId, task!.id);
      expect(result).toBe(true);
      expect(manager.getTasks(spaceId).length).toBe(0);
    });
  });
});

describe('SpaceEncryption', () => {
  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data', () => {
      const key = SpaceEncryption.generateKey();
      const plaintext = 'Sensitive data';
      
      const encrypted = SpaceEncryption.encrypt(plaintext, key);
      expect(encrypted.ciphertext).not.toBe(plaintext);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      
      const decrypted = SpaceEncryption.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different IVs for same data', () => {
      const key = SpaceEncryption.generateKey();
      const plaintext = 'Same data';
      
      const encrypted1 = SpaceEncryption.encrypt(plaintext, key);
      const encrypted2 = SpaceEncryption.encrypt(plaintext, key);
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong key', () => {
      const key1 = SpaceEncryption.generateKey();
      const key2 = SpaceEncryption.generateKey();
      const plaintext = 'Secret';
      
      const encrypted = SpaceEncryption.encrypt(plaintext, key1);
      
      expect(() => SpaceEncryption.decrypt(encrypted, key2)).toThrow();
    });
  });

  describe('Key Generation', () => {
    it('should generate 64 character hex key', () => {
      const key = SpaceEncryption.generateKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = SpaceEncryption.generateKey();
      const key2 = SpaceEncryption.generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from password', () => {
      const salt = SpaceEncryption.generateSalt();
      const key = SpaceEncryption.deriveKey('password123', salt);
      expect(key.length).toBe(64);
    });

    it('should derive same key with same password and salt', () => {
      const salt = SpaceEncryption.generateSalt();
      const key1 = SpaceEncryption.deriveKey('password', salt);
      const key2 = SpaceEncryption.deriveKey('password', salt);
      expect(key1).toBe(key2);
    });

    it('should derive different keys with different salts', () => {
      const salt1 = SpaceEncryption.generateSalt();
      const salt2 = SpaceEncryption.generateSalt();
      const key1 = SpaceEncryption.deriveKey('password', salt1);
      const key2 = SpaceEncryption.deriveKey('password', salt2);
      expect(key1).not.toBe(key2);
    });
  });
});
