import keycloak from "./config/keycloak";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Ajoute Navigate
import { socket } from "./socket";
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
import GestionProjet from './components/projet/gestion-projet';
import Projet from './components/projet/projet';
import TicketPage from './components/projet/Ticket/ticket';
import TicketPageAdmin from './components/admin/ticketPageAdmin';
import GestionQuotas from './components/admin/quota'
import FichiersAd from "./components/admin/fichiersAdm";
import Notifications from "./components/admin/notifications";
import NotificationsUser from './components/user/notifications-user';
import NotificationsListener from "./components/NotificationsListener";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";




import { useKeycloak } from "@react-keycloak/web";
import { setToken } from "./services/authService";
import { useEffect, useState } from 'react';
import { ensureECDHKeyExists } from "./hooks/useECDHKey";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  // Ajoute un badge "vu" si des messages non lus existent (exemple simple)
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!keycloak?.authenticated || !keycloak?.token) return;

      try {
        // 🔹 1. نجيب keycloak user
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${keycloak.token}`
          }
        });

        const data = await res.json();

        // 🔹 2. نجيب user DB
        const localRes = await fetch(
          `http://localhost:5000/api/users/by-keycloak/${data.keycloakId}`
        );

        const localUser = await localRes.json();

        // 🔥 3. نحط utilisateur_id الصحيح
        localStorage.setItem("utilisateur_id", localUser.id);

        console.log("✅ utilisateur_id synced:", localUser.id);

      } catch (err) {
        console.error("❌ sync user error:", err);
      }
    };

    syncUser();
  }, [keycloak?.authenticated]);


  useEffect(() => {
    const syncECDHKey = async () => {
      try {
        if (!keycloak?.authenticated) return;

        const userId = localStorage.getItem("utilisateur_id");
        if (!userId) return;

        // 1️⃣ Check si clé existe déjà
        const check = await fetch(`http://localhost:5000/api/crypto/ecdh-public-key/${userId}`);

        if (check.ok) {
          console.log("🔑 Clé déjà موجودة");
          return;
        }

        // 2️⃣ Générer clé ECDH
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: "ECDH",
            namedCurve: "P-256",
          },
          true,
          ["deriveKey"]
        );

        const publicKey = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

        // 3️⃣ Envoyer au backend
        await fetch("http://localhost:5000/api/crypto/ecdh-public-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: Number(userId),
            public_key: publicKeyBase64
          })
        });

        console.log("✅ Clé ECDH créée automatiquement");

      } catch (err) {
        console.error("❌ Erreur création clé ECDH:", err);
      }
    };

    const runECDH = async () => {
      const userId = localStorage.getItem("utilisateur_id");
      if (!userId) return;

      await ensureECDHKeyExists(Number(userId));
    };

    runECDH();
  }, [keycloak?.authenticated]);


  useEffect(() => {
    if (keycloak?.token) {
      console.log("✅ Token Keycloak détecté :", keycloak.token);
      localStorage.setItem("keycloak_token", keycloak.token);

      if (keycloak.tokenParsed?.sub) {
        localStorage.setItem("utilisateur_keycloak_id", keycloak.tokenParsed.sub);
        console.log("✅ ID Keycloak sauvegardé :", keycloak.tokenParsed.sub);
      }
    } else {
      console.log("⚠️ Aucun token Keycloak pour l’instant");
    }
  }, [keycloak?.token]);



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
  //const isHome = window.location.pathname === '/';

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

const TicketPageWrapper = () => {
  const { keycloak } = useKeycloak();
  const user = keycloak.tokenParsed;
  // Récupère les membres et le groupe depuis localStorage ou API si besoin
  // Exemple simple :
  const members = JSON.parse(localStorage.getItem("members") || "[]");

  return (
    <TicketPage
      allMembers={members}
    />
  );
};

const App = () => {
  const { keycloak, initialized } = useKeycloak();

  useEffect(() => {
    if (initialized && keycloak?.authenticated && keycloak?.token) {
      setToken(keycloak.token);
      // Récupère la liste des groupes de l'utilisateur (exemple via localStorage)
      const groupes = JSON.parse(localStorage.getItem("groupes") || "[]");
      if (Array.isArray(groupes)) {
        groupes.forEach((g: any) => {
          if (g.id) {
            console.log("[SOCKET] joinGroupRoom global pour groupe_id:", g.id);
            socket.emit("joinGroupRoom", g.id);
          }
        });
      }
    }
  }, [initialized, keycloak]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <NotificationsListener />
      <Router> {/* Utilisation du Router pour encapsuler toutes les routes */}
        <AuthProvider>
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
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/gestion-utilisateurs" element={<GestionUtilisateursPage />} />
              <Route path="/utilisateurs" element={<UtilisateursPage />} />
              <Route path="/mes-groupes-chat" element={<MesGroupesChatPage />} />
              <Route path="/gestion-projet" element={<GestionProjet />} />
              <Route path="/projet/:id" element={<Projet />} />
              <Route path="/tickets" element={<TicketPageWrapper />} />
              <Route path="/admintickets" element={<TicketPageAdmin />} />
              <Route path="/quotas" element={<GestionQuotas />} />
              <Route path="/fichiersAd" element={<FichiersAd />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/notifications-user" element={<NotificationsUser />} />

            </Routes>
          </AppLayout>
        </AuthProvider>
      </Router>
    </>
  );
};

export default App;
