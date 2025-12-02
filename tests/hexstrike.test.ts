/**
 * Tests for HexaGate Hexstrike MCP (Agent Framework)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  AgentRegistry, 
  AgentPermissionBuilder, 
  AgentTaskManager 
} from '../src/hexstrike/index.js';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('Agent Registration', () => {
    it('should register a new agent', () => {
      const permissions = AgentPermissionBuilder.standard();
      const agent = registry.registerAgent(
        'automation',
        'TestBot',
        'Test automation agent',
        permissions
      );
      expect(agent.name).toBe('TestBot');
      expect(agent.type).toBe('automation');
      expect(agent.enabled).toBe(true);
    });

    it('should register agent with custom config', () => {
      const permissions = AgentPermissionBuilder.minimal();
      const agent = registry.registerAgent(
        'osint',
        'OSINTBot',
        'OSINT research agent',
        permissions,
        { searchEngines: ['duckduckgo'] }
      );
      expect(agent.config.searchEngines).toEqual(['duckduckgo']);
    });
  });

  describe('Agent Management', () => {
    let agentId: string;

    beforeEach(() => {
      const permissions = AgentPermissionBuilder.standard();
      const agent = registry.registerAgent('automation', 'Bot', 'Test', permissions);
      agentId = agent.id;
    });

    it('should get agent by ID', () => {
      const agent = registry.getAgent(agentId);
      expect(agent?.name).toBe('Bot');
    });

    it('should return null for non-existent agent', () => {
      const agent = registry.getAgent('non-existent');
      expect(agent).toBeNull();
    });

    it('should update agent', () => {
      const updated = registry.updateAgent(agentId, { name: 'UpdatedBot' });
      expect(updated?.name).toBe('UpdatedBot');
    });

    it('should remove agent', () => {
      const result = registry.removeAgent(agentId);
      expect(result).toBe(true);
      expect(registry.getAgent(agentId)).toBeNull();
    });

    it('should list all agents', () => {
      registry.registerAgent('osint', 'Bot2', 'Another bot', AgentPermissionBuilder.minimal());
      const agents = registry.listAgents();
      expect(agents.length).toBe(2);
    });
  });

  describe('Agent Type Filtering', () => {
    beforeEach(() => {
      registry.registerAgent('automation', 'AutoBot1', 'Auto 1', AgentPermissionBuilder.minimal());
      registry.registerAgent('automation', 'AutoBot2', 'Auto 2', AgentPermissionBuilder.minimal());
      registry.registerAgent('osint', 'OSINTBot', 'OSINT', AgentPermissionBuilder.minimal());
      registry.registerAgent('research', 'ResearchBot', 'Research', AgentPermissionBuilder.minimal());
    });

    it('should filter by type', () => {
      const automationAgents = registry.getAgentsByType('automation');
      expect(automationAgents.length).toBe(2);
    });

    it('should return empty array for no matches', () => {
      const customAgents = registry.getAgentsByType('custom');
      expect(customAgents.length).toBe(0);
    });
  });

  describe('Agent State Management', () => {
    let agentId: string;

    beforeEach(() => {
      const agent = registry.registerAgent('automation', 'Bot', 'Test', AgentPermissionBuilder.minimal());
      agentId = agent.id;
    });

    it('should enable agent', () => {
      registry.disableAgent(agentId);
      const result = registry.enableAgent(agentId);
      expect(result).toBe(true);
      expect(registry.getAgent(agentId)?.enabled).toBe(true);
    });

    it('should disable agent', () => {
      const result = registry.disableAgent(agentId);
      expect(result).toBe(true);
      expect(registry.getAgent(agentId)?.enabled).toBe(false);
    });

    it('should start agent', () => {
      const result = registry.startAgent(agentId);
      expect(result).toBe(true);
      expect(registry.isAgentRunning(agentId)).toBe(true);
    });

    it('should stop agent', () => {
      registry.startAgent(agentId);
      const result = registry.stopAgent(agentId);
      expect(result).toBe(true);
      expect(registry.isAgentRunning(agentId)).toBe(false);
    });

    it('should not start disabled agent', () => {
      registry.disableAgent(agentId);
      const result = registry.startAgent(agentId);
      expect(result).toBe(false);
    });
  });
});

describe('AgentPermissionBuilder', () => {
  describe('Fluent API', () => {
    it('should build permissions with network access', () => {
      const permissions = new AgentPermissionBuilder()
        .allowNetwork('clearnet', 'tor')
        .build();
      expect(permissions.networkAccess).toContain('clearnet');
      expect(permissions.networkAccess).toContain('tor');
    });

    it('should build permissions with space access', () => {
      const permissions = new AgentPermissionBuilder()
        .allowSpaces('space1', 'space2')
        .build();
      expect(permissions.spaceAccess).toContain('space1');
      expect(permissions.spaceAccess).toContain('space2');
    });

    it('should build permissions with command execution', () => {
      const permissions = new AgentPermissionBuilder()
        .allowCommands()
        .build();
      expect(permissions.canExecuteCommands).toBe(true);
    });

    it('should build permissions with wallet access', () => {
      const permissions = new AgentPermissionBuilder()
        .allowWalletAccess()
        .build();
      expect(permissions.canAccessWallets).toBe(true);
    });
  });

  describe('Presets', () => {
    it('should create minimal permissions', () => {
      const permissions = AgentPermissionBuilder.minimal();
      expect(permissions.networkAccess).toEqual([]);
      expect(permissions.canExecuteCommands).toBe(false);
    });

    it('should create standard permissions', () => {
      const permissions = AgentPermissionBuilder.standard();
      expect(permissions.networkAccess).toContain('clearnet');
      expect(permissions.canExecuteCommands).toBe(false);
    });

    it('should create full permissions', () => {
      const permissions = AgentPermissionBuilder.full();
      expect(permissions.networkAccess.length).toBeGreaterThan(0);
      expect(permissions.canExecuteCommands).toBe(true);
      expect(permissions.canAccessWallets).toBe(true);
    });
  });
});

describe('AgentTaskManager', () => {
  let taskManager: AgentTaskManager;

  beforeEach(() => {
    taskManager = new AgentTaskManager();
  });

  describe('Task Creation', () => {
    it('should create a new task', () => {
      const task = taskManager.createTask('agent1', 'automation', { query: 'test' });
      expect(task.agentId).toBe('agent1');
      expect(task.type).toBe('automation');
      expect(task.status).toBe('pending');
    });

    it('should store task input', () => {
      const task = taskManager.createTask('agent1', 'osint', { target: 'example.com' });
      expect(task.input.target).toBe('example.com');
    });
  });

  describe('Task Retrieval', () => {
    it('should get task by ID', () => {
      const created = taskManager.createTask('agent1', 'automation', {});
      const retrieved = taskManager.getTask(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get tasks by agent', () => {
      taskManager.createTask('agent1', 'automation', {});
      taskManager.createTask('agent1', 'automation', {});
      taskManager.createTask('agent2', 'automation', {});
      
      const tasks = taskManager.getTasksByAgent('agent1');
      expect(tasks.length).toBe(2);
    });

    it('should get pending tasks', () => {
      taskManager.createTask('agent1', 'automation', {});
      taskManager.createTask('agent2', 'automation', {});
      
      const pending = taskManager.getPendingTasks();
      expect(pending.length).toBe(2);
    });
  });

  describe('Task Status Updates', () => {
    it('should update task status to running', () => {
      const task = taskManager.createTask('agent1', 'automation', {});
      taskManager.updateTaskStatus(task.id, 'running');
      
      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('running');
      expect(updated?.startedAt).toBeDefined();
    });

    it('should update task status to completed', () => {
      const task = taskManager.createTask('agent1', 'automation', {});
      taskManager.updateTaskStatus(task.id, 'completed', { result: 'success' });
      
      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.output?.result).toBe('success');
      expect(updated?.completedAt).toBeDefined();
    });

    it('should update task status to failed', () => {
      const task = taskManager.createTask('agent1', 'automation', {});
      taskManager.updateTaskStatus(task.id, 'failed', undefined, 'Connection timeout');
      
      const updated = taskManager.getTask(task.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.error).toBe('Connection timeout');
    });
  });

  describe('Task Queue', () => {
    it('should get next task from queue', () => {
      const task1 = taskManager.createTask('agent1', 'automation', {});
      taskManager.createTask('agent2', 'automation', {});
      
      const next = taskManager.getNextTask();
      expect(next?.id).toBe(task1.id);
    });

    it('should skip completed tasks in queue', () => {
      const task1 = taskManager.createTask('agent1', 'automation', {});
      const task2 = taskManager.createTask('agent2', 'automation', {});
      
      taskManager.updateTaskStatus(task1.id, 'completed');
      
      const next = taskManager.getNextTask();
      expect(next?.id).toBe(task2.id);
    });

    it('should return null when queue is empty', () => {
      const next = taskManager.getNextTask();
      expect(next).toBeNull();
    });
  });
});
