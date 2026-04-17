const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notifications = sequelize.define("Notifications", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  titre: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  envoye_par: { type: DataTypes.INTEGER },
  type: { type: DataTypes.STRING, defaultValue: 'global' }
}, {
  tableName: 'notifications',
  timestamps: false
});

module.exports = Notifications;
