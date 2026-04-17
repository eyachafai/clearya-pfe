const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');


// models/Quota.js
const Quota = sequelize.define('Quota', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    quota_mb: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 }, // quota en Mo
    used_mb: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 } // utilisé en Mo
}, {
    tableName: 'quota',
    timestamps: false,
});


module.exports = Quota;
