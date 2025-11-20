const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

const keyVaultName = process.env.KEY_VAULT_NAME;
const URL = "https://" + keyVaultName + ".vault.azure.net";

const credential = new DefaultAzureCredential();
const client = new SecretClient(URL, credential);

async function getSecret(secretName) {
  return await client.getSecret(secretName);
}

module.exports = { getSecret };