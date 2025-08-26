# Première étape : Construction de l'application avec Node.js
FROM node:slim AS builder
WORKDIR /app

# Copier les fichiers de dépendances pour installer les packages nécessaires
COPY package*.json ./
RUN npm ci

# Copier le code source et exécuter la construction de l'application
COPY . .
RUN npm run build

# Deuxième étape : Configuration de Nginx
FROM nginx:1.27-alpine-slim

# Copier la sortie de la construction de l'application dans le répertoire nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la configuration Nginx dans le conteneur
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Assurer les bonnes permissions sur le fichier de configuration Nginx
RUN chmod 644 /etc/nginx/conf.d/default.conf

# Exposer le port sur lequel Nginx écoute
EXPOSE 3000

# Démarrer Nginx en mode non-démon
CMD ["nginx", "-g", "daemon off;"]
