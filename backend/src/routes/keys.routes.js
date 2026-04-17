const express = require("express");
const { generateRSAKeyPair } = require("../utils/keygen");

const router = express.Router();
const keys = generateRSAKeyPair();

router.get("/public-key", (req, res) => {
   res.json({ publicKey: keys.publicKey });
});

router.post('/savePublicKey', (req, res) => {
  console.log("[BACKEND] Clé publique reçue :", req.body.publicKey);
  // ...ton code de sauvegarde...
  res.status(200).json({ success: true });
});

module.exports = router;