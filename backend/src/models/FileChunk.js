const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FileChunk = sequelize.define("FileChunk", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  file_id: { type: DataTypes.STRING, allowNull: false },
  chunk_index: { type: DataTypes.INTEGER, allowNull: false },
  chunk_data: { type: DataTypes.BLOB, allowNull: false },
  message_id: { type: DataTypes.INTEGER }, // optionnel
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'file_chunks',
  timestamps: false
});
