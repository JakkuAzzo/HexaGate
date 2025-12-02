# HexaGate

**Next-generation, security-first browser framework**

HexaGate unifies clearnet, Tor, I2P, GNUnet, dVPNs and emerging networks into a single routing framework. It replaces URLs with human-readable handles, isolates tasks into encrypted Spaces, and embeds agents via Hexstrike MCP for automation, OSINT, and research. With strict anti-downgrade policies, private PKI support, and integrated crypto/TradFi wallets, HexaGate becomes a trusted command surface for secure browsing and control.

## Features

### 🌐 Unified Routing Framework
- **Multi-network support**: Route traffic through clearnet, Tor, I2P, GNUnet, or decentralized VPNs
- **Automatic network selection**: Choose the optimal network based on security requirements
- **Extensible architecture**: Add custom network handlers for emerging protocols

### 📍 Human-Readable Handles
- **Replace URLs with memorable names**: Use `my-site` instead of `https://example.com`
- **Network-aware handles**: Prefix handles with network type (`tor:hidden-service`)
- **Alias support**: Create multiple names for the same destination
- **Searchable registry**: Find handles by name, description, or tags

### 🔐 Encrypted Spaces
- **Task isolation**: Separate browsing sessions into encrypted workspaces
- **AES-256-GCM encryption**: Military-grade encryption for all space data
- **Security levels**: Standard, Elevated, or Maximum security per space
- **Password-derived keys**: Derive encryption keys from user passwords

### 🤖 Hexstrike MCP (Agent Framework)
- **Automation agents**: Automate repetitive tasks
- **OSINT agents**: Gather intelligence from public sources
- **Research agents**: Assist with information gathering
- **Permission system**: Fine-grained control over agent capabilities
- **Task queue**: Manage and track agent tasks

### 🛡️ Security Policies
- **Anti-downgrade protection**: Prevent TLS downgrade attacks
- **Weak cipher detection**: Block connections using insecure ciphers
- **Certificate validation**: Verify certificate chains and expiration
- **Customizable rules**: Create policies tailored to your needs

### 🔑 Private PKI Support
- **Self-signed certificates**: Generate certificates for internal use
- **Trusted issuer management**: Control which CAs you trust
- **Certificate verification**: Validate certificates against custom policies

### 💰 Wallet Integration
- **Cryptocurrency wallets**: Connect to Web3 wallets
- **Traditional finance**: Interface with banking systems
- **Unified management**: Manage all wallets from one interface

## Installation

```bash
npm install hexagate
```

## Quick Start

```typescript
import { HexaGate } from 'hexagate';

// Create a new HexaGate instance
const hexagate = new HexaGate();

// Initialize with desired networks
await hexagate.initialize(['clearnet', 'tor', 'i2p']);

// Register a human-readable handle
hexagate.handles.registerHandle('my-site', 'clearnet', 'https://example.com', {
  description: 'My favorite website',
  tags: ['personal', 'main']
});

// Navigate using the handle
const response = await hexagate.navigate({ handle: 'my-site' });
console.log(response.resolvedAddress); // https://example.com

// Create an encrypted space for secure browsing
const space = hexagate.spaces.createSpace('Research', 'maximum');
hexagate.spaces.addTask(space.id, 'OSINT Research', 'tor');

// Set security level
hexagate.setSecurityLevel('elevated');

// Shutdown when done
await hexagate.shutdown();
```

## API Reference

### HexaGate

The main facade class providing access to all subsystems.

```typescript
const hexagate = new HexaGate();
await hexagate.initialize(['clearnet', 'tor']);
```

#### Properties
- `router` - Unified routing manager
- `handles` - Handle resolver
- `spaces` - Space manager
- `agents` - Agent registry
- `tasks` - Task manager
- `policies` - Security policy manager
- `pki` - PKI manager
- `security` - Security level manager
- `wallets` - Wallet manager

### Routing

```typescript
import { UnifiedRouter, TorHandler, I2PHandler } from 'hexagate';

const router = new UnifiedRouter();
router.registerHandler(new TorHandler());
router.registerHandler(new I2PHandler());

const response = await router.route({
  url: 'https://example.com',
  preferredNetwork: 'tor'
});
```

### Handles

```typescript
import { HandleResolver, HandleParser } from 'hexagate';

const resolver = new HandleResolver();

// Register a handle
resolver.registerHandle('example', 'tor', 'http://example.onion', {
  description: 'Example hidden service',
  tags: ['example', 'demo']
});

// Resolve a handle
const handle = resolver.resolve('example');

// Parse handle with network prefix
const parsed = HandleParser.parse('tor:my-service');
// { name: 'my-service', networkType: 'tor' }
```

### Spaces

```typescript
import { SpaceManager, SpaceEncryption } from 'hexagate';

const manager = new SpaceManager();

// Create an encrypted space
const space = manager.createSpace('Work', 'elevated');

// Add tasks to the space
manager.addTask(space.id, 'Research', 'clearnet');

// Encrypt data
const encrypted = SpaceEncryption.encrypt('sensitive data', space.encryptionKey);

// Decrypt data
const decrypted = SpaceEncryption.decrypt(encrypted, space.encryptionKey);
```

### Agents (Hexstrike MCP)

```typescript
import { AgentRegistry, AgentPermissionBuilder, AgentTaskManager } from 'hexagate';

const registry = new AgentRegistry();
const taskManager = new AgentTaskManager();

// Create an agent with permissions
const permissions = new AgentPermissionBuilder()
  .allowNetwork('clearnet', 'tor')
  .allowCommands()
  .build();

const agent = registry.registerAgent(
  'automation',
  'ResearchBot',
  'Automated research assistant',
  permissions
);

// Create a task for the agent
const task = taskManager.createTask(agent.id, 'automation', {
  query: 'search terms'
});
```

### Security

```typescript
import { PolicyManager, PKIManager, SecurityLevelManager } from 'hexagate';

const policyManager = new PolicyManager();

// Evaluate a connection
const result = policyManager.evaluateConnection({
  url: 'https://example.com',
  tlsVersion: '1.3',
  cipherSuite: 'TLS_AES_256_GCM_SHA384'
});

if (!result.allowed) {
  console.log('Connection blocked:', result.violations);
}

// Generate a self-signed certificate
const pkiManager = new PKIManager();
const cert = pkiManager.generateSelfSignedCertificate('CN=internal.local');
```

### Wallets

```typescript
import { WalletManager, MockCryptoWallet } from 'hexagate';

const walletManager = new WalletManager();

// Create and connect a wallet
const wallet = walletManager.createWallet('crypto', 'My ETH Wallet');
walletManager.connectWallet(wallet.id, '0x123...', 'publicKey');

// Update balance
walletManager.updateBalance(wallet.id, {
  currency: 'ETH',
  amount: '1.5',
  lastUpdated: new Date()
});
```

## Architecture

```
hexagate/
├── src/
│   ├── index.ts          # Main entry point and HexaGate facade
│   ├── types/            # TypeScript type definitions
│   ├── routing/          # Unified routing framework
│   ├── handles/          # Human-readable handle system
│   ├── spaces/           # Encrypted spaces
│   ├── hexstrike/        # Agent framework (MCP)
│   ├── security/         # Security policies and PKI
│   └── wallets/          # Wallet integration
├── tests/                # Test suites
├── dist/                 # Compiled output
└── package.json
```

## Security Considerations

HexaGate implements multiple layers of security:

1. **Transport Security**: Enforces TLS 1.2+ with strong cipher suites
2. **Anti-Downgrade**: Prevents protocol downgrade attacks
3. **Certificate Validation**: Verifies certificate chains and expiration
4. **Encryption**: Uses AES-256-GCM for space data encryption
5. **Key Derivation**: PBKDF2 with SHA-512 for password-based keys
6. **Network Isolation**: Separates traffic by network type

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Type check
npm run lint
```

## License

ISC

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

