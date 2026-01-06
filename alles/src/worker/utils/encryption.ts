/**
 * Encryption utilities for API keys
 * Uses AES-256-GCM for authenticated encryption
 */

// Note: Cloudflare Workers use Web Crypto API, not Node.js crypto
// We'll use the Web Crypto API which is available in Workers

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // 128 bits for authentication tag

/**
 * Derives a crypto key from a master key string
 * Uses PBKDF2 for key derivation
 */
async function deriveKey(masterKey: string): Promise<CryptoKey> {
  // Convert master key string to ArrayBuffer
  const encoder = new TextEncoder();
  const keyData = encoder.encode(masterKey);
  
  // Use a fixed salt for deterministic key derivation
  // In production, you might want to use a per-user salt stored in the database
  const salt = new Uint8Array(16).fill(0);
  
  // Import the master key material
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive a key for AES-GCM using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    importedKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Format: base64(iv + encrypted_data + auth_tag)
 * 
 * @param plaintext - The text to encrypt
 * @param masterKey - The master encryption key
 * @returns Base64 encoded string containing IV + encrypted data + auth tag
 */
export async function encrypt(plaintext: string, masterKey: string): Promise<string> {
  try {
    const cryptoKey = await deriveKey(masterKey);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encode plaintext
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH
      },
      cryptoKey,
      data
    );
    
    // Combine IV + encrypted data
    // The auth tag is automatically appended by Web Crypto API
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts an encrypted string using AES-256-GCM
 * 
 * @param encrypted - Base64 encoded string containing IV + encrypted data + auth tag
 * @param masterKey - The master encryption key
 * @returns The decrypted plaintext
 */
export async function decrypt(encrypted: string, masterKey: string): Promise<string> {
  try {
    const cryptoKey = await deriveKey(masterKey);
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH
      },
      cryptoKey,
      encryptedData
    );
    
    // Decode to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

