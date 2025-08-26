const express = require('express');
const router = express.Router();
const axios = require('axios');
const { keycloak } = require('../config/keycloak.config');
const { Utilisateur } = require('../models/index'); 
const { Departement } = require("../models");
const { Groupe } = require("../models");
const { GroupeUtilisateur } = require("../models");
require('dotenv').config();

const ADMIN_USERNAME = process.env.KEYCLOAK_ADMIN;
const ADMIN_PASSWORD = process.env.KEYCLOAK_PASSWORD; 
const CLIENT_ID = 'admin-cli'

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_SERVER_URL || "http://localhost:8080";
const REALM_NAME = 'myrealm';

// Ajoute ce modèle Sequelize si pas déjà fait
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const JournalConnexion = sequelize.define("JournalConnexion", {
  id: { type: DataTypes.STRING, primaryKey: true },
  event_id: { type: DataTypes.STRING },
  timestamp: { type: DataTypes.BIGINT },
  type: { type: DataTypes.STRING },
  user_id: { type: DataTypes.STRING },
  username: { type: DataTypes.STRING },
  ip_address: { type: DataTypes.STRING },
  client: { type: DataTypes.STRING }
}, {
  tableName: 'journal_connexion',
  timestamps: false
});

// Récupération du token admin
async function getAdminToken() {
  const res = await axios.post(
    `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      client_id: "admin-cli",
      username: process.env.KEYCLOAK_ADMIN,
      password: process.env.KEYCLOAK_PASSWORD,
      grant_type: "password"
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return res.data.access_token;
}

//////////////////////////////////////////////////////////////////////////

/**
 * GET /utilisateurs
 * Retourne uniquement les utilisateurs de la base locale
 */
router.get('/utilisateurs', async (req, res) => {
  try {
    // Retourne uniquement les utilisateurs de la base locale
    const users = await Utilisateur.findAll({ order: [['username', 'ASC']] });
    res.json(users);
  } catch (err) {
    console.error('Erreur récupération utilisateurs:', err.message);
    res.status(500).json({ error: 'Erreur récupération utilisateurs' });
  }
});

/**
 * POST /utilisateurs/sync
 * Synchronise tous les utilisateurs Keycloak dans la base locale
 */
router.post('/utilisateurs/sync', async (req, res) => {
  try {
    const adminToken = await getAdminToken();
    const kcUsers = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    let added = 0;
    for (const user of kcUsers.data) {
      const exists = await Utilisateur.findOne({ where: { keycloak_id: user.id } });
      if (!exists) {
        try {
          await axios.post(
            `http://localhost:${process.env.PORT || 5000}/api/auth/register-local`,
            { username: user.username }
          );
          added++;
        } catch (err) {
          // Ignore erreur 409 (conflit/doublon)
          if (err.response?.status !== 409) {
            throw err;
          }
        }
      }
    }

    res.json({ message: `Synchronisation terminée. ${added} nouveaux utilisateurs ajoutés.` });
  } catch (err) {
    // Affiche l'erreur complète pour debug
    console.error('Erreur synchronisation utilisateurs:', err);
    res.status(500).json({
      error: 'Erreur synchronisation utilisateurs',
      details: err.response?.data || err.message || err
    });
  }
});

/////////////////////////////////////////////////////////////////////////////
//test departement

router.post("/departements/register-local", async (req, res) => {
  const { name } = req.body; // on cherche maintenant par name
  if (!name) {
    console.log("❌ name manquant dans le body");
    return res.status(400).json({ error: "Le champ 'name' est obligatoire" });
  }
  try {
    // Vérifie si le département existe déjà dans la DB locale
    const exists = await Departement.findOne({ where: { name } });
    if (exists) {
      return res.status(409).json({ error: "Département déjà présent dans la DB locale" });
    }

    // 1️⃣ Récupérer token admin Keycloak
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

    // 2️⃣ Chercher le groupe dans Keycloak par name
    const kcRes = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const kcGroup = kcRes.data.find(g => g.name === name);
    if (!kcGroup) {
      return res.status(404).json({ error: "Groupe non trouvé dans Keycloak" });
    }

    // 3️⃣ Enregistrer dans DB locale
    const dep = await Departement.create({
      keycloak_id: kcGroup.id,
      name: kcGroup.name,
      description: kcGroup.attributes?.description || null,
      parent_id: kcGroup.parentId || null
    });

    res.json({ message: "Département récupéré depuis Keycloak et enregistré", dep });

  } catch (err) {
    console.error("Erreur register-local département:", err);
    res.status(500).json({
      error: "Failed to fetch/save département",
      details: err.message || err
    });
  }
});

/**
 * GET /departements
 * Retourne uniquement les départements de la base locale
 */
router.get('/departements', async (req, res) => {
  try {
    const deps = await Departement.findAll({ order: [['name', 'ASC']] });
    res.json(deps);
  } catch (err) {
    console.error('Erreur récupération départements:', err.message);
    res.status(500).json({ error: 'Erreur récupération départements' });
  }
});

/**
 * POST /departements/sync
 * Synchronise tous les groupes Keycloak (départements) dans la base locale
 */
router.post('/departements/sync', async (req, res) => {
  try {
    const adminToken = await getAdminToken();

    const kcGroups = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    let added = 0;
    for (const g of kcGroups.data) {
      const exists = await Departement.findOne({ where: { keycloak_id: g.id } });
      if (!exists) {
        await Departement.create({
          keycloak_id: g.id,
          name: g.name,
          description: g.attributes?.description?.[0] || null,
          parent_id: g.parentId || null
        });
        added++;
      } else {
        await exists.update({
          name: g.name,
          description: g.attributes?.description?.[0] || null,
          parent_id: g.parentId || null
        });
      }
    }

    res.json({ message: `Synchronisation départements terminée. ${added} nouveaux départements ajoutés.` });
  } catch (err) {
    console.error('Erreur synchronisation départements:', err);
    res.status(500).json({
      error: 'Erreur synchronisation départements',
      details: err.response?.data || err.message || err
    });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * POST /groupes/sync
 * Synchronise tous les groupes Keycloak dans la table locale "groupe"
 * et les membres/roles dans "groupe_utilisateur"
 */
router.post('/groupes/sync', async (req, res) => {
  try {
    const adminToken = await getAdminToken();
    const kcGroups = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    let added = 0;
    let membresAjoutes = 0;
    await GroupeUtilisateur.destroy({ where: {} });

    for (const g of kcGroups.data) {
      // 1. Synchronise le groupe
      let groupe = await Groupe.findOne({ where: { keycloak_id: g.id } });
      if (!groupe) {
        groupe = await Groupe.create({
          keycloak_id: g.id,
          name: g.name,
          description: g.attributes?.description?.[0] || null,
          parent_id: g.parentId || null
        });
        added++;
      } else {
        await groupe.update({
          name: g.name,
          description: g.attributes?.description?.[0] || null,
          parent_id: g.parentId || null
        });
      }

      // 2. Synchronise les membres et rôles dans la table de liaison
      const membersRes = await axios.get(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups/${g.id}/members`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const members = membersRes.data || [];

      for (const user of members) {
        // Cherche l'utilisateur localement par keycloak_id
        const utilisateur = await Utilisateur.findOne({ where: { keycloak_id: user.id } });
        if (!utilisateur) {
          // Ajoute l'utilisateur local si absent (sync automatique)
          await axios.post(
            `http://localhost:${process.env.PORT || 5000}/api/auth/register-local`,
            { username: user.username }
          );
        }
        // Récupère à nouveau l'utilisateur (après ajout éventuel)
        const utilisateurFinal = await Utilisateur.findOne({ where: { keycloak_id: user.id } });
        if (!utilisateurFinal) continue;

        // Récupère le rôle spécifique (hors default-roles-myrealm/offline_access)
        let role = '';
        try {
          const roleMappings = await axios.get(
            `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users/${user.id}/role-mappings`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
          );
          const realmRoles = (roleMappings.data.realmMappings || [])
            .filter(r => r.name !== 'default-roles-myrealm' && r.name !== 'offline_access');
          if (realmRoles.length > 0) {
            role = realmRoles.map(r => r.name).join(', ');
          } else {
            role = '—';
          }
        } catch {
          role = '—';
        }

        // Ajoute le membre dans la table locale
        await GroupeUtilisateur.create({
          groupe_id: groupe.id,
          utilisateur_id: utilisateurFinal.id,
          role
        });
        membresAjoutes++;
      }
    }

    res.json({ message: `Synchronisation groupes et membres terminée. ${added} nouveaux groupes ajoutés, ${membresAjoutes} membres synchronisés dans groupe_utilisateur.` });
  } catch (err) {
    console.error('Erreur synchronisation groupes:', err);
    res.status(500).json({
      error: 'Erreur synchronisation groupes',
      details: err.response?.data || err.message || err
    });
  }
});

/**
 * POST /groupes/force-sync
 * Vide la table groupe puis resynchronise tous les groupes Keycloak dans la table locale "groupe"
 * et les membres/roles dans "groupe_utilisateur"
 */
router.post('/groupes/force-sync', async (req, res) => {
  try {
    // Vide la table groupe et la table de liaison
    await GroupeUtilisateur.destroy({ where: {} });
    await Groupe.destroy({ where: {} });

    // Synchronise comme dans /groupes/sync
    const adminToken = await getAdminToken();
    const kcGroups = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    let added = 0;
    for (const g of kcGroups.data) {
      let groupe = await Groupe.create({
        keycloak_id: g.id,
        name: g.name,
        description: g.attributes?.description?.[0] || null,
        parent_id: g.parentId || null
      });
      added++;

      // Synchronise les membres et rôles dans la table de liaison
      const membersRes = await axios.get(
        `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups/${g.id}/members`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const members = membersRes.data || [];

      for (const user of members) {
        const utilisateur = await Utilisateur.findOne({ where: { keycloak_id: user.id } });
        if (!utilisateur) continue;

        let role = '';
        try {
          const roleMappings = await axios.get(
            `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users/${user.id}/role-mappings`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
          );
          const realmRoles = (roleMappings.data.realmMappings || [])
            .filter(r => r.name !== 'default-roles-myrealm' && r.name !== 'offline_access');
          if (realmRoles.length > 0) {
            role = realmRoles.map(r => r.name).join(', ');
          } else {
            role = '—';
          }
        } catch {
          role = '—';
        }

        // Upsert manuel pour éviter l'erreur unique
        const [record, created] = await GroupeUtilisateur.findOrCreate({
          where: { groupe_id: groupe.id, utilisateur_id: utilisateur.id },
          defaults: { role }
        });
        if (!created) {
          await record.update({ role });
        }
      }
    }

    res.json({ message: `Force sync OK. ${added} groupes resynchronisés.` });
  } catch (err) {
    console.error('Erreur force sync groupes:', err);
    res.status(500).json({
      error: 'Erreur force sync groupes',
      details: err.response?.data || err.message || err
    });
  }
});

/**
 * GET /departements/:keycloak_id/users
 * Retourne les utilisateurs d'un département (groupe Keycloak) avec leur rôle dans ce groupe
 */
router.get('/departements/:keycloak_id/users', async (req, res) => {
  const { keycloak_id } = req.params;
  try {
    const adminToken = await getAdminToken();
    // 1. Récupérer les membres du groupe (département)
    const membersRes = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups/${keycloak_id}/members`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const members = membersRes.data;
    // 2. Pour chaque membre, récupérer ses rôles realm (hors default-roles-myrealm/offline_access)
    const usersWithRole = await Promise.all(members.map(async (user) => {
      let role = '';
      try {
        const groupRoleMappings = await axios.get(
          `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users/${user.id}/role-mappings`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        // Filtrer les rôles realm qui ne sont pas "default-roles-myrealm" ni "offline_access"
        const realmRoles = (groupRoleMappings.data.realmMappings || [])
          .filter(r => r.name !== 'default-roles-myrealm' && r.name !== 'offline_access');
        if (realmRoles.length > 0) {
          role = realmRoles.map(r => r.name).join(', ');
        } else {
          role = '—';
        }
      } catch (e) {
        role = '—';
      }
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role
      };
    }));
    res.json(usersWithRole);
  } catch (err) {
    console.error('Erreur récupération users du département:', err);
    res.status(500).json({ error: 'Erreur récupération users du département', details: err.response?.data || err.message });
  }
});

/**
 * GET /departements/:keycloak_id/roles
 * Retourne la liste des rôles du groupe (département) depuis Keycloak
 */
router.get('/departements/:keycloak_id/roles', async (req, res) => {
  const { keycloak_id } = req.params;
  try {
    const adminToken = await getAdminToken();
    // Récupère les rôles du groupe (Keycloak)
    const rolesRes = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups/${keycloak_id}/role-mappings/realm`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    // Retourne la liste des rôles (name, description)
    const roles = (rolesRes.data || []).map(r => ({
      name: r.name,
      description: r.description || ''
    }));
    res.json(roles);
  } catch (err) {
    console.error('Erreur récupération rôles du groupe:', err);
    res.status(500).json({ error: 'Erreur récupération rôles du groupe', details: err.response?.data || err.message });
  }
});

/**
 * GET /groupes/membres
 * Retourne tous les groupes (départements) avec leurs membres et rôles
 * (récupération depuis Keycloak à chaque appel, pas depuis la base locale)
 */
router.get('/groupes/membres', async (req, res) => {
  try {
    const adminToken = await getAdminToken();
    // Récupère tous les groupes (départements)
    const deps = await Departement.findAll({ order: [['name', 'ASC']] });

    // Pour chaque groupe, récupère les membres et leur rôle
    const groupes = await Promise.all(deps.map(async (dep) => {
      // Membres du groupe
      let membres = [];
      try {
        const membersRes = await axios.get(
          `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/groups/${dep.keycloak_id}/members`,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        membres = await Promise.all((membersRes.data || []).map(async (user) => {
          // Récupère le rôle spécifique (hors default-roles-myrealm/offline_access)
          let role = '';
          try {
            const roleMappings = await axios.get(
              `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/users/${user.id}/role-mappings`,
              { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            const realmRoles = (roleMappings.data.realmMappings || [])
              .filter(r => r.name !== 'default-roles-myrealm' && r.name !== 'offline_access');
            if (realmRoles.length > 0) {
              role = realmRoles.map(r => r.name).join(', ');
            } else {
              role = '—';
            }
          } catch {
            role = '—';
          }
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role
          };
        }));
      } catch {
        membres = [];
      }
      return {
        id: dep.id,
        name: dep.name,
        membres
      };
    }));

    res.json(groupes);
  } catch (err) {
    console.error('Erreur récupération groupes/membres:', err);
    res.status(500).json({ error: 'Erreur récupération groupes/membres', details: err.response?.data || err.message });
  }
});

/**
 * GET /groupes-utilisateur/:utilisateur_id
 * Retourne les groupes (depuis la BD locale) où l'utilisateur est membre + rôle
 */
router.get('/groupes-utilisateur/:utilisateur_id', async (req, res) => {
  const { utilisateur_id } = req.params;
  try {
    // Jointure pour récupérer le rôle en plus du nom du groupe
    const groupes = await Groupe.findAll({
      include: [{
        model: GroupeUtilisateur,
        as: 'groupeUtilisateurs',
        where: { utilisateur_id },
        attributes: ['role'] // Ajoute le rôle dans la réponse
      }],
      attributes: ['id', 'name']
    });

    // Formate la réponse pour inclure le rôle
    const result = groupes.map(g => ({
      id: g.id,
      name: g.name,
      role: g.groupeUtilisateurs[0]?.role || ''
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération groupes utilisateur', details: err.message });
  }
});

/**
 * GET /groupes
 * Retourne la liste des groupes (table locale "groupe")
 */
router.get('/groupes', async (req, res) => {
  try {
    const groupes = await Groupe.findAll({ order: [['name', 'ASC']] });
    res.json(groupes);
  } catch (err) {
    console.error('Erreur récupération groupes:', err.message);
    res.status(500).json({ error: 'Erreur récupération groupes' });
  }
});

/**
 * GET /auth/journal-connexions
 * Retourne la liste des logs de connexion Keycloak (user events) enrichis avec le username local
 * ET les enregistre dans la table locale journal_connexion
 */
router.get('/auth/journal-connexions', async (req, res) => {
  try {
    // 1. Récupère le token admin
    const adminToken = await getAdminToken();
    // 2. Récupère les events Keycloak (user events)
    const kcEventsRes = await axios.get(
      `${KEYCLOAK_BASE_URL}/admin/realms/${REALM_NAME}/events`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const events = kcEventsRes.data || [];

    // 3. Récupère tous les utilisateurs locaux pour faire le mapping userId → username
    const users = await Utilisateur.findAll();
    const userMap = {};
    users.forEach(u => {
      userMap[u.keycloak_id] = u.username;
    });

    // 4. Formate les logs pour le frontend et la BD locale
    const logs = events.map(ev => ({
      id: ev.id || (ev.time + ev.userId + ev.type),
      event_id: ev.id || "",
      timestamp: ev.time,
      type: ev.type,
      user_id: ev.userId,
      username: userMap[ev.userId] || "",
      ip_address: ev.ipAddress,
      client: ev.clientId
    }));

    // 5. Enregistre dans la table journal_connexion (upsert pour éviter les doublons)
    for (const log of logs) {
      await JournalConnexion.upsert(log);
    }

    res.json(logs);
  } catch (err) {
    console.error('Erreur récupération journal connexions:', err);
    res.status(500).json({ error: 'Erreur récupération journal connexions', details: err.message });
  }
});

/**
 * GET /auth/journal-connexions/local
 * Retourne la liste des logs de connexion depuis la BD locale (journal_connexion)
 */
router.get('/auth/journal-connexions/local', async (req, res) => {
  try {
    // Charge les logs depuis la BD locale (table journal_connexion)
    const logs = await sequelize.models.JournalConnexion.findAll({
      order: [['timestamp', 'DESC']],
      limit: 200
    });
    res.json(logs);
  } catch (err) {
    console.error('Erreur lecture journal_connexion local:', err);
    res.status(500).json({ error: 'Erreur lecture journal_connexion local', details: err.message });
  }
});

module.exports = router;
