import { useEffect, useState } from 'react';
import apiClient from '../../../services/apiClient';
import { FaBuilding, FaSyncAlt, FaUsers } from "react-icons/fa";
import { Departement,UserInDep,Role } from '../../../types/departement';


const DepartementsPage = () => {
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDep, setSelectedDep] = useState<Departement | null>(null);
  const [depUsers, setDepUsers] = useState<UserInDep[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [depRoles, setDepRoles] = useState<Role[]>([]);

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const response = await apiClient.get<Departement[]>('/api/admin/departements');
        setDepartements(response.data);
      } catch (err: any) {
        setError("Erreur lors du chargement des départements.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeps();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/api/admin/departements/sync');
      const response = await apiClient.get<Departement[]>('/api/admin/departements');
      setDepartements(response.data);
      alert("Synchronisation terminée !");
    } catch (err: any) {
      setError("Erreur lors de la synchronisation !");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowUsers = async (dep: Departement) => {
    setSelectedDep(dep);
    setLoadingUsers(true);
    setDepUsers([]);
    setDepRoles([]);
    try {
      // Récupère les rôles du groupe
      const rolesRes = await apiClient.get<Role[]>(`/api/admin/departements/${dep.keycloak_id}/roles`);
      setDepRoles(rolesRes.data);
      // Récupère les utilisateurs du groupe
      const res = await apiClient.get<UserInDep[]>(`/api/admin/departements/${dep.keycloak_id}/users`);
      setDepUsers(res.data);
    } catch (err) {
      setDepUsers([]);
      setDepRoles([]);
    } finally {
      setLoadingUsers(false);
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
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
        borderBottom: "1px solid #e0e0e0",
        paddingBottom: "1rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <FaBuilding style={{ fontSize: "2rem", color: "#2196f3" }} />
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.7rem", color: "#222" }}>Départements</h2>
        </div>
        <button
          style={{
            background: "linear-gradient(90deg,#2196f3,#1976d2)",
            color: "#fff",
            borderRadius: "50%",
            padding: "0.7rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(33,150,243,0.08)",
            fontSize: "1.3rem",
            transition: "background 0.2s"
          }}
          onClick={handleSync}
          disabled={loading}
          title="Synchroniser"
        >
          <FaSyncAlt />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div className="lux-loader" />
          <p style={{ color: "#2196f3", fontWeight: 500 }}>Chargement...</p>
        </div>
      ) : error ? (
        <p style={{ color: '#d32f2f', fontWeight: 500, textAlign: "center" }}>{error}</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {departements.map(dep => (
            <div key={dep.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 2px 8px rgba(44,62,80,0.07)",
              cursor: "pointer",
              border: selectedDep?.id === dep.id ? "2px solid #607d8b" : "none"
            }}
              onClick={() => handleShowUsers(dep)}
            >
              <FaBuilding style={{ fontSize: "2rem", color: "#2196f3" }} />
              <div>
                <strong>{dep.name}</strong>
                {dep.description && <p style={{ margin: 0 }}>{dep.description}</p>}
              </div>
              <FaUsers style={{ marginLeft: "auto", color: "#607d8b" }} title="Voir les utilisateurs" />
            </div>
          ))}
        </div>
      )}

      {/* Liste des utilisateurs du département sélectionné */}
      {selectedDep && (
        <div style={{
          marginTop: "2.5rem",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 8px rgba(44,62,80,0.07)",
          padding: "1.5rem"
        }}>
          <h3 style={{ marginTop: 0, color: "#607d8b" }}>
            Utilisateurs du département : {selectedDep.name}
          </h3>
          {/* Affichage des rôles du groupe */}
          {depRoles.length > 0 && (
            <div style={{ marginBottom: "1.2rem" }}>
              <strong>Rôles disponibles :</strong>
              <ul style={{ margin: "0.5rem 0 0 0", padding: 0, listStyle: "none", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                {depRoles.map(r => (
                  <li key={r.name} style={{
                    background: "#e0e3e8",
                    color: "#232323",
                    borderRadius: 16,
                    padding: "0.4rem 1.2rem",
                    fontWeight: 500,
                    fontSize: "1rem",
                    boxShadow: "0 1px 4px #bdbdbd30"
                  }}>
                    {r.name}
                    {r.description ? <span style={{ color: "#888", marginLeft: 8, fontSize: "0.95em" }}>({r.description})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingUsers ? (
            <div style={{ textAlign: "center" }}>
              <div className="lux-loader" />
              <p>Chargement...</p>
            </div>
          ) : depUsers.length === 0 ? (
            <p style={{ color: "#888" }}>Aucun utilisateur dans ce département.</p>
          ) : (
            <table className="clearya-table">
              <thead>
                <tr style={{ background: "linear-gradient(90deg,#2196f3,#1976d2)", color: "#fff" }}>
                  <th>Rôle</th>
                  <th>Nom d'utilisateur</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {depUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.role}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Loader style */}
      <style>{`
        .lux-loader {
          margin: 0 auto 1rem auto;
          width: 36px;
          height: 36px;
          border: 4px solid #e0e0e0;
          border-top: 4px solid #2196f3;
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

export default DepartementsPage;
