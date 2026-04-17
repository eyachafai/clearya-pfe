const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
require('dotenv').config({ path: '../.env' });
const { keycloak } = require('../config/keycloak.config');
const { Utilisateur } = require('../models/index');
const Groupe = require('../models/Groupe');
const GroupeUtilisateur = require('../models/GroupeUtilisateur');


const REALM_NAME = 'myrealm';
const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_SERVER_URL;
const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN;
const ADMIN_PASSWORD = process.env.KEYCLOAK_PASSWORD;
const CLIENT_ID = 'admin-cli'


router.get('/me', async (req, res) => {
  // Vérifie la présence du token dans l'en-tête Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  try {
    //    console.log('✅ Route /me appelée');

    if (!req.kauth || !req.kauth.grant || !req.kauth.grant.access_token) {
      console.warn('⚠️ req.kauth.grant ou access_token est manquant');
      return res.status(401).json({ error: 'Token non valide ou manquant' });
    }

    const tokenContent = req.kauth.grant.access_token.content;

    //   console.log('🔐 Token décodé:', tokenContent);

    const keycloakId = tokenContent.sub;
    const username = tokenContent.preferred_username;
    const email = tokenContent.email;
    const firstName = tokenContent.given_name || '';
    const lastName = tokenContent.family_name || '';

    return res.json({ keycloakId, username, email, firstName, lastName });

  } catch (error) {
    console.error('❌ Erreur interne dans /me:', error);
    return res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// ✅ Token admin pour MAJ profil
async function getAdminToken() {
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', CLIENT_ID);
  params.append('username', ADMIN_USERNAME);
  params.append('password', ADMIN_PASSWORD);
  const res = await axios.post(
    `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return res.data.access_token;
}

// ✅ Mise à jour profil
router.put('/profile', keycloak.protect(), async (req, res) => {
  const { first_name, last_name, email } = req.body;

  console.log(first_name, last_name, email)

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  try {
    const tokenContent = req.kauth.grant.access_token.content;
    const userId = tokenContent.sub;
    //  console.log('userId ', userId)
    const adminToken = await getAdminToken();
    //console.log({ firstName: first_name, lastName: last_name, email });

    await axios.put(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users/${userId}`,
      {
        firstName: first_name,
        lastName: last_name,
        email,
      },
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.status(200).json({ message: 'Profil mis à jour avec succès', status: 200 });

  } catch (err) {
    console.error('❌ Erreur mise à jour profil:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Erreur mise à jour du profil ', details: err.response?.data || err.message });
  }
});

router.post("/register-local", async (req, res) => {
  const { username } = req.body;

  try {
    // Vérifie si l'utilisateur existe déjà dans la base locale
    const exists = await Utilisateur.findOne({ where: { username } });
    if (exists) {
      return res.status(409).json({ error: "Utilisateur déjà présent dans la base locale" });
    }

    // 1️⃣ Récupère le token admin Keycloak
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', CLIENT_ID);
    params.append('username', ADMIN_USERNAME);
    params.append('password', ADMIN_PASSWORD);
    const tokenRes = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const adminToken = tokenRes.data.access_token;

    // 2️⃣ Cherche l'utilisateur dans Keycloak
    const kcRes = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users?username=${username}`,
      {
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      }
    );

    if (!kcRes.data || kcRes.data.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé dans Keycloak" });
    }

    const kcUser = kcRes.data[0];

    // 3️⃣ Enregistre dans la DB locale avec Sequelize
    const user = await Utilisateur.create({
      username: kcUser.username,
      first_name: kcUser.firstName || "",
      last_name: kcUser.lastName || "",
      email: kcUser.email || "",
      keycloak_id: kcUser.id
    });

    res.json({ message: "User fetched from Keycloak and saved in DB", user });

  } catch (err) {
    console.error("Erreur register-local:", err);
    res.status(500).json({
      error: "Failed to fetch/save user",
      details: err.message || err
    });
  }
});

router.delete("/delete-local/:keycloak_id", async (req, res) => {
  const { keycloak_id } = req.params;
  try {
    const deleted = await Utilisateur.destroy({ where: { keycloak_id } });
    if (deleted) {
      res.json({ message: "Utilisateur supprimé de la base locale", keycloak_id });
    } else {
      res.status(404).json({ error: "Utilisateur non trouvé dans la base locale" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression utilisateur" });
  }
});

router.delete("/delete-keycloak-local/:keycloak_id", async (req, res) => {
  const { keycloak_id } = req.params;
  try {
    // 1️⃣ Récupère le token admin Keycloak
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', CLIENT_ID);
    params.append('username', ADMIN_USERNAME);
    params.append('password', ADMIN_PASSWORD);
    const tokenRes = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const adminToken = tokenRes.data.access_token;

    // 2️⃣ Supprime l'utilisateur dans Keycloak
    await axios.delete(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users/${keycloak_id}`,
      {
        headers: {
          "Authorization": `Bearer ${adminToken}`
        }
      }
    );

    // 3️⃣ Supprime l'utilisateur dans la base locale
    const deleted = await Utilisateur.destroy({ where: { keycloak_id } });

    res.json({ message: "Utilisateur supprimé dans Keycloak et la base locale", keycloak_id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur suppression utilisateur", details: err.response?.data || err.message });
  }
});

router.get("/groupes-utilisateur/:keycloakId", async (req, res) => {
  const { keycloakId } = req.params;

  try {
    console.log("🔹 Requête reçue avec keycloakId :", keycloakId);

    // Vérification de la valeur de keycloakId
    if (!keycloakId || typeof keycloakId !== "string") {
      console.warn("⚠️ keycloakId est invalide ou manquant :", keycloakId);
      return res.status(400).json({ error: "keycloakId invalide ou manquant" });
    }

    console.log("🔹 Recherche de utilisateur_id à partir de keycloak_id...");

    // Récupérer utilisateur_id à partir de keycloak_id
    const utilisateur = await Utilisateur.findOne({
      where: { keycloak_id: keycloakId },
    });

    if (!utilisateur) {
      console.warn("⚠️ Utilisateur non trouvé pour keycloakId :", keycloakId);
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const utilisateurId = utilisateur.id; // ID interne (integer)
    console.log("🔹 utilisateurId récupéré :", utilisateurId);

    // Récupérer les groupes via la table pivot
    const groupes = await GroupeUtilisateur.findAll({
      where: { utilisateur_id: utilisateurId },
      include: [{ model: Groupe, attributes: ["id", "name"] }],
    });
    console.log("🔹 Groupes récupérés :", groupes);

    const result = groupes.map((g) => ({
      id: g.Groupe.id,
      name: g.Groupe.name,
      role: g.role,
    }));

    console.log("🔹 Résultat final envoyé au frontend :", result);

    res.json(result);
  } catch (err) {
    console.error("❌ Erreur récupération groupes utilisateur :", err);
    res.status(500).json({
      error: "Erreur récupération groupes utilisateur",
      details: err.message,
    });
  }
});

router.get("/users/:id", async (req, res) => {
  console.log('🔹 GET /users/:id called');
  const userId = req.params.id;
  console.log(`🔹 Request received for user ID: ${userId}`);

  try {
    const user = await Utilisateur.findByPk(userId);
    if (!user) {
      console.warn(`⚠️ User not found for ID: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🟢 User found:`, user);
    res.json(user);

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
