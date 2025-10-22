import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-cbc";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits

  constructor() {
    // In production, this should come from environment variables
    this.validateEncryptionKey();
  }

  private validateEncryptionKey(): void {
    const key = this.getEncryptionKey();
    if (!key || key.length !== this.keyLength) {
      throw new Error("Invalid encryption key configuration");
    }
  }

  private getEncryptionKey(): Buffer {
    // Get key from environment variable or generate a default for development
    const keyString =
      process.env.API_KEY_ENCRYPTION_KEY ||
      "default-dev-key-change-in-production-32chars";

    // Ensure key is exactly 32 bytes
    if (keyString.length < this.keyLength) {
      return crypto.scryptSync(keyString, "salt", this.keyLength);
    }

    return Buffer.from(keyString.slice(0, this.keyLength));
  }

  /**
   * Encrypt sensitive data (like API keys)
   */
  encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Combine IV + encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, "hex")]);

      return combined.toString("base64");
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(encryptedData, "base64");

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const encrypted = combined.slice(this.ivLength);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Decryption failed");
    }
  }

  /**
   * Generate a secure random key
   */
  generateSecureKey(length: number = 64): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash a key for storage (one-way, cannot be reversed)
   */
  hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }

  /**
   * Generate a masked version of a key for display
   */
  maskKey(key: string, visibleChars: number = 8): string {
    if (key.length <= visibleChars) {
      return "*".repeat(key.length);
    }

    const start = key.substring(0, 4);
    const end = key.substring(key.length - visibleChars);
    const middle = "*".repeat(key.length - 4 - visibleChars);

    return `${start}${middle}${end}`;
  }

  /**
   * Verify if a key matches a hashed version
   */
  verifyKey(key: string, hash: string): boolean {
    const keyHash = this.hashKey(key);
    return crypto.timingSafeEqual(Buffer.from(keyHash), Buffer.from(hash));
  }
}
