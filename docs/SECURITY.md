# Security Architecture Documentation

## Overview

TradeCircle implements a robust security architecture for handling sensitive broker API keys and user data. This document outlines the encryption, storage, and access patterns used throughout the system.

## Encryption Architecture

### Master Key Management

- **Storage**: Master encryption key (`ENCRYPTION_MASTER_KEY`) is stored as a Cloudflare Workers Secret
- **Access**: Only accessible within Worker runtime, never exposed to frontend or logs
- **Rotation**: Can be rotated by updating the Wrangler Secret (requires re-encryption of all stored keys)

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Authenticated Encryption with Associated Data)
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 100,000 iterations (OWASP recommended minimum)
- **IV Generation**: Random 96-bit IV per encryption (prevents nonce reuse attacks)
- **Authentication**: 128-bit GCM authentication tag (integrity verification)

### Key Storage

Broker API keys are stored in the `api_keys` D1 table with the following structure:

```sql
CREATE TABLE api_keys (
  user_id TEXT NOT NULL,
  exchange TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,      -- AES-256-GCM encrypted API key
  encrypted_secret TEXT NOT NULL,   -- AES-256-GCM encrypted API secret
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, exchange)
);
```

**Security Properties:**
- Keys encrypted at rest in D1 database
- IV embedded in ciphertext (Web Crypto API standard)
- No plaintext keys ever stored
- Foreign key constraint to `users` table

## Key Lifecycle

### 1. Storage (POST /api/keys/store)

1. Frontend sends plaintext API key/secret
2. Worker receives request (authenticated)
3. Worker encrypts key/secret using `ENCRYPTION_MASTER_KEY`
4. Encrypted data stored in D1
5. Plaintext never persisted

### 2. Retrieval (GET /api/keys/:exchange)

- Returns encrypted keys only
- Never returns plaintext
- Used for verification/listing purposes

### 3. Order Execution (On-the-fly Decryption)

1. Worker loads encrypted keys from D1
2. Decrypts keys in RAM using `ENCRYPTION_MASTER_KEY`
3. Uses decrypted keys for API call
4. Keys go out of scope (removed from RAM)
5. Never logged or exposed in responses

**Critical Security Rule**: Decrypted keys must never:
- Be logged to console
- Appear in error messages
- Be stored in variables that persist beyond request
- Be included in API responses

## Authentication & Authorization

### User Authentication

- **Primary**: Firebase Authentication (Google OAuth)
- **Fallback**: Mocha Users Service (session tokens)
- **Session Management**: HTTP-only cookies with secure flags

### Authorization

- All API key routes require authentication
- Users can only access their own API keys
- Database queries filtered by `user_id` (Firebase UID)

## Error Handling Security

### Sanitization

All error responses are sanitized to prevent sensitive data leakage:

- API keys/secrets: `[REDACTED]`
- Passwords: `[REDACTED]`
- Tokens: `[REDACTED]`
- Private keys: `[REDACTED]`

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* sanitized details */ },
  "timestamp": "2025-01-07T12:00:00Z"
}
```

## Database Security

### D1 Database

- **Encryption at Rest**: Managed by Cloudflare (automatic)
- **Access Control**: Only accessible via Worker bindings
- **Backup**: Automatic backups by Cloudflare
- **Foreign Keys**: Enforced for data integrity

### Query Security

- Parameterized queries (prepared statements) prevent SQL injection
- User ID filtering on all queries
- No raw SQL with user input

## Secrets Management

### Wrangler Secrets

Sensitive configuration stored as Cloudflare Workers Secrets:

- `ENCRYPTION_MASTER_KEY` - Master key for API key encryption
- `HUME_SECRET_KEY` - Hume AI API secret
- `ISSUER_PRIVATE_KEY` - SBT issuer node private key

**Setup**: See `SECRETS_SETUP.md` for configuration instructions.

### Environment Variables

Non-sensitive configuration in `wrangler.json`:

- `HUME_API_KEY` - Public API key
- `POLYGON_RPC_URL` - Public RPC endpoint
- `SBT_CONTRACT_ADDRESS` - Public contract address

## Audit Compliance

### Encryption Standards

- **NIST Approved**: AES-256-GCM (FIPS 140-2 compliant)
- **Key Derivation**: PBKDF2 (NIST SP 800-132)
- **Random Number Generation**: `crypto.getRandomValues()` (CSPRNG)

### Logging

- No sensitive data in logs
- Request IDs for tracing
- Performance metrics (without sensitive data)
- Error codes (not sensitive details)

### Data Retention

- API keys: Stored until user deletion
- Audit logs: Managed by Cloudflare Workers logging
- No plaintext keys in backups

## Threat Model

### Protected Against

- ✅ Database breaches (keys encrypted at rest)
- ✅ Memory dumps (keys only in RAM during execution)
- ✅ Log file exposure (no plaintext in logs)
- ✅ SQL injection (parameterized queries)
- ✅ Unauthorized access (authentication required)
- ✅ Cross-user access (user ID filtering)

### Not Protected Against

- ⚠️ Compromised Worker runtime (would expose master key)
- ⚠️ Compromised user device (frontend could be modified)
- ⚠️ Social engineering (user could be tricked into revealing keys)

## Best Practices

1. **Never log API keys** - Even in error messages
2. **Use parameterized queries** - Prevent SQL injection
3. **Validate user ownership** - Always filter by user_id
4. **Rotate master key periodically** - Requires re-encryption
5. **Monitor access patterns** - Detect anomalies
6. **Regular security audits** - Review encryption implementation

## Incident Response

If a security breach is suspected:

1. Rotate `ENCRYPTION_MASTER_KEY` immediately
2. Re-encrypt all stored API keys
3. Revoke compromised user sessions
4. Review access logs
5. Notify affected users

## Compliance

This architecture supports compliance with:

- **GDPR**: Data encryption, user data access controls
- **SOC 2**: Encryption at rest, access controls, audit logging
- **PCI DSS**: Secure key management (if handling payment data)

## References

- [NIST SP 800-132](https://csrc.nist.gov/publications/detail/sp/800-132/final) - Key Derivation
- [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
