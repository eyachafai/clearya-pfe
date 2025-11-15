import { useEffect, useState } from "react";
import { FaUsers } from "react-icons/fa";
import ChatPage from "./ChatPage";
import { Groupe } from '../../types/grp_slide';
import { UnreadCount } from '../../types/message';
import { useKeycloak } from '@react-keycloak/web';


const MesGroupesChatPage = () => {
  console.log("✅ MesGroupesChatPage monté !");

  const { keycloak } = useKeycloak();
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [utilisateurId, setUtilisateurId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [selectedGroupeId, setSelectedGroupeId] = useState<number | null>(null);
  const [keycloakId, setKeycloakId] = useState<string | null>(null); // UUID Keycloak

useEffect(() => {
  const storedKeycloakId = localStorage.getItem("utilisateur_keycloak_id");
  const storedUserId = localStorage.getItem("utilisateur_id");

  if (storedKeycloakId && storedUserId) {
    setKeycloakId(storedKeycloakId);
    setUtilisateurId(storedUserId);
  } else if (keycloak?.token) {
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${keycloak.token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject("Unauthorized"))
      .then(data => {
        if (data?.keycloakId) {
          localStorage.setItem("utilisateur_keycloak_id", data.keycloakId);
          localStorage.setItem("utilisateur_id", data.id || "undefined");
          localStorage.setItem("utilisateur", JSON.stringify(data));
          setKeycloakId(data.keycloakId);
          setUtilisateurId(data.id || "undefined");
        }
      })
      .catch(err => console.error("❌ Erreur /api/auth/me :", err));
  } else {
    console.warn("⚠️ Aucun token Keycloak disponible");
  }
}, [keycloak?.token]);

useEffect(() => {
  console.log("👀 keycloakId actuel :", keycloakId);
  if (!keycloakId) {
    console.error("❌ keycloakId est null ou invalide, requête annulée");
    return;
  }

  console.log("🚀 Lancement du fetch groupes pour utilisateur", keycloakId);

  fetch(`/api/groupes-utilisateur/${keycloakId}`)
    .then(res => res.json())
    .then(data => {
      console.log("📦 Données reçues du backend :", data);
      if (Array.isArray(data)) {
        setGroupes(data.map((g: any) => ({ id: g.id, name: g.name, role: g.role })));
      } else {
        setGroupes([]);
      }
    })
    .catch(err => console.error("❌ Erreur fetch groupes :", err));
}, [keycloakId]);

    useEffect(() => {
      if (!utilisateurId || groupes.length === 0) return;
      const fetchUnread = async () => {
        const counts: UnreadCount = {};
        await Promise.all(
          groupes.map(async (g) => {
            let convId: number | null = null;
            try {
              const convRes = await fetch(`/api/messages/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ groupe_id: g.id, titre: g.name }),
              });
              if (!convRes.ok) return;
              const conv = await convRes.json();
              if (!conv?.id) return;
              convId = conv.id;
            } catch {
              return;
            }
            try {
              const msgsRes = await fetch(`/api/messages/conversations/${convId}/messages`);
              if (!msgsRes.ok) return;
              const msgs = await msgsRes.json();
              const unreadMsgs = Array.isArray(msgs)
                ? msgs.filter((m: any) =>
                  !m.is_read &&
                  m.conversation_id === convId &&
                  m.utilisateur_id !== utilisateurId
                )
                : [];
              counts[g.id] = unreadMsgs.length;
            } catch {
              counts[g.id] = 0;
            }
          })
        );
        setUnreadCounts(counts);
      };
      fetchUnread();
    }, [groupes, utilisateurId]);

    return (
      <div className="wa-app">
        <aside className="wa-sidebar">
          <div className="wa-sidebar-header">
            <FaUsers style={{ marginRight: 10, color: "#00c853" }} />
            Mes groupes
          </div>
          <div className="wa-chats-list">
            {groupes.length === 0 ? (
              <div style={{ color: "#888", padding: "1.5rem" }}>Aucun groupe trouvé.</div>
            ) : (
              groupes.map(g => (
                <button
                  key={g.id}
                  className={`wa-chat-item${selectedGroupeId === g.id ? " active" : ""}`}
                  onClick={() => setSelectedGroupeId(g.id)}
                >
                  <div className="wa-chat-avatar">{g.name[0]?.toUpperCase() || "G"}</div>
                  <div className="wa-chat-meta">
                    <span className="wa-chat-title">{g.name}</span>
                    {/* Optionnel: dernier message ou info */}
                  </div>
                  {unreadCounts[g.id] > 0 && (
                    <span className="wa-chat-badge">{unreadCounts[g.id]}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>
        <main className="wa-main">
          {selectedGroupeId ? (
            <ChatPage key={selectedGroupeId} groupeIdProp={selectedGroupeId} />
          ) : (
            <div style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: "1.2rem"
            }}>
              Sélectionnez un groupe pour commencer à discuter.
            </div>
          )}
        </main>
      </div>
    );
  };

  export default MesGroupesChatPage;