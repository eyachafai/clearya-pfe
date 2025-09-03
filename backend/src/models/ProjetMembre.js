const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Utilisateur = require('./Utilisateur');

const ProjetMembre = sequelize.define('ProjetMembre', {
  projet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projet',
      key: 'id'
    }
  },
  utilisateur_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "membre"
  }
}, {
  tableName: 'projet_membre',
  timestamps: false,
  primaryKey: false
});

ProjetMembre.removeAttribute('id');

// Association pour include
ProjetMembre.belongsTo(Utilisateur, { foreignKey: 'utilisateur_id' });

module.exports = ProjetMembre;
