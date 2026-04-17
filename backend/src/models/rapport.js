module.exports = (sequelize, DataTypes) => {
  const Rapport = sequelize.define('Rapport', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },

    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    chemin_fichier: {
      type: DataTypes.STRING,
      allowNull: false
    },
    projet_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'rapports',
    timestamps: false
  });
  Rapport.associate = models => {
    Rapport.belongsTo(models.Projet, { foreignKey: 'projet_id', as: 'projet' });
  };
  return Rapport;
};