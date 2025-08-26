const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Departement = sequelize.define("Departement", {
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
  tableName: 'departement', // <-- correspond à ta table PostgreSQL
  timestamps: false          // si pas besoin de createdAt / updatedAt
});

module.exports = Departement;
