const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Utilisateur = require("./Utilisateur");

const files = sequelize.define("Files", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  file_name: { type: DataTypes.STRING, allowNull: false },
  file_type: { type: DataTypes.STRING },
  file_url: { type: DataTypes.STRING },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  user_id: { type: DataTypes.INTEGER }
}, {
  tableName: 'files',
  timestamps: false
});

files.belongsTo(Utilisateur, { foreignKey: "user_id", as: "owner" });

module.exports = files;


