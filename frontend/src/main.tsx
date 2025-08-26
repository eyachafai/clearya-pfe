import ReactDOM from 'react-dom/client';
import App from './App';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import keycloak from './config/keycloak'; // assure-toi du bon chemin

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ReactKeycloakProvider
    authClient={keycloak}
    initOptions={{ onLoad: 'check-sso' }}
  >
    <App />
  </ReactKeycloakProvider>
);
