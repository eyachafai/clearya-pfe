import './ChatPage.css';
import { useEffect, useState, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { Conversation } from "../../types/conversation";
import { Message } from "../../types/message";
import { io } from "socket.io-client";
import { encryptAESKeyWithRSA, encryptWithAES, generateAESKey } from '../../utils/chiffrage';
import { sendMessage } from '../../services/chatService';
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

  const { keycloak } = useKeycloak();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const groupe_id = props.groupeIdProp ?? (Number(params.get("groupe_id")) || 1);
  const [utilisateur_id, setUtilisateurId] = useState<number | null>(null);



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
        if (!conv?.id) throw new Error("Conversation non créée");
        setConversation(conv);

        // 3. Charge les messages via API proxy
        const msgRes = await fetch(`/api/messages/conversations/${conv.id}/messages/proxy`);
        if (!msgRes.ok) throw new Error("Erreur serveur lors du chargement des messages");
        const msgs = await msgRes.json();
        setMessages(Array.isArray(msgs) ? msgs : []);

        // 4. Récupère le nom du groupe si besoin
        if (!props.groupeNameProp) {
          const res = await fetch(`/api/admin/groupes`);
          const data = await res.json();
          const groupe = Array.isArray(data) ? data.find((g: any) => Number(g.id) === groupe_id) : null;
          setGroupeName(groupe?.name || "");
        }

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
    if (!input.trim() || !conversation || !utilisateur_id) {
      alert("Impossible d'envoyer le message : utilisateur ou conversation non défini.");
      return;
    }
    setSending(true);
    try {
      const body = {
        conversation_id: conversation.id,
        utilisateur_id,
        contenu: input,
        type: "text",
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
                {msg.contenu}
              </div>
              <div className="wa-meta">
                {msg.utilisateur?.username || "moi"} · {new Date(msg.date_envoi).toLocaleTimeString()}
                {/* Affiche "vu" seulement pour le dernier message de la conversation */}
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
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type something to send..."
          disabled={sending}
          style={{ background: "#fff" }} // force fond blanc si besoin
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          title="Envoyer"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
}

export default ChatPage;
