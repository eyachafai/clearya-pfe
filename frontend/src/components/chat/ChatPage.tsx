import './ChatPage.css';
import { useEffect, useState, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { Conversation } from "../../types/conversation";
import { Message } from "../../types/message";
import { io } from "socket.io-client";
import { encryptAESKeyWithRSA, encryptWithAES, generateAESKey, decryptAESKeyWithRSA, decryptWithAES } from '../../utils/chiffrage';
import { sendMessage } from '../../services/chatService';
import { fetchPublicKey } from '../../services/keyService';
const socket = io("http://localhost:5000");

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
      setMessages(Array.isArray(msgs) ? msgs : []);

      // 4️⃣ WebSocket : écoute les nouveaux messages
      socket.off("receiveMessage");
      socket.on("receiveMessage", (data) => {
        if (!unsubSocket) setMessages((prev) => [...prev, data]);
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


/* aes cryptage */
const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);
const [aesKey, setAesKey] = useState<string | null>(null);

useEffect(() => {
  const loadKey = async () => {
    try {
      const key = await fetchPublicKey();
      setRecipientPublicKey(key);
      const newAesKey = generateAESKey();
      setAesKey(newAesKey);
    } catch (error) {
      console.error("Impossible de charger la clé publique", error);
    }
  };
  loadKey();
}, []);

const encryptedMessageData = recipientPublicKey && aesKey
  ? encryptWithAES("Bonjour 👋", aesKey)
  : null;

const encryptedAESKeyData = recipientPublicKey && aesKey
  ? encryptAESKeyWithRSA(aesKey, recipientPublicKey)
  : null;

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



// Envoi d'un message (temps réel via API)
const handleSend = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if ((!input.trim() && !audioBlob) || !conversation || !utilisateur_id) {
    alert("Impossible d'envoyer le message : utilisateur ou conversation non défini.");
    return;
  }
  setSending(true);
  try {
    if (audioBlob) {
      // Envoi du message vocal
      const audioFile = new File([audioBlob], "audio-message.webm");
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('conversation_id', String(conversation.id));
      formData.append('utilisateur_id', String(utilisateur_id));
      const res = await fetch('/api/messages/send-audio', {
        method: 'POST',
        body: formData
      });
      // On n'ajoute pas le message localement, on attend receiveMessage du serveur
      setAudioBlob(null);
      setInput("");
      setSending(false);
      return;
    }

    const body = {
      conversation_id: conversation.id,
      utilisateur_id,
      contenu: input,
      type: "text",
      encryptedMessageData,
      encryptedAESKeyData,
    };

    await sendMessage(body);
    // On n'ajoute pas le message localement, on attend receiveMessage du serveur
    setInput("");
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

function handleUpload(e?: React.FormEvent) {
  if (e) e.preventDefault();
  setCurrentChunkIndex(0);
}

useEffect(() => {
  async function uploadChunk(readerEvent: ProgressEvent<FileReader>) {
    if (!file) return;
    const data = readerEvent.target?.result;
    const params = new URLSearchParams();
    params.set('name', file.name);
    params.set('currentChunkIndex', String(currentChunkIndex));
    params.set('totalChunks', String(Math.ceil(file.size / chunkSize)));
    // Ajout conversation_id et utilisateur_id pour l'envoi temps réel côté backend
    if (conversation?.id) params.set('conversation_id', String(conversation.id));
    if (utilisateur_id) params.set('utilisateur_id', String(utilisateur_id));
    const headers = { 'Content-Type': 'application/octet-stream' };
    const url = 'http://localhost:5000/api/messages/upload?' + params.toString();

    fetch(url, {
      method: 'POST',
      headers: headers,
      body: data as BodyInit
    }).then(response => response.json())
      .then(res => {
        const isLastChunk = currentChunkIndex === Math.ceil(file.size / chunkSize) - 1;
        if (isLastChunk) {
          file.finalFilename = res.finalFilename;
          setCurrentChunkIndex(null);
          // Plus besoin d'appeler /send-file, le backend gère l'émission socket.io
        } else {
          setCurrentChunkIndex((currentChunkIndex ?? 0) + 1);
        }
      });
  }

  function readAndUploadCurrentChunk() {
    if (!file || currentChunkIndex == null) return;
    const from = currentChunkIndex * chunkSize;
    const to = (currentChunkIndex + 1) * chunkSize >= file.size ? file.size : from + chunkSize;
    const blob = file.slice(from, to);
    const reader = new FileReader();
    reader.onload = e => uploadChunk(e as ProgressEvent<FileReader>);
    reader.readAsDataURL(blob);
  }

  if (currentChunkIndex != null) readAndUploadCurrentChunk();
}, [chunkSize, currentChunkIndex, file, conversation?.id, utilisateur_id]);

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
          if (!contenu) return null;

          let displayedContent: React.ReactNode = contenu;

          // Déchiffrement si données chiffrées présentes
          if (msg.encryptedMessageData && msg.encryptedAESKeyData) {
            const decrypted = decryptMessage(msg);
            displayedContent = decrypted;
          }

          // Affichage audio (avec icône cliquable si pas d'audio tag direct)
          if (msg.type === "audio" && contenu.startsWith("[audio]")) {
            const audioFile = contenu.replace("[audio] ", "");
            displayedContent = (
              <AudioPlayer filename={audioFile} />
            );
          }
          // Affichage image ou fichier
          else if (msg.type === "file" && contenu.startsWith("[file]")) {
            const filename = contenu.replace("[file] ", "");
            const ext = filename.split('.').pop()?.toLowerCase();
            const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
            const isAudio = ["mp3", "wav", "ogg", "webm"].includes(ext || "");

            if (isImage) {
              displayedContent = (
                <img
                  src={`${BACKEND_URL}/uploads/${filename}`}
                  alt={filename}
                  style={{
                    maxWidth: "220px",
                    maxHeight: "220px",
                    borderRadius: 8,
                    display: "block",
                    background: "#eee",
                    objectFit: "contain",
                    margin: "0 auto"
                  }}
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = "none";
                    console.error("Erreur chargement image:", `${BACKEND_URL}/uploads/${filename}`);
                  }}
                />
              );
            } else if (isAudio) {
              displayedContent = (
                <AudioPlayer filename={filename} />
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

// Ajoute ce composant utilitaire dans le même fichier (ou à part si tu préfères)
function AudioPlayer({ filename }: { filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = () => {
    audioRef.current?.play();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button
        onClick={handlePlay}
        style={{
          background: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "2rem",
          marginRight: 8
        }}
        title="Écouter l'audio"
      >
        <span role="img" aria-label="audio">🔊</span>
      </button>
      <audio ref={audioRef} src={`${BACKEND_URL}/uploads/${filename}`} preload="auto" />
    </div>
  );
}

// For demo: private key (NEVER expose in production)
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIBVwIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEAu...etc...
-----END PRIVATE KEY-----`;

// Utility to decrypt a message object
function decryptMessage(msg: Message): string | null {
  try {
    if (msg.encryptedMessageData && msg.encryptedAESKeyData) {
      // 1. Decrypt AES key with RSA private key
      const aesKey = decryptAESKeyWithRSA(msg.encryptedAESKeyData, PRIVATE_KEY);
      // 2. Decrypt message with AES key
      const encryptedData = JSON.parse(msg.encryptedMessageData);
      return decryptWithAES(encryptedData.ciphertext, aesKey, encryptedData.iv);
    }
    return msg.contenu;
  } catch (e) {
    console.error("Erreur déchiffrement:", e);
    return "[Erreur déchiffrement]";
  }
}