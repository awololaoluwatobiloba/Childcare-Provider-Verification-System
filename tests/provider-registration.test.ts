import { describe, it, expect, beforeEach } from 'vitest';

// Mock Clarity contract interaction
const providerRegistrationContract = {
  state: {
    providerCount: 0,
    providers: new Map(),
    principalToProvider: new Map(),
    verifiers: new Map(),
    admin: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
  },
  
  // Constants
  STATUS_PENDING: 1,
  STATUS_VERIFIED: 2,
  STATUS_REJECTED: 3,
  
  // Error codes
  ERR_UNAUTHORIZED: 100,
  ERR_ALREADY_REGISTERED: 101,
  ERR_NOT_FOUND: 102,
  
  registerProvider(name, credentials, sender) {
    // Check if already registered
    if (this.state.principalToProvider.has(sender)) {
      return { error: this.ERR_ALREADY_REGISTERED };
    }
    
    const providerId = this.state.providerCount + 1;
    
    this.state.providers.set(providerId, {
      name,
      credentials,
      backgroundCheckPassed: false,
      verificationStatus: this.STATUS_PENDING
    });
    
    this.state.principalToProvider.set(sender, providerId);
    this.state.providerCount = providerId;
    
    return { value: providerId };
  },
  
  addVerifier(verifier, sender) {
    if (sender !== this.state.admin) {
      return { error: this.ERR_UNAUTHORIZED };
    }
    
    this.state.verifiers.set(verifier, true);
    return { value: true };
  },
  
  verifyProvider(providerId, backgroundCheckPassed, status, sender) {
    if (!this.state.verifiers.has(sender)) {
      return { error: this.ERR_UNAUTHORIZED };
    }
    
    if (!this.state.providers.has(providerId)) {
      return { error: this.ERR_NOT_FOUND };
    }
    
    const provider = this.state.providers.get(providerId);
    provider.backgroundCheckPassed = backgroundCheckPassed;
    provider.verificationStatus = status;
    
    this.state.providers.set(providerId, provider);
    return { value: true };
  },
  
  getProvider(providerId) {
    return this.state.providers.get(providerId) || null;
  },
  
  getProviderId(principal) {
    return this.state.principalToProvider.get(principal) || null;
  },
  
  isProviderVerified(providerId) {
    const provider = this.state.providers.get(providerId);
    if (!provider) return false;
    return provider.verificationStatus === this.STATUS_VERIFIED;
  }
};

describe('Provider Registration Contract', () => {
  const admin = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
  const verifier = 'ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ';
  const provider = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
  
  beforeEach(() => {
    // Reset state before each test
    providerRegistrationContract.state.providerCount = 0;
    providerRegistrationContract.state.providers = new Map();
    providerRegistrationContract.state.principalToProvider = new Map();
    providerRegistrationContract.state.verifiers = new Map();
    providerRegistrationContract.state.admin = admin;
  });
  
  it('should register a new provider', () => {
    const result = providerRegistrationContract.registerProvider(
        'Happy Kids Daycare',
        'Early Childhood Education Degree, CPR Certified, First Aid Training',
        provider
    );
    
    expect(result).toHaveProperty('value');
    expect(result.value).toBe(1);
    
    const providerData = providerRegistrationContract.getProvider(1);
    expect(providerData).not.toBeNull();
    expect(providerData.name).toBe('Happy Kids Daycare');
    expect(providerData.verificationStatus).toBe(providerRegistrationContract.STATUS_PENDING);
    expect(providerData.backgroundCheckPassed).toBe(false);
  });
  
  it('should not allow duplicate provider registration', () => {
    // Register once
    providerRegistrationContract.registerProvider('Happy Kids Daycare', 'Credentials', provider);
    
    // Try to register again
    const result = providerRegistrationContract.registerProvider('Another Name', 'Credentials', provider);
    
    expect(result).toHaveProperty('error');
    expect(result.error).toBe(providerRegistrationContract.ERR_ALREADY_REGISTERED);
  });
  
  it('should allow admin to add verifiers', () => {
    const result = providerRegistrationContract.addVerifier(verifier, admin);
    
    expect(result).toHaveProperty('value');
    expect(result.value).toBe(true);
    expect(providerRegistrationContract.state.verifiers.has(verifier)).toBe(true);
  });
  
  it('should allow verifiers to verify providers', () => {
    // Register a provider
    providerRegistrationContract.registerProvider('Happy Kids Daycare', 'Certification', provider);
    
    // Add a verifier
    providerRegistrationContract.addVerifier(verifier, admin);
    
    // Verify the provider
    const result = providerRegistrationContract.verifyProvider(
        1,
        true,
        providerRegistrationContract.STATUS_VERIFIED,
        verifier
    );
    
    expect(result).toHaveProperty('value');
    expect(result.value).toBe(true);
    
    const providerData = providerRegistrationContract.getProvider(1);
    expect(providerData.backgroundCheckPassed).toBe(true);
    expect(providerData.verificationStatus).toBe(providerRegistrationContract.STATUS_VERIFIED);
    expect(providerRegistrationContract.isProviderVerified(1)).toBe(true);
  });
})
