const { generateKeyPairSync } = require("crypto");
const fs = require("fs");
const path = require("path");

// Chemins des fichiers PEM
const keysDir = path.join(__dirname, "../keys");
if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir);

const privateKeyPath = path.join(keysDir, "private.pem");
const publicKeyPath = path.join(keysDir, "public.pem");

// Générer les clés seulement si elles n’existent pas
function generateRSAKeyPair() {
  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    console.log("Clés déjà existantes.");
    return {
      publicKey: fs.readFileSync(publicKeyPath, "utf8"),
      privateKey: fs.readFileSync(privateKeyPath, "utf8"),
    };
  }

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);

  console.log("Clés générées et sauvegardées dans keys/");
  return { publicKey, privateKey };
}

module.exports = { generateRSAKeyPair, privateKeyPath, publicKeyPath };
