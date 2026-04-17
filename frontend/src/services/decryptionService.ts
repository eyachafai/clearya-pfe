import { decryptMessageOnBackend } from "../utils/chiffrage";

// Déchiffre un message reçu via le backend
export async function decryptMessage(message: any): Promise<string> {
  if (!message.encryptedMessageData || !message.encryptedAESKeyData) return message.contenu || "";
  return await decryptMessageOnBackend(message);
}
