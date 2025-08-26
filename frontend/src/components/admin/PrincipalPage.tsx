import './PrincipalPage.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const PrincipalPage = () => {
  const navigate = useNavigate();

  return (
    <div className="principal-container">
      <div className="back-button" onClick={() => navigate('/AdminPage')}>
        <FaArrowLeft /> Retour
      </div>
      <div className="principal-box">
        <h1>Page Principale Admin</h1>
        
        {/* Bouton Journal de Connexion supprimé */}
        
        {/* <button className="principal-btn" onClick={() => navigate('/groupes')}>
          Gestion des groupes
        </button> */}
        
        <button className="principal-btn" onClick={() => navigate('/gestion-utilisateurs')}>
          Gestion des utilisateurs
        </button>
        
      </div>
    </div>
  );
};

export default PrincipalPage;
