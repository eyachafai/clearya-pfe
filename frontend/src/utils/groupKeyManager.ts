/**
 * Génère une clé AES-256-GCM pour chiffrer les messages du groupe
 */
export async function generateGroupAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Dérive une clé de chiffrement via ECDH + HKDF
 * @param myPrivateKey - Ma clé privée ECDH
 * @param theirPublicKeyRaw - Clé publique du destinataire (raw format)
 * @param salt - Salt pour HKDF
 */



// Prendre ta clé privée ECDH + la clé publique de l’autre
// produire une clé symétrique AES‑GCM (256 bits) via ECDH puis HKDF.
export async function deriveSharedKey(
  privateKey: CryptoKey,
  otherPublicKeyRaw: BufferSource,// contenant la clé publique "raw" 
  salt: BufferSource  // doit être le même côté expéditeur/récepteur pour dériver la même clé.
): Promise<CryptoKey> {
//obtient un CryptoKey public utilisable par WebCrypto
  const otherPublicKey = await crypto.subtle.importKey(
    "raw",
    otherPublicKeyRaw,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    []
  );
//calcule le secret partagé (256 bits).
  const sharedSecret = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: otherPublicKey,
    },
    privateKey,
    256
  );
// traite le secret comme clé d’entrée pour HKDF
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"]
  );
// applique HKDF(SHA‑256, salt) pour obtenir une clé AES‑GCM 256 bits, utilisable pour chiffrer/déchiffrer
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: new Uint8Array(),
    },
    hkdfKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Chiffre la clé AES de groupe avec la clé dérivée
 * @param aesKey - Clé AES de groupe à chiffrer
 * @param sharedKey - Clé partagée dérivée
 */
export async function encryptGroupAESKey(
  aesKey: CryptoKey,
  sharedKey: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const rawAES = await window.crypto.subtle.exportKey("raw", aesKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    rawAES
  );
  return { encrypted, iv };
}

/**
 * Déchiffre la clé AES de groupe avec la clé dérivée
 * @param encryptedRaw - Clé AES chiffrée (raw ArrayBuffer)
 * @param iv - IV utilisé pour le chiffrement
 * @param sharedKey - Clé partagée dérivée
 */

export async function decryptGroupAESKey(
  encryptedRaw: ArrayBuffer,
  iv: Uint8Array,
  sharedKey: CryptoKey
): Promise<CryptoKey> {

  const decryptedRaw = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    sharedKey,
    encryptedRaw
  );

  // Importe la clé AES déchiffrée
  return await window.crypto.subtle.importKey(
    "raw",
    decryptedRaw,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Chiffre un message texte avec la clé AES de groupe
 * @param plaintext - Texte en clair
 * @param groupKey - Clé AES de groupe
 */
export async function encryptMessageWithGroupKey(
  plaintext: string,
  groupKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    groupKey,
    encoder.encode(plaintext)
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Déchiffre un message texte avec la clé AES de groupe
 * @param ciphertextB64 - Ciphertext en base64
 * @param ivB64 - IV en base64
 * @param groupKey - Clé AES de groupe
 */
export async function decryptMessageWithGroupKey(
  ciphertextB64: string,
  ivB64: string,
  groupKey: CryptoKey
): Promise<string> {
  try {
    const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      groupKey,
      ciphertext
    ); return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("❌ Erreur déchiffrement message:", err);
    throw err;
  }
}

/**
 * Chiffre un fichier (audio, image, pdf...) avec AES-GCM
 * @param file - fichier à chiffrer
 * @param groupKey - clé AES de groupe
 */
export async function encryptFile(
  file: Blob,
  groupKey: CryptoKey
): Promise<{ ciphertext: Blob; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await file.arrayBuffer();

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    groupKey,
    arrayBuffer
  );

  return {
    ciphertext: new Blob([encrypted]),
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Déchiffre un fichier AES-GCM
 */
export async function decryptFile(
  ciphertext: Blob,
  ivB64: string,
  groupKey: CryptoKey
): Promise<Blob> {
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const data = await ciphertext.arrayBuffer();

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    groupKey,
    data
  );

  return new Blob([decrypted]);
}
