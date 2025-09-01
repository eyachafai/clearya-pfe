import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { FaEdit, FaSignOutAlt } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const { keycloak } = useKeycloak();
  const user = keycloak.tokenParsed;
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    document.body.classList.toggle('light-mode', !darkMode);

    if (!keycloak?.authenticated) return;

    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
          },
        });

        const text = await res.text();
        try {
          const data = JSON.parse(text);
          console.log('Utilisateur bien synchronisé avec la base :', data);
        } catch {
          console.error('Réponse non JSON:', text);
        }
      } catch (error) {
        console.error('Erreur de requête /me :', error);
      }
    };



    fetchUserData();

  }, [darkMode, keycloak.authenticated]); // ou [] selon usage


  return (
    <div className="profile-wrapper">
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

      <div className="profile-container">
        <div className="profile-header">
          <img
            src="/default-avatar.png"
            alt="Avatar"
            className="profile-avatar"
          />

          <div>
            <h1>{user?.preferred_username}</h1>
            <p>{user?.email}</p>
          </div>
          <div className="profile-actions">
            <FaEdit
              className="icon"
              title="Modifier le profil"
              onClick={() => navigate('/edit-profile')}
            />
            <FaSignOutAlt
              className="icon"
              onClick={() => keycloak.logout({ redirectUri: window.location.origin + '/' })}
              title="Se déconnecter"
            />

          </div>
        </div>

        <ul className="profile-info">
          <li><strong>Prénom:</strong> {user?.given_name ?? 'Non disponible'}</li>
          <li><strong>Nom:</strong> {user?.family_name ?? 'Non disponible'}</li>
          <li><strong>Email:</strong> {user?.email}</li>
        </ul>

        <div className="profile-buttons">
          <button onClick={() => navigate('/mes-groupes-chat')}>Chat & Messagerie</button>
          <button onClick={() => navigate('/gestion-projet')}>
            Gestion de projet
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
