const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GroupKey = sequelize.define('GroupKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'groupes',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id'
      }
    },
    encrypted_group_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Clé AES de groupe chiffrée en base64'
    },
    iv: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'IV pour le chiffrement en base64'
    },
    sender_public_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Clé publique ECDH du sender en base64 (65 bytes pour P-256)'
    }
  }, {
    tableName: 'group_keys',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['group_id', 'user_id']
      }
    ]
  });

  return GroupKey;
};
