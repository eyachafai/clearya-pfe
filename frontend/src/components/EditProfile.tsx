import { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './EditProfile.css';
import { updateProfile } from '../services/authService';

const EditProfile = () => {
  const { keycloak } = useKeycloak();
  const navigate = useNavigate();

  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (keycloak?.authenticated && keycloak?.tokenParsed) {
      setNewFirstName(keycloak.tokenParsed.given_name ?? '');
      setNewLastName(keycloak.tokenParsed.family_name ?? '');
      setNewEmail(keycloak.tokenParsed.email ?? '');
    }
  }, [keycloak]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = keycloak?.token;
    if (!token) {
      alert('Utilisateur non authentifié');
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      alert('Email invalide');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
      };

      const res = await updateProfile(payload);
      console.log("Profil mis à jour :", res);

      if (res.status != 200) {
        alert(`Échec de la mise à jour : status ${res.status} }`);
      } else {
        alert('Profil mis à jour avec succès !');
        navigate('/profile');
      }
    } catch (error: any) {
      alert(`Échec de la mise à jour du profil : ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="edit-profile-container">
      <div className="back-button" onClick={() => navigate('/profile')}>
        <FaArrowLeft /> Retour
      </div>

      <h2>Modifier le Profil</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Prénom</label>
          <input
            type="text"
            value={newFirstName}
            onChange={(e) => setNewFirstName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label>Nom</label>
          <input
            type="text"
            value={newLastName}
            onChange={(e) => setNewLastName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
        </button>

        <div className="txt">
          <p>CONTACTEZ L'ADMINISTRATEUR POUR MODIFIER LE MOT DE PASSE</p>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
