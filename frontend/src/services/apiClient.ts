// Configurez Axios avec un Intercepteur 
// axios simplifie les appels HTTP depuis le frontend ou le backend
// Un intercepteur est une fonction dans Axios qui interagit avec les requêtes ou les réponses avant qu'elles ne soient envoyées ou reçues

import axios from 'axios';
import { getToken } from './authService';

// Créez une instance Axios
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // l'URL de base de votre API
    headers: {
        'Content-Type': 'application/json',
    },
});


// Ajoutez un intercepteur pour les requêtes
apiClient.interceptors.request.use(
    (config) => {
        // Ajoutez un token d'authentification si nécessaire
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // Gérer les erreurs avant que la requête ne soit envoyée
        return Promise.reject(error);
    }
);

// Ajoutez un intercepteur pour les réponses
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Gérer les erreurs globales
        if (error.response?.status === 401) {
            console.error('Utilisateur non autorisé, redirection...');
            // Par exemple, rediriger l'utilisateur vers la page de login
        }
        return Promise.reject(error);
    }
);

export default apiClient;
