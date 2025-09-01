const express = require('express');
const router = express.Router();
const { Groupe, GroupeUtilisateur, Utilisateur } = require('../models');
const sequelize = require('../config/db');

// Ajoute cette association si elle n'existe pas déjà
GroupeUtilisateur.belongsTo(Utilisateur, { foreignKey: 'utilisateur_id' });

/*
// GET /api/projets?groupe_id=...
router.get('/projets', async (req, res) => {
  const { groupe_id } = req.query;
  try {
    // Remplace par ta logique réelle de projets si tu as une table Projet
    // Ici, on retourne juste le groupe comme "projet" pour l'exemple
    const groupe = await Groupe.findByPk(groupe_id);
    if (!groupe) return res.json([]);
    // Si tu as une table Projet, fais Projet.findAll({ where: { groupe_id } })
    res.json([{ id: groupe.id, name: groupe.name }]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération projets', details: err.message });
  }
});*/

// GET /api/groupes/:id/members
router.get('/groupes/:id/members', async (req, res) => {
  const { id } = req.params;
  try {
    const membres = await GroupeUtilisateur.findAll({
      where: { groupe_id: id },
      include: [{
        model: Utilisateur,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name']
      }]
    });
    const result = membres.map(m => ({
      id: m.utilisateur_id,
      username: m.Utilisateur?.username,
      email: m.Utilisateur?.email,
      name: m.Utilisateur?.first_name + ' ' + m.Utilisateur?.last_name,
      role: m.role
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération membres', details: err.message });
  }
});

// GET /api/groupes/membres
router.get('/groupes/membres', async (req, res) => {
  try {
    // Récupère tous les groupes
    const groupes = await Groupe.findAll({ order: [['name', 'ASC']] });

    // Pour chaque groupe, récupère les membres et leur rôle
    const result = await Promise.all(groupes.map(async (groupe) => {
      const membres = await GroupeUtilisateur.findAll({
        where: { groupe_id: groupe.id },
        include: [{
          model: Utilisateur,
          attributes: ['id', 'username', 'email', 'first_name', 'last_name']
        }]
      });
      return {
        id: groupe.id,
        name: groupe.name,
        membres: membres.map(m => ({
          id: m.utilisateur_id,
          username: m.Utilisateur?.username,
          email: m.Utilisateur?.email,
          name: m.Utilisateur?.first_name + ' ' + m.Utilisateur?.last_name,
          role: m.role
        }))
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération groupes/membres', details: err.message });
  }
});

module.exports = router;
