/**
 * HexaGate Security Module
 * Implements anti-downgrade policies and private PKI support.
 */

import * as crypto from 'crypto';
import type { 
  SecurityPolicy, 
  SecurityRule, 
  Certificate, 
  SecurityLevel 
} from '../types/index.js';

/**
 * Policy Manager - Manages security policies
 */
export class PolicyManager {
  private policies: Map<string, SecurityPolicy> = new Map();
  private activePolicies: Set<string> = new Set();

  constructor() {
    // Initialize with default anti-downgrade policy
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    const antiDowngradePolicy: SecurityPolicy = {
      id: 'default-anti-downgrade',
      name: 'Anti-Downgrade Protection',
      rules: [
        {
          type: 'anti-downgrade',
          condition: 'tls_version < 1.2',
          action: 'deny',
          metadata: { minVersion: '1.2' }
        },
        {
          type: 'anti-downgrade',
          condition: 'cipher_suite in weak_ciphers',
          action: 'deny',
          metadata: { weakCiphers: ['RC4', 'DES', '3DES', 'MD5'] }
        },
        {
          type: 'anti-downgrade',
          condition: 'certificate_expired',
          action: 'deny'
        }
      ],
      enforcementLevel: 'strict'
    };

    this.policies.set(antiDowngradePolicy.id, antiDowngradePolicy);
    this.activePolicies.add(antiDowngradePolicy.id);
  }

  /**
   * Create a new security policy
   */
  createPolicy(
    name: string,
    rules: SecurityRule[],
    enforcementLevel: SecurityPolicy['enforcementLevel'] = 'warn'
  ): SecurityPolicy {
    const policy: SecurityPolicy = {
      id: this.generatePolicyId(),
      name,
      rules,
      enforcementLevel
    };

    this.policies.set(policy.id, policy);
    return policy;
  }

  /**
   * Get a policy by ID
   */
  getPolicy(id: string): SecurityPolicy | null {
    return this.policies.get(id) ?? null;
  }

  /**
   * Activate a policy
   */
  activatePolicy(id: string): boolean {
    if (!this.policies.has(id)) return false;
    this.activePolicies.add(id);
    return true;
  }

  /**
   * Deactivate a policy
   */
  deactivatePolicy(id: string): boolean {
    return this.activePolicies.delete(id);
  }

  /**
   * Check if a policy is active
   */
  isPolicyActive(id: string): boolean {
    return this.activePolicies.has(id);
  }

  /**
   * Get all active policies
   */
  getActivePolicies(): SecurityPolicy[] {
    return Array.from(this.activePolicies)
      .map(id => this.policies.get(id))
      .filter((p): p is SecurityPolicy => p !== undefined);
  }

  /**
   * List all policies
   */
  listPolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Remove a policy
   */
  removePolicy(id: string): boolean {
    this.activePolicies.delete(id);
    return this.policies.delete(id);
  }

  /**
   * Evaluate a connection against active policies
   */
  evaluateConnection(context: ConnectionContext): PolicyEvaluationResult {
    const results: PolicyEvaluationResult = {
      allowed: true,
      violations: [],
      warnings: []
    };

    for (const policy of this.getActivePolicies()) {
      for (const rule of policy.rules) {
        const violation = this.evaluateRule(rule, context);
        if (violation) {
          if (rule.action === 'deny' && policy.enforcementLevel !== 'warn') {
            results.allowed = false;
            results.violations.push({
              policyId: policy.id,
              policyName: policy.name,
              rule,
              message: violation
            });
          } else {
            results.warnings.push({
              policyId: policy.id,
              policyName: policy.name,
              rule,
              message: violation
            });
          }
        }
      }
    }

    return results;
  }

  private evaluateRule(rule: SecurityRule, context: ConnectionContext): string | null {
    switch (rule.type) {
      case 'anti-downgrade':
        return this.evaluateAntiDowngrade(rule, context);
      case 'certificate':
        return this.evaluateCertificate(rule, context);
      default:
        return null;
    }
  }

  private evaluateAntiDowngrade(rule: SecurityRule, context: ConnectionContext): string | null {
    if (rule.condition === 'tls_version < 1.2') {
      const minVersion = (rule.metadata?.minVersion as string) ?? '1.2';
      if (context.tlsVersion && this.compareTlsVersions(context.tlsVersion, minVersion) < 0) {
        return `TLS version ${context.tlsVersion} is below minimum ${minVersion}`;
      }
    }
    
    if (rule.condition === 'cipher_suite in weak_ciphers') {
      const weakCiphers = (rule.metadata?.weakCiphers as string[]) ?? [];
      if (context.cipherSuite && weakCiphers.some(weak => context.cipherSuite?.includes(weak))) {
        return `Weak cipher suite detected: ${context.cipherSuite}`;
      }
    }

    if (rule.condition === 'certificate_expired' && context.certificateExpired) {
      return 'Certificate has expired';
    }

    return null;
  }

  private evaluateCertificate(rule: SecurityRule, context: ConnectionContext): string | null {
    if (!context.certificate) return null;
    
    if (rule.condition === 'untrusted' && !context.certificate.trusted) {
      return 'Certificate is not trusted';
    }

    return null;
  }

  private compareTlsVersions(version: string, minVersion: string): number {
    const parseVersion = (v: string): number => {
      const match = v.match(/(\d+)\.?(\d+)?/);
      if (!match) return 0;
      return parseFloat(`${match[1]}.${match[2] ?? 0}`);
    };
    return parseVersion(version) - parseVersion(minVersion);
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Connection context for policy evaluation
 */
export interface ConnectionContext {
  url: string;
  tlsVersion?: string;
  cipherSuite?: string;
  certificate?: Certificate;
  certificateExpired?: boolean;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
}

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  rule: SecurityRule;
  message: string;
}

/**
 * PKI Manager - Manages private PKI and certificates
 */
export class PKIManager {
  private certificates: Map<string, Certificate> = new Map();
  private trustedIssuers: Set<string> = new Set();

  /**
   * Add a certificate
   */
  addCertificate(cert: Omit<Certificate, 'id'>): Certificate {
    const certificate: Certificate = {
      ...cert,
      id: this.generateCertificateId()
    };

    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  /**
   * Get a certificate by ID
   */
  getCertificate(id: string): Certificate | null {
    return this.certificates.get(id) ?? null;
  }

  /**
   * Find certificate by subject
   */
  findBySubject(subject: string): Certificate | null {
    for (const cert of this.certificates.values()) {
      if (cert.subject === subject) {
        return cert;
      }
    }
    return null;
  }

  /**
   * Remove a certificate
   */
  removeCertificate(id: string): boolean {
    return this.certificates.delete(id);
  }

  /**
   * List all certificates
   */
  listCertificates(): Certificate[] {
    return Array.from(this.certificates.values());
  }

  /**
   * Add a trusted issuer
   */
  addTrustedIssuer(issuer: string): void {
    this.trustedIssuers.add(issuer);
  }

  /**
   * Remove a trusted issuer
   */
  removeTrustedIssuer(issuer: string): boolean {
    return this.trustedIssuers.delete(issuer);
  }

  /**
   * Check if an issuer is trusted
   */
  isTrustedIssuer(issuer: string): boolean {
    return this.trustedIssuers.has(issuer);
  }

  /**
   * Verify a certificate chain
   */
  verifyCertificate(cert: Certificate): CertificateVerificationResult {
    const result: CertificateVerificationResult = {
      valid: true,
      trusted: false,
      errors: [],
      warnings: []
    };

    // Check expiration
    const now = new Date();
    if (cert.validFrom > now) {
      result.valid = false;
      result.errors.push('Certificate is not yet valid');
    }
    if (cert.validTo < now) {
      result.valid = false;
      result.errors.push('Certificate has expired');
    }

    // Check trust
    if (this.trustedIssuers.has(cert.issuer) || cert.isPrivate) {
      result.trusted = true;
    } else {
      result.warnings.push('Certificate issuer is not in trusted list');
    }

    return result;
  }

  /**
   * Generate a self-signed certificate (for private PKI)
   */
  generateSelfSignedCertificate(subject: string, validityDays: number = 365): Certificate {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const validFrom = new Date();
    const validTo = new Date();
    validTo.setDate(validTo.getDate() + validityDays);

    const cert: Certificate = {
      id: this.generateCertificateId(),
      subject,
      issuer: subject, // Self-signed
      publicKey: keyPair.publicKey,
      serialNumber: this.generateSerialNumber(),
      validFrom,
      validTo,
      isPrivate: true,
      trusted: true
    };

    this.certificates.set(cert.id, cert);
    return cert;
  }

  /**
   * Get certificate count
   */
  getCertificateCount(): number {
    return this.certificates.size;
  }

  private generateCertificateId(): string {
    return `cert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateSerialNumber(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }
}

export interface CertificateVerificationResult {
  valid: boolean;
  trusted: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Security Level Manager - Enforces security levels
 */
export class SecurityLevelManager {
  private currentLevel: SecurityLevel = 'standard';
  private levelConfigs: Map<SecurityLevel, SecurityLevelConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    this.levelConfigs.set('standard', {
      minTlsVersion: '1.2',
      requireCertificateValidation: true,
      allowSelfSigned: false,
      requireStrictTransportSecurity: false
    });

    this.levelConfigs.set('elevated', {
      minTlsVersion: '1.2',
      requireCertificateValidation: true,
      allowSelfSigned: false,
      requireStrictTransportSecurity: true
    });

    this.levelConfigs.set('maximum', {
      minTlsVersion: '1.3',
      requireCertificateValidation: true,
      allowSelfSigned: false,
      requireStrictTransportSecurity: true
    });
  }

  /**
   * Get current security level
   */
  getCurrentLevel(): SecurityLevel {
    return this.currentLevel;
  }

  /**
   * Set security level
   */
  setLevel(level: SecurityLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get config for current level
   */
  getCurrentConfig(): SecurityLevelConfig {
    return this.levelConfigs.get(this.currentLevel) ?? this.levelConfigs.get('standard')!;
  }

  /**
   * Get config for a specific level
   */
  getConfig(level: SecurityLevel): SecurityLevelConfig | null {
    return this.levelConfigs.get(level) ?? null;
  }
}

export interface SecurityLevelConfig {
  minTlsVersion: string;
  requireCertificateValidation: boolean;
  allowSelfSigned: boolean;
  requireStrictTransportSecurity: boolean;
}
