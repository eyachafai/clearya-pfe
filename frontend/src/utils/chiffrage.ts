// utils/chiffrage.ts
import CryptoJS from "crypto-js";
import * as forge from "node-forge";
import { Message } from "../types/message";


const BACKEND_URL = "http://localhost:5000"; // 👈 TRÈS IMPORTANT !




// 🟢 Load private key from LocalStorage
export function loadPrivateKey(): string | null {
  return localStorage.getItem("privateKeyPem");
}

// 🟢 Generate RSA keypair (for new user)
export async function generateUserKeys() {
  const keyPair = forge.pki.rsa.generateKeyPair(2048);
  const privatePem = forge.pki.privateKeyToPem(keyPair.privateKey);
  const publicPem = forge.pki.publicKeyToPem(keyPair.publicKey);

  localStorage.setItem("privateKeyPem", privatePem);

  console.log("[generateUserKeys] Clé publique envoyée au backend :", publicPem);

  await fetch("/api/keys/savePublicKey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey: publicPem }),
  });
}

export function generateAESKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
}

export function encryptWithAES(content: string, aesKeyHex: string): string {
  const aesKey = CryptoJS.enc.Hex.parse(aesKeyHex);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(content, aesKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.stringify({
    ciphertext: encrypted.toString(),
    iv: iv.toString(CryptoJS.enc.Hex),
  });
}

export function encryptAESKeyWithRSA(aesKeyHex: string, recipientPublicKeyPem: string): string {
  const publicKey = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
  const encrypted = publicKey.encrypt(
    forge.util.hexToBytes(aesKeyHex),
    "RSA-OAEP"
  );
  return forge.util.encode64(encrypted);
}

export function decryptWithAES(ciphertextBase64: string, aesKeyHex: string, ivHex: string): string {
  const aesKey = CryptoJS.enc.Hex.parse(aesKeyHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64),
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, aesKey, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
}

export async function decryptMessageOnBackend(msg: Message): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/messages/decryption/decrypt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedAESKey: msg.encryptedAESKeyData,
        encryptedMessageData: msg.encryptedMessageData,
      }),
    });

    if (!response.ok) {
      console.error("Backend error:", response.status);
      return `[Erreur backend: ${response.status}]`;
    }

    const data = await response.json();
    return data.decryptedMessage;
  } catch (error) {
    console.error("Erreur déchiffrement backend :", error);
    return "[Erreur de déchiffrement]";
  }
}
