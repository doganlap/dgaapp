const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Antivirus Scanner Service
 * Implements file scanning for malware detection
 */
class AVScanner {
  constructor() {
    this.quarantineDir = path.join(__dirname, '../quarantine');
    this.initQuarantineDir();
  }

  async initQuarantineDir() {
    try {
      await fs.mkdir(this.quarantineDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create quarantine directory:', error);
    }
  }

  /**
   * Scan file for malware
   * @param {string} filePath - Path to file to scan
   * @returns {Promise<Object>} Scan result
   */
  async scanFile(filePath) {
    try {
      // Basic file validation
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('Invalid file');
      }

      // Check file size (prevent DoS)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (stats.size > maxSize) {
        throw new Error('File too large for scanning');
      }

      // Calculate file hash for reputation checking
      const fileHash = await this.calculateFileHash(filePath);
      
      // Check against known malware hashes (simplified implementation)
      const isMalicious = await this.checkMalwareSignatures(filePath, fileHash);
      
      if (isMalicious) {
        await this.quarantineFile(filePath);
        return {
          clean: false,
          threat: 'Malware detected',
          action: 'quarantined',
          hash: fileHash
        };
      }

      // Additional content-based scanning
      const contentScan = await this.scanFileContent(filePath);
      
      return {
        clean: contentScan.clean,
        threat: contentScan.threat || null,
        action: contentScan.clean ? 'allowed' : 'blocked',
        hash: fileHash,
        scanTime: new Date().toISOString()
      };

    } catch (error) {
      console.error('AV scan error:', error);
      return {
        clean: false,
        threat: 'Scan failed',
        action: 'blocked',
        error: error.message
      };
    }
  }

  /**
   * Calculate SHA-256 hash of file
   */
  async calculateFileHash(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Check file against known malware signatures
   */
  async checkMalwareSignatures(filePath, fileHash) {
    // Known malicious file hashes (example - in production, use threat intelligence feeds)
    const knownMalwareHashes = new Set([
      // Add known malware hashes here
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Example hash
    ]);

    if (knownMalwareHashes.has(fileHash)) {
      return true;
    }

    // Check for suspicious file patterns
    const fileBuffer = await fs.readFile(filePath);
    const content = fileBuffer.toString('binary');

    // Basic signature detection (simplified)
    const suspiciousPatterns = [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /<script[^>]*>.*?<\/script>/gis,
      /javascript:/gi,
      /vbscript:/gi
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Perform content-based scanning
   */
  async scanFileContent(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const content = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 1024 * 1024)); // First 1MB

      // Check for embedded executables
      if (this.containsExecutableSignatures(fileBuffer)) {
        return {
          clean: false,
          threat: 'Embedded executable detected'
        };
      }

      // Check for suspicious URLs
      const urlPattern = /https?:\/\/[^\s<>"']+/gi;
      const urls = content.match(urlPattern) || [];
      
      for (const url of urls) {
        if (await this.isSuspiciousUrl(url)) {
          return {
            clean: false,
            threat: `Suspicious URL detected: ${url}`
          };
        }
      }

      return { clean: true };

    } catch (error) {
      console.error('Content scan error:', error);
      return {
        clean: false,
        threat: 'Content scan failed'
      };
    }
  }

  /**
   * Check for executable file signatures
   */
  containsExecutableSignatures(buffer) {
    const signatures = [
      Buffer.from([0x4D, 0x5A]), // PE executable (MZ)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable
      Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O 64-bit
    ];

    return signatures.some(sig => buffer.indexOf(sig) === 0);
  }

  /**
   * Check if URL is suspicious
   */
  async isSuspiciousUrl(url) {
    try {
      const suspiciousDomains = [
        'malware.com',
        'phishing.net',
        // Add more suspicious domains
      ];

      const urlObj = new URL(url);
      return suspiciousDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * Move file to quarantine
   */
  async quarantineFile(filePath) {
    try {
      const fileName = path.basename(filePath);
      const timestamp = Date.now();
      const quarantinePath = path.join(this.quarantineDir, `${timestamp}_${fileName}`);
      
      await fs.rename(filePath, quarantinePath);
      
      // Log quarantine action
      console.warn(`File quarantined: ${filePath} -> ${quarantinePath}`);
      
      return quarantinePath;
    } catch (error) {
      console.error('Quarantine failed:', error);
      throw error;
    }
  }

  /**
   * Get scan statistics
   */
  async getScanStats() {
    try {
      const quarantineFiles = await fs.readdir(this.quarantineDir);
      return {
        quarantinedFiles: quarantineFiles.length,
        lastScan: new Date().toISOString()
      };
    } catch (error) {
      return {
        quarantinedFiles: 0,
        error: error.message
      };
    }
  }
}

module.exports = new AVScanner();