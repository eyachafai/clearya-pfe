const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Conversation = sequelize.define("Conversation", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  groupe_id: { type: DataTypes.INTEGER, references: { model: 'groupe', key: 'id' } },
  titre: { type: DataTypes.STRING }
}, {
  tableName: 'conversation',
  timestamps: false
});

// Ajoute une méthode statique pour retrouver une conversation par groupe_id
Conversation.findByGroupeId = async function(groupe_id) {
  return await Conversation.findOne({ where: { groupe_id } });
};

module.exports = Conversation;
