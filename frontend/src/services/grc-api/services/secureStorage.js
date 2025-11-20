const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Secure Storage Service
 * Implements controlled storage with encryption and access controls
 */
class SecureStorage {
  constructor() {
    this.secureDir = path.join(__dirname, '../secure-storage');
    this.encryptionKey = process.env.STORAGE_ENCRYPTION_KEY || this.generateKey();
    this.algorithm = 'aes-256-gcm';
    this.initSecureStorage();
  }

  async initSecureStorage() {
    try {
      await fs.mkdir(this.secureDir, { recursive: true, mode: 0o700 });
      
      // Create tenant-specific directories
      const tenantsDir = path.join(this.secureDir, 'tenants');
      await fs.mkdir(tenantsDir, { recursive: true, mode: 0o700 });
      
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
    }
  }

  /**
   * Generate encryption key
   */
  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store file securely with encryption
   * @param {string} filePath - Original file path
   * @param {string} tenantId - Tenant ID for isolation
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Storage result
   */
  async storeFile(filePath, tenantId, metadata = {}) {
    try {
      // Create tenant directory
      const tenantDir = path.join(this.secureDir, 'tenants', tenantId);
      await fs.mkdir(tenantDir, { recursive: true, mode: 0o700 });

      // Generate secure filename
      const secureFileName = this.generateSecureFileName(metadata.originalName);
      const securePath = path.join(tenantDir, secureFileName);

      // Read and encrypt file
      const fileData = await fs.readFile(filePath);
      const encryptedData = this.encryptData(fileData);

      // Store encrypted file
      await fs.writeFile(securePath, encryptedData.encrypted, { mode: 0o600 });

      // Store metadata separately
      const metadataPath = securePath + '.meta';
      const fileMetadata = {
        ...metadata,
        originalPath: filePath,
        encryptionIv: encryptedData.iv,
        authTag: encryptedData.authTag,
        storedAt: new Date().toISOString(),
        checksum: this.calculateChecksum(fileData)
      };

      await fs.writeFile(metadataPath, JSON.stringify(fileMetadata), { mode: 0o600 });

      // Remove original file for security
      await fs.unlink(filePath);

      return {
        success: true,
        securePath,
        secureFileName,
        metadata: fileMetadata
      };

    } catch (error) {
      console.error('Secure storage error:', error);
      throw new Error(`Failed to store file securely: ${error.message}`);
    }
  }

  /**
   * Retrieve file from secure storage
   * @param {string} securePath - Secure file path
   * @param {string} tenantId - Tenant ID for access control
   * @returns {Promise<Buffer>} Decrypted file data
   */
  async retrieveFile(securePath, tenantId) {
    try {
      // Verify tenant access
      if (!securePath.includes(path.join('tenants', tenantId))) {
        throw new Error('Access denied: Invalid tenant access');
      }

      // Read metadata
      const metadataPath = securePath + '.meta';
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      // Read encrypted file
      const encryptedData = await fs.readFile(securePath);

      // Decrypt file
      const decryptedData = this.decryptData({
        encrypted: encryptedData,
        iv: metadata.encryptionIv,
        authTag: metadata.authTag
      });

      // Verify integrity
      const currentChecksum = this.calculateChecksum(decryptedData);
      if (currentChecksum !== metadata.checksum) {
        throw new Error('File integrity check failed');
      }

      return {
        data: decryptedData,
        metadata
      };

    } catch (error) {
      console.error('File retrieval error:', error);
      throw new Error(`Failed to retrieve file: ${error.message}`);
    }
  }

  /**
   * Generate signed URL for secure file access
   * @param {string} securePath - Secure file path
   * @param {string} tenantId - Tenant ID
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {string} Signed URL
   */
  generateSignedUrl(securePath, tenantId, expiresIn = 3600) {
    const expiration = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = {
      path: securePath,
      tenant: tenantId,
      exp: expiration
    };

    const signature = this.signPayload(payload);
    const token = Buffer.from(JSON.stringify({ ...payload, sig: signature })).toString('base64url');

    return `/api/documents/secure/${token}`;
  }

  /**
   * Verify signed URL
   * @param {string} token - Signed token
   * @returns {Object} Verified payload
   */
  verifySignedUrl(token) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
      
      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('URL expired');
      }

      // Verify signature
      const expectedSig = this.signPayload({
        path: payload.path,
        tenant: payload.tenant,
        exp: payload.exp
      });

      if (payload.sig !== expectedSig) {
        throw new Error('Invalid signature');
      }

      return payload;

    } catch (error) {
      throw new Error(`Invalid signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from secure storage
   * @param {string} securePath - Secure file path
   * @param {string} tenantId - Tenant ID for access control
   */
  async deleteFile(securePath, tenantId) {
    try {
      // Verify tenant access
      if (!securePath.includes(path.join('tenants', tenantId))) {
        throw new Error('Access denied: Invalid tenant access');
      }

      // Delete file and metadata
      await fs.unlink(securePath);
      await fs.unlink(securePath + '.meta');

      return { success: true };

    } catch (error) {
      console.error('Secure delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Encrypt data
   */
  encryptData(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
    cipher.setAAD(Buffer.from('secure-storage'));

    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data
   */
  decryptData({ encrypted, iv, authTag }) {
    const decipher = crypto.createDecipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
    decipher.setAAD(Buffer.from('secure-storage'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
  }

  /**
   * Generate secure filename
   */
  generateSecureFileName(originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    return `${timestamp}_${random}${ext}`;
  }

  /**
   * Calculate file checksum
   */
  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sign payload for URL generation
   */
  signPayload(payload) {
    const message = JSON.stringify(payload);
    return crypto.createHmac('sha256', this.encryptionKey).update(message).digest('hex');
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(tenantId) {
    try {
      const tenantDir = path.join(this.secureDir, 'tenants', tenantId);
      const files = await fs.readdir(tenantDir);
      
      // Filter out metadata files
      const dataFiles = files.filter(f => !f.endsWith('.meta'));
      
      let totalSize = 0;
      for (const file of dataFiles) {
        const stats = await fs.stat(path.join(tenantDir, file));
        totalSize += stats.size;
      }

      return {
        fileCount: dataFiles.length,
        totalSize,
        tenantId
      };

    } catch (error) {
      return {
        fileCount: 0,
        totalSize: 0,
        error: error.message
      };
    }
  }
}

module.exports = new SecureStorage();