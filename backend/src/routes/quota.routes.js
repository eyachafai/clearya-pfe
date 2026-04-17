// quota.routes.js
const express = require('express');
const router = express.Router();
const { Quota, Utilisateur } = require('../models');
const Files = require('../models/Files');
const axios = require('axios');
const multer = require('multer');


// Configuration stockage local
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/files'); // dossier où stocker les fichiers
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });


// UPLOAD FILE (multer + DB)
router.post('/files', upload.single('file'), async (req, res) => {
  console.log('[BACK] File reçu par multer:', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier envoyé' });
  }

  const userId = req.body.user_id || req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: "user_id requis pour quota" });
  }

  try {
    const file = await Files.create({
      file_name: req.file.originalname,
      file_type: req.file.mimetype,
      file_url: `/uploads/files/${req.file.filename}`,
      user_id: userId // Ajout du propriétaire du fichier
    });

    // Calcul taille fichier en Mo
    const fileSizeMb = req.file.size ? req.file.size / (1024 * 1024) : 0;
    // Met à jour le quota utilisé
    const quota = await Quota.findOne({ where: { user_id: userId } });
    if (quota) {
      quota.used_mb = (quota.used_mb || 0) + fileSizeMb;
      await quota.save();
    }

    res.status(201).json(file);
  } catch (err) {
    console.error('[BACK] Erreur DB:', err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du fichier" });
  }
});

// GET all files
router.get('/files', async (req, res) => {
  try {
    const allFiles = await Files.findAll({
      include: [{ model: require('../models/Utilisateur'), as: 'owner', attributes: ['id', 'username', 'email'] }]
    });
    res.json(allFiles);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET one file
router.get('/files/:id', async (req, res) => {
  const file = await Files.findByPk(req.params.id);

  if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });
  res.json(file);
});

// DELETE file (seulement si propriétaire)
router.delete('/files/:id', async (req, res) => {
  const file = await Files.findByPk(req.params.id);
  const userId = req.body.user_id || req.headers['x-user-id'];
  if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });
  if (!userId || file.user_id != userId) {
    return res.status(403).json({ error: 'Suppression non autorisée' });
  }
  await file.destroy();
  // Recalcule le quota utilisé pour cet utilisateur
  const files = await Files.findAll({ where: { user_id: userId } });
  let totalMb = 0;
  const fs = require('fs');
  for (const f of files) {
    const filePath = f.file_url.startsWith('/') ? `.${f.file_url}` : f.file_url;
    try {
      const stats = fs.statSync(filePath);
      totalMb += stats.size / (1024 * 1024);
    } catch (e) {}
  }
  const quota = await Quota.findOne({ where: { user_id: userId } });
  if (quota) {
    quota.used_mb = totalMb;
    await quota.save();
  }
  res.json({ message: 'Fichier supprimé et quota synchronisé' });
});

// GET /api/ (doit être avant /:userId)
router.get('/', async (req, res) => {
  const quotas = await Quota.findAll({ include: [{ model: Utilisateur, as: 'utilisateur', attributes: ['id', 'username', 'email'] }] });
  res.json(quotas);
});

// Endpoint pour synchroniser les quotas utilisés avec les fichiers existants
router.post('/quota/sync', async (req, res) => {
  try {
    // Récupère tous les utilisateurs ayant un quota
    const quotas = await Quota.findAll();
    for (const quota of quotas) {
      // Calcule la somme des tailles des fichiers de l'utilisateur
      const files = await Files.findAll({ where: { user_id: quota.user_id } });
      let totalMb = 0;
      for (const file of files) {
        // Récupère la taille du fichier sur le disque
        const fs = require('fs');
        const filePath = file.file_url.startsWith('/') ? `.${file.file_url}` : file.file_url;
        try {
          const stats = fs.statSync(filePath);
          totalMb += stats.size / (1024 * 1024);
        } catch (e) {
          // Si le fichier n'existe plus sur le disque, ignorer
        }
      }
      quota.used_mb = totalMb;
      await quota.save();
    }
    res.json({ message: 'Quotas synchronisés avec les fichiers.' });
  } catch (err) {
    console.error('[BACK] Erreur sync quota:', err);
    res.status(500).json({ error: "Erreur lors de la synchronisation des quotas" });
  }
});

// GET /api/:userId (doit être à la fin)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const quota = await Quota.findOne({ where: { user_id: userId } });
  if (!quota) return res.status(404).json({ error: 'Quota non trouvé' });
  res.json(quota);
});



module.exports = router;
