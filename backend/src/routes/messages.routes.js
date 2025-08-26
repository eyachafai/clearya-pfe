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

// Pour tester les routes de messagerie :

// 1. **Créer une conversation pour un groupe**
//    - Méthode : POST
//    - URL : `http://localhost:5000/api/messages/conversations`
//    - Body (JSON) :
//      ```json
//      {
//        "groupe_id": 1,
//        "titre": "Groupe 1"
//      }
//      ```
//    - Résultat attendu : un objet conversation (id, groupe_id, titre).

// 2. **Envoyer un message dans une conversation**
//    - Méthode : POST
//    - URL : `http://localhost:5000/api/messages/messages`
//    - Body (JSON) :
//      ```json
//      {
//        "conversation_id": 1,
//        "utilisateur_id": 1,
//        "contenu": "Bonjour à tous !",
//        "type": "text"
//      }
//      ```
//    - Résultat attendu : un objet message (id, conversation_id, utilisateur_id, contenu, ...).

// 3. **Récupérer l’historique des messages d’une conversation**
//    - Méthode : GET
//    - URL : `http://localhost:5000/api/messages/conversations/1/messages`
//    - Résultat attendu : un tableau de messages (avec utilisateur inclus).

// **Utilise Postman, Insomnia ou curl pour tester ces routes.**

// **Exemple curl :**
// ```bash
// curl -X POST http://localhost:5000/api/messages/conversations -H "Content-Type: application/json" -d '{"groupe_id":1,"titre":"Groupe 1"}'
// curl -X POST http://localhost:5000/api/messages/messages -H "Content-Type: application/json" -d '{"conversation_id":1,"utilisateur_id":1,"contenu":"Bonjour !","type":"text"}'
// curl http://localhost:5000/api/messages/conversations/1/messages
// ```

// **Vérifie la base de données pour voir les enregistrements créés.**

// Remarque :
// - Chaque conversation est liée à un groupe (groupe_id).
// - Les membres d'une conversation sont les membres du groupe correspondant (table groupe_utilisateur).
// - L'admin peut aussi être inclus comme membre spécial si besoin (à gérer côté logique d'affichage ou d'envoi).
/*
# Explication technique

- On utilise `groupe_id` (clé primaire numérique) pour référencer les groupes dans la base de données et dans les relations (ex : conversation, groupe_utilisateur).
- Le champ `name` est juste un label (nom affiché), il n’est pas unique ni optimisé pour les relations SQL.
- Les clés étrangères (`groupe_id`) permettent de garantir l’intégrité référentielle, d’éviter les doublons, et de faire des jointures rapides.
- Si tu utilises le `name`, tu risques d’avoir des bugs si deux groupes ont le même nom ou si le nom change.

**En résumé :**
- `groupe_id` = identifiant technique, utilisé pour toutes les relations et requêtes.
- `name` = affichage, utilisé pour l’UI et la présentation.

**C’est la bonne pratique en base de données relationnelle.***/

module.exports = router;
