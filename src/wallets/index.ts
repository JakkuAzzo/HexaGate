/**
 * HexaGate Wallet Integration
 * Provides interfaces for crypto and TradFi wallets.
 */

import * as crypto from 'crypto';
import type { Wallet, WalletBalance, WalletType } from '../types/index.js';

/**
 * Wallet Manager - Manages crypto and TradFi wallets
 */
export class WalletManager {
  private wallets: Map<string, Wallet> = new Map();
  private activeWalletId: string | null = null;

  /**
   * Create a new wallet
   */
  createWallet(type: WalletType, name: string): Wallet {
    const wallet: Wallet = {
      id: this.generateWalletId(),
      type,
      name,
      connected: false
    };

    this.wallets.set(wallet.id, wallet);
    return wallet;
  }

  /**
   * Get a wallet by ID
   */
  getWallet(id: string): Wallet | null {
    return this.wallets.get(id) ?? null;
  }

  /**
   * Remove a wallet
   */
  removeWallet(id: string): boolean {
    if (this.activeWalletId === id) {
      this.activeWalletId = null;
    }
    return this.wallets.delete(id);
  }

  /**
   * List all wallets
   */
  listWallets(): Wallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get wallets by type
   */
  getWalletsByType(type: WalletType): Wallet[] {
    return this.listWallets().filter(w => w.type === type);
  }

  /**
   * Set active wallet
   */
  setActiveWallet(id: string): boolean {
    if (!this.wallets.has(id)) return false;
    this.activeWalletId = id;
    return true;
  }

  /**
   * Get active wallet
   */
  getActiveWallet(): Wallet | null {
    return this.activeWalletId ? this.getWallet(this.activeWalletId) : null;
  }

  /**
   * Connect a wallet
   */
  connectWallet(id: string, address: string, publicKey?: string): boolean {
    const wallet = this.wallets.get(id);
    if (!wallet) return false;

    wallet.connected = true;
    wallet.address = address;
    if (publicKey) wallet.publicKey = publicKey;
    return true;
  }

  /**
   * Disconnect a wallet
   */
  disconnectWallet(id: string): boolean {
    const wallet = this.wallets.get(id);
    if (!wallet) return false;

    wallet.connected = false;
    return true;
  }

  /**
   * Update wallet balance
   */
  updateBalance(id: string, balance: WalletBalance): boolean {
    const wallet = this.wallets.get(id);
    if (!wallet) return false;

    wallet.balance = balance;
    return true;
  }

  /**
   * Get connected wallets
   */
  getConnectedWallets(): Wallet[] {
    return this.listWallets().filter(w => w.connected);
  }

  /**
   * Get wallet count
   */
  getWalletCount(): number {
    return this.wallets.size;
  }

  private generateWalletId(): string {
    return `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Crypto Wallet Interface - For cryptocurrency wallets
 */
export interface CryptoWalletAdapter {
  getChainId(): string;
  getAddress(): Promise<string>;
  signMessage(message: string): Promise<string>;
  signTransaction(transaction: CryptoTransaction): Promise<string>;
  sendTransaction(signedTx: string): Promise<string>;
  getBalance(): Promise<WalletBalance>;
}

export interface CryptoTransaction {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
}

/**
 * TradFi Wallet Interface - For traditional finance wallets
 */
export interface TradFiWalletAdapter {
  getAccountId(): string;
  getAccountType(): string;
  getBalance(): Promise<WalletBalance>;
  getTransactionHistory(limit?: number): Promise<TradFiTransaction[]>;
}

export interface TradFiTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: string;
  currency: string;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Mock Crypto Wallet - For testing purposes
 */
export class MockCryptoWallet implements CryptoWalletAdapter {
  private chainId: string;
  private address: string;

  constructor(chainId: string = '1', address?: string) {
    this.chainId = chainId;
    this.address = address ?? this.generateMockAddress();
  }

  getChainId(): string {
    return this.chainId;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessage(message: string): Promise<string> {
    // Mock signature using hash
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    return `0x${hash}`;
  }

  async signTransaction(transaction: CryptoTransaction): Promise<string> {
    // Mock signed transaction
    const txData = JSON.stringify(transaction);
    const hash = crypto.createHash('sha256').update(txData).digest('hex');
    return `0x${hash}`;
  }

  async sendTransaction(_signedTx: string): Promise<string> {
    // Mock transaction hash
    return `0x${crypto.randomBytes(32).toString('hex')}`;
  }

  async getBalance(): Promise<WalletBalance> {
    return {
      currency: 'ETH',
      amount: '1.0',
      lastUpdated: new Date()
    };
  }

  private generateMockAddress(): string {
    return `0x${crypto.randomBytes(20).toString('hex')}`;
  }
}

/**
 * Mock TradFi Wallet - For testing purposes
 */
export class MockTradFiWallet implements TradFiWalletAdapter {
  private accountId: string;
  private accountType: string;

  constructor(accountId?: string, accountType: string = 'checking') {
    this.accountId = accountId ?? this.generateMockAccountId();
    this.accountType = accountType;
  }

  getAccountId(): string {
    return this.accountId;
  }

  getAccountType(): string {
    return this.accountType;
  }

  async getBalance(): Promise<WalletBalance> {
    return {
      currency: 'USD',
      amount: '10000.00',
      lastUpdated: new Date()
    };
  }

  async getTransactionHistory(limit: number = 10): Promise<TradFiTransaction[]> {
    const transactions: TradFiTransaction[] = [];
    for (let i = 0; i < limit; i++) {
      transactions.push({
        id: `tx_${i}`,
        type: i % 2 === 0 ? 'credit' : 'debit',
        amount: `${(Math.random() * 1000).toFixed(2)}`,
        currency: 'USD',
        description: `Mock transaction ${i}`,
        timestamp: new Date(Date.now() - i * 86400000),
        status: 'completed'
      });
    }
    return transactions;
  }

  private generateMockAccountId(): string {
    return `ACCT${Math.floor(Math.random() * 1000000000).toString().padStart(10, '0')}`;
  }
}
