const express = require('express');
const router = express.Router();
const sequelize = require('../config/db');
const models = require('../models');

// POST /api/crypto/ecdh-public-key - Publier la clé publique ECDH
router.post('/ecdh-public-key', async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: "Body manquant ou invalide" });
        }
        const { user_id, public_key } = req.body;
        console.log('📝 POST /ecdh-public-key reçu :', { user_id, public_key: public_key?.substring(0, 50) + '...' });
        console.log('🔍 models.UserECDHKey existe ?', !!models.UserECDHKey);
        console.log('🔍 models keys :', Object.keys(models));
        if (!user_id || !public_key) {
            return res.status(400).json({ error: 'user_id et public_key requis' });
        }
        if (!models.UserECDHKey) {
            return res.status(500).json({ error: 'UserECDHKey model not found' });
        }
        const [key, created] = await models.UserECDHKey.findOrCreate({
            where: { user_id },
            defaults: { public_key }
        });
        if (!created) {
            key.public_key = public_key;
            await key.save();
        }
        console.log('✅ Clé publique enregistrée pour user_id:', user_id);
        res.json({ success: true, public_key: key.public_key });
    } catch (err) {
        console.error('❌ Erreur POST /ecdh-public-key :', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/crypto/ecdh-public-key/:user_id - Récupérer la clé publique d'un utilisateur
router.get('/ecdh-public-key/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const key = await models.UserECDHKey.findOne({ where: { user_id } });
        if (!key) {
            return res.status(404).json({ error: "no key" });
        }
        if (!key) {
            return res.status(404).json({ error: 'Clé publique non trouvée' });
        }
        res.json({ public_key: key.public_key });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/crypto/group-keys - Publier la clé AES de groupe chiffrée
router.post('/group-keys', async (req, res) => {
    try {
        console.log("HEADERS:", req.headers);
        console.log("BODY:", req.body);

        if (!req.body) {
            return res.status(400).json({ error: "Body manquant" });
        }

        const {
            group_id,
            user_id,
            encrypted_group_key,
            iv,
            sender_public_key
        } = req.body;

        if (!group_id || !user_id || !encrypted_group_key || !iv || !sender_public_key) {
            return res.status(400).json({ error: 'Paramètres manquants' });
        }

        const key = await models.GroupKey.findOne({
            where: { group_id, user_id }
        });

        if (!key) {
            await models.GroupKey.create({
                group_id,
                user_id,
                encrypted_group_key,
                iv,
                sender_public_key
            });
        } else {
            await key.update({
                encrypted_group_key,
                iv,
                sender_public_key
            });
        }

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/crypto/group-keys/:group_id - Récupérer la clé AES chiffrée
router.get('/group-keys/:group_id/:user_id', async (req, res) => {
    try {
        const { group_id, user_id } = req.params;
        const key = await models.GroupKey.findOne({
            where: { group_id, user_id }
        });
        if (!key) {
            return res.status(404).json({ error: 'Clé de groupe non trouvée' });
        }
        res.json({
            encrypted_group_key: key.encrypted_group_key,
            iv: key.iv,
            sender_public_key: key.sender_public_key
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/groupes/:group_id/membres - Récupérer les membres d'un groupe
router.get('/groupes/:group_id/membres', async (req, res) => {
    try {
        const { group_id } = req.params;

        const groupeUtilisateurs = await models.GroupeUtilisateur.findAll({
            where: { groupe_id: group_id },
            include: [{
                model: models.Utilisateur,
                attributes: ['id', 'username', 'email']
            }]
        });

        const members = groupeUtilisateurs.map(gu => ({
            id: gu.Utilisateur.id,
            username: gu.Utilisateur.username,
            email: gu.Utilisateur.email
        }));

        res.json(members);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

//DELETE /api/crypto/group-keys/:group_id
router.delete('/group-keys/:group_id', async (req, res) => {
    try {
        await models.GroupKey.destroy({ where: { group_id: req.params.group_id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur suppression group_keys', details: err.message });
    }
});

router.get('/group-keys/group/:group_id', async (req, res) => {
    try {
        const key = await models.GroupKey.findOne({
            where: { group_id: req.params.group_id }
        });

        if (!key) {
            return res.status(404).json({ error: 'No group key' });
        }

        res.json({
            exists: true
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
