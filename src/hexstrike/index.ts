/**
 * HexaGate Hexstrike MCP
 * Agent embedding framework for automation, OSINT, and research.
 */

import type { 
  Agent, 
  AgentType, 
  AgentPermissions, 
  NetworkType 
} from '../types/index.js';

/**
 * Agent Registry - Manages embedded agents
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private runningAgents: Set<string> = new Set();

  /**
   * Register a new agent
   */
  registerAgent(
    type: AgentType,
    name: string,
    description: string,
    permissions: AgentPermissions,
    config: Record<string, unknown> = {}
  ): Agent {
    const agent: Agent = {
      id: this.generateAgentId(),
      type,
      name,
      description,
      enabled: true,
      permissions,
      config
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent | null {
    return this.agents.get(id) ?? null;
  }

  /**
   * Update agent configuration
   */
  updateAgent(id: string, updates: Partial<Pick<Agent, 'name' | 'description' | 'enabled' | 'permissions' | 'config'>>): Agent | null {
    const agent = this.agents.get(id);
    if (!agent) {
      return null;
    }

    const updatedAgent: Agent = {
      ...agent,
      ...updates
    };

    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  /**
   * Remove an agent
   */
  removeAgent(id: string): boolean {
    this.runningAgents.delete(id);
    return this.agents.delete(id);
  }

  /**
   * List all agents
   */
  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): Agent[] {
    return this.listAgents().filter(agent => agent.type === type);
  }

  /**
   * Enable an agent
   */
  enableAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    agent.enabled = true;
    return true;
  }

  /**
   * Disable an agent
   */
  disableAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    agent.enabled = false;
    this.runningAgents.delete(id);
    return true;
  }

  /**
   * Check if agent is running
   */
  isAgentRunning(id: string): boolean {
    return this.runningAgents.has(id);
  }

  /**
   * Start an agent
   */
  startAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent || !agent.enabled) return false;
    this.runningAgents.add(id);
    return true;
  }

  /**
   * Stop an agent
   */
  stopAgent(id: string): boolean {
    return this.runningAgents.delete(id);
  }

  /**
   * Get count of registered agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Agent Permission Builder - Fluent API for creating agent permissions
 */
export class AgentPermissionBuilder {
  private permissions: AgentPermissions = {
    networkAccess: [],
    spaceAccess: [],
    canExecuteCommands: false,
    canAccessWallets: false
  };

  /**
   * Allow network access
   */
  allowNetwork(...networks: NetworkType[]): this {
    this.permissions.networkAccess.push(...networks);
    return this;
  }

  /**
   * Allow access to specific spaces
   */
  allowSpaces(...spaceIds: string[]): this {
    this.permissions.spaceAccess.push(...spaceIds);
    return this;
  }

  /**
   * Allow command execution
   */
  allowCommands(): this {
    this.permissions.canExecuteCommands = true;
    return this;
  }

  /**
   * Allow wallet access
   */
  allowWalletAccess(): this {
    this.permissions.canAccessWallets = true;
    return this;
  }

  /**
   * Build the permissions object
   */
  build(): AgentPermissions {
    return { ...this.permissions };
  }

  /**
   * Create minimal permissions (read-only, no network)
   */
  static minimal(): AgentPermissions {
    return new AgentPermissionBuilder().build();
  }

  /**
   * Create standard permissions (clearnet access, no commands)
   */
  static standard(): AgentPermissions {
    return new AgentPermissionBuilder()
      .allowNetwork('clearnet')
      .build();
  }

  /**
   * Create full permissions (all networks, commands, wallets)
   */
  static full(): AgentPermissions {
    return new AgentPermissionBuilder()
      .allowNetwork('clearnet', 'tor', 'i2p', 'gnunet', 'dvpn')
      .allowCommands()
      .allowWalletAccess()
      .build();
  }
}

/**
 * Agent Context - Provides context and utilities for agent execution
 */
export interface AgentContext {
  agentId: string;
  spaceId?: string;
  permissions: AgentPermissions;
  timestamp: Date;
}

/**
 * Agent Task - Represents a task that an agent can execute
 */
export interface AgentTask {
  id: string;
  agentId: string;
  type: 'automation' | 'osint' | 'research' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Agent Task Manager - Manages agent task execution
 */
export class AgentTaskManager {
  private tasks: Map<string, AgentTask> = new Map();
  private taskQueue: string[] = [];

  /**
   * Create a new task
   */
  createTask(
    agentId: string,
    type: AgentTask['type'],
    input: Record<string, unknown>
  ): AgentTask {
    const task: AgentTask = {
      id: this.generateTaskId(),
      agentId,
      type,
      status: 'pending',
      input
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task.id);
    return task;
  }

  /**
   * Get a task by ID
   */
  getTask(id: string): AgentTask | null {
    return this.tasks.get(id) ?? null;
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    id: string,
    status: AgentTask['status'],
    output?: Record<string, unknown>,
    error?: string
  ): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    task.status = status;
    if (output) task.output = output;
    if (error) task.error = error;
    
    if (status === 'running' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date();
    }

    return true;
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): AgentTask[] {
    return this.taskQueue
      .map(id => this.tasks.get(id))
      .filter((task): task is AgentTask => task?.status === 'pending');
  }

  /**
   * Get tasks by agent
   */
  getTasksByAgent(agentId: string): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.agentId === agentId);
  }

  /**
   * Get next task from queue
   */
  getNextTask(): AgentTask | null {
    while (this.taskQueue.length > 0) {
      const taskId = this.taskQueue.shift();
      if (taskId) {
        const task = this.tasks.get(taskId);
        if (task?.status === 'pending') {
          return task;
        }
      }
    }
    return null;
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
