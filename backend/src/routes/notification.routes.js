const express = require('express');
const router = express.Router();
const { Notifications, Utilisateur } = require('../models');

// GET toutes les notifications (avec auteur)
router.get('/notifications', async (req, res) => {
    try {
        const notifs = await Notifications.findAll({
            include: [{ model: Utilisateur, as: 'auteur', attributes: ['id', 'username', 'email'] }],
            order: [['date', 'DESC']]
        });
        res.json(notifs);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET une notification par id
router.get('/notification/:id', async (req, res) => {
    try {
        const notif = await Notifications.findByPk(req.params.id, {
            include: [{ model: Utilisateur, as: 'auteur', attributes: ['id', 'username', 'email'] }]
        });
        if (!notif) return res.status(404).json({ error: 'Notification non trouvée' });
        res.json(notif);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST créer une notification
router.post('/notifications', async (req, res) => {
    const { titre, message, envoye_par, type } = req.body;
    if (!titre || !message || !envoye_par) {
        console.log('[NOTIF] Champs manquants:', req.body);
        return res.status(400).json({ error: 'Champs requis manquants' });
    }
    try {
        const notif = await Notifications.create({ titre, message, envoye_par, type });
        console.log('[NOTIF] Notification créée:', notif);
        // Recharge la notification avec l'auteur
        const notifWithAuthor = await Notifications.findByPk(notif.id, {
            include: [{ model: Utilisateur, as: 'auteur', attributes: ['id', 'username', 'email'] }]
        });
        if (req.app.get('io')) {
            console.log('[NOTIF] Emission socket.io de la notification:', notifWithAuthor);
            // Émettre à TOUS les clients (pour qu'ils reçoivent et décident s'ils l'affichent)
            req.app.get('io').emit('notification', notifWithAuthor);
        } else {
            console.log('[NOTIF] Pas de socket.io trouvé sur req.app');
        }
        res.status(201).json(notifWithAuthor);
    } catch (err) {
        console.error('[NOTIF] Erreur lors de la création:', err);
        res.status(500).json({ error: 'Erreur lors de la création' });
    }
});

// PUT modifier une notification
router.put('/notification/:id', async (req, res) => {
    try {
        const notif = await Notifications.findByPk(req.params.id);
        if (!notif) return res.status(404).json({ error: 'Notification non trouvée' });
        await notif.update(req.body);
        res.json(notif);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la modification' });
    }
});

// DELETE supprimer une notification
router.delete('/notification/:id', async (req, res) => {
    try {
        const notif = await Notifications.findByPk(req.params.id);
        if (!notif) return res.status(404).json({ error: 'Notification non trouvée' });
        await notif.destroy();
        res.json({ message: 'Notification supprimée' });
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// GET toutes les notifications envoyées par un admin
router.get('/by-admin/:adminId', async (req, res) => {
    try {
        const notifs = await Notifications.findAll({
            where: { envoye_par: req.params.adminId },
            include: [{ model: Utilisateur, as: 'auteur', attributes: ['id', 'username', 'email'] }],
            order: [['date', 'DESC']]
        });
        res.json(notifs);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST pour synchroniser l'état des notifications (enabled/disabled)
router.post('/toggle-status/:userId', async (req, res) => {
    const { disabled } = req.body;
    try {
        await Utilisateur.update(
            { notifications_disabled: disabled },
            { where: { id: req.params.userId } }
        );
        console.log(`[NOTIF] Notifications pour user ${req.params.userId} mises à ${disabled}`);
        res.json({ success: true, disabled });
    } catch (err) {
        console.error('[NOTIF] Erreur lors de la mise à jour:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
