const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Utilisateur = require('./Utilisateur');

const Tache = sequelize.define('Tache', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  projet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projet',
      key: 'id'
    }
  },
  membre_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  etat: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "nouveau"
  }
}, {
  tableName: 'tache',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Pour include membre dans les requêtes
Tache.belongsTo(Utilisateur, { foreignKey: 'membre_id', as: 'membre' });

module.exports = Tache;
