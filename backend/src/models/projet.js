const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Projet = sequelize.define('Projet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  groupe_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'groupe',
      key: 'id'
    }
  }
}, {
  tableName: 'projet',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Projet;
