import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers } from "react-icons/fa";

type Groupe = {
  id: number;
  name: string;
};

type UnreadCount = {
  [groupeId: number]: number;
};

const MesGroupesChatPage = () => {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [utilisateurId, setUtilisateurId] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});
  const navigate = useNavigate();

  useEffect(() => {
    // Récupère l'id utilisateur local depuis localStorage ou via /api/auth/me si possible
    let id = localStorage.getItem('utilisateur_id');
    if (!id || id === "null" || id === "" || isNaN(Number(id))) {
      // Essaie de récupérer via /api/auth/me si le localStorage est vide
      fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
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
    // Debug : vérifie la valeur utilisateurId
    console.log("utilisateurId localStorage:", utilisateurId);
  }, [utilisateurId]);

  useEffect(() => {
    if (!utilisateurId) return;
    // Appel API backend pour récupérer les groupes de l'utilisateur
    fetch(`http://localhost:5000/api/admin/groupes-utilisateur/${utilisateurId}`)
      .then(res => res.json())
      .then(data => {
        console.log("Réponse groupes-utilisateur:", data); // Debug
        if (Array.isArray(data)) {
          setGroupes(data.map((g: any) => ({ id: g.id, name: g.name })));
        } else {
          setGroupes([]);
        }
      });
  }, [utilisateurId]);

  // Récupère le nombre de messages non lus pour chaque groupe
  useEffect(() => {
    if (!utilisateurId || groupes.length === 0) return;
    console.log("==== DEBUG fetchUnread ====");
    console.log("utilisateurId:", utilisateurId);
    console.log("groupes:", groupes);
    const fetchUnread = async () => {
      const counts: UnreadCount = {};
      await Promise.all(
        groupes.map(async (g) => {
          let convId: number | null = null;
          try {
            console.log(`--> Groupe ${g.id} (${g.name}) : fetch conversation`);
            const convRes = await fetch(`http://localhost:5000/api/messages/conversations`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ groupe_id: g.id, titre: g.name }),
            });
            if (!convRes.ok) {
              console.error(`Erreur conversation groupe ${g.id}:`, convRes.status, convRes.statusText);
              return;
            }
            const conv = await convRes.json();
            console.log(`Conversation reçue pour groupe ${g.id}:`, conv);
            if (!conv?.id) {
              console.error(`Conversation non trouvée/créée pour groupe ${g.id}`, conv);
              return;
            }
            convId = conv.id;
          } catch (err) {
            console.error(`Erreur fetch conversation groupe ${g.id}:`, err);
            return;
          }
          // 2. Récupère les messages de la conversation
          try {
            console.log(`--> Groupe ${g.id} (${g.name}) : fetch messages conversation ${convId}`);
            const msgsRes = await fetch(`http://localhost:5000/api/messages/conversations/${convId}/messages`);
            if (!msgsRes.ok) {
              console.error(`Erreur fetch messages conversation ${convId}:`, msgsRes.status, msgsRes.statusText);
              return;
            }
            const msgs = await msgsRes.json();
            console.log(`Messages reçus pour conversation ${convId}:`, msgs);
            // DEBUG: Affiche tous les messages pour cette conversation
            if (Array.isArray(msgs)) {
              msgs.forEach((m: any) => {
                console.log(
                  `MSG id=${m.id} conv=${m.conversation_id} user=${m.utilisateur_id} is_read=${m.is_read} contenu="${m.contenu}"`
                );
              });
            }
            // 3. Compte les messages non lus (is_read === false) dans cette conversation
            // Correction : badge pour tout message non lu (is_read: false) envoyé par un autre utilisateur
            const unreadMsgs = Array.isArray(msgs)
              ? msgs.filter((m: any) =>
                  !m.is_read &&
                  m.conversation_id === convId &&
                  m.utilisateur_id !== utilisateurId
                )
              : [];
            counts[g.id] = unreadMsgs.length;
            if (unreadMsgs.length > 0) {
              console.log(`BADGE: Groupe ${g.id} (${g.name}) → ${unreadMsgs.length} non lus`, unreadMsgs);
            }
            // DEBUG: Affiche les messages non lus trouvés
            console.log(`DEBUG non lus pour groupe ${g.id}:`, unreadMsgs);
            console.log(`Groupe ${g.id} (${g.name}) : ${counts[g.id]} message(s) non lus`);
          } catch (err) {
            console.error(`Erreur fetch messages pour conversation ${convId}:`, err);
            counts[g.id] = 0;
          }
        })
      );
      console.log("Résultat final unreadCounts:", counts);
      setUnreadCounts(counts);
    };
    fetchUnread();
  }, [groupes, utilisateurId]);

  return (
    <div style={{
      maxWidth: 600,
      margin: "2rem auto",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 12px #bdbdbd30",
      padding: "2rem"
    }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, color: "#ff9800" }}>
        <FaUsers /> Mes groupes de chat
      </h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "2rem" }}>
        {groupes.map(g => (
          <li key={g.id} style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#ffe0b2",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "1.1rem",
            color: "#232323",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
            onClick={() => navigate(`/chat?groupe_id=${g.id}`)}
          >
            <span>{g.name}</span>
            {unreadCounts[g.id] > 0 && (
              <span style={{
                background: "#ff9800",
                color: "#fff",
                borderRadius: "50%",
                minWidth: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "0.95em",
                marginLeft: 12,
                boxShadow: "0 1px 4px #bdbdbd30"
              }}>
                {unreadCounts[g.id]}
              </span>
            )}
          </li>
        ))}
        {groupes.length === 0 && (
          <li style={{ color: "#888", textAlign: "center", marginTop: "2rem" }}>
            Aucun groupe trouvé.
          </li>
        )}
      </ul>
    </div>
  );
};

export default MesGroupesChatPage;
