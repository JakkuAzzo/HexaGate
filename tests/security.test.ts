/**
 * Tests for HexaGate Security Module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PolicyManager, 
  PKIManager, 
  SecurityLevelManager 
} from '../src/security/index.js';
import type { Certificate } from '../src/types/index.js';

describe('PolicyManager', () => {
  let policyManager: PolicyManager;

  beforeEach(() => {
    policyManager = new PolicyManager();
  });

  describe('Default Policies', () => {
    it('should have default anti-downgrade policy', () => {
      const policies = policyManager.listPolicies();
      const antiDowngrade = policies.find(p => p.name === 'Anti-Downgrade Protection');
      expect(antiDowngrade).toBeDefined();
    });

    it('should have anti-downgrade policy active by default', () => {
      const activePolicies = policyManager.getActivePolicies();
      expect(activePolicies.length).toBeGreaterThan(0);
    });
  });

  describe('Policy Management', () => {
    it('should create a new policy', () => {
      const policy = policyManager.createPolicy('Custom Policy', [
        { type: 'network', condition: 'require_https', action: 'deny' }
      ]);
      expect(policy.name).toBe('Custom Policy');
      expect(policy.rules.length).toBe(1);
    });

    it('should get policy by ID', () => {
      const created = policyManager.createPolicy('Test', []);
      const retrieved = policyManager.getPolicy(created.id);
      expect(retrieved?.name).toBe('Test');
    });

    it('should activate and deactivate policy', () => {
      const policy = policyManager.createPolicy('Test', []);
      
      policyManager.activatePolicy(policy.id);
      expect(policyManager.isPolicyActive(policy.id)).toBe(true);
      
      policyManager.deactivatePolicy(policy.id);
      expect(policyManager.isPolicyActive(policy.id)).toBe(false);
    });

    it('should remove policy', () => {
      const policy = policyManager.createPolicy('ToRemove', []);
      const result = policyManager.removePolicy(policy.id);
      expect(result).toBe(true);
      expect(policyManager.getPolicy(policy.id)).toBeNull();
    });
  });

  describe('Policy Evaluation', () => {
    it('should allow connection with valid TLS', () => {
      const result = policyManager.evaluateConnection({
        url: 'https://example.com',
        tlsVersion: '1.3',
        cipherSuite: 'TLS_AES_256_GCM_SHA384'
      });
      expect(result.allowed).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should block connection with old TLS version', () => {
      const result = policyManager.evaluateConnection({
        url: 'https://example.com',
        tlsVersion: '1.0'
      });
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.message.includes('TLS version'))).toBe(true);
    });

    it('should block connection with weak cipher', () => {
      const result = policyManager.evaluateConnection({
        url: 'https://example.com',
        tlsVersion: '1.2',
        cipherSuite: 'RC4-SHA'
      });
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.message.includes('cipher'))).toBe(true);
    });

    it('should block expired certificates', () => {
      const result = policyManager.evaluateConnection({
        url: 'https://example.com',
        tlsVersion: '1.2',
        certificateExpired: true
      });
      expect(result.allowed).toBe(false);
      expect(result.violations.some(v => v.message.includes('expired'))).toBe(true);
    });
  });
});

describe('PKIManager', () => {
  let pkiManager: PKIManager;

  beforeEach(() => {
    pkiManager = new PKIManager();
  });

  describe('Certificate Management', () => {
    it('should add certificate', () => {
      const cert = pkiManager.addCertificate({
        subject: 'CN=example.com',
        issuer: 'CN=Test CA',
        publicKey: 'mock-public-key',
        serialNumber: '123456',
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isPrivate: false,
        trusted: true
      });
      expect(cert.id).toBeDefined();
      expect(cert.subject).toBe('CN=example.com');
    });

    it('should get certificate by ID', () => {
      const cert = pkiManager.addCertificate({
        subject: 'CN=test.com',
        issuer: 'CN=CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(),
        validTo: new Date(),
        isPrivate: false,
        trusted: true
      });
      const retrieved = pkiManager.getCertificate(cert.id);
      expect(retrieved?.subject).toBe('CN=test.com');
    });

    it('should find certificate by subject', () => {
      pkiManager.addCertificate({
        subject: 'CN=findme.com',
        issuer: 'CN=CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(),
        validTo: new Date(),
        isPrivate: false,
        trusted: true
      });
      const found = pkiManager.findBySubject('CN=findme.com');
      expect(found).toBeDefined();
    });

    it('should remove certificate', () => {
      const cert = pkiManager.addCertificate({
        subject: 'CN=remove.com',
        issuer: 'CN=CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(),
        validTo: new Date(),
        isPrivate: false,
        trusted: true
      });
      const result = pkiManager.removeCertificate(cert.id);
      expect(result).toBe(true);
      expect(pkiManager.getCertificate(cert.id)).toBeNull();
    });
  });

  describe('Trusted Issuers', () => {
    it('should add trusted issuer', () => {
      pkiManager.addTrustedIssuer('CN=Trusted CA');
      expect(pkiManager.isTrustedIssuer('CN=Trusted CA')).toBe(true);
    });

    it('should remove trusted issuer', () => {
      pkiManager.addTrustedIssuer('CN=Trusted CA');
      pkiManager.removeTrustedIssuer('CN=Trusted CA');
      expect(pkiManager.isTrustedIssuer('CN=Trusted CA')).toBe(false);
    });
  });

  describe('Certificate Verification', () => {
    it('should verify valid certificate', () => {
      const cert: Certificate = {
        id: '1',
        subject: 'CN=valid.com',
        issuer: 'CN=Trusted CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isPrivate: false,
        trusted: true
      };
      pkiManager.addTrustedIssuer('CN=Trusted CA');
      
      const result = pkiManager.verifyCertificate(cert);
      expect(result.valid).toBe(true);
      expect(result.trusted).toBe(true);
    });

    it('should detect expired certificate', () => {
      const cert: Certificate = {
        id: '1',
        subject: 'CN=expired.com',
        issuer: 'CN=CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        isPrivate: false,
        trusted: true
      };
      
      const result = pkiManager.verifyCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Certificate has expired');
    });

    it('should detect not yet valid certificate', () => {
      const cert: Certificate = {
        id: '1',
        subject: 'CN=future.com',
        issuer: 'CN=CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        validTo: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        isPrivate: false,
        trusted: true
      };
      
      const result = pkiManager.verifyCertificate(cert);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Certificate is not yet valid');
    });

    it('should warn about untrusted issuer', () => {
      const cert: Certificate = {
        id: '1',
        subject: 'CN=untrusted.com',
        issuer: 'CN=Unknown CA',
        publicKey: 'key',
        serialNumber: '1',
        validFrom: new Date(Date.now() - 1000),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isPrivate: false,
        trusted: false
      };
      
      const result = pkiManager.verifyCertificate(cert);
      expect(result.trusted).toBe(false);
      expect(result.warnings.some(w => w.includes('not in trusted list'))).toBe(true);
    });
  });

  describe('Self-Signed Certificates', () => {
    it('should generate self-signed certificate', () => {
      const cert = pkiManager.generateSelfSignedCertificate('CN=self.local');
      expect(cert.subject).toBe('CN=self.local');
      expect(cert.issuer).toBe('CN=self.local');
      expect(cert.isPrivate).toBe(true);
      expect(cert.trusted).toBe(true);
    });

    it('should set correct validity period', () => {
      const cert = pkiManager.generateSelfSignedCertificate('CN=test.local', 30);
      const diffDays = Math.ceil((cert.validTo.getTime() - cert.validFrom.getTime()) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(30);
    });
  });
});

describe('SecurityLevelManager', () => {
  let securityManager: SecurityLevelManager;

  beforeEach(() => {
    securityManager = new SecurityLevelManager();
  });

  describe('Level Management', () => {
    it('should default to standard level', () => {
      expect(securityManager.getCurrentLevel()).toBe('standard');
    });

    it('should change security level', () => {
      securityManager.setLevel('maximum');
      expect(securityManager.getCurrentLevel()).toBe('maximum');
    });
  });

  describe('Level Configurations', () => {
    it('should have standard config', () => {
      const config = securityManager.getConfig('standard');
      expect(config?.minTlsVersion).toBe('1.2');
      expect(config?.requireStrictTransportSecurity).toBe(false);
    });

    it('should have elevated config', () => {
      const config = securityManager.getConfig('elevated');
      expect(config?.minTlsVersion).toBe('1.2');
      expect(config?.requireStrictTransportSecurity).toBe(true);
    });

    it('should have maximum config', () => {
      const config = securityManager.getConfig('maximum');
      expect(config?.minTlsVersion).toBe('1.3');
      expect(config?.requireStrictTransportSecurity).toBe(true);
    });

    it('should get current level config', () => {
      securityManager.setLevel('elevated');
      const config = securityManager.getCurrentConfig();
      expect(config.requireStrictTransportSecurity).toBe(true);
    });
  });
});
