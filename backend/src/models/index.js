const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

const db = {};

// =====================
// IMPORT DES MODÈLES
// =====================
db.JournalConnexion = require("./JournalConnexion");
db.Utilisateur = require("./Utilisateur");
db.Departement = require("./Departement");
db.Groupe = require('./Groupe');
db.GroupeUtilisateur = require('./GroupeUtilisateur');
db.Conversation = require('./Conversation');
db.Message = require('./Message');
db.Projet = require('./projet');
db.ProjetMembre = require('./ProjetMembre');
db.Tache = require('./tache');
db.Ticket = require('./ticket');
db.Quota = require('./quota');
db.Files = require('./Files');
db.Notifications = require('./Notifications');

// ⚠️ modèles avec sequelize (IMPORTANT)
db.Rapport = require('./rapport')(sequelize, DataTypes);
db.UserECDHKey = require('./UserECDHKey')(sequelize);
db.GroupKey = require('./GroupKey')(sequelize);

// =====================
// ASSOCIATIONS
// =====================

// Quota <-> Utilisateur
db.Quota.belongsTo(db.Utilisateur, { foreignKey: 'user_id', as: 'utilisateur' });
db.Utilisateur.hasOne(db.Quota, { foreignKey: 'user_id', as: 'quota' });


// Groupe <-> Utilisateur
db.Groupe.belongsToMany(db.Utilisateur, {
  through: db.GroupeUtilisateur,
  foreignKey: 'groupe_id',
  otherKey: 'utilisateur_id',
  as: 'membres'
});

db.Utilisateur.belongsToMany(db.Groupe, {
  through: db.GroupeUtilisateur,
  foreignKey: 'utilisateur_id',
  otherKey: 'groupe_id',
  as: 'groupes'
});

// GroupeUtilisateur
db.Groupe.hasMany(db.GroupeUtilisateur, {
  foreignKey: 'groupe_id',
  as: 'groupeUtilisateurs'
});

db.GroupeUtilisateur.belongsTo(db.Groupe, {
  foreignKey: 'groupe_id',
  as: 'groupe'
});

// Messagerie
db.Message.belongsTo(db.Utilisateur, {
  foreignKey: 'utilisateur_id',
  as: 'utilisateur'
});

db.Message.belongsTo(db.Conversation, {
  foreignKey: 'conversation_id',
  as: 'conversation'
});

db.Conversation.belongsTo(db.Groupe, {
  foreignKey: 'groupe_id',
  as: 'groupe'
});

// Rapport
db.Rapport.belongsTo(db.Projet, {
  foreignKey: 'projet_id',
  as: 'projet'
});

db.Projet.hasMany(db.Rapport, {
  foreignKey: 'projet_id',
  as: 'rapports'
});

// Notifications
db.Notifications.belongsTo(db.Utilisateur, {
  foreignKey: 'envoye_par',
  as: 'auteur'
});

db.Utilisateur.hasMany(db.Notifications, {
  foreignKey: 'envoye_par',
  as: 'notificationsEnvoyees'
});

// =====================
// 🔐 E2EE ASSOCIATIONS
// =====================

// User ECDH Key
db.UserECDHKey.belongsTo(db.Utilisateur, {
  foreignKey: 'user_id',
  as: 'utilisateur'
});

db.Utilisateur.hasOne(db.UserECDHKey, {
  foreignKey: 'user_id',
  as: 'ecdhKey'
});

// Group Key
db.GroupKey.belongsTo(db.Utilisateur, {
  foreignKey: 'user_id',
  as: 'utilisateur'
});

db.GroupKey.belongsTo(db.Groupe, {
  foreignKey: 'group_id',
  as: 'groupe'
});

db.Utilisateur.hasMany(db.GroupKey, {
  foreignKey: 'user_id',
  as: 'groupKeys'
});

db.Groupe.hasMany(db.GroupKey, {
  foreignKey: 'group_id',
  as: 'groupKeys'
});

// =====================
// EXPORT
// =====================
db.sequelize = sequelize;

module.exports = db;