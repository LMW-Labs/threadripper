// src/config/secrets.js - Secret Manager helper
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class SecretsManager {
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
    this.cache = new Map(); // Cache secrets to avoid repeated API calls
  }

  async getSecret(secretName) {
    // Check cache first
    if (this.cache.has(secretName)) {
      return this.cache.get(secretName);
    }

    try {
      console.log(`Fetching secret: ${secretName}`);
      
      const [version] = await this.client.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/${secretName}/versions/latest`,
      });
      
      const secretValue = version.payload.data.toString();
      
      // Cache the secret
      this.cache.set(secretName, secretValue);
      
      return secretValue;
    } catch (error) {
      console.error(`Error getting secret ${secretName}:`, error.message);
      
      // For development, try environment variables as fallback
      if (process.env.NODE_ENV === 'development') {
        const envValue = process.env[secretName];
        if (envValue) {
          console.log(`Using environment variable for ${secretName}`);
          this.cache.set(secretName, envValue);
          return envValue;
        }
      }
      
      return null;
    }
  }

  // Clear cache if needed
  clearCache() {
    this.cache.clear();
  }

  // Get multiple secrets at once
  async getSecrets(secretNames) {
    const secrets = {};
    for (const name of secretNames) {
      secrets[name] = await this.getSecret(name);
    }
    return secrets;
  }
}

module.exports = { SecretsManager };