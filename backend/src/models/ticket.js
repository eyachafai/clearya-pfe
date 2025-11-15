const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Utilisateur = require('./Utilisateur');

const Ticket = sequelize.define('Ticket', {
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
  assignee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  etat: {
    type: DataTypes.ENUM("nouveau", "en cours", "resolu", "ferme"),
    allowNull: false,
    defaultValue: "nouveau"
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ticket',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Associations pour include
Ticket.belongsTo(Utilisateur, { foreignKey: 'assignee_id', as: 'assignee' });
Ticket.belongsTo(Utilisateur, { foreignKey: 'created_by', as: 'creator' });

module.exports = Ticket;
