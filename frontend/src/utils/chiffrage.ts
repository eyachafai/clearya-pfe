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

// ✅ Decrypt AES key with RSA
export function decryptAESKeyWithRSA(encryptedAESKey: string, privateKey: string): string {
  // Use window.crypto.subtle or a library like node-forge/jsrsasign for RSA decryption in browser
  // For demo, pseudo-code:
  // return rsaDecrypt(encryptedAESKey, privateKey);
  // ...implement with your crypto lib...
  return ""; // TODO: implement
}

// ✅ Decrypt with AES using the generated key
export function decryptWithAES(ciphertext: string, key: string, iv: string): string {
  // Use window.crypto.subtle or a library like crypto-js for AES decryption
  // For demo, pseudo-code:
  // return aesDecrypt(ciphertext, key, iv);
  // ...implement with your crypto lib...
  return ""; // TODO: implement
}