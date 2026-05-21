import forge from "node-forge";

/**
 * Generate an RSA key pair (public + private) using node-forge.
 * Returns PEM-formatted strings for both keys.
 */
export function generateRSAKeyPair(): { publicKeyPem: string; privateKeyPem: string } {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
  return { publicKeyPem, privateKeyPem };
}

/**
 * Encrypt a plaintext message using the receiver's RSA public key (PEM format).
 * Returns a Base64-encoded ciphertext string.
 *
 * RSA can only encrypt data smaller than the key size.
 * For longer messages, we use a hybrid approach:
 * 1. Generate a random AES key
 * 2. Encrypt the message with AES
 * 3. Encrypt the AES key with RSA
 * 4. Return both together
 */
export function encryptMessage(plaintext: string, receiverPublicKeyPem: string): string {
  const publicKey = forge.pki.publicKeyFromPem(receiverPublicKeyPem);

  // Generate a random AES key and IV
  const aesKey = forge.random.getBytesSync(32); // 256-bit key
  const iv = forge.random.getBytesSync(16);

  // Encrypt the message with AES-256-CBC
  const cipher = forge.cipher.createCipher("AES-CBC", aesKey);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(plaintext, "utf8"));
  cipher.finish();
  const encryptedMessage = cipher.output.getBytes();

  // Encrypt the AES key with RSA
  const encryptedAesKey = publicKey.encrypt(aesKey, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });

  // Combine: encryptedAESKey (fixed 256 bytes for 2048-bit RSA) + iv (16 bytes) + encryptedMessage
  const payload = {
    ek: forge.util.encode64(encryptedAesKey),
    iv: forge.util.encode64(iv),
    em: forge.util.encode64(encryptedMessage),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypt a ciphertext using the receiver's RSA private key (PEM format).
 * Expects the ciphertext format produced by encryptMessage().
 */
export function decryptMessage(ciphertext: string, receiverPrivateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(receiverPrivateKeyPem);

  const payload = JSON.parse(ciphertext);

  const encryptedAesKey = forge.util.decode64(payload.ek);
  const iv = forge.util.decode64(payload.iv);
  const encryptedMessage = forge.util.decode64(payload.em);

  // Decrypt the AES key with RSA
  const aesKey = privateKey.decrypt(encryptedAesKey, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  });

  // Decrypt the message with AES-256-CBC
  const decipher = forge.cipher.createDecipher("AES-CBC", aesKey);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(encryptedMessage));
  decipher.finish();

  return decipher.output.toString("utf8");
}
