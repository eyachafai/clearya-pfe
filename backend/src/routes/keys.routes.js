const express = require("express");
const { generateRSAKeyPair } = require("../utils/keygen");

const router = express.Router();
const keys = generateRSAKeyPair();

router.get("/public-key", (req, res) => {
   res.json({ publicKey: keys.publicKey });
});

module.exports = router;