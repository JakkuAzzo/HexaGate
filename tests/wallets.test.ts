/**
 * Tests for HexaGate Wallet Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WalletManager, 
  MockCryptoWallet, 
  MockTradFiWallet 
} from '../src/wallets/index.js';

describe('WalletManager', () => {
  let walletManager: WalletManager;

  beforeEach(() => {
    walletManager = new WalletManager();
  });

  describe('Wallet Creation', () => {
    it('should create crypto wallet', () => {
      const wallet = walletManager.createWallet('crypto', 'My ETH Wallet');
      expect(wallet.type).toBe('crypto');
      expect(wallet.name).toBe('My ETH Wallet');
      expect(wallet.connected).toBe(false);
    });

    it('should create tradfi wallet', () => {
      const wallet = walletManager.createWallet('tradfi', 'My Bank Account');
      expect(wallet.type).toBe('tradfi');
      expect(wallet.name).toBe('My Bank Account');
    });
  });

  describe('Wallet Management', () => {
    let walletId: string;

    beforeEach(() => {
      const wallet = walletManager.createWallet('crypto', 'Test Wallet');
      walletId = wallet.id;
    });

    it('should get wallet by ID', () => {
      const wallet = walletManager.getWallet(walletId);
      expect(wallet?.name).toBe('Test Wallet');
    });

    it('should return null for non-existent wallet', () => {
      const wallet = walletManager.getWallet('non-existent');
      expect(wallet).toBeNull();
    });

    it('should remove wallet', () => {
      const result = walletManager.removeWallet(walletId);
      expect(result).toBe(true);
      expect(walletManager.getWallet(walletId)).toBeNull();
    });

    it('should list all wallets', () => {
      walletManager.createWallet('tradfi', 'Another Wallet');
      const wallets = walletManager.listWallets();
      expect(wallets.length).toBe(2);
    });
  });

  describe('Wallet Type Filtering', () => {
    beforeEach(() => {
      walletManager.createWallet('crypto', 'ETH Wallet');
      walletManager.createWallet('crypto', 'BTC Wallet');
      walletManager.createWallet('tradfi', 'Bank Account');
    });

    it('should filter crypto wallets', () => {
      const cryptoWallets = walletManager.getWalletsByType('crypto');
      expect(cryptoWallets.length).toBe(2);
    });

    it('should filter tradfi wallets', () => {
      const tradfiWallets = walletManager.getWalletsByType('tradfi');
      expect(tradfiWallets.length).toBe(1);
    });
  });

  describe('Active Wallet', () => {
    it('should set and get active wallet', () => {
      const wallet = walletManager.createWallet('crypto', 'Active');
      walletManager.setActiveWallet(wallet.id);
      expect(walletManager.getActiveWallet()?.id).toBe(wallet.id);
    });

    it('should return null when no active wallet', () => {
      expect(walletManager.getActiveWallet()).toBeNull();
    });

    it('should clear active wallet on removal', () => {
      const wallet = walletManager.createWallet('crypto', 'ToRemove');
      walletManager.setActiveWallet(wallet.id);
      walletManager.removeWallet(wallet.id);
      expect(walletManager.getActiveWallet()).toBeNull();
    });
  });

  describe('Wallet Connection', () => {
    let walletId: string;

    beforeEach(() => {
      const wallet = walletManager.createWallet('crypto', 'Connect Test');
      walletId = wallet.id;
    });

    it('should connect wallet', () => {
      const result = walletManager.connectWallet(walletId, '0x123...', 'pubkey');
      expect(result).toBe(true);
      
      const wallet = walletManager.getWallet(walletId);
      expect(wallet?.connected).toBe(true);
      expect(wallet?.address).toBe('0x123...');
      expect(wallet?.publicKey).toBe('pubkey');
    });

    it('should disconnect wallet', () => {
      walletManager.connectWallet(walletId, '0x123...');
      walletManager.disconnectWallet(walletId);
      
      const wallet = walletManager.getWallet(walletId);
      expect(wallet?.connected).toBe(false);
    });

    it('should get connected wallets', () => {
      const wallet2 = walletManager.createWallet('crypto', 'Another');
      walletManager.connectWallet(walletId, '0x123...');
      
      const connected = walletManager.getConnectedWallets();
      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe(walletId);
    });
  });

  describe('Wallet Balance', () => {
    it('should update balance', () => {
      const wallet = walletManager.createWallet('crypto', 'Balance Test');
      
      walletManager.updateBalance(wallet.id, {
        currency: 'ETH',
        amount: '1.5',
        lastUpdated: new Date()
      });
      
      const updated = walletManager.getWallet(wallet.id);
      expect(updated?.balance?.amount).toBe('1.5');
      expect(updated?.balance?.currency).toBe('ETH');
    });
  });
});

describe('MockCryptoWallet', () => {
  let mockWallet: MockCryptoWallet;

  beforeEach(() => {
    mockWallet = new MockCryptoWallet();
  });

  describe('Basic Properties', () => {
    it('should have chain ID', () => {
      expect(mockWallet.getChainId()).toBe('1');
    });

    it('should use custom chain ID', () => {
      const wallet = new MockCryptoWallet('137');
      expect(wallet.getChainId()).toBe('137');
    });

    it('should generate address', async () => {
      const address = await mockWallet.getAddress();
      expect(address.startsWith('0x')).toBe(true);
      expect(address.length).toBe(42);
    });

    it('should use custom address', async () => {
      const wallet = new MockCryptoWallet('1', '0x1234567890123456789012345678901234567890');
      const address = await wallet.getAddress();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('Signing', () => {
    it('should sign message', async () => {
      const signature = await mockWallet.signMessage('Hello');
      expect(signature.startsWith('0x')).toBe(true);
    });

    it('should sign transaction', async () => {
      const signed = await mockWallet.signTransaction({
        to: '0x123...',
        value: '1000000000000000000'
      });
      expect(signed.startsWith('0x')).toBe(true);
    });
  });

  describe('Transactions', () => {
    it('should send transaction', async () => {
      const txHash = await mockWallet.sendTransaction('0xsigned...');
      expect(txHash.startsWith('0x')).toBe(true);
      expect(txHash.length).toBe(66);
    });
  });

  describe('Balance', () => {
    it('should get balance', async () => {
      const balance = await mockWallet.getBalance();
      expect(balance.currency).toBe('ETH');
      expect(balance.amount).toBe('1.0');
    });
  });
});

describe('MockTradFiWallet', () => {
  let mockWallet: MockTradFiWallet;

  beforeEach(() => {
    mockWallet = new MockTradFiWallet();
  });

  describe('Basic Properties', () => {
    it('should have account ID', () => {
      const accountId = mockWallet.getAccountId();
      expect(accountId.startsWith('ACCT')).toBe(true);
    });

    it('should use custom account ID', () => {
      const wallet = new MockTradFiWallet('CUSTOM123');
      expect(wallet.getAccountId()).toBe('CUSTOM123');
    });

    it('should have account type', () => {
      expect(mockWallet.getAccountType()).toBe('checking');
    });

    it('should use custom account type', () => {
      const wallet = new MockTradFiWallet(undefined, 'savings');
      expect(wallet.getAccountType()).toBe('savings');
    });
  });

  describe('Balance', () => {
    it('should get balance', async () => {
      const balance = await mockWallet.getBalance();
      expect(balance.currency).toBe('USD');
      expect(parseFloat(balance.amount)).toBeGreaterThan(0);
    });
  });

  describe('Transaction History', () => {
    it('should get transaction history', async () => {
      const transactions = await mockWallet.getTransactionHistory(5);
      expect(transactions.length).toBe(5);
    });

    it('should have transaction properties', async () => {
      const transactions = await mockWallet.getTransactionHistory(1);
      const tx = transactions[0];
      
      expect(tx.id).toBeDefined();
      expect(['credit', 'debit']).toContain(tx.type);
      expect(tx.currency).toBe('USD');
      expect(tx.status).toBe('completed');
    });
  });
});
