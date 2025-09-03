import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Member } from "../../types/membre";

const ProjetMembres = () => {
  const { id } = useParams();
  const location = useLocation();
  const projet = location.state?.projet;
  const group = location.state?.group;
  const allMembers: Member[] = location.state?.members || [];
  const [projetMembers, setProjetMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupère les membres du projet depuis l'API
  useEffect(() => {
    async function fetchProjetMembers() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projet/${id}/membres`);
        if (res.ok) {
          const data = await res.json();
          setProjetMembers(data);
        } else {
          setProjetMembers([]);
        }
      } catch {
        setProjetMembers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProjetMembers();
  }, [id]);

  // Ajoute un membre au projet
  const handleAddMember = async (memberId: number) => {
    await fetch(`/api/projet/${id}/membres`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utilisateur_id: memberId }),
    });
    // Refresh
    const res = await fetch(`/api/projet/${id}/membres`);
    setProjetMembers(res.ok ? await res.json() : []);
  };

  // Retire un membre du projet
  const handleRemoveMember = async (memberId: number) => {
    await fetch(`/api/projet/${id}/membres/${memberId}`, {
      method: "DELETE"
    });
    // Refresh
    const res = await fetch(`/api/projet/${id}/membres`);
    setProjetMembers(res.ok ? await res.json() : []);
  };

  // Liste des membres du groupe qui ne sont pas dans le projet
  const availableMembers = allMembers.filter(
    (m) => !projetMembers.some((pm) => pm.id === m.id)
  );

  return (
    <div style={{ padding: "32px", maxWidth: "700px", margin: "40px auto", background: "#fff", borderRadius: "16px", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
      <h2 style={{ fontWeight: "bold", fontSize: "2rem", color: "#222", marginBottom: "24px" }}>
        Membres du projet : {projet?.name}
      </h2>
      <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#222", marginBottom: "16px" }}>Membres actuels</h3>
      <ul>
        {loading ? (
          <li>Chargement...</li>
        ) : projetMembers.length === 0 ? (
          <li>Aucun membre dans ce projet.</li>
        ) : (
          projetMembers.map(m => (
            <li key={m.id} style={{
              background: "#f5f6fa",
              borderRadius: "8px",
              padding: "12px 18px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: "bold",
              color: "#222"
            }}>
              <span>
                {m.username}
                {m.name && ` (${m.name})`}
                {m.email && ` - ${m.email}`}
              </span>
              <button
                onClick={() => handleRemoveMember(m.id)}
                style={{
                  background: "#dc3545",
                  color: "#fff",
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Retirer
              </button>
            </li>
          ))
        )}
      </ul>
      <h3 style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#222", margin: "24px 0 16px" }}>Ajouter un membre du groupe</h3>
      <ul>
        {availableMembers.length === 0 ? (
          <li>Aucun membre disponible à ajouter.</li>
        ) : (
          availableMembers.map(m => (
            <li key={m.id} style={{
              background: "#f5f6fa",
              borderRadius: "8px",
              padding: "12px 18px",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontWeight: "bold",
              color: "#222"
            }}>
              <span>
                {m.username}
                {m.name && ` (${m.name})`}
                {m.email && ` - ${m.email}`}
              </span>
              <button
                onClick={() => handleAddMember(m.id)}
                style={{
                  background: "#198754",
                  color: "#fff",
                  border: "none",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Ajouter
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ProjetMembres;
