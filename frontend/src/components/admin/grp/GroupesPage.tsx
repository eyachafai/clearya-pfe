import { useEffect, useState, useRef } from "react";
import { FaSyncAlt, FaUsers, FaTimesCircle } from "react-icons/fa";
import './GroupesPage.css';
import ChatPage from '../../chat/ChatPage';
import { Group } from '../../../types/groupe';
import { useKeycloak } from "@react-keycloak/web";

const GroupesPage = () => {
  console.log("🧩 GroupesPage monté !");

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [openChatGroupeId, setOpenChatGroupeId] = useState<string | null>(null);

  const { keycloak } = useKeycloak();
  const chatKeyRef = useRef<number>(Date.now());

  // ---- Fonction de récupération des groupes ----
const fetchGroups = async () => {
  console.log("🚀 fetchGroups() LANCÉ !");
  setLoading(true);
  try {
    const syncUrl = "http://localhost:5000/api/admin/groupes/sync";
    console.log("🌍 Envoi POST vers :", syncUrl);

    const syncRes = await fetch(syncUrl, { method: "POST" });
    console.log("🧾 syncRes.status =", syncRes.status);

    if (syncRes.ok) {
      const syncData = await syncRes.json();
      console.log("✅ syncData =", syncData);
      alert(syncData.message || "Synchronisation des groupes terminée !");
    } else {
      const errText = await syncRes.text();
      console.warn("⚠️ Erreur sync :", errText);
      alert("Erreur lors de la synchronisation : " + errText);
    }

    const membresUrl = "http://localhost:5000/api/admin/groupes/membres";
    console.log("🌍 Fetch GET vers :", membresUrl);

    const res = await fetch(membresUrl);
    console.log("🧾 res.status =", res.status);

    const data: Group[] = await res.json();
    console.log("📦 Données reçues du backend :", data);

    setGroups(data);
  } catch (err) {
    console.error("💥 Erreur lors du chargement des groupes :", err);
    alert("Erreur serveur !");
  } finally {
    console.log("🏁 Fin du fetchGroups()");
    setLoading(false);
  }
};

  // ---- Hooks React ----
  useEffect(() => {
    console.log("🟢 useEffect appelé — lancement du fetchGroups()");
    fetchGroups();
  }, []);

  useEffect(() => {
    if (openChatGroupeId) {
      chatKeyRef.current = Date.now();
    }
  }, [openChatGroupeId]);


  // ---- Vue principale ----
  if (openChatGroupeId) {
    const selectedGroup = groups.find(g => String(g.id) === String(openChatGroupeId));
    const groupeIdNumber = selectedGroup ? Number(selectedGroup.id) : Number(openChatGroupeId);
    const groupeName = selectedGroup ? selectedGroup.name : "";

    console.log("=== DEBUG OUVERTURE CHAT ===");
    console.log("openChatGroupeId:", openChatGroupeId);
    console.log("groupeIdNumber:", groupeIdNumber);
    console.log("LISTE GROUPES:", groups.map(g => ({ id: g.id, name: g.name })));

    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 1000,
          background: "linear-gradient(135deg,#e3f2fd 0%,#f8fafc 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          style={{
            background: "none",
            color: "#00c853",
            border: "none",
            borderRadius: "50%",
            padding: 0,
            cursor: "pointer",
            fontWeight: 600,
            position: "absolute",
            top: 32,
            left: 32,
            zIndex: 1100,
            fontSize: 44,
          }}
          onClick={() => setOpenChatGroupeId(null)}
          title="Fermer le chat"
        >
          <FaTimesCircle />
        </button>

        <div
          style={{
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            boxShadow: "0 8px 32px #bdbdbd30",
            borderRadius: 32,
            background: "rgba(255,255,255,0.95)",
            padding: "2.5rem 1.5rem",
            position: "relative"
          }}
        >
          <ChatPage
            key={groupeIdNumber}
            groupeIdProp={groupeIdNumber}
            groupeNameProp={groupeName}
          />
        </div>
      </div>
    );
  }

  // ---- Liste des groupes ----
  return (
    <div
      style={{
        maxWidth: 900,
        margin: '2rem auto',
        padding: '2.5rem 2rem 2rem 2rem',
        borderRadius: 24,
        background: '#fff',
        boxShadow: '0 8px 32px rgba(255,152,0,0.10)',
        position: 'relative',
        fontFamily: 'Poppins, Segoe UI, Arial, sans-serif'
      }}
      className="groupes-container"
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
        borderBottom: "1px solid #e0e0e0",
        paddingBottom: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <FaUsers style={{ fontSize: "2rem", color: "#ff9800" }} />
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.7rem", color: "#222" }}>Groupes</h2>
        </div>
        <button
          style={{
            background: "linear-gradient(90deg,#ff9800,#ffc107)",
            color: "#fff",
            borderRadius: "50%",
            padding: "0.7rem",
            border: "none",
            cursor: "pointer",
            fontSize: "1.3rem",
          }}
          onClick={fetchGroups}
          disabled={loading}
          title="Synchroniser"
        >
          <FaSyncAlt />
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden"
        }}>
          <thead>
            <tr style={{ background: "linear-gradient(90deg,#ff9800,#ffc107)", color: "#fff" }}>
              <th style={{ padding: "1rem" }}>Nom du groupe</th>
              <th style={{ padding: "1rem" }}>Membres & rôles</th>
              <th style={{ padding: "1rem" }}>Chat</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const adminUsername = keycloak?.tokenParsed?.preferred_username;
              const isAdminInGroup = group.membres.some(
                (m: any) => m.username === adminUsername
              );
              return (
                <tr key={group.id}>
                  <td style={{ padding: "0.9rem" }}>{group.name}</td>
                  <td style={{ padding: "0.9rem" }}>
                    {group.membres.length === 0 ? (
                      <span style={{ color: "#888" }}>Aucun membre</span>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {group.membres.map(m => (
                          <li key={m.id}>
                            <strong>{m.username}</strong>
                            <span style={{ color: "#888", marginLeft: 8 }}>{m.email}</span>
                            <span style={{
                              border: "1px solid #232323",
                              borderRadius: 10,
                              padding: "1px 7px",
                              marginLeft: 12,
                              fontSize: "0.82em",
                            }}>
                              {m.role}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ padding: "0.9rem" }}>
                    {isAdminInGroup && (
                      <button
                        style={{
                          background: "#ff9800",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "0.5rem 1.2rem",
                          cursor: "pointer",
                          fontWeight: 600
                        }}
                        onClick={() => setOpenChatGroupeId(String(group.id))}
                      >
                        Ouvrir Chat
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && (
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <div style={{
            margin: "0 auto",
            width: 36,
            height: 36,
            border: "4px solid #ffe0b2",
            borderTop: "4px solid #ff9800",
            borderRadius: "50%",
            animation: "lux-spin 0.8s linear infinite"
          }} />
          <style>{`
            @keyframes lux-spin {
              0% { transform: rotate(0deg);}
              100% { transform: rotate(360deg);}
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default GroupesPage;
