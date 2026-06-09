const express = require('express');
const router = express.Router();
const { Ticket } = require('../models');

// ...existing routes...

router.patch('/tickets/:id/etat', async (req, res) => {
  const { id } = req.params;
  const { etat, utilisateur_id } = req.body;
  console.log('PATCH request:', { id, etat, utilisateur_id });


  
  const allowedEtats = ["nouveau", "en cours", "resolu", "ferme"];
  if (!allowedEtats.includes(etat)) {
    console.log('Etat invalide:', etat);
    return res.status(400).json({ error: "Etat invalide" });
  }

  try {
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      console.log('Ticket non trouvé:', id);
      return res.status(404).json({ error: "Ticket non trouvé" });
    }

    console.log('Ticket trouvé:', ticket);
    if (Number(ticket.assignee_id) !== Number(utilisateur_id)) {
      console.log('Utilisateur non autorisé:', { assignee_id: ticket.assignee_id, utilisateur_id });
      return res.status(403).json({ error: "Vous n'êtes pas autorisé à changer cet état" });
    }

    ticket.etat = etat;
    if (etat === "resolu" || etat === "ferme") {
      ticket.resolved_at = new Date();
    }

    await ticket.save();
    console.log('Etat changé avec succès:', ticket);
    res.json(ticket);
  } catch (err) {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

module.exports = router;