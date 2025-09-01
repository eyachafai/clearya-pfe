const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const files = sequelize.define("Files", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  file_id: { type: DataTypes.STRING, allowNull: false },
  file_name: { type: DataTypes.STRING, allowNull: false },
  file_type: { type: DataTypes.STRING },
  file_url: { type: DataTypes.STRING },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'files',
  timestamps: false
});

module.exports = files;


