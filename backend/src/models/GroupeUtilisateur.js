const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupeUtilisateur = sequelize.define("GroupeUtilisateur", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  groupe_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'groupe', key: 'id' }
  },
  utilisateur_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  role: {
    type: DataTypes.STRING,
  }
}, {
  tableName: 'groupe_utilisateur',
  timestamps: false
});

module.exports = GroupeUtilisateur;

// Explication de la table groupe_utilisateur

// - Cette table sert à lier chaque utilisateur (`utilisateur_id`) à chaque groupe (`groupe_id`) où il est membre.
// - Chaque ligne représente un membre dans un groupe, avec son rôle dans ce groupe.

// Exemple :
// | id | groupe_id | utilisateur_id | role        |
// |----|-----------|---------------|-------------|
// | 21 |     5     |      17       | développeur |
// | 22 |     5     |      9        | designer    |
// | 23 |     6     |      17       | développeur |
// | 24 |     6     |      9        | designer    |

// - Ici, l’utilisateur 17 (maroua) est membre du groupe 5 (Département Technique) comme développeur et du groupe 6 (Employee) aussi comme développeur.
// - L’utilisateur 9 (outail) est membre des deux groupes avec le rôle designer.

// Pourquoi cette structure ?
// - Un utilisateur peut être dans plusieurs groupes (ex : département + employee).
// - Un groupe peut avoir plusieurs membres.
// - Le champ `role` permet de savoir le rôle de l’utilisateur dans chaque groupe (ex : développeur, designer, manager…).

// En résumé :
// - Cette table permet de gérer la liste des membres et leur rôle pour chaque groupe, utilisée pour la messagerie, l’affichage des membres, les droits, etc.
