import CryptoJS from "crypto-js";
import forge from "node-forge";

// ✅ Generate 256-bit AES key
export function generateAESKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex); // 32 bytes = 256 bits
}

// ✅ Encrypt with AES using the generated key
export function encryptWithAES(content: string, aesKeyHex: string): string {
  const aesKey = CryptoJS.enc.Hex.parse(aesKeyHex);
  const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV

  const encrypted = CryptoJS.AES.encrypt(content, aesKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Return ciphertext + IV so you can decrypt later
  return JSON.stringify({
    ciphertext: encrypted.toString(),
    iv: iv.toString(CryptoJS.enc.Hex),
  });
}

// ✅ Encrypt AES key with RSA
export function encryptAESKeyWithRSA(aesKeyHex: string, recipientPublicKeyPem: string): string {
  // console.log(" recipientPublicKeyPem ",recipientPublicKeyPem)
  const publicKey = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
  const encrypted = publicKey.encrypt(
    forge.util.hexToBytes(aesKeyHex),
    "RSA-OAEP"
  );
  return forge.util.encode64(encrypted);
}
