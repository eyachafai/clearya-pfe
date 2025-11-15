const express = require('express');
const router = express.Router();
const { Groupe, GroupeUtilisateur, Utilisateur, Projet, ProjetMembre, Tache, Ticket } = require('../models');
const sequelize = require('../config/db');

// Associations
GroupeUtilisateur.belongsTo(Utilisateur, { foreignKey: 'utilisateur_id' });
GroupeUtilisateur.belongsTo(Groupe, { foreignKey: 'groupe_id' });

// Liste des états possibles pour les taches
const ETATS_TACHE = [
  "à faire",
  "en cours",
  "terminée"];

// Liste des états possibles pour les tickets
const ETATS_Ticket = [
  "nouveau",
  "en cours",
  "resolu",
  "fermee"
];

// GET /api/groupes-utilisateur/:utilisateur_id
router.get('/groupes-utilisateur/:utilisateur_id', async (req, res) => {
  const { utilisateur_id } = req.params;
  console.log(`[API] Reçu demande groupes-utilisateur pour utilisateur_id: ${utilisateur_id}`);
  try {
    // Correction: le champ dans la base est "keycloak_id" (snake_case)
    const user = await Utilisateur.findOne({ where: { keycloak_id: utilisateur_id } });
    if (!user) {
      console.warn(`[API] Aucun utilisateur trouvé avec keycloak_id: ${utilisateur_id}`);
      return res.json([]);
    }
    console.log(`[API] Utilisateur interne trouvé:`, user.id);

    // Utilise l'id interne pour la requête des groupes
    const groupes = await GroupeUtilisateur.findAll({
      where: { utilisateur_id: user.id },
      include: [
        {
          model: Groupe,
          attributes: ['id', 'name']
        }
      ]
    });
    console.log(`[API] Groupes trouvés pour utilisateur ${user.id}:`, JSON.stringify(groupes, null, 2));

    // Pour chaque groupe, si ce n'est pas "Employee", récupérer les membres
    const result = await Promise.all(groupes.map(async g => {
      if (!g.Groupe) {
        console.warn(`[API] Groupe non trouvé pour l'entrée:`, g);
        return null;
      }
      if (g.Groupe?.name === "Employee") {
        console.log(`[API] Groupe "Employee" détecté, pas de membres à retourner`);
        return {
          id: g.Groupe?.id,
          name: g.Groupe?.name,
          role: g.role,
          membres: []
        };
      }
      // Récupérer les membres du groupe (sauf Employee)
      console.log(`[API] Récupération des membres pour groupe: ${g.Groupe?.name} (${g.Groupe?.id})`);
      const membres = await GroupeUtilisateur.findAll({
        where: { groupe_id: g.Groupe?.id },
        include: [{
          model: Utilisateur,
          attributes: ['id', 'username', 'email', 'first_name', 'last_name']
        }]
      });
      console.log(`[API] Membres récupérés pour groupe ${g.Groupe?.name}:`, JSON.stringify(membres, null, 2));
      return {
        id: g.Groupe?.id,
        name: g.Groupe?.name,
        role: g.role,
        membres: membres.map(m => ({
          id: m.utilisateur_id,
          username: m.Utilisateur?.username,
          email: m.Utilisateur?.email,
          name: m.Utilisateur?.first_name + ' ' + m.Utilisateur?.last_name,
          role: m.role
        }))
      };
    }));

    const filteredResult = result.filter(g => g && g.id);
    console.log(`[API] Résultat final envoyé au frontend:`, JSON.stringify(filteredResult, null, 2));
    res.json(filteredResult);
  } catch (err) {
    console.error(`[API] Erreur récupération groupes utilisateur:`, err);
    res.status(500).json({ error: 'Erreur récupération groupes utilisateur', details: err.message });
  }
});

// GET /api/groupes/:id/members
router.get('/groupes/:id/members', async (req, res) => {
    const { id } = req.params;
    console.log("id groupe:", id);
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
    console.log(`Groupes trouvés:`, JSON.stringify(groupes, null, 2));

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

// GET /api/projets?groupe_id=...
router.get('/projets', async (req, res) => {
  const { groupe_id } = req.query;
  if (!groupe_id) {
    return res.status(400).json({ error: "groupe_id requis" });
  }
  try {
    const projets = await Projet.findAll({ where: { groupe_id } });
    res.json(projets);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération projets", details: err.message });
  }
});

// POST /api/projets
router.post('/projets', async (req, res) => {
  const { name, groupe_id } = req.body;
  if (!name || !groupe_id) {
    return res.status(400).json({ error: "name et groupe_id requis" });
  }
  try {
    const projet = await Projet.create({ name, groupe_id });
    res.status(201).json(projet);
  } catch (err) {
    res.status(500).json({ error: "Erreur création projet", details: err.message });
  }
});

// GET /api/projet/:id/membres
router.get('/projet/:id/membres', async (req, res) => {
  const { id } = req.params;
  try {
    const membres = await ProjetMembre.findAll({
      where: { projet_id: id },
      include: [{
        model: Utilisateur,
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'keycloak_id'] // Ajoute keycloak_id ici
      }]
    });
    const result = membres.map(m => ({
      id: m.utilisateur_id,
      username: m.Utilisateur?.username,
      email: m.Utilisateur?.email,
      name: m.Utilisateur?.first_name + ' ' + m.Utilisateur?.last_name,
      role: m.role,
      keycloak_id: m.Utilisateur?.keycloak_id // Ajoute keycloak_id dans la réponse
    }));
    // DEBUG: Affiche les membres envoyés au frontend
    if (process.env.NODE_ENV === 'development') {
      console.log('[API] Membres projet envoyés au frontend:', membres);
    }
    res.json(result);
  } catch (err) {
    console.error("[API] Erreur récupération membres projet:", err);
    res.status(500).json({ error: "Erreur récupération membres projet", details: err.message });
  }
});

// POST /api/projet/:id/membres
router.post('/projet/:id/membres', async (req, res) => {
  const { id } = req.params;
  const { utilisateur_id, role } = req.body;
  if (!utilisateur_id) {
    return res.status(400).json({ error: "utilisateur_id requis" });
  }
  try {
    // Si le membre existe déjà dans le projet, on update juste le rôle
    const [projetMembre, created] = await ProjetMembre.findOrCreate({
      where: { projet_id: id, utilisateur_id },
      defaults: { role: role || "membre" }
    });
    if (!created) {
      // Si déjà existant, on update le rôle
      await projetMembre.update({ role: role || "membre" });
    }
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur ajout membre projet", details: err.message });
  }
});

// DELETE /api/projet/:id/membres/:utilisateur_id
router.delete('/projet/:id/membres/:utilisateur_id', async (req, res) => {
  const { id, utilisateur_id } = req.params;
  try {
    await ProjetMembre.destroy({ where: { projet_id: id, utilisateur_id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression membre projet", details: err.message });
  }
});

// GET /api/projet/:id/taches
router.get('/projet/:id/taches', async (req, res) => {
  const { id } = req.params;
  try {
    const taches = await Tache.findAll({
      where: { projet_id: id },
      include: [{
        model: Utilisateur,
        as: 'membre',
        attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'keycloak_id'] // Ajoute keycloak_id ici
      }]
    });
    const result = taches.map(t => ({
      id: t.id,
      titre: t.titre,
      description: t.description,
      membre_id: t.membre_id,
      membre: t.membre ? {
        id: t.membre.id,
        username: t.membre.username,
        email: t.membre.email,
        name: t.membre.first_name + ' ' + t.membre.last_name,
        keycloak_id: t.membre.keycloak_id 
      } : null,
      etat: t.etat 
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération tâches", details: err.message });
  }
});

// POST /api/projet/:id/taches
router.post('/projet/:id/taches', async (req, res) => {
  const { id } = req.params;
  const { titre, description, membre_id, etat } = req.body;

  if (!titre || !membre_id) {
    return res.status(400).json({ error: "titre et membre_id requis" });
  }

  try {
    const tache = await Tache.create({
      titre,
      description,
      projet_id: id,
      membre_id,
      etat // ici direct, pas besoin de etatToInsert
    });
    res.status(201).json(tache);
  } catch (err) {
    console.error("Erreur création tâche:", err);
    res.status(500).json({ error: "Erreur création tâche", details: err.message });
  }
});

// DELETE /api/projet/:id/taches/:tache_id
router.delete('/projet/:id/taches/:tache_id', async (req, res) => {
  const { id, tache_id } = req.params;
  try {
    const deleted = await Tache.destroy({
      where: { id: tache_id, projet_id: id }
    });
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Tâche non trouvée" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression tâche", details: err.message });
  }
});

// PUT /api/projet/:id/taches/:tache_id (mise à jour de l'état d'une tâche)
router.put('/projet/:id/taches/:tache_id', async (req, res) => {
  const { id, tache_id } = req.params;
  const { etat, titre, description, membre_id } = req.body;
  try {
    const tache = await Tache.findOne({ where: { id: tache_id, projet_id: id } });
    if (!tache) {
      return res.status(404).json({ error: "Tâche non trouvée" });
    }
    // Mets à jour seulement les champs fournis
    if (etat !== undefined) tache.etat = etat;
    if (titre !== undefined) tache.titre = titre;
    if (description !== undefined) tache.description = description;
    if (membre_id !== undefined) tache.membre_id = membre_id;
    await tache.save();
    res.json({ success: true, tache });
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour tâche", details: err.message });
  }
});

// PATCH /api/projet/:projet_id/taches/:tache_id/etat
router.patch('/projet/:projet_id/taches/:tache_id/etat', async (req, res) => {
  const { projet_id, tache_id } = req.params;
  const { etat, utilisateur_id } = req.body;
  const allowed = ETATS_TACHE;
  if (!allowed.includes(etat)) {
    return res.status(400).json({ error: "Etat invalide" });
  }
  if (!utilisateur_id) return res.status(400).json({ error: "utilisateur_id requis" });

  // Récupère la tâche
  const tache = await Tache.findOne({ where: { id: tache_id, projet_id } });
  if (!tache) return res.status(404).json({ error: "Tâche non trouvée" });

  // Seul le membre assigné peut changer l'état
  const isAssignee = Number(tache.membre_id) === Number(utilisateur_id);
  if (!isAssignee) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à changer cet état" });
  }

  const oldEtat = tache.etat;
  await tache.update({ etat });

  // (Optionnel) log dans la console
  console.log(`[API] Etat tâche ${tache.id} changé: ${oldEtat} → ${etat} par user ${utilisateur_id}`);

  res.json(tache);
});

// DELETE /api/projets/:id
router.delete('/projets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Supprime d'abord les membres et les tâches liés au projet (si contraintes FK non ON DELETE CASCADE)
    await ProjetMembre.destroy({ where: { projet_id: id } });
    await Tache.destroy({ where: { projet_id: id } });
    // Puis supprime le projet
    const deleted = await Projet.destroy({ where: { id } });
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Projet non trouvé" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression projet", details: err.message });
  }
});


// GET /api/taches/etats
router.get('/taches/etats', (req, res) => {
  res.json(ETATS_TACHE);
});




// GET /api/tickets?assignee_id=...&etat=...
router.get('/tickets', async (req, res) => {
  const { assignee_id, etat } = req.query;
  const where = {};
  if (assignee_id) where.assignee_id = assignee_id;
  if (etat) where.etat = etat;
  try {
    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: Utilisateur, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: Utilisateur, as: 'creator', attributes: ['id', 'username', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(tickets);
  } catch (err) {
    console.error("[API] Erreur récupération tickets:", err); // Ajoute ce log pour debug
    res.status(500).json({ error: "Erreur récupération tickets", details: err.message });
  }
});

// GET /api/tickets/:id
router.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: Utilisateur, as: 'assignee', attributes: ['id', 'username', 'email'] },
        { model: Utilisateur, as: 'creator', attributes: ['id', 'username', 'email'] }
      ]
    });
    if (!ticket) return res.status(404).json({ error: "Ticket non trouvé" });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération ticket", details: err.message });
  }
});

// POST /api/tickets
router.post('/tickets', async (req, res) => {
  const { titre, description, assignee_id, created_by } = req.body;
  if (!titre || !assignee_id || !created_by) {
    return res.status(400).json({ error: "titre, assignee_id, created_by requis" });
  }
  try {
    const ticket = await Ticket.create({
      titre,
      description,
      assignee_id,
      created_by
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Erreur création ticket", details: err.message });
  }
});

// PUT /api/tickets/:id
router.put('/tickets/:id', async (req, res) => {
  const { titre, description, assignee_id, etat, resolved_at } = req.body;
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket non trouvé" });
    if (titre !== undefined) ticket.titre = titre;
    if (description !== undefined) ticket.description = description;
    if (assignee_id !== undefined) ticket.assignee_id = assignee_id;
    if (etat !== undefined) ticket.etat = etat;
    if (resolved_at !== undefined) ticket.resolved_at = resolved_at;
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour ticket", details: err.message });
  }
});

// PATCH /api/tickets/:id/etat
router.patch('/tickets/:id/etat', async (req, res) => {
  const { etat, utilisateur_id } = req.body;
  const allowed = ["nouveau", "en cours", "resolu", "ferme", "fermée"];
  if (!allowed.includes(etat)) {
    return res.status(400).json({ error: "Etat invalide" });
  }
  if (!utilisateur_id) return res.status(400).json({ error: "utilisateur_id requis" });
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket non trouvé" });
    // Seul l'assignee peut changer l'état
    if (Number(ticket.assignee_id) !== Number(utilisateur_id)) {
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à changer cet état" });
    }
    const oldEtat = ticket.etat;
    ticket.etat = etat;
    if (etat === "resolu" || etat === "ferme" || etat === "fermée") {
      ticket.resolved_at = new Date();
    }
    await ticket.save();
    // (Optionnel) notification ici
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Erreur changement état ticket", details: err.message });
  }
});

// DELETE /api/tickets/:id
router.delete('/tickets/:id', async (req, res) => {
  try {
    const deleted = await Ticket.destroy({ where: { id: req.params.id } });
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Ticket non trouvé" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erreur suppression ticket", details: err.message });
  }
});

// GET /api/admin/groupes-utilisateur/:id
router.get('/admin/groupes-utilisateur/:id', async (req, res) => {
  const utilisateur_id = req.params.id;
  console.log("[API] Route /admin/groupes-utilisateur appelée avec utilisateur_id:", utilisateur_id);

  try {
    // Log la requête brute SQL générée par Sequelize
    const groupes = await GroupeUtilisateur.findAll({
      where: { utilisateur_id },
      include: [{ model: require('../models/Groupe'), attributes: ['id', 'name'] }]
    });
    console.log("[API] GroupesUtilisateur trouvés:", groupes);

    // Log le mapping final envoyé au frontend
    const result = groupes.map(g => ({
      id: g.Groupe?.id,
      name: g.Groupe?.name,
      role: g.role
    }));
    console.log("[API] Résultat envoyé au frontend:", result);

    res.json(result);
  } catch (err) {
    console.error("[API] Erreur récupération groupes-utilisateur:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// NEW: GET /api/users/by-keycloak/:keycloakId
router.get('/users/by-keycloak/:keycloakId', async (req, res) => {
  const { keycloakId } = req.params;
  console.log('[API] GET user by keycloakId:', keycloakId);
  try {
    const user = await Utilisateur.findOne({ where: { keycloak_id: keycloakId } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json({ id: user.id, username: user.username, email: user.email, first_name: user.first_name, last_name: user.last_name, keycloak_id: user.keycloak_id });
  } catch (err) {
    console.error('[API] Erreur récupération utilisateur par keycloak:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});


module.exports = router;
