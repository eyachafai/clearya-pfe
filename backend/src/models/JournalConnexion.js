const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Utilisateur = require("./Utilisateur"); // Ajoute cet import

// Table journal_connexion (PostgreSQL)
// id            : string (clé primaire, unique, ex: eventId ou time+userId+type)
// event_id      : string (id event keycloak, optionnel)
// timestamp     : bigint (ms depuis epoch, date de l'event)
// type          : string (LOGIN, LOGOUT, CODE_TO_TOKEN, etc.)
// user_id       : string (clé keycloak de l'utilisateur)
// username      : string (nom d'utilisateur local, optionnel)
// ip_address    : string (adresse IP de l'event)
// client        : string (nom du client keycloak ex: myapp)

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

// Liaison (optionnelle) avec Utilisateur (clé étrangère user_id <-> keycloak_id)
JournalConnexion.belongsTo(Utilisateur, {
  foreignKey: 'user_id',
  targetKey: 'keycloak_id',
  as: 'utilisateur'
});

module.exports = JournalConnexion;
