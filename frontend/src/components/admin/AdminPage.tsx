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
      <div className="main-content">
        {/* Icône de déconnexion en haut à droite du carré */}
        <div className="logout-icon" title="Déconnexion">
          <FaSignOutAlt size={24} onClick={handleLogout} />
        </div>
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
