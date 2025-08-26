import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaArrowLeft, FaSignOutAlt } from 'react-icons/fa';
import { useKeycloak } from '@react-keycloak/web';
import './AdminPage.css';

const AdminPage = () => {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  const handleLogout = () => {
    keycloak?.logout({ redirectUri: window.location.origin + '/' });
  };

  return (
    <div className="admin-container">
      {/* Icône de déconnexion en haut à gauche */}
      <div style={{ position: 'absolute', top: 20, left: 30, cursor: 'pointer' }} title="Déconnexion">
        <FaSignOutAlt size={24} onClick={handleLogout} />
      </div>
      <div className="back-button" onClick={() => navigate('/Home')}>
        <FaArrowLeft /> Retour
      </div>
      <div className="theme-toggle">
        <label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
          />
          {darkMode ? 'Mode Sombre' : 'Mode Clair'}
        </label>
      </div>

      <div className="main-content">
        <h2>Page Admin</h2>
        <div className="button-group">
          <button
            className="admin-btn"
            onClick={() => window.open('http://localhost:8080/', '_blank')}
          >
            Ouvrir Admin Console Keycloak
          </button>
          <button
            className="admin-btn"
            onClick={() => navigate('/principal')}
          >
            Interface Admin App
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
