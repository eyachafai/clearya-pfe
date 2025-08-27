import { useEffect, useState } from "react";
import { FaUsers } from "react-icons/fa";
import ChatPage from "./ChatPage";
import { Groupe } from '../../types/grp_slide';
import { UnreadCount } from '../../types/message';

const MesGroupesChatPage = () => {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [utilisateurId, setUtilisateurId] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const [selectedGroupeId, setSelectedGroupeId] = useState<number | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('utilisateur_id');
    if (!id || id === "null" || id === "" || isNaN(Number(id))) {
      fetch('/api/auth/me', { credentials: 'include' })
        .then(async res => {
          if (!res.ok) throw new Error("Unauthorized");
          const data = await res.json();
          if (data && (data.id || data.keycloakId)) {
            const validId = data.id || data.keycloakId;
            localStorage.setItem('utilisateur_id', String(validId));
            setUtilisateurId(Number(validId));
          } else {
            localStorage.setItem('utilisateur_id', "2");
            setUtilisateurId(2);
          }
        })
        .catch(() => {
          localStorage.setItem('utilisateur_id', "2");
          setUtilisateurId(2);
        });
    } else {
      setUtilisateurId(Number(id));
    }
  }, []);

  useEffect(() => {
    if (!utilisateurId) return;
    fetch(`/api/admin/groupes-utilisateur/${utilisateurId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGroupes(data.map((g: any) => ({ id: g.id, name: g.name })));
        } else {
          setGroupes([]);
        }
      });
  }, [utilisateurId]);

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
