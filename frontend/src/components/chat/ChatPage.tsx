import './ChatPage.css';
import { useEffect, useState, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import { Conversation } from "../../types/conversation";
import { Message } from "../../types/message";
import { io } from "socket.io-client";
const socket = io("http://localhost:5000"); // URL du backend



const ChatPage = (props: { groupeIdProp?: number, groupeNameProp?: string }) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [chat, setChat] = useState<any[]>([]);
  const [message, setMessage] = useState("");

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
    // Ajoute un log pour voir la valeur brute récupérée
    const fetchUserLocal = async () => {
      try {
        const headers: Record<string, string> = {};
        if (keycloak?.token) {
          headers["Authorization"] = `Bearer ${keycloak.token}`;
        }
        const res = await fetch('http://localhost:5000/api/auth/me', {
          credentials: 'include',
          headers
        });
        if (!res.ok) {
          let id = localStorage.getItem('utilisateur_id');
          console.log("DEBUG localStorage utilisateur_id:", id);
          if (!id || id === "null" || id === "" || isNaN(Number(id))) {
            id = "2";
            localStorage.setItem('utilisateur_id', id);
          }
          setUtilisateurId(Number(id));
          return;
        }
        const data = await res.json();
        console.log("DEBUG /api/auth/me data:", data);
        // Correction ici : il faut récupérer l'id local de la base (pas le keycloakId)
        // Appelle l'API locale pour trouver l'utilisateur par keycloakId et récupérer son id local
        let localId: number | null = null;
        if (data && data.keycloakId) {
          // Appel à /api/admin/utilisateurs pour trouver l'id local
          try {
            const usersRes = await fetch('http://localhost:5000/api/admin/utilisateurs');
            const users = await usersRes.json();
            const userLocal = users.find((u: any) => u.keycloak_id === data.keycloakId);
            if (userLocal && userLocal.id) {
              localId = userLocal.id;
              localStorage.setItem('utilisateur_id', String(localId));
              setUtilisateurId(Number(localId));
              return;
            }
          } catch (e) {
            // fallback
          }
        }
        // fallback si pas trouvé
        if (data && data.id && !isNaN(Number(data.id))) {
          setUtilisateurId(Number(data.id));
          localStorage.setItem('utilisateur_id', String(data.id));
        } else {
          setUtilisateurId(null);
        }
      } catch {
        let id = localStorage.getItem('utilisateur_id');
        console.log("DEBUG localStorage utilisateur_id (catch):", id);
        if (!id || id === "null" || id === "" || isNaN(Number(id))) {
          id = "2";
          localStorage.setItem('utilisateur_id', id);
        }
        setUtilisateurId(Number(id));
      }
    };
    fetchUserLocal();
    // Recevoir un message du serveur
    socket.on("receiveMessage", (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receiveMessage");
    };

  }, [keycloak?.token]);

  // Charger ou créer la conversation du groupe
  useEffect(() => {
    const fetchOrCreateConversation = async () => {
      setLoading(true);
      setConversation(null); // Ajouté : reset conversation pour éviter le flash d'ancienne valeur
      try {
        // Crée ou récupère la conversation pour ce groupe
        const res = await fetch("http://localhost:5000/api/messages/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupe_id, titre: "" }), // <-- titre vide pour forcer le backend à utiliser le nom du groupe
        });
        if (!res.ok) {
          // Correction : utilise error?.message ou error?.error
          let error = {};
          try {
            error = await res.json();
          } catch {
            error = {};
          }
          const errorMsg =
            (error as any)?.message ||
            (error as any)?.error ||
            "Erreur serveur lors de la création de la conversation";
          throw new Error(errorMsg);
        }
        const conv = await res.json();
        if (!conv?.id) throw new Error("Conversation non créée");
        setConversation(conv);

        // Charge les messages
        const msgRes = await fetch(`http://localhost:5000/api/messages/conversations/${conv.id}/messages`);
        if (!msgRes.ok) {
          const error = await msgRes.json().catch(() => ({}));
          throw new Error(error?.error || "Erreur serveur lors du chargement des messages");
        }
        const msgs = await msgRes.json();
        setMessages(Array.isArray(msgs) ? msgs : []);
      } catch (err: any) {
        setMessages([]);
        alert(err?.message || "Erreur lors du chargement du chat.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrCreateConversation();
  }, [groupe_id]);

  // Récupère le nom du groupe depuis l'API locale
  useEffect(() => {
    if (props.groupeNameProp) {
      setGroupeName(props.groupeNameProp);
      return;
    }
    const fetchGroupeName = async () => {
      if (!groupe_id) return;
      try {
        // Appel direct à l'API groupes pour récupérer le nom du groupe par id
        const res = await fetch(`http://localhost:5000/api/admin/groupes`);
        const data = await res.json();
        // Cherche le groupe courant par id
        const groupe = Array.isArray(data) ? data.find((g: any) => Number(g.id) === groupe_id) : null;
        setGroupeName(groupe?.name || "");
      } catch {
        setGroupeName("");
      }
    };
    fetchGroupeName();
  }, [groupe_id, props.groupeNameProp]);

  // Scroll auto en bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pour que le message soit envoyé, il faut que :
  // - utilisateur_id soit bien défini (donc l'utilisateur connecté existe dans la base locale)
  // - conversation soit bien créée (conversation.id existe)
  // Ajoute un log pour debug :
  useEffect(() => {
    console.log("DEBUG utilisateur_id:", utilisateur_id);
    console.log("DEBUG conversation:", conversation);
  }, [utilisateur_id, conversation]);

  // Marquer automatiquement comme lu les messages non lus qui ne sont pas à moi
  useEffect(() => {
    if (!utilisateur_id) return;
    const unread = messages.filter(
      (msg) => msg.utilisateur_id !== utilisateur_id && !msg.is_read
    );
    // Met à jour le badge sur l'icône de l'app (stocke le nombre dans localStorage)
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

  // Envoi d'un message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !conversation || !utilisateur_id) {
      alert("Impossible d'envoyer le message : utilisateur ou conversation non défini.");
      return;
    }
    setSending(true);
    try {
      console.log("Envoi message POST", {
        conversation_id: conversation.id,
        utilisateur_id,
        contenu: input,
        type: "text"
      });

      const url = "http://localhost:5000/api/messages/messages";
      console.log("URL utilisée pour POST:", url);

      const body = {
        conversation_id: conversation.id,
        utilisateur_id,
        contenu: input,
        type: "text"
      };
      console.log("Body envoyé:", body);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log("Statut réponse:", res.status);

      socket.emit("sendMessage", body);
      setMessage("");

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setInput("");
      } else {
        const errorText = await res.text();
        console.error("Erreur backend:", errorText);
        alert("Erreur backend: " + errorText);
      }
    } catch (err) {
      // Correction pour TypeScript : err peut être de type unknown
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

  return (
    <div style={{
      maxWidth: 700,
      margin: "2rem auto",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 12px #bdbdbd30",
      padding: "1.5rem",
      minHeight: 500,
      display: "flex",
      flexDirection: "column"
    }}>
      <h2 style={{ color: "#ff9800", marginBottom: "1.5rem" }}>
        Chat {groupeName}
      </h2>
      <div style={{
        flex: 1,
        overflowY: "auto",
        background: "#f8fafc",
        borderRadius: 12,
        padding: "1rem",
        marginBottom: "1.2rem",
        minHeight: 300,
        maxHeight: 400
      }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#ff9800" }}>Chargement...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center" }}>Aucun message.</div>
        ) : (
          Array.isArray(messages) && messages.map(msg => (
            <div key={msg.id} style={{
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              alignItems: msg.utilisateur_id === utilisateur_id ? "flex-end" : "flex-start"
            }}>
              <div style={{
                background: msg.utilisateur_id === utilisateur_id ? "#ff9800" : "#e0e3e8",
                color: msg.utilisateur_id === utilisateur_id ? "#fff" : "#232323",
                borderRadius: 12,
                padding: "0.7rem 1.2rem",
                maxWidth: 340,
                fontSize: "1rem",
                fontWeight: 500,
                boxShadow: "0 1px 4px #bdbdbd30",
                opacity: msg.utilisateur_id !== utilisateur_id && !msg.is_read ? 0.7 : 1
              }}>
                {msg.contenu}
              </div>
              <div style={{
                fontSize: "0.85em",
                color: "#888",
                marginTop: 2,
                marginLeft: 4,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                {msg.utilisateur?.username || "moi"} · {new Date(msg.date_envoi).toLocaleTimeString()}
                {/* Affiche "vu" pour les messages reçus qui sont lus */}
                {msg.utilisateur_id !== utilisateur_id && msg.is_read && (
                  <span style={{ color: "#4caf50", marginLeft: 8, fontWeight: 600 }}>vu</span>
                )}
                {/* Affiche "vu" pour MES messages SI au moins un autre membre du groupe l'a lu */}
                {msg.utilisateur_id === utilisateur_id && msg.is_read && (
                  <span style={{ color: "#4caf50", marginLeft: 8, fontWeight: 600 }}>vu</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} style={{
        display: "flex",
        gap: "1rem",
        alignItems: "center"
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Écrire un message..."
          style={{
            flex: 1,
            padding: "0.9rem 1.2rem",
            borderRadius: 30,
            border: "1px solid #e0e0e0",
            fontSize: "1rem",
            outline: "none"
          }}
          disabled={sending}
        />
        <button
          type="submit"
          style={{
            background: "linear-gradient(90deg,#ff9800,#ffc107)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255,152,0,0.08)",
            transition: "background 0.2s"
          }}
          disabled={sending || !input.trim()}
          title="Envoyer"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default ChatPage;

// Explication de la logique chat/conversation/messages

// 1. Groupes et utilisateurs
// - Chaque utilisateur appartient à un ou plusieurs groupes (table `groupe_utilisateur`).
// - Un groupe peut être, par exemple, "Employee", "Département Technique", etc.

// 2. Conversation
// - Une conversation est créée pour chaque groupe (table `conversation`).
// - La conversation est liée à un groupe via `groupe_id`.
// - Quand tu ouvres le chat d’un groupe, le frontend demande au backend de créer ou récupérer la conversation liée à ce groupe.

// 3. Messages
// - Les messages sont liés à une conversation et à un utilisateur (table `message`).
// - Quand tu envoies un message, le frontend envoie une requête POST avec :
//   - `conversation_id` (la conversation du groupe)
//   - `utilisateur_id` (l’utilisateur connecté)
//   - `contenu` (le texte du message)
//   - `type` (ex: "text")

// 4. Affichage
// - Le frontend affiche le nom du groupe (récupéré via l’API locale).
// - Il affiche la liste des messages de la conversation, avec le nom de l’auteur et l’heure.
// - Les messages envoyés par l’utilisateur connecté sont alignés à droite, les autres à gauche.

// 5. Sécurité et cohérence
// - Le backend vérifie que la conversation et l’utilisateur existent avant d’enregistrer le message.
// - Les ids utilisés sont ceux de la base locale (pas Keycloak).

// 6. Flux typique
// - L’utilisateur clique sur "Chat & Messagerie" → voit la liste de ses groupes.
// - Il clique sur un groupe → le frontend charge la conversation du groupe et les messages.
// - Il écrit un message → le message est envoyé et affiché dans la conversation.

// ---

// **En résumé :**
// - 1 groupe = 1 conversation.
// - Les membres du groupe peuvent envoyer/lire des messages dans la conversation du groupe.
// - Tout est relié par les ids locaux (users, groupe, conversation, message).

// ---

// # Analyse du problème

// - Si tu es connecté avec user1 mais que les messages sont envoyés avec l’id ou le nom d’un autre utilisateur (ex : maroua), c’est que l’id local (`utilisateur_id`) n’est pas mis à jour après changement de compte.
// - Possible causes :
//   - Tu n’as pas déconnecté/reconnecté proprement (le localStorage garde l’ancien id).
//   - La page frontend ne recharge pas l’id utilisateur après login/logout.
//   - Le backend `/api/auth/me` retourne l’id du précédent utilisateur (token non rafraîchi).

// ---

// # Solution pratique

// 1. **Déconnecte-toi** complètement (bouton logout) pour vider le token et le localStorage.
// 2. **Reconnecte-toi** avec user1, vérifie que le token Keycloak est bien celui de user1.
// 3. **Vérifie le localStorage** :
//    - Ouvre la console navigateur, tape :
//      `localStorage.getItem('utilisateur_id')`
//    - Il doit afficher l’id de user1 (ex : 4).
// 4. **Recharge la page** pour forcer la récupération du nouvel id utilisateur.
// 5. **Vérifie dans la console** que `utilisateur_id` est bien celui de user1 avant d’envoyer un message.

// ---

// # À corriger dans le frontend

// - Après chaque login/logout, supprime l’id du localStorage :
//   ```js
//   localStorage.removeItem('utilisateur_id');
//   ```
// - Recharge la page ou appelle `/api/auth/me` pour récupérer l’id du nouvel utilisateur.

// ---

// # En résumé

// - Le frontend doit toujours utiliser l’id de l’utilisateur connecté (pas celui du précédent).
// - Si tu changes de compte, déconnecte-toi et reconnecte-toi pour synchroniser l’id local.
// - Vérifie la valeur de `utilisateur_id` avant chaque envoi de message.
