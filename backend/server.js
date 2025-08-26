require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require("http");
const { Server } = require("socket.io");

const { initSession, initKeycloakMiddleware, keycloak } = require('./src/config/keycloak.config');
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/routesAdmin');
const pool = require('./src/config/db');
const testKeycloakRoutes = require('./src/routes/testkeycloak');
const messagesRoutes = require('./src/routes/messages.routes');

const app = express();
// ➤ Sessions + Keycloak   /// il faut avant le middleware
initSession(app);
initKeycloakMiddleware(app);

app.use(keycloak.middleware());

// ➤ Middleware JSON
app.use(express.json());

// ➤ CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // <-- Ajoute PATCH ici
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Créer un serveur HTTP
const server = http.createServer(app);

// Initialiser Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // ton frontend React
    methods: ["GET", "POST"]
  }
});

// Gestion des événements Socket.IO
io.on("connection", (socket) => {
  console.log("Un utilisateur connecté :", socket.id);

  // Écouter un message venant du client
  socket.on("sendMessage", (data) => {
    console.log("Message reçu:", data);

    // Réémettre à tous les clients connectés
    io.emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
  });
});

// ➤ Routes protégées
app.use('/api/auth', authRoutes);
// app.use('/api/admin', keycloak.protect('realm:admin'), adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/testKeycloakRoutes', testKeycloakRoutes);
app.use('/api/messages', (req, res, next) => {
  console.log("API /api/messages route called:", req.method, req.url);
  next();
});
app.use('/api/messages', messagesRoutes);

app.use((req, res, next) => {
  console.log("404 middleware catch:", req.method, req.url);
  next();
});

// ➤ Route test backend
app.get('/', (req, res) => {
  console.log('Backend Clearya is running')
  res.send('✅ Backend Clearya is running');
});

// ➤ Fonction de test DB
/*async function testDbConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connecté');
  } catch (err) {
    console.error('❌ Erreur DB:', err);
    process.exit(1);
  }
}*/

//testDbConnection();  // ✅ N'oublie de l'appeler pour tester la DB au démarrage

// ➤ Route test protégée Keycloak (exemple)
app.get('/api/admin/test', keycloak.protect('realm:admin'), (req, res) => {
  res.send('✅ Accès admin autorisé');
});

// ➤ Gestion erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// ➤ Démarrage du serveur
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("FRONTEND_URL ", process.env.FRONTEND_URL)
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});