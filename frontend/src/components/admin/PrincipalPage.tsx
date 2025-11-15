import './PrincipalPage.css';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const PrincipalPage = () => {
  const navigate = useNavigate();

  return (
    <div className="principal-container">
      <div className="back-button" onClick={() => navigate('/admin')}>
        <FaArrowLeft /> Retour
      </div>
      <div className="principal-box">
        <h1>Page Principale Admin</h1>
        
                
        <button className="principal-btn" onClick={() => navigate('/gestion-utilisateurs')}>
          Gestion des utilisateurs
        </button>

         <button className="principal-btn" onClick={() => navigate('/tickets')}>
          Gestion des tickets
        </button> 

       
      </div>
    </div>
  );
};

export default PrincipalPage;
