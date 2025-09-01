import { useEffect, useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  const handleLogin = () => {
    keycloak?.login();
  };

  const handleLogout = () => {
    keycloak?.logout({ redirectUri: window.location.origin + '/' });
    // Redirection automatique déjà gérée par Keycloak
  };

  useEffect(() => {
    if (keycloak?.authenticated) {
      // Vérifie si l'utilisateur a le rôle myapp-admin
      const roles =
        keycloak?.tokenParsed?.realm_access?.roles || [];
      const clientRoles =
        keycloak?.tokenParsed?.resource_access?.myapp?.roles || [];
      if (roles.includes('admin') || roles.includes('admin-') || clientRoles.includes('myapp-admin')) {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    }
    // Appliquer le mode sombre ou clair
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);
    // Ajoute une classe spéciale au body pour la page Home
    document.body.classList.add('home-page');
    return () => {
      document.body.classList.remove('home-page');
    };
  }, [keycloak?.authenticated, darkMode, navigate]);

  return (
    <div className="home-container">
      {/* Icône de déconnexion supprimée */}
      <div className="main-content">
        <h1>Bienvenue sur Clearya</h1>
        {/* Toggle du mode */}
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

        {!keycloak?.authenticated ? (
          <div className="login-section">
            <p>Veuillez vous connecter pour accéder à votre espace personnel.</p>
            <button className="login-btn" onClick={handleLogin}>Se connecter</button>
          </div>
        ) : (
          <div className="welcome-section">
            <p>Vous êtes connecté(e) avec le rôle : <strong>{keycloak?.tokenParsed?.realm_access?.roles?.join(', ')}</strong></p>
            <button className="logout-btn" onClick={handleLogout}>Se déconnecter</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
