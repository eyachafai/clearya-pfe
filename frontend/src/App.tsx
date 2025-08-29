import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import des éléments nécessaires
import Home from './components/Home'; 
import Profile from './components/Profile'; 
import EditProfile from "./components/EditProfile";
import AdminPage from './components/admin/AdminPage';
import PrincipalPage from './components/admin/PrincipalPage';
import JournalConnexionPage from './components/admin/JournalConnexionPage';
import GroupesPage from './components/admin/grp/GroupesPage'
import AjouterGroupe from './components/admin/grp/AjouterGroupe'
import ModifierGroupe from './components/admin/grp/ModifierGroupe'
import ChatPage from './components/chat/ChatPage'
import GestionUtilisateursPage from './components/admin/GestionUtilisateursPage'
import UtilisateursPage from './components/admin/UtilisateursPage';
import MesGroupesChatPage from './components/chat/MesGroupesChatPage';

import { useKeycloak } from "@react-keycloak/web";
import { setToken } from "./services/authService";
import { useEffect, useState } from 'react';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  // Ajoute un badge "vu" si des messages non lus existent (exemple simple)
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    // Vérifie dans le localStorage ou via API si des messages non lus existent
    // Ici, on suppose que tu stockes un indicateur dans localStorage (à adapter selon ton app)
    const checkUnread = () => {
      // Par exemple, tu peux stocker le nombre de messages non lus dans localStorage
      const unread = Number(localStorage.getItem('messages_unread') || "0");
      setHasUnread(unread > 0);
    };
    checkUnread();
    window.addEventListener("storage", checkUnread);
    return () => window.removeEventListener("storage", checkUnread);
  }, []);

  // Ajoute une classe spéciale au body uniquement sur la page Home
  const isHome = window.location.pathname === '/';

  return (
    <div>
      <header>
        <div className="clearya-logo-bar" style={{ position: "relative" }}>
          <img src="/clearya-logo.svg" alt="Clearya" className="clearya-logo" />
          <span className="clearya-title" style={{ position: "relative", marginLeft: 16, fontWeight: 700, fontSize: "1.5rem", color: "#232323" }}>
            Clearya
            {hasUnread && (
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  right: -24,
                  background: "#4caf50",
                  color: "#fff",
                  borderRadius: "50%",
                  padding: "0.18em 0.55em",
                  fontSize: "0.85em",
                  fontWeight: 700,
                  boxShadow: "0 1px 4px #bdbdbd30",
                  zIndex: 10,
                  marginLeft: 8,
                }}
                title="Nouveaux messages"
              >
                ●
              </span>
            )}
          </span>
        </div>
      </header>
      <main>
        <div className="clearya-main-container">
          {children}
        </div>
      </main>
      <footer>
        © {new Date().getFullYear()} Clearya. Tous droits réservés.
      </footer>
    </div>
  );
};

const App = () => {
 const { keycloak, initialized } = useKeycloak();

  useEffect(() => {
    if (initialized && keycloak?.authenticated && keycloak?.token) {
      setToken(keycloak.token);
  //    console.log("✅ Token sauvegardé :", keycloak.token);
    }
  }, [initialized, keycloak]);

  return (
    <Router> {/* Utilisation du Router pour encapsuler toutes les routes */}
      <AppLayout>
        <Routes>
          {/* Définition des routes */}
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} /> 
          <Route path="/admin" element={<AdminPage />} /> 
          <Route path="/principal" element={<PrincipalPage />} />
          <Route path="/journal-connexion" element={<JournalConnexionPage />} />
          <Route path="/groupes" element={<GroupesPage />} />
          <Route path="/add-group" element={<AjouterGroupe />} />
          <Route path="/edit-group/" element={<ModifierGroupe />} />
          <Route path="/chat"element={<ChatPage />}/>
          <Route path="/gestion-utilisateurs" element={<GestionUtilisateursPage />} />
          <Route path="/utilisateurs" element={<UtilisateursPage />} />
          <Route path="/mes-groupes-chat" element={<MesGroupesChatPage />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

export default App;
