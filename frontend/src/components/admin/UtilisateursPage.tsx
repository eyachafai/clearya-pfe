import { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { FaSyncAlt, FaUsers, FaBook } from "react-icons/fa";
import { Utilisateur } from '../../types/utilisateur';


const UtilisateursPage = () => {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get('/api/admin/utilisateurs');
        setUsers(response.data);
      } catch (err: any) {
        setError("Erreur lors du chargement des utilisateurs.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (keycloak_id: string) => {
    if (!window.confirm("Confirmer la suppression de cet utilisateur ?")) return;
    try {
      await apiClient.delete(`/api/auth/delete-keycloak-local/${keycloak_id}`);
      setUsers(users.filter(u => u.keycloak_id !== keycloak_id));
      alert("Utilisateur supprimé !");
    } catch (err: any) {
      alert("Erreur lors de la suppression !");
      console.error(err);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/admin/utilisateurs/sync');
      const response = await apiClient.get('/api/admin/utilisateurs');
      setUsers(response.data);
      alert("Synchronisation terminée !");
    } catch (err: any) {
      setError("Erreur lors de la synchronisation !");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '2rem auto',
        padding: '2.5rem 2rem 2rem 2rem',
        borderRadius: 24,
        background: 'linear-gradient(135deg, #f8fafc 60%, #e3f2fd 100%)',
        boxShadow: '0 8px 32px rgba(44,62,80,0.12)',
        position: 'relative',
        fontFamily: 'Poppins, Segoe UI, Arial, sans-serif'
      }}
    >
      {/* Header luxe */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
        borderBottom: "1px solid #e0e0e0",
        paddingBottom: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <FaUsers style={{ fontSize: "2rem", color: "#4caf50" }} />
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.7rem", color: "#222" }}>Utilisateurs</h2>
          {/* Icône Journal de Connexion */}
          <FaBook
            title="Journal de connexion"
            style={{
              fontSize: "1.5rem",
              color: "#4caf50",
              cursor: "pointer",
              marginLeft: 18
            }}
            onClick={() => navigate('/journal-connexion')}
          />
        </div>
        <button
          style={{
            background: "linear-gradient(90deg,#4caf50,#43a047)",
            color: "#fff",
            borderRadius: "50%",
            padding: "0.7rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(76,175,80,0.08)",
            fontSize: "1.3rem",
            transition: "background 0.2s"
          }}
          onClick={handleSync}
          disabled={loading}
          title="Rafraîchir / Synchroniser"
        >
          <FaSyncAlt />
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div className="lux-loader" />
          <p style={{ color: "#4caf50", fontWeight: 500 }}>Chargement...</p>
        </div>
      ) : error ? (
        <p style={{ color: '#d32f2f', fontWeight: 500, textAlign: "center" }}>{error}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 2px 8px rgba(44,62,80,0.07)",
            overflow: "hidden"
          }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg,#4caf50,#43a047)", color: "#fff" }}>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Username</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Email</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Prénom</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Nom</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid #e0e0e0", transition: "background 0.2s" }}>
                  <td style={{ padding: "0.9rem" }}>{u.username}</td>
                  <td style={{ padding: "0.9rem" }}>{u.email}</td>
                  <td style={{ padding: "0.9rem" }}>{u.first_name ?? ''}</td>
                  <td style={{ padding: "0.9rem" }}>{u.last_name ?? ''}</td>
                  <td style={{ padding: "0.9rem" }}>
                    <button
                      style={{
                        background: "linear-gradient(90deg,#aa0000,#d32f2f)",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "0.4rem 1.2rem",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 500,
                        boxShadow: "0 1px 4px rgba(170,0,0,0.08)",
                        transition: "background 0.2s"
                      }}
                      onClick={() => handleDelete(u.keycloak_id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Loader luxe */}
      <style>{`
        .lux-loader {
          margin: 0 auto 1rem auto;
          width: 36px;
          height: 36px;
          border: 4px solid #e0e0e0;
          border-top: 4px solid #4caf50;
          border-radius: 50%;
          animation: lux-spin 0.8s linear infinite;
        }
        @keyframes lux-spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
    </div>
  );
};

export default UtilisateursPage;
