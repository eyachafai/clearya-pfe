const JournalConnexion = require("./JournalConnexion");
const Utilisateur = require("./Utilisateur");
const Departement = require("./Departement");
const Groupe = require('./Groupe');
const GroupeUtilisateur = require('./GroupeUtilisateur');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Projet = require('./projet');
const ProjetMembre = require('./ProjetMembre');
const Tache = require('./tache');

// Associations pour la messagerie et groupes
Groupe.hasMany(GroupeUtilisateur, { foreignKey: 'groupe_id', as: 'groupeUtilisateurs' });
GroupeUtilisateur.belongsTo(Groupe, { foreignKey: 'groupe_id', as: 'groupe' });

// Associations pour la messagerie (pour include dans les requêtes)
Message.belongsTo(Utilisateur, { foreignKey: 'utilisateur_id', as: 'utilisateur' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
Conversation.belongsTo(Groupe, { foreignKey: 'groupe_id', as: 'groupe' });

module.exports = {
  JournalConnexion,
  Utilisateur,
  Departement,
  Groupe,
  GroupeUtilisateur,
  Conversation,
  Message,
  Projet,
  ProjetMembre,
  Tache,
};
