import { useEffect, useState } from "react";

if (!window.crypto?.subtle) {
  throw new Error("Web Crypto API not supported");
}

// Utilitaire pour convertir ArrayBuffer <-> base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("crypto-keys-db", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("crypto-keys")) {
        db.createObjectStore("crypto-keys");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function setKeyInDB(key: string, value: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("crypto-keys", "readwrite");
    tx.objectStore("crypto-keys").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getKeyFromDB(key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("crypto-keys", "readonly");
    const req = tx.objectStore("crypto-keys").get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Fonction de génération/synchronisation de la clé ECDH (peut être appelée globalement)
async function ensureECDHKeyExists(userId: number): Promise<{ publicKeyBase64: string; privateKey: CryptoKey }> {
  let privKey: CryptoKey | null = null;
  let pubKey: CryptoKey | null = null;
  let pubBase64 = "";

  try {
    const privJwk = await getKeyFromDB(`ecdh_private_key_${userId}`);
    const pubJwk = await getKeyFromDB(`ecdh_public_key_${userId}`);
    if (privJwk && pubJwk) {
      try {
        privKey = await crypto.subtle.importKey(
          "jwk",
          privJwk,
          { name: "ECDH", namedCurve: "P-256" },
          true,
          ["deriveKey", "deriveBits"]
        );

        pubKey = await crypto.subtle.importKey(
          "jwk",
          pubJwk,
          { name: "ECDH", namedCurve: "P-256" },
          true,
          []
        );
      } catch {
        console.warn("❌ Clés corrompues en IndexedDB, régénération...");
        await setKeyInDB(`ecdh_private_key_${userId}`, null);
        await setKeyInDB(`ecdh_public_key_${userId}`, null);
      }
    }

    // ❌ si pas de clé locale → régénération
    if (!privKey || !pubKey) {
      console.log("🔄 Génération d'une nouvelle clé ECDH...");
      const keyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
      );

      privKey = keyPair.privateKey;
      pubKey = keyPair.publicKey;

      const privJwkNew = await crypto.subtle.exportKey("jwk", privKey);
      const pubJwkNew = await crypto.subtle.exportKey("jwk", pubKey);

      await setKeyInDB(`ecdh_private_key_${userId}`, privJwkNew);
      await setKeyInDB(`ecdh_public_key_${userId}`, pubJwkNew);
      console.log("✅ Clé ECDH générée et stockée en IndexedDB");
    }

    const pubRaw = await crypto.subtle.exportKey("raw", pubKey);
    pubBase64 = arrayBufferToBase64(pubRaw);

    // Synchroniser avec le backend
    const check = await fetch(
      `http://localhost:5000/api/crypto/ecdh-public-key/${userId}`
    );

    const data = await check.json().catch(() => ({}));

    if (!check.ok || data?.error === "no key") {
      console.log("🔄 Synchronisation de la clé ECDH avec le backend...");

      const syncRes = await fetch("http://localhost:5000/api/crypto/ecdh-public-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          public_key: pubBase64
        })
      });

      if (syncRes.ok) {
        console.log("✅ Clé ECDH synchronisée avec le backend");
      } else {
        console.error("❌ Erreur lors de la synchronisation de la clé ECDH");
      }
    } else {
      console.log("✅ Clé ECDH déjà synchronisée avec le backend");
    }

    return { publicKeyBase64: pubBase64, privateKey: privKey };
  } catch (err) {
    console.error("❌ Erreur lors de la gestion de la clé ECDH:", err);
    throw err;
  }
}

export function useECDHKey(userId?: number) {
  const [publicKeyBase64, setPublicKeyBase64] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const { publicKeyBase64: pubKey64, privateKey: privKey } = await ensureECDHKeyExists(userId);
        setPublicKeyBase64(pubKey64);
        setPrivateKey(privKey);
      } catch (err) {
        console.error("ECDH hook error:", err);
      }
    })();
  }, [userId]);

  return { publicKeyBase64, privateKey };
}

// Export la fonction pour l'utiliser globalement
export { ensureECDHKeyExists };