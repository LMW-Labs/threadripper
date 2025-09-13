// src/config/secrets.js
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const secretManagerClient = new SecretManagerServiceClient();
const projectId = process.env.GCP_PROJECT_ID;

async function getSecret(secretName) {
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID environment variable not set.');
  }
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    const [version] = await secretManagerClient.accessSecretVersion({ name });
    const payload = version.payload.data.toString('utf8');
    console.log(`✅ Fetched secret: ${secretName}`);
    return payload;
  } catch (error) {
    console.error(`❌ Error accessing secret ${secretName}:`, error.details || error.message);
    throw new Error(`Failed to retrieve secret ${secretName}. Ensure it exists and the service account has 'Secret Manager Secret Accessor' role.`);
  }
}

module.exports = { getSecret };