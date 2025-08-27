const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
require('dotenv').config({ path: '../.env' });
const { keycloak } = require('../config/keycloak.config');
const { Conversation, Message, Groupe, Utilisateur } = require('../models');

// Créer une conversation pour un groupe (si elle n'existe pas déjà)
router.post('/conversations', async (req, res) => {
  const { groupe_id, titre } = req.body;
  try {
    // Vérifie que groupe_id est bien fourni et est un nombre
    if (!groupe_id || isNaN(Number(groupe_id))) {
      return res.status(400).json({ error: "groupe_id manquant ou invalide" });
    }
    // Vérifie que le groupe existe
    const groupe = await Groupe.findByPk(groupe_id);
    if (!groupe) {
      return res.status(404).json({ error: "Groupe non trouvé" });
    }
    // Vérifie que titre est une string (optionnel)
    const convTitre = typeof titre === "string" && titre.length > 0 ? titre : `Groupe ${groupe_id}`;
    let conv = await Conversation.findOne({ where: { groupe_id } });
    if (!conv) {
      conv = await Conversation.create({ groupe_id, titre: convTitre });
    }
    res.json(conv);
  } catch (err) {
    console.error('Erreur création conversation:', err);
    res.status(500).json({ error: 'Erreur création conversation', details: err.message });
  }
});

// Envoyer un message dans une conversation
router.post('/messages', async (req, res) => {
  console.log("POST /api/messages/messages called");
  console.log("Body received:", req.body);
  // Vérifie que le body contient bien les champs attendus
  const { conversation_id, utilisateur_id, contenu, type } = req.body;
  if (!conversation_id || !utilisateur_id || !contenu) {
    console.error("Paramètres manquants :", req.body);
    return res.status(400).json({ error: "Paramètres manquants" });
  }
  try {
    // Vérifie que la conversation existe
    const conv = await Conversation.findByPk(conversation_id);
    if (!conv) {
      console.error("Conversation non trouvée :", conversation_id);
      return res.status(404).json({ error: "Conversation non trouvée" });
    }
    // Vérifie que l'utilisateur existe
    const user = await Utilisateur.findByPk(utilisateur_id);
    if (!user) {
      console.error("Utilisateur non trouvé :", utilisateur_id);
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    // Enregistre le message dans la DB locale
    const msg = await Message.create({
      conversation_id,
      utilisateur_id,
      contenu,
      type: type || 'text'
    });
    console.log("Message enregistré :", msg.id);
    res.status(201).json(msg);
  } catch (err) {
    console.error('Erreur envoi message:', err);
    res.status(500).json({ error: 'Erreur envoi message', details: err.message });
  }
});

// Marquer un message comme lu (is_read = true)
router.patch('/messages/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const msg = await Message.findByPk(id);
    if (!msg) {
      return res.status(404).json({ error: "Message non trouvé" });
    }
    await msg.update({ is_read: true });
    res.json({ message: "Message marqué comme lu", id });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour de is_read", details: err.message });
  }
});

// Récupérer l'historique des messages d'une conversation
router.get('/conversations/:conversation_id/messages', async (req, res) => {
  const { conversation_id } = req.params;
  try {
    const messages = await Message.findAll({
      where: { conversation_id },
      include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['id', 'username', 'email'] }],
      order: [['date_envoi', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération messages', details: err.message });
  }
});

// Pour permettre à l'API d'émettre sur socket.io, il faut exporter une fonction d'initialisation
let ioInstance = null;
function setSocketIo(io) {
  ioInstance = io;
}
router.setSocketIo = setSocketIo; // <-- Corrige ici : attache à router, pas à module.exports

// Nouvelle route API pour envoyer un message en temps réel (front → API → axios → backend socket → API → front)
router.post('/messages/realtime', async (req, res) => {
  try {
    // Utilise axios pour appeler la vraie route backend locale
    const axios = require('axios');
    const apiUrl = `http://localhost:${process.env.PORT || 5000}/api/messages/messages`;
    const rep = await axios.post(apiUrl, req.body, { headers: { 'Content-Type': 'application/json' } });
    const msg = rep.data;

    // Émet le message sur socket.io à tous les clients connectés
    if (ioInstance) {
      ioInstance.emit("receiveMessage", msg);
    }

    // Retourne la réponse telle quelle au frontend
    res.status(201).json(msg);
  } catch (err) {
    console.error("Erreur /messages/realtime:", err);
    res.status(500).json({ error: "Erreur envoi message temps réel", details: err.message });
  }
});

// Proxy pour créer ou récupérer une conversation (front → API → axios → backend → API → front)
router.post('/conversations/proxy', async (req, res) => {
  try {
    const axios = require('axios');
    const apiUrl = `http://localhost:${process.env.PORT || 5000}/api/messages/conversations`;
    const rep = await axios.post(apiUrl, req.body, { headers: { 'Content-Type': 'application/json' } });
    res.status(rep.status).json(rep.data);
  } catch (err) {
    console.error("Erreur /conversations/proxy:", err);
    res.status(500).json({ error: "Erreur proxy conversation", details: err.message });
  }
});

// Proxy pour récupérer les messages d'une conversation (front → API → axios → backend → API → front)
router.get('/conversations/:conversation_id/messages/proxy', async (req, res) => {
  try {
    const axios = require('axios');
    const apiUrl = `http://localhost:${process.env.PORT || 5000}/api/messages/conversations/${req.params.conversation_id}/messages`;
    const rep = await axios.get(apiUrl);
    res.status(rep.status).json(rep.data);
  } catch (err) {
    console.error("Erreur /conversations/:id/messages/proxy:", err);
    res.status(500).json({ error: "Erreur proxy messages", details: err.message });
  }
});

module.exports = router;
