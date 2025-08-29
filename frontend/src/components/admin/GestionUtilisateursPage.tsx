import { useState } from 'react';
import UtilisateursPage from './UtilisateursPage';
import GroupesPage from './grp/GroupesPage';
import DepartementsPage from './grp/DepartementsPage';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaSignOutAlt } from 'react-icons/fa';

const GestionUtilisateursPage = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Redirige vers la page Home après logout
    window.location.href = '/';
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#e3f2fd 0%,#f8fafc 100%)"
    }}>
      {/* Header luxe */}
      <div style={{
        width: '100%',
        padding: '2rem 0 1.2rem 0',
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '0 2px 16px rgba(44,62,80,0.07)',
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: "1px solid #e0e0e0"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          position: "relative"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.2rem"
          }}>
            <h2 style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "2rem",
              color: "#222",
              letterSpacing: "1px"
            }}>Gestion des utilisateurs</h2>
            {/* Icône journal de connexion à côté du titre */}
            <FaBook
              title="Journal de connexion"
              style={{
                fontSize: "1.7rem",
                color: "#4caf50",
                cursor: "pointer",
                marginLeft: 12
              }}
              onClick={() => navigate('/journal-connexion')}
            />
          </div>
          {/* Icône de déconnexion verte à droite */}
          <FaSignOutAlt
            title="Déconnexion"
            style={{
              fontSize: "1.7rem",
              color: "#00c853",
              cursor: "pointer",
              marginLeft: "auto"
            }}
            onClick={handleLogout}
          />
        </div>
        <div style={{ marginTop: '1.2rem', display: "flex", justifyContent: "center", gap: "1.5rem" }}>
          <button style={{
            padding: '0.8rem 2.2rem',
            borderRadius: 30,
            background: "linear-gradient(90deg,#4caf50,#43a047)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(76,175,80,0.08)",
            transition: "background 0.2s"
          }} onClick={() => setSelected('utilisateurs')}>Utilisateurs</button>
          <button style={{
            padding: '0.8rem 2.2rem',
            borderRadius: 30,
            background: "linear-gradient(90deg,#1976d2,#64b5f6)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(25,118,210,0.08)",
            transition: "background 0.2s"
          }} onClick={() => setSelected('departements')}>Départements</button>
          <button style={{
            padding: '0.8rem 2.2rem',
            borderRadius: 30,
            background: "linear-gradient(90deg,#ff9800,#ffc107)",
            color: "#fff",
            border: "none",
            fontWeight: 600,
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255,152,0,0.08)",
            transition: "background 0.2s"
          }} onClick={() => setSelected('groupes')}>Groupes</button>
        </div>
      </div>
      {/* Contenu dynamique centré */}
      <div style={{ maxWidth: 1000, margin: '2rem auto', minHeight: 400 }}>
        {selected === 'utilisateurs' && <UtilisateursPage />}
        {selected === 'groupes' && <GroupesPage />}
        {selected === 'departements' && <DepartementsPage />} 
        {!selected && (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: '#888', fontSize: "1.2rem" }}>
            <p>Sélectionnez une section à afficher.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUtilisateursPage;
