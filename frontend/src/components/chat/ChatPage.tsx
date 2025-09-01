import './ChatPage.css';
import { useEffect, useState, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { Conversation } from "../../types/conversation";
import { Message } from "../../types/message";
import { io } from "socket.io-client";
import { encryptAESKeyWithRSA, encryptWithAES, generateAESKey } from '../../utils/chiffrage';
import { lireFile, sendMessage } from '../../services/chatService';
import { fetchPublicKey } from '../../services/keyService';
const socket = io("http://localhost:5000");

const ChatPage = (props: { groupeIdProp?: number, groupeNameProp?: string }) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groupeName, setGroupeName] = useState<string>(props.groupeNameProp || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  const { keycloak } = useKeycloak();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const groupe_id = props.groupeIdProp ?? (Number(params.get("groupe_id")) || 1);
  const [utilisateur_id, setUtilisateurId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAudioFiles() {
      const newUrls: Record<string, string> = {}; // clé = nom du fichier
      for (const msg of messages) {
        if (msg.type !== "text") {
          try {
            const fileName = msg.contenu;
            newUrls[fileName] = `http://localhost:5000/file/${fileName}`;

            console.log("URL audio :", newUrls);

          } catch (err) {
            console.error("Erreur téléchargement fichier:", err);
          }
        }
      }
      setAudioUrls(newUrls); // <-- ici, on passe tout l'objet
    }
    fetchAudioFiles();
  }, [messages]);



  useEffect(() => {
    let unsubSocket = false;
    const fetchAll = async () => {
      setLoading(true);
      setConversation(null);
      try {
        // 1. Récupère l'utilisateur local
        let id = localStorage.getItem('utilisateur_id');
        if (!id || id === "null" || id === "" || isNaN(Number(id))) {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (data && (data.id || data.keycloakId)) {
              const validId = data.id || data.keycloakId;
              localStorage.setItem('utilisateur_id', String(validId));
              setUtilisateurId(Number(validId));
            } else {
              localStorage.setItem('utilisateur_id', "2");
              setUtilisateurId(2);
            }
          } else {
            localStorage.setItem('utilisateur_id', "2");
            setUtilisateurId(2);
          }
        } else {
          setUtilisateurId(Number(id));
        }

        // 2. Crée ou récupère la conversation pour ce groupe via API proxy
        const convRes = await fetch("/api/messages/conversations/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupe_id, titre: "" }),
        });
        if (!convRes.ok) throw new Error("Erreur serveur lors de la création de la conversation");
        const conv = await convRes.json();
        console.log("conv ", conv)
        if (!conv?.id) throw new Error("Conversation non créée");
        setConversation(conv);

        // 3. Charge les messages via API proxy
        const msgRes = await fetch(`/api/messages/conversations/${conv.id}/messages/proxy`);
        if (!msgRes.ok) throw new Error("Erreur serveur lors du chargement des messages");
        const msgs = await msgRes.json();
        console.log(msgs)
        setMessages(Array.isArray(msgs) ? msgs : []);

        // 4. Récupère le nom du groupe si besoin
        // if (!props.groupeNameProp) {
        //   const res = await fetch(`/api/admin/groupes`);
        //   const data = await res.json();
        //   const groupe = Array.isArray(data) ? data.find((g: any) => Number(g.id) === groupe_id) : null;
        //   setGroupeName(groupe?.name || "");
        // }

        // 5. Socket.io : écoute les nouveaux messages
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

  // Scroll auto en bas UNIQUEMENT à l'ouverture du chat (pas à chaque message)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        const ref = messagesEndRef.current;
        if (ref) {
          // Cherche le parent scrollable (.wa-messages)
          let parent = ref.parentElement;
          // Si le parent n'est pas scrollable, cherche plus haut
          while (parent && parent !== document.body && parent.scrollHeight <= parent.clientHeight) {
            parent = parent.parentElement;
          }
          if (parent && parent.scrollHeight > parent.clientHeight) {
            parent.scrollTop = parent.scrollHeight;
          } else {
            ref.scrollIntoView({ behavior: "auto" });
          }
        }
      }, 0);
    }
  }, [conversation?.id]);

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
        formData.append('conversation_id', String(conversation.id)); // <-- convert to string
        formData.append('utilisateur_id', String(utilisateur_id));   // <-- convert to string
        await fetch('/api/messages/send-audio', {
          method: 'POST',
          body: formData
        });
        setAudioBlob(null);
        setInput("");
        setSending(false);
        return;
      }

      const body = {
        conversation_id: conversation.id,
        utilisateur_id,
        contenu: input,
        type: "audio",
        encryptedMessageData,
        encryptedAESKeyData,
      };

      await sendMessage(body)

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
  }, [chunkSize, currentChunkIndex, file]);

  // WhatsApp-like layout
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
          Array.isArray(messages) && messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={`wa-message-row${msg.utilisateur_id === utilisateur_id ? " me" : ""}`}
            >
              <div className="wa-bubble">
                {/* 
                 <audio
                    controls
                    src="http://localhost:5000/file/audio_1756741603620_audio-message.webm"
                    style={{ width: "100%" }}
                  />
 */}
                {msg.type === "audio" ? (
                  msg.contenu === "[audio-chunk]" ? (
                    <span style={{ color: "#888" }}>⏳ Message audio en cours...</span>
                  ) : audioUrls[msg.contenu.replace("[audio]", "").trim()] ? (
                    <audio
                      controls
                      src={audioUrls[msg.contenu.replace("[audio]", "").trim()]}
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <span style={{ color: "#888" }}>Chargement audio...</span>
                  )
                ) : (
                  msg.contenu
                )}

              </div>

              <div className="wa-meta">
                {msg.utilisateur?.username || "moi"} · {new Date(msg.date_envoi).toLocaleTimeString()}
                {idx === messages.length - 1 && msg.is_read && (
                  <span className="vu">vu</span>
                )}
              </div>
            </div>
          ))
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