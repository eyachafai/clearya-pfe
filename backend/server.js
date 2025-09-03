require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require('body-parser'); // Body-parser to parse incoming request bodies
const fs = require('fs'); // File system to handle file operations
const md5 = require('md5'); // MD5 to generate hash
const path = require('path');

const { initSession, initKeycloakMiddleware, keycloak } = require('./src/config/keycloak.config');
const authRoutes = require('./src/routes/auth.routes');
const keysRouter = require('./src/routes/keys.routes');

const adminRoutes = require('./src/routes/routesAdmin');
const pool = require('./src/config/db');
const testKeycloakRoutes = require('./src/routes/testkeycloak');
const messagesRoutes = require('./src/routes/messages.routes');
const projetRoutes = require('./src/routes/projet.routes');

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

// Connecte socket.io à la route messages
messagesRoutes.setSocketIo(io);

// Gestion des événements Socket.IO
io.on("connection", (socket) => {
  console.log("Un utilisateur connecté :", socket.id);

  socket.on("disconnect", () => {
    console.log("Utilisateur déconnecté :", socket.id);
  });
});

// Ce middleware doit être AVANT tes routes API
app.use('/uploads', (req, res, next) => {
  console.log('Requête reçue sur /uploads:', req.url);
  next();
}, express.static(path.join(__dirname, 'uploads'))); // <-- 'uploads' doit être au même niveau que server.js

// Parse incoming raw data
app.use(bodyParser.raw({
  type: 'application/octet-stream',
  limit: '100mb'
}));

// ➤ Routes protégées
app.use('/api/auth', authRoutes);
app.use('/api/keys', keysRouter);

// app.use('/api/admin', keycloak.protect('realm:admin'), adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/testKeycloakRoutes', testKeycloakRoutes);
app.use('/api/messages', (req, res, next) => {
  console.log("API /api/messages route called:", req.method, req.url);
  next();
});
app.use('/api/messages', messagesRoutes);
app.use('/api', projetRoutes);

app.use((req, res, next) => {
  console.log("404 middleware catch:", req.method, req.url);
  next();
});

// ➤ Route test backend
app.get('/', (req, res) => {
  console.log('Backend Clearya is running')
  res.send('✅ Backend Clearya is running');
});


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