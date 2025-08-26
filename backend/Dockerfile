FROM node:slim

WORKDIR /app

# Installer netcat (version OpenBSD) pour attendre PostgreSQL
RUN apt-get update && apt-get install -y netcat-openbsd

COPY package*.json ./
RUN npm ci

COPY . .

COPY wait-for-postgres.sh /wait-for-postgres.sh
RUN chmod +x /wait-for-postgres.sh

ENTRYPOINT ["sh", "/wait-for-postgres.sh"]