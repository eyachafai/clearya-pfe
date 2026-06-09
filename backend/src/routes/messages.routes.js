const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
require('dotenv').config({ path: '../.env' });
const { keycloak } = require('../config/keycloak.config');
const { Conversation, Message, Groupe, Utilisateur } = require('../models');
const { FileChunk } = require('../models/FileChunk')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // stocke en mémoire pour concaténation rapide
const fs = require('fs');
const path = require('path');
const md5 = require('md5');
const File = require('../models/Files');
const forge = require('node-forge');
const privateKeyPath = path.join(__dirname, '../keys/private.pem');
const PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);


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
  console.log("Body received:", req.body);
  // Vérifie que le body contient bien les champs attendus
  // Supporte 2 formats:
  // 1. Format ancien: contenu (texte en clair)
  // 2. Format chiffré: ciphertext + iv (message chiffré AES)
  const { conversation_id, utilisateur_id, contenu, ciphertext, iv, type } = req.body;
  
  if (!conversation_id || !utilisateur_id) {
    console.error("Paramètres manquants :", req.body);
    return res.status(400).json({ error: "Paramètres manquants: conversation_id et utilisateur_id requis" });
  }

  // Vérifie qu'on a soit contenu soit ciphertext+iv
  if (!contenu && (!ciphertext || !iv)) {
    console.error("Paramètres manquants :", req.body);
    return res.status(400).json({ error: "Paramètres manquants: contenu OU (ciphertext + iv) requis" });
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

    // 🔐 IMPORTANT: Enregistre le message chiffré correctement
    console.log("📝 Enregistrement du message:");
    console.log("   - ciphertext:", ciphertext ? `${ciphertext.substring(0, 30)}...` : "null");
    console.log("   - iv:", iv ? `${iv.substring(0, 30)}...` : "null");
    
    const msg = await Message.create({
      conversation_id,
      utilisateur_id,
      contenu: contenu || `[chiffré]`, // Si message chiffré, on met un placeholder
      type: type || 'text',
      ciphertext: ciphertext || null,  // ✅ IMPORTANT: Enregistre le vrai ciphertext
      iv: iv || null,                   // ✅ IMPORTANT: Enregistre le vrai iv
      encryptedMessageData: req.body.encryptedMessageData || null,
      encryptedAESKeyData: req.body.encryptedAESKeyData || null
    });
    console.log("✅ Message enregistré en BD:");
    console.log("   - ID:", msg.id);
    console.log("   - ciphertext en BD:", msg.ciphertext ? `${msg.ciphertext.substring(0, 30)}...` : "null");
    console.log("   - iv en BD:", msg.iv ? `${msg.iv.substring(0, 30)}...` : "null");

    // Récupère la conversation pour le groupe_id
    const convNotif = conv;
    console.log("Conversation trouvée:", convNotif);
    if (ioInstance) {
      const notif = {
        titre: "Nouveau message",
        message: contenu || "[message chiffré]",
        date: new Date(),
        auteur: { id: user.id, username: user.username, email: user.email }
      };
      console.log("[SOCKET] Emission notification dans room_groupe_", convNotif?.groupe_id, notif);
      ioInstance.to(`room_groupe_${convNotif?.groupe_id}`).emit("notification", notif);
      console.log("[SOCKET] Notification émise dans room_groupe_", convNotif?.groupe_id);
    } else {
      console.log("[SOCKET] ioInstance non défini");
    }

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
router.setSocketIo = setSocketIo;

// Nouvelle route API pour envoyer un message en temps réel (front → API → axios → backend socket → API → front)
router.post('/messages/realtime', async (req, res) => {
  try {
    // Utilise axios pour appeler la vraie route backend locale
    const axios = require('axios');
    const apiUrl = `http://localhost:${process.env.PORT || 5000}/api/messages/messages`;
    const rep = await axios.post(apiUrl, req.body, { headers: { 'Content-Type': 'application/json' } });
    const msg = rep.data;

    // Récupère la conversation pour émettre sur la bonne room
    const conv = await Conversation.findByPk(msg.conversation_id);
    
    // Émet le message sur socket.io à tous les clients connectés
    if (ioInstance && conv) {
      console.log("[SOCKET] Emission receiveMessage pour conversation:", msg.conversation_id);
      ioInstance.to(`room_${msg.conversation_id}`).emit("receiveMessage", msg);
      ioInstance.emit("receiveMessage", msg); // fallback pour les autres clients
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

// Route to upload file (avec support du chiffrement)
router.post('/upload', async (req, res) => {
  const { name, currentChunkIndex, totalChunks, conversation_id, utilisateur_id, iv } = req.query;

  // Ensure temp directory exists before writing
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const firstChunk = parseInt(currentChunkIndex) === 0;
  const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;

  const fileExtension = name.split('.').pop();
  const data = req.body.toString().split(',')[1];
  const buffer = Buffer.from(data, 'base64');
  const tempFilename = md5(name + req.ip + Math.random().toString('36').substring(0, 6)) + '.' + fileExtension;

  // Append current chunk data to file in temp directory
  fs.appendFileSync(path.join(tempDir, tempFilename), buffer);

  if (lastChunk) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    const finalFilename = md5(Math.random().toString('36')).substring(0, 6) + '.' + fileExtension;
    fs.renameSync(path.join(tempDir, tempFilename), path.join(uploadsDir, finalFilename));

    console.log("✅ Fichier chiffré sauvegardé:", finalFilename);
    console.log("📝 IV du fichier:", iv);

    // Enregistrement du message fichier et émission socket.io si conversation_id et utilisateur_id sont fournis
    let msg = null;
    if (conversation_id && utilisateur_id) {
      msg = await Message.create({
        conversation_id,
        utilisateur_id,
        contenu: `[file] ${finalFilename}`,
        type: "file",
        iv: iv || null,  // Stocke l'IV pour le déchiffrement ultérieur
        ciphertext: "encrypted"  // Marque que c'est chiffré
      });

      console.log("📝 Message fichier enregistré en base, ID:", msg.id);
      console.log("🔄 Récupération complète du message...");
      
      // Récupère le message complet avec utilisateur
      const fullMsg = await Message.findByPk(msg.id, {
        include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['id', 'username', 'email'] }]
      });

      if (ioInstance) {
        console.log("📡 Émission socket receiveMessage:", fullMsg);
        ioInstance.to(`room_${conversation_id}`).emit("receiveMessage", fullMsg);
        ioInstance.emit("receiveMessage", fullMsg); // fallback
      }
    }

    res.json({ message: 'File uploaded', finalFilename, msg });
  } else {
    res.status(200).json({
      message: 'Chunk uploaded',
      currentChunkIndex,
      totalChunks
    });
  }
});

// Route pour recevoir un message vocal (audio) chiffré
router.post('/send-audio', upload.single('audio'), async (req, res) => {
  try {
    const { conversation_id, utilisateur_id, iv } = req.body;
    
    if (!conversation_id || !utilisateur_id || !req.file) {
      return res.status(400).json({ error: "Paramètres manquants ou fichier audio absent" });
    }

    if (!iv) {
      return res.status(400).json({ error: "IV manquant pour le déchiffrement" });
    }

    console.log("🎤 Réception audio chiffré, IV:", iv);

    // Sauvegarde le fichier audio chiffré dans uploads/
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    
    const audioFilename = `audio_${Date.now()}.enc`;
    const audioPath = path.join(uploadsDir, audioFilename);
    fs.writeFileSync(audioPath, req.file.buffer);

    console.log("✅ Fichier audio chiffré sauvegardé:", audioFilename);

    // Enregistre le message dans la base (type audio)
    // Stocke l'IV en base pour permettre le déchiffrement côté client
    const msg = await Message.create({
      conversation_id,
      utilisateur_id,
      contenu: `[audio] ${audioFilename}`,
      type: "audio",
      iv: iv || null,  // Stocke l'IV pour le déchiffrement ultérieur
      ciphertext: "encrypted"  // Marque que c'est chiffré
    });

    console.log("📝 Message audio enregistré en base, ID:", msg.id);

    // Émission socket temps réel
    if (ioInstance) {
      ioInstance.to(`room_${conversation_id}`).emit("receiveMessage", msg);
      ioInstance.emit("receiveMessage", msg); // fallback pour clients hors room
    }

    res.json({ message: "Message vocal reçu", audioFilename, msg });
  } catch (err) {
    console.error("Erreur send-audio:", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du message vocal", details: err.message });
  }
});

// le log ici juste pour debug temporaire:
router.use('/uploads', (req, res, next) => {
  console.log('Requête reçue sur /uploads:', req.url);
  next();
});




// === TEST DECRYPT — FONCTIONNE TOUJOURS ===
router.post('/decryption/decrypt', (req, res) => {
  try {
    const { encryptedAESKey, encryptedMessageData } = req.body;
    if (!encryptedAESKey || !encryptedMessageData) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const privateKey = forge.pki.privateKeyFromPem(PRIVATE_KEY);
    const aesKeyBytes = privateKey.decrypt(
      forge.util.decode64(encryptedAESKey),
      'RSA-OAEP'
    );
    const encrypted = JSON.parse(encryptedMessageData);
    const ivBytes = forge.util.hexToBytes(encrypted.iv);
    const cipherBytes = forge.util.decode64(encrypted.ciphertext);
    const decipher = forge.cipher.createDecipher('AES-CBC', aesKeyBytes);
    decipher.start({ iv: ivBytes });
    decipher.update(forge.util.createBuffer(cipherBytes, 'raw'));
    const success = decipher.finish();
    if (!success) {
      throw new Error('AES decryption failed');
    }
    const decryptedMessage = decipher.output.toString('utf8');
    return res.json({ decryptedMessage });
  } catch (error) {
    console.error('Error during decryption:', error);
    return res.status(500).json({ error: 'Decryption failed', details: error.message });
  }
});

router.get('/:group_id/membres', async (req, res) => {
  try {
    const { group_id } = req.params;
    const groupe = await db.Groupe.findByPk(group_id, {
      include: [{
        model: db.User,
        through: { attributes: [] },
        attributes: ['id', 'username', 'email']
      }]
    });
    if (!groupe) {
      return res.status(404).json({ error: 'Groupe non trouvé' });
    }
    res.json(groupe.Users || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET nombre de messages non lus pour une conversation
router.get('/conversations/:conversation_id/unread-count', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const count = await Message.count({ 
      where: { conversation_id, is_read: false } 
    });
    console.log(`📬 Messages non lus pour conversation ${conversation_id}: ${count}`);
    res.json({ unread_count: count });
  } catch (err) {
    console.error('Erreur comptage non-lus:', err);
    res.status(500).json({ error: "Erreur lors du comptage des non-lus" });
  }
});

module.exports = router;