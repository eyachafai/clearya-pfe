-- Connexion à postgres
\connect postgres;

-- Drop ancienne base métier si elle existe
DROP DATABASE IF EXISTS app_db;

-- Créer un utilisateur métier sécurisé
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'user') THEN
    CREATE ROLE "user" WITH 
      LOGIN 
      PASSWORD 'password';
  END IF;
END $$;

-- Créer la base métier
CREATE DATABASE app_db WITH OWNER "user";

-- Connexion à la base métier
\connect app_db;

-- Créer un schéma (optionnel)
CREATE SCHEMA IF NOT EXISTS app;

-- Table utilisateur (dans schéma app)
CREATE TABLE IF NOT EXISTS app.utilisateur (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  mot_de_passe TEXT NOT NULL,
  email VARCHAR(100),
  nom_complet VARCHAR(100),
  role VARCHAR(20) DEFAULT 'utilisateur',
  est_actif BOOLEAN DEFAULT TRUE,
  dernier_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quota_stockage INTEGER DEFAULT 0,
  notification_active BOOLEAN DEFAULT TRUE
);
