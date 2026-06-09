import './ChatPage.css';
import { useEffect, useState, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { Conversation } from "../../types/conversation";
import { Message } from "../../types/message";
import { sendMessage } from '../../services/chatService';
import { socket } from "../../socket";
import { useECDHKey } from '../../hooks/useECDHKey';
import { generateGroupAESKey, deriveSharedKey } from "../../utils/groupKeyManager";

// Utilitaires décodage (base64 / hex) au niveau module
function isBase64(str: string) {
  try {
    return btoa(atob(str)) === str || btoa(atob(str + '=')) === str || btoa(atob(str + '==')) === str;
  } catch (e) {
    return false;
  }
}

function base64ToUint8Array(b64: string) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hexToUint8Array(hex: string) {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length % 2 !== 0) return new Uint8Array();
  const len = cleaned.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  }
  return bytes;
}

function decodeToUint8Array(input: string) {
  if (!input) return new Uint8Array();
  if (isBase64(input)) return base64ToUint8Array(input);
  const hex = hexToUint8Array(input);
  if (hex.length > 0) return hex;
  try {
    return Uint8Array.from(atob(input), c => c.charCodeAt(0));
  } catch (e) {
    return new Uint8Array();
  }
}

const BACKEND_URL = "http://localhost:5000";

const ChatPage = (props: { groupeIdProp?: number, groupeNameProp?: string }) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groupeName] = useState<string>(props.groupeNameProp || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { keycloak } = useKeycloak();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const groupe_id = props.groupeIdProp ?? (Number(params.get("groupe_id")) || 1);
  const [utilisateur_id, setUtilisateurId] = useState<number | null>(null);



  useEffect(() => {
    console.log("[SOCKET] joinGroupRoom appelé pour groupe_id:", groupe_id);
    socket.emit("joinGroupRoom", groupe_id); // Utilise bien groupe_id
    // Ne quitte plus le room quand on quitte la page
    // return () => {
    //   console.log("[SOCKET] leaveGroupRoom appelé pour groupe_id:", groupe_id);
    //   socket.emit("leaveGroupRoom", groupe_id);
    // };
  }, [groupe_id]);

  useEffect(() => {
    // Join la room du groupe pour recevoir les messages en temps réel
    if (conversation?.id) {
      socket.emit("joinRoom", { conversation_id: conversation.id });
    }
  }, [conversation?.id]);

  useEffect(() => {
    let unsubSocket = false;
    const fetchAll = async () => {
      setLoading(true);
      setConversation(null);
      try {
        // 1️⃣ Récupère ou synchronise l'utilisateur
        const syncUserId = async (): Promise<number | null> => {
          try {
            const idFromLocal = localStorage.getItem('utilisateur_id');
            console.log('Vérification utilisateur_id en localStorage :', idFromLocal);
            if (idFromLocal && !isNaN(Number(idFromLocal))) {
              const check = await fetch(`/api/auth/users/${idFromLocal}`);
              if (check.ok) {
                setUtilisateurId(Number(idFromLocal));
                console.log('🟢 Utilisateur trouvé via localStorage id:', idFromLocal);
                return Number(idFromLocal);
              } else {
                localStorage.removeItem('utilisateur_id');
              }
            }

            // Si pas trouvé en local, on passe à la synchro Keycloak
            const headers: any = {};
            if (keycloak?.token) headers.Authorization = `Bearer ${keycloak.token}`;
            const creds = keycloak?.token ? 'same-origin' : 'include';
            const res = await fetch('/api/auth/me', { credentials: creds, headers });
            if (res.ok) {
              const data = await res.json();
              console.log('Utilisateur bien synchronisé avec la base :', data);
              if (data && typeof data.id === 'number') {
                localStorage.setItem('utilisateur_id', String(data.id));
                localStorage.setItem('utilisateur', JSON.stringify(data));
                setUtilisateurId(data.id);
                return data.id;
              }
              if (data && data.keycloakId) {
                // 🔁 Si pas d'id, on récupère via keycloakId
                const r2 = await fetch(`${BACKEND_URL}/api/users/by-keycloak/${data.keycloakId}`);
                if (r2.ok) {
                  const user = await r2.json();
                  if (user && typeof user.id === 'number') {
                    localStorage.setItem('utilisateur_id', String(user.id));
                    localStorage.setItem('utilisateur', JSON.stringify(user));
                    setUtilisateurId(user.id);
                    return user.id;
                  }
                }
              }
            } else {
              console.warn('/api/auth/me returned', res.status);
            }
            setUtilisateurId(null);
            return null;
          } catch (err) {
            console.error('Erreur syncUserId :', err);
            setUtilisateurId(null);
            return null;
          }
        };

        await syncUserId();

        // 2️⃣ Crée ou récupère la conversation
        const convRes = await fetch("/api/messages/conversations/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupe_id, titre: "" }),
        });
        if (!convRes.ok) throw new Error("Erreur serveur lors de la création de la conversation");

        const conv = await convRes.json();
        if (!conv?.id) throw new Error("Conversation non créée");
        setConversation(conv);

        // 3️⃣ Charge les messages
        const msgRes = await fetch(`/api/messages/conversations/${conv.id}/messages/proxy`);
        if (!msgRes.ok) throw new Error("Erreur serveur lors du chargement des messages");
        const msgs = await msgRes.json();
        console.log("📨 Messages reçus de la BD :");
        msgs.forEach((msg: any) => {
          if (msg.ciphertext) {
            console.log(`   Message ${msg.id}:`);
            console.log(`     ciphertext brut: ${msg.ciphertext}`);
            console.log(`     ciphertext length: ${msg.ciphertext.length} chars`);
            console.log(`     iv brut: ${msg.iv}`);
            console.log(`     iv length: ${msg.iv?.length} chars`);
          }
        });
        setMessages(Array.isArray(msgs) ? msgs : []);

        // 4️⃣ WebSocket : écoute les nouveaux messages
        socket.off("receiveMessage");
        socket.on("receiveMessage", (data) => {
          if (!unsubSocket && data.conversation_id === conv.id) {
            setMessages((prev) => [...prev, data]);
          }
        });
      } catch (err: any) {
        setMessages([]);
        alert(err?.message || "Erreur lors du chargement du chat.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    return () => {
      unsubSocket = true;
      socket.off("receiveMessage");
    };
  }, [groupe_id, props.groupeNameProp, keycloak?.token]);



  // Récupère le nombre de messages non lus
  useEffect(() => {
    if (!conversation?.id) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`/api/messages/conversations/${conversation.id}/unread-count`);
        if (res.ok) {
          const data = await res.json();
          console.log("📬 Messages non lus:", data.unread_count);
        }
      } catch (err) {
        console.error("Erreur récupération compte non-lus:", err);
      }
    };

    fetchUnreadCount();

    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [conversation?.id]);

  // Marquer automatiquement comme lu les messages non lus qui ne sont pas à moi
  useEffect(() => {
    if (!utilisateur_id) return;
    const unread = messages.filter(
      (msg) => msg.utilisateur_id !== utilisateur_id && !msg.is_read
    );
    localStorage.setItem('messages_unread', String(unread.length));
    if (unread.length === 0) return;
    unread.forEach((msg) => {
      fetch(`http://localhost:5000/api/messages/messages/${msg.id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      }).then(() => {
        setMessages((msgs) =>
          msgs.map((m) => m.id === msg.id ? { ...m, is_read: true } : m)
        );
      });
    });
  }, [messages, utilisateur_id]);



  // Utilitaires décodage (base64 / hex) (déplacés au niveau module pour réutilisation)
  // function isBase64(str: string) {
  //   try {
  //     return btoa(atob(str)) === str || btoa(atob(str + '=')) === str || btoa(atob(str + '==')) === str;
  //   } catch (e) {
  //     return false;
  //   }
  // }

  // function base64ToUint8Array(b64: string) {
  //   const bin = atob(b64);
  //   const len = bin.length;
  //   const bytes = new Uint8Array(len);
  //   for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  //   return bytes;
  // }

  // function hexToUint8Array(hex: string) {
  //   const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
  //   if (cleaned.length % 2 !== 0) return new Uint8Array();
  //   const len = cleaned.length / 2;
  //   const bytes = new Uint8Array(len);
  //   for (let i = 0; i < len; i++) {
  //     bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  //   }
  //   return bytes;
  // }

  // function decodeToUint8Array(input: string) {
  //   if (!input) return new Uint8Array();
  //   // try base64
  //   if (isBase64(input)) return base64ToUint8Array(input);
  //   // try hex
  //   const hex = hexToUint8Array(input);
  //   if (hex.length > 0) return hex;
  //   // try raw atob
  //   try {
  //     return Uint8Array.from(atob(input), c => c.charCodeAt(0));
  //   } catch (e) {
  //     return new Uint8Array();
  //   }
  // }

  async function encryptMessageWithGroupKey(plainText: string, groupKey: CryptoKey) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      groupKey,
      encoder.encode(plainText)
    );
    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  async function decryptMessageWithGroupKey(ciphertextB64: string, ivB64: string, groupKey: CryptoKey): Promise<string> {
    try {
      if (!ciphertextB64 || !ivB64) {
        console.warn("⚠️ Ciphertext ou IV manquant");
        return "[Message non chiffré]";
      }

      if (ciphertextB64 === 'encrypted') {
        console.warn('⚠️ Ciphertext placeholder detected');
        return '[Media chiffré (placeholder)]';
      }

      const ciphertext = decodeToUint8Array(ciphertextB64);
      const iv = decodeToUint8Array(ivB64);

      console.log("🔓 Déchiffrement... ciphertext length:", ciphertext.length, "IV length:", iv.length);

      // Validation: L'IV DOIT faire exactement 12 bytes
      if (iv.length !== 12) {
        console.error("❌ IV invalide - longueur:", iv.length, "attendue: 12");
        return "[IV invalide]";
      }

      // ⚠️ Validation: Le ciphertext doit faire au moins 16 bytes (tag auth + données)
      if (ciphertext.length < 16) {
        console.error("❌ Ciphertext trop court - longueur:", ciphertext.length, "minimum attendu: 16");
        return "[Ciphertext invalide]";
      }

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        groupKey,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.error('❌ Erreur déchiffrement :', err);
      console.error('   Ciphertext length:', ciphertextB64?.length);
      console.error('   IV length:', ivB64?.length);
      return '[Erreur déchiffrement]';
    }
  }



  // Fonction pour chiffrer un Blob (audio ou fichier)
  async function encryptBlob(blob: Blob, groupKey: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
    const buffer = await blob.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      groupKey,
      buffer
    );
    return { ciphertext, iv };
  }

  // Envoi d'un message (temps réel via API)
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !audioBlob) || !conversation || !utilisateur_id) {
      alert("Impossible d'envoyer le message : utilisateur ou conversation non défini.");
      return;
    }
    if (!groupKey) {
      console.error("❌ groupKey est null ou undefined");
      console.error("   conversation:", conversation);
      console.error("   utilisateur_id:", utilisateur_id);
      console.error("   privateKey:", privateKey);
      console.error("   publicKeyBase64:", publicKeyBase64);
      alert("Clé de groupe non disponible, chiffrement impossible.");
      return;
    }
    setSending(true);

    try {
      // Gestion audio
      if (audioBlob && groupKey) {
        console.log("🎤 Chiffrement de l'audio...");
        const { ciphertext, iv } = await encryptBlob(audioBlob, groupKey);

        const timestamp = Date.now();
        const filename = `audio_${timestamp}.enc`;
        const ivBase64 = btoa(String.fromCharCode(...iv));

        console.log("✅ Audio chiffré, IV:", ivBase64);

        const formData = new FormData();
        formData.append("audio", new Blob([ciphertext]), filename);
        formData.append("iv", ivBase64);
        formData.append("conversation_id", String(conversation.id));
        formData.append("utilisateur_id", String(utilisateur_id));

        console.log("📤 Envoi de l'audio chiffré avec IV...");
        const audioRes = await fetch("/api/messages/send-audio", {
          method: "POST",
          body: formData
        });

        if (!audioRes.ok) {
          const errorText = await audioRes.text();
          console.error("❌ Erreur serveur:", errorText);
          throw new Error(`Erreur envoi audio: ${audioRes.status}`);
        }

        const responseData = await audioRes.json();
        console.log("✅ Audio envoyé avec succès:", responseData);
        setAudioBlob(null);
        setInput("");
        return;
      }

      // Gestion texte
      if (input.trim()) {
        console.log("📝 Chiffrement du message texte...");
        const { ciphertext, iv } = await encryptMessageWithGroupKey(input, groupKey);
        console.log("✅ Message chiffré:");
        console.log("   ciphertext:", ciphertext);
        console.log("   iv:", iv);
        const body = {
          conversation_id: conversation.id,
          utilisateur_id,
          ciphertext,
          iv,
          type: "text",
        };
        console.log("📤 Body envoyé à /messages/realtime:", JSON.stringify(body, null, 2));
        await sendMessage(body);
        setInput("");
        console.log("✅ Message envoyé avec succès");
      }
    } catch (err) {
      let msg = "Erreur JS frontend";
      if (err instanceof Error) {
        msg += ": " + err.message;
      } else if (typeof err === "string") {
        msg += ": " + err;
      } else {
        msg += ": " + JSON.stringify(err);
      }
      console.error(msg);
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  // State pour l'enregistrement vocal
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  const handleRecordAudio = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: "audio/webm" }));
        setRecording(false);
      };
      mediaRecorder.start();
    } catch (err) {
      setRecording(false);
      alert("Erreur lors de l'accès au micro.");
    }
  };

  // Chunked upload state and logic
  const [file, setFile] = useState<any>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);
  const chunkSize = 1024 * 1024 * 5;

  async function handleUpload(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!file || !groupKey || !conversation?.id || !utilisateur_id) {
      alert("Fichier, clé de groupe ou conversation manquant");
      return;
    }

    try {
      console.log("📁 Chiffrement du fichier...");
      const fileBuffer = await file.arrayBuffer();
      const { ciphertext, iv } = await encryptBlob(new Blob([fileBuffer]), groupKey);

      const ivBase64 = btoa(String.fromCharCode(...iv));
      console.log("✅ Fichier chiffré, IV:", ivBase64);

      setFile({
        ...file,
        encryptedBuffer: ciphertext,
        iv: ivBase64,
        originalName: file.name,
        isEncrypted: true
      });

      setCurrentChunkIndex(0);
    } catch (err) {
      console.error("Erreur chiffrement fichier:", err);
      alert("Erreur lors du chiffrement du fichier");
    }
  }

  useEffect(() => {
    async function uploadChunk(readerEvent: ProgressEvent<FileReader>) {
      if (!file) return;
      const data = readerEvent.target?.result;
      const totalSize = file.encryptedBuffer?.byteLength || file.size;
      const totalChunks = Math.ceil(totalSize / chunkSize);

      const params = new URLSearchParams();
      params.set('name', file.originalName || file.name);
      params.set('currentChunkIndex', String(currentChunkIndex));
      params.set('totalChunks', String(totalChunks));
      params.set('iv', file.iv || '');
      // Ajout conversation_id et utilisateur_id pour l'envoi temps réel côté backend
      if (conversation?.id) params.set('conversation_id', String(conversation.id));
      if (utilisateur_id) params.set('utilisateur_id', String(utilisateur_id));
      const headers = { 'Content-Type': 'application/octet-stream' };
      const url = 'http://localhost:5000/api/messages/upload?' + params.toString();

      console.log(`📤 Upload chunk ${currentChunkIndex}/${totalChunks - 1}`);

      fetch(url, {
        method: 'POST',
        headers: headers,
        body: data as BodyInit
      }).then(response => response.json())
        .then(res => {
          console.log('📥 Upload response:', res);
          const isLastChunk = currentChunkIndex === totalChunks - 1;
          if (isLastChunk) {
            console.log("✅ Dernier chunk uploadé");
            file.finalFilename = res.finalFilename;
            setCurrentChunkIndex(null);
            setFile(null);
          } else {
            setCurrentChunkIndex((currentChunkIndex ?? 0) + 1);
          }
        });
    }

    function readAndUploadCurrentChunk() {
      if (!file || currentChunkIndex == null) return;

      // Si le fichier est chiffré, utilise encryptedBuffer
      const buffer = file.isEncrypted ? file.encryptedBuffer : file;
      const from = currentChunkIndex * chunkSize;
      const to = (currentChunkIndex + 1) * chunkSize >= (buffer?.byteLength || file.size) ? (buffer?.byteLength || file.size) : from + chunkSize;

      let blob;
      if (file.isEncrypted) {
        blob = new Blob([new Uint8Array(buffer).slice(from, to)]);
      } else {
        blob = file.slice(from, to);
      }

      const reader = new FileReader();
      reader.onload = e => uploadChunk(e as ProgressEvent<FileReader>);
      // send raw bytes to backend
      reader.readAsDataURL(blob);
    }

    if (currentChunkIndex != null) readAndUploadCurrentChunk();
  }, [chunkSize, currentChunkIndex, file, conversation?.id, utilisateur_id]);

  // Ajoute ce hook pour générer/publier la clé ECDH dès que l'utilisateur est connu
  const { privateKey, publicKeyBase64 } = useECDHKey(utilisateur_id ?? undefined);
  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);
  const [decryptedMessages, setDecryptedMessages] = useState<{ [id: number]: string }>({});

  useEffect(() => {
    if (!conversation?.id || !utilisateur_id || !privateKey || !publicKeyBase64) {
      return;
    }

    let cancelled = false;

    const loadGroupKey = async () => {
      try {
        console.log("🔄 Chargement de la clé de groupe...");

        const salt = new TextEncoder().encode("global-group-key-salt");

        // =========================
        // 1️⃣ Vérifier si clé existe
        // =========================
        const groupExistsRes = await fetch(
          `http://localhost:5000/api/crypto/group-keys/group/${groupe_id}`
        );

        const existingKeyRes = await fetch(
          `http://localhost:5000/api/crypto/group-keys/${groupe_id}/${utilisateur_id}`
        );

        // =========================
        // CAS 1 : clé existe déjà
        // =========================

        if (existingKeyRes.ok) {

          const data = await existingKeyRes.json();

          if (
            data?.encrypted_group_key &&
            data?.iv &&
            data?.sender_public_key
          ) {

            console.log("✅ Clé existante trouvée");

            const encryptedKey = Uint8Array.from(
              atob(data.encrypted_group_key),
              c => c.charCodeAt(0)
            );

            const iv = Uint8Array.from(
              atob(data.iv),
              c => c.charCodeAt(0)
            );

            const senderPubKey = Uint8Array.from(
              atob(data.sender_public_key),
              c => c.charCodeAt(0)
            );

            console.log("🔑 Derivation shared key...");

            const sharedKey = await deriveSharedKey(
              privateKey,
              senderPubKey.buffer,
              salt
            );

            console.log("🔓 Déchiffrement AES group key...");

            const rawAesKey = await window.crypto.subtle.decrypt(
              {
                name: "AES-GCM",
                iv
              },
              sharedKey,
              encryptedKey
            );

            const importedKey = await window.crypto.subtle.importKey(
              "raw",
              rawAesKey,
              {
                name: "AES-GCM"
              },
              true,
              ["encrypt", "decrypt"]
            );

            if (!cancelled) {
              setGroupKey(importedKey);
            }

            console.log("✅ Clé groupe chargée avec succès");

            return;
          }
        }

        // =========================
        // CAS 2 : aucune clé utilisateur
        // =========================

        // groupe possède déjà une clé
        if (groupExistsRes.ok) {

          console.log("⚠️ Le groupe possède déjà une clé");
          console.log("⚠️ Mais aucune clé chiffrée pour cet utilisateur");

          return;
        }

        console.log("🆕 Première clé du groupe → création...");
        // génération UNE seule fois
        const aesKey = await generateGroupAESKey();

        // export raw AES key UNE seule fois
        const exportedAesKey = await window.crypto.subtle.exportKey(
          "raw",
          aesKey
        );

        const membersRes = await fetch(
          `http://localhost:5000/api/crypto/groupes/${groupe_id}/membres`
        );

        if (!membersRes.ok) {
          throw new Error("Impossible charger membres");
        }

        const members = await membersRes.json();

        console.log("👥 Membres:", members.length);

        const myPublicKeyRaw = Uint8Array.from(
          atob(publicKeyBase64),
          c => c.charCodeAt(0)
        );

        // IMPORTANT :
        // on sauvegarde la clé AVANT setGroupKey
        for (const member of members) {

          console.log("🔄 Membre:", member.id);

          const pubRes = await fetch(
            `http://localhost:5000/api/crypto/ecdh-public-key/${member.id}`
          );

          if (!pubRes.ok) {
            console.warn("⚠️ Clé publique absente pour:", member.id);
            continue;
          }

          const { public_key } = await pubRes.json();

          const theirPubKeyRaw = Uint8Array.from(
            atob(public_key),
            c => c.charCodeAt(0)
          );

          const sharedKey = await deriveSharedKey(
            privateKey,
            theirPubKeyRaw.buffer,
            salt
          );

          const iv = crypto.getRandomValues(new Uint8Array(12));

          const encrypted = await window.crypto.subtle.encrypt(
            {
              name: "AES-GCM",
              iv
            },
            sharedKey,
            exportedAesKey
          );

          const saveRes = await fetch(
            "http://localhost:5000/api/crypto/group-keys",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                group_id: groupe_id,
                user_id: member.id,
                encrypted_group_key: btoa(
                  String.fromCharCode(...new Uint8Array(encrypted))
                ),
                iv: btoa(
                  String.fromCharCode(...iv)
                ),
                sender_public_key: btoa(
                  String.fromCharCode(...myPublicKeyRaw)
                )
              })
            }
          );

          if (!saveRes.ok) {
            console.error("❌ Erreur sauvegarde pour:", member.id);
          } else {
            console.log("✅ Clé sauvegardée pour:", member.id);
          }
        }

        // IMPORTANT :
        // setGroupKey seulement APRÈS sauvegarde complète
        if (!cancelled) {
          setGroupKey(aesKey);
        }

        console.log("✅ Nouvelle clé groupe créée");

      } catch (err) {
        console.error("❌ Erreur group key:", err);
      }
    };

    loadGroupKey();

    return () => {
      cancelled = true;
    };

  }, [
    conversation?.id,
    utilisateur_id,
    privateKey,
    publicKeyBase64,
    groupe_id
  ]);

  useEffect(() => {
    if (!groupKey || messages.length === 0) return;

    const decryptAll = async () => {
      const updates: { [id: number]: string } = {};

      for (const msg of messages) {
        if (msg.ciphertext && msg.iv && !decryptedMessages[msg.id]) {
          try {
            const clear = await decryptMessageWithGroupKey(
              msg.ciphertext,
              msg.iv,
              groupKey
            );

            updates[msg.id] = clear;
          } catch {
            updates[msg.id] = "[Erreur déchiffrement]";
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        setDecryptedMessages(prev => ({
          ...prev,
          ...updates
        }));
      }
    };

    decryptAll();
  }, [messages, groupKey]);


  return (
    <div className="wa-main">
      <div className="wa-main-header">
        <span style={{ fontWeight: 700, fontSize: "1.15rem" }}>
          {groupeName ? `Group chat: ${groupeName}` : "Chat"}
        </span>
      </div>
      <div className="wa-messages">
        {loading ? (
          <div style={{ textAlign: "center", color: "#00c853" }}>Chargement...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center" }}>Aucun message.</div>
        ) : (
          Array.isArray(messages) && messages.map((msg, idx) => {
            const contenu = msg.contenu?.trim();
            let displayedContent: React.ReactNode = contenu;
            if (msg.ciphertext && msg.iv) {
              displayedContent = decryptedMessages[msg.id] || "Déchiffrement...";
            }

            // Affichage audio (avec icône cliquable si pas d'audio tag direct)
            if (msg.type === "audio" && contenu?.startsWith("[audio]")) {
              const audioFile = contenu.replace("[audio] ", "");
              displayedContent = (
                <div style={{ padding: 6, borderRadius: 8 }}>
                  <AudioPlayer
                    filename={audioFile}
                    iv={msg.iv}
                    groupKey={groupKey}
                  />
                </div>
              );
            }
            // Affichage image ou fichier
            else if (msg.type === "file" && contenu?.startsWith("[file]")) {
              const filename = contenu.replace("[file] ", "");
              const ext = filename.split('.').pop()?.toLowerCase();
              const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
              const isAudio = ["mp3", "wav", "ogg", "webm"].includes(ext || "");

              if (isImage) {
                displayedContent = (
                  <EncryptedImage
                    filename={filename}
                    iv={msg.iv}
                    groupKey={groupKey}
                  />
                );
              } else if (isAudio) {
                displayedContent = (
                  <AudioPlayer
                    filename={filename}
                    iv={msg.iv}
                    groupKey={groupKey}
                  />
                );
              } else {
                displayedContent = (
                  <a href={`${BACKEND_URL}/uploads/${filename}`} target="_blank" rel="noopener noreferrer">
                    📎 {filename}
                  </a>
                );
              }
            }

            return (
              <div
                key={msg.id || msg.contenu + msg.date_envoi}
                className={`wa-message-row${msg.utilisateur_id === utilisateur_id ? " me" : ""}`}
              >
                <div className="wa-bubble" style={{ textAlign: "center" }}>
                  {displayedContent}
                </div>
                <div className="wa-meta">
                  {msg.utilisateur?.username || "moi"} · {new Date(msg.date_envoi).toLocaleTimeString()}
                  {idx === messages.length - 1 && msg.is_read && (
                    <span className="vu">vu</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="wa-input-bar" onSubmit={handleSend}>
        {/* Bouton pour enregistrer le voice */}
        <button
          type="button"
          style={{
            background: recording ? "#ff9800" : "#fff",
            color: recording ? "#fff" : "#00c853",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            marginRight: 8,
            cursor: "pointer",
            boxShadow: "0 2px 8px #bdbdbd40",
            transition: "background 0.2s"
          }}
          onClick={handleRecordAudio}
          disabled={sending}
          title={recording ? "Arrêter l'enregistrement" : "Enregistrer un message vocal"}
        >
          {recording ? "⏺️" : "🎤"}
        </button>
        {/* Affichage de l'état d'enregistrement */}
        {recording && (
          <span style={{ color: "#ff9800", marginRight: 8, fontWeight: 600 }}>
            Enregistrement...
          </span>
        )}
        {/* Preview du voice avant envoi */}
        {audioBlob && !recording && (
          <div style={{ display: "flex", alignItems: "center", marginRight: 8 }}>
            <audio controls src={URL.createObjectURL(audioBlob)} style={{ marginRight: 8 }} />
            <button
              type="button"
              onClick={() => setAudioBlob(null)}
              style={{
                background: "#fff",
                color: "#d32f2f",
                border: "1px solid #d32f2f",
                borderRadius: 4,
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
              title="Supprimer l'enregistrement"
            >
              Supprimer
            </button>
          </div>
        )}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type something to send..."
          disabled={sending}
          style={{ background: "#fff" }}
        />
        <button
          type="submit"
          disabled={sending || (!input.trim() && !audioBlob)}
          title="Envoyer"
        >
          <FaPaperPlane />
        </button>
      </form>
      {/* Chunked upload UI */}
      <div className={'main'}>
        <input className={`input`} type="file" multiple={false}
          onChange={e => { setFile(e.target.files ? e.target.files[0] : null); }}
        />
        <button onClick={handleUpload} className={'button'}>
          Upload
        </button>
        <div className="files">
          {file && (
            <a
              className="file"
              target="_blank"
              href={file.finalFilename ? 'http://localhost:5000/uploads/' + file.finalFilename : undefined}
              rel="noreferrer"
            >
              <div>{file.finalFilename ?
                '100%' :
                (<>{Math.round((currentChunkIndex ?? 0) / Math.ceil(file.size / chunkSize) * 100)}%</>)
              }</div>
              <div className="name">{file.name}</div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;

function AudioPlayer({ filename, iv, groupKey }: any) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const decryptMedia = async () => {
      try {
        if (!groupKey || !iv) {
          setError("Clé de groupe ou IV manquant");
          return;
        }

        console.log("🔄 Récupération du media:", filename);
        const res = await fetch(`${BACKEND_URL}/uploads/${filename}`);

        if (!res.ok) {
          setError(`Erreur téléchargement: ${res.status}`);
          return;
        }

        const encryptedData = await res.arrayBuffer();
        console.log("✅ Media téléchargé, taille:", encryptedData.byteLength);

        const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
        console.log("🔓 Déchiffrement...");

        const decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          groupKey,
          encryptedData
        );

        console.log("✅ Media déchiffré");

        // Détecte le type de fichier par l'extension
        const ext = filename.split('.').pop()?.toLowerCase();
        const isAudio = ["webm", "mp3", "wav", "ogg"].includes(ext || "");

        const mimeType = isAudio ? "audio/webm" : "application/octet-stream";
        const blob = new Blob([decrypted], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } catch (err) {
        console.error("❌ Erreur déchiffrement media:", err);
        setError(`Erreur: ${err instanceof Error ? err.message : "Déchiffrement échoué"}`);
      }
    };

    decryptMedia();
  }, [filename, groupKey, iv]);

  if (error) return <span style={{ color: "red" }}>❌ {error}</span>;
  if (!audioUrl) return <span>🔓 Déchiffrement...</span>;

  return <audio controls src={audioUrl} style={{ maxWidth: "200px" }} />;
}


function EncryptedImage({ filename, iv, groupKey }: any) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    const decryptImage = async () => {
      try {
        if (!groupKey || !iv) {
          setError("Clé ou IV manquant");
          return;
        }

        const res = await fetch(`${BACKEND_URL}/uploads/${filename}`);

        if (!res.ok) {
          setError(`Erreur téléchargement ${res.status}`);
          return;
        }

        const encryptedData = await res.arrayBuffer();

        const ivBytes = Uint8Array.from(
          atob(iv),
          c => c.charCodeAt(0)
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          groupKey,
          encryptedData
        );

        const ext = filename.split('.').pop()?.toLowerCase();

        let mimeType = "image/png";

        if (ext === "jpg" || ext === "jpeg")
          mimeType = "image/jpeg";
        else if (ext === "gif")
          mimeType = "image/gif";
        else if (ext === "webp")
          mimeType = "image/webp";

        const blob = new Blob([decrypted], {
          type: mimeType
        });

        setImageUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error(err);
        setError("Déchiffrement échoué");
      }
    };

    decryptImage();
  }, [filename, iv, groupKey]);

  if (error)
    return <span style={{ color: "red" }}>{error}</span>;

  if (!imageUrl)
    return <span>🖼️ Déchiffrement...</span>;

  return (
    <img
      src={imageUrl}
      alt={filename}
      style={{
        maxWidth: "220px",
        maxHeight: "220px",
        borderRadius: 8,
        objectFit: "contain"
      }}
    />
  );
}