const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Groupe = sequelize.define("Groupe", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  keycloak_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  parent_id: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'groupe',
  timestamps: false
});

module.exports = Groupe;
