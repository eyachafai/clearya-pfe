const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserECDHKey = sequelize.define('UserECDHKey', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    public_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Clé publique ECDH en base64'
    }
  }, {
    tableName: 'user_ecdh_keys',
    timestamps: false
  });

  return UserECDHKey;
};
