const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Message = sequelize.define("Message", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  conversation_id: { type: DataTypes.INTEGER, references: { model: 'conversation', key: 'id' } },
  utilisateur_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  contenu: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING(16), defaultValue: 'text' },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  date_envoi: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  file_id: { type: DataTypes.INTEGER, references: { model: 'files', key: 'id' }, onDelete: 'SET NULL' }
}, {
  tableName: 'message',
  timestamps: false
});

module.exports = Message;
