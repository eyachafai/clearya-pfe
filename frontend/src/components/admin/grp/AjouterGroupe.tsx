import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GroupesPage.css'; // On réutilise le même style pour l'uniformité

const AjouterGroupe = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        alert('Groupe ajouté avec succès');
        navigate('/groupes');
      } else {
        alert('Erreur lors de l\'ajout du groupe');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur serveur');
    }
  };

  return (
    <div className="groupes-container">
      <h1>Ajouter un groupe</h1>
      <form onSubmit={handleSubmit} className="form-ajout">
        <div>
          <label>Nom :</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Description :</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <button type="submit">Enregistrer</button>
        <button type="button" onClick={() => navigate('/groupes')}>
          Annuler
        </button>
      </form>
    </div>
  );
};

export default AjouterGroupe;
