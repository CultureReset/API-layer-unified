// EXTRACTED FROM: gcr-api-clean/routes/stripe.js's encrypt/decrypt pair —
// picked over the nearly-identical copies in routes/square.js,
// routes/google-business.js, and cybercheck-api-database's four
// independent copies (stripe.js, square.js, fareharbor.js,
// google-business.js) specifically because cybercheck-api-database's
// fareharbor.js copy has a real bug: it calls
// `createDecipheriv('aes-256-gcm', Buffer.from(ivH,'hex'), Buffer.from(ivH,'hex'))`
// — the IV in both the key and IV argument slots. It fails closed there
// (decryption throws, the ciphertext never gets used as a real key), but
// four repos independently copy-pasting the same crypto block instead of
// sharing one tested module is exactly how a bug like that survives.
//
// WHAT IT DOES: AES-256-GCM encrypt/decrypt for secrets a tenant hands you
// to hold on their behalf (a pasted API key, an OAuth refresh token) —
// standard format `iv:authTag:ciphertext`, one server-side 32-byte key
// from the environment.
//
// STATUS: standalone, not wired into any route. This platform's
// Connectors system doesn't hold any real third-party credentials yet
// (routes/connectors.js only records `status`, no secret). Wire this in
// the moment a Connector needs to store one — as ONE shared module, not a
// fifth copy-pasted version of this same 20 lines.

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes (64 hex characters).');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(encoded, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error('Malformed encrypted value.');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
