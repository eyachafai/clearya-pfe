# Backlog - Système de Messaging et Notifications (Chat Sécurisé)
## Architecture : ECDH + AES-CBC pour le chiffrement E2E

---

## 📊 Tableau récapitulatif

| User Story ID | Description | Tâches techniques principales | Priorité | Statut |
|---|---|---|---|---|
| US2.1 | Envoyer/recevoir des messages texte chiffrés dans un groupe | Socket.io RT + API POST /messages + ECDH+AES-CBC | +++ | ✅ Implémenté |
| US2.2 | Voir l'historique des messages d'un groupe | API GET /conversations/:id/messages + déchiffrement | ++ | ✅ Implémenté |
| US2.3 | Envoyer/recevoir fichiers & images chiffrés | Upload chunké POST /upload + AES-CBC + socket.io | +++ | ✅ Implémenté |
| US2.4 | Envoyer/recevoir messages audio chiffrés | POST /send-audio + AES-CBC + socket.io | +++ | ✅ Implémenté |
| US2.5 | Badge messages non lus par groupe | Endpoint GET /conversations/:id/unread-count | ++ | 🔄 Partiellement |
| US2.6 | Notifications RT en temps réel | Socket.io notification + NotificationsListener.tsx | ++ | ✅ Implémenté |
| US2.7 | Activer/désactiver notifications | Table user_preferences + PATCH /users/:id/preferences | ++ | ❌ À faire |
| US2.8 | Admin : notifications globales | POST /admin/broadcast-notification + socket.io | +++ | ❌ À faire |
| US2.9 | Gérer les clés ECDH de groupe | Distribution + rotation des clés | +++ | 🔄 Partiellement |
| US2.10 | Créer conversation pour un groupe | POST /conversations + génération clé de groupe | ++ | ✅ Implémenté |
| US2.11 | Éditer/supprimer messages | PUT/DELETE /messages/:id + socket.io | + | ❌ À faire |
| US2.12 | Ajouter réactions (emoji) | Table message_reactions + socket.io | + | ❌ À faire |
| US2.13 | Épingler messages importants | Champ is_pinned + PATCH /messages/:id/pin | + | ❌ À faire |
| US2.14 | Chercher dans l'historique | GET /conversations/:id/search?q= | + | ❌ À faire |

---

## 📝 Détail des User Stories

### US2.1 ✅ IMPLÉMENTÉ
**En tant qu'utilisateur, je veux envoyer et recevoir des messages texte chiffrés dans un groupe**

**Tâches techniques** :
- ✅ Intégration socket.io via `setSocketIo()` pour l'envoi/réception en temps réel
- ✅ API endpoint `POST /api/messages/messages` avec support chiffrement ECDH + AES-CBC
- ✅ Stockage des messages dans la base de donnee : `{ contenu, ciphertext, iv }`
- ✅ Émission socket `notification` sur `room_groupe_{groupe_id}`
- ✅ Frontend : saisie via `ChatPage.tsx` + chiffrement via `groupKeyManager.ts`

**Endpoints** :
- `POST /api/messages/messages` — Envoyer un message
- `POST /api/messages/messages/realtime` — Version temps réel avec axios interne

**Priorité : +++**
**Statut : ✅ Complet**

---

### US2.2 ✅ IMPLÉMENTÉ
**En tant qu'utilisateur, je veux voir l'historique des messages d'un groupe**

**Tâches techniques** :
- ✅ Route API `GET /api/messages/conversations/:conversation_id/messages`
- ✅ Include Utilisateur avec attributs [id, username, email]
- ✅ Tri ASC par date_envoi
- ✅ Récupération des messages avec ciphertext + iv pour déchiffrement client

**Endpoints** :
- `GET /api/messages/conversations/:conversation_id/messages` — Récupérer l'historique
- `GET /api/messages/conversations/:conversation_id/messages/proxy` — Version proxy

**Frontend** :
- Affichage dans `ChatPage.tsx`
- Déchiffrement automatique via `decryptionService.ts` + `groupKeyManager.ts`

**Priorité : ++**
**Statut : ✅ Complet**

---

### US2.3 ✅ IMPLÉMENTÉ
**En tant qu'utilisateur, je veux envoyer et recevoir des fichiers & images chiffrés**

**Tâches techniques** :
- ✅ Upload chunké via `POST /api/messages/upload`
- ✅ Paramètres : `name, currentChunkIndex, totalChunks, conversation_id, utilisateur_id, iv`
- ✅ Stockage temporaire en `/temp` avec md5
- ✅ Déplacement final vers `/uploads` après dernier chunk
- ✅ Création automatique du message type `"file"` avec IV
- ✅ Émission socket `receiveMessage` après upload complet

**Endpoints** :
- `POST /api/messages/upload` — Upload de fichier chunké
- `GET /uploads/:filename` — Téléchargement du fichier chiffré

**Frontend** :
- Chiffrement AES-CBC avant upload via `chiffrage.ts`
- Affichage des fichiers dans `ChatPage.tsx`
- Déchiffrement lors du téléchargement

**Priorité : +++**
**Statut : ✅ Complet**

---

### US2.4 ✅ IMPLÉMENTÉ
**En tant qu'utilisateur, je veux envoyer et recevoir des messages audio chiffrés**

**Tâches techniques** :
- ✅ Endpoint `POST /api/messages/send-audio` avec multer memory storage
- ✅ Paramètres : `conversation_id, utilisateur_id, iv` (en body formData)
- ✅ Stockage du fichier audio chiffré : `/uploads/audio_[timestamp].enc`
- ✅ Création du message type `"audio"` avec IV et ciphertext="encrypted"
- ✅ Émission socket `receiveMessage` pour diffusion RT

**Endpoints** :
- `POST /api/messages/send-audio` — Envoyer message audio chiffré
- `GET /uploads/audio_*.enc` — Télécharger audio chiffré

**Frontend** :
- Enregistrement audio via Web Audio API
- Chiffrement AES-CBC via `chiffrage.ts`
- Envoi avec IV
- Déchiffrement et lecture via `decryptionService.ts`

**Priorité : +++**
**Statut : ✅ Complet**

---

### US2.5 🔄 PARTIELLEMENT IMPLÉMENTÉ
**En tant qu'utilisateur, je veux voir un badge du nombre de messages non lus dans mes groupes**

**Tâches techniques** :
- ✅ Endpoint `PATCH /api/messages/messages/:id/read` — Marquer message comme lu
- ❌ Endpoint `GET /api/messages/conversations/:conversation_id/unread-count` — À créer
- ❌ Marquage automatique comme lu à l'ouverture d'une conversation
- ❌ Affichage du badge dans `GroupesSidebar.tsx`

**À implémenter** :
```javascript
// Backend : Route à ajouter
router.get('/conversations/:conversation_id/unread-count', async (req, res) => {
  const { conversation_id } = req.params;
  const count = await Message.count({ where: { conversation_id, is_read: false } });
  res.json({ unread_count: count });
});

// Frontend : Hook personnalisé pour les non-lus
const useUnreadCount = (conversationId) => {
  const [count, setCount] = useState(0);
  // Appel API + socket listener
};
```

**Priorité : ++**
**Statut : 🔄 À finir (40%)**

---

### US2.6 ✅ IMPLÉMENTÉ
**En tant qu'utilisateur, je veux recevoir des notifications en temps réel lors de nouveaux messages**

**Tâches techniques** :
- ✅ Émission socket `notification` sur `room_groupe_{groupe_id}` dans `POST /messages`
- ✅ Payload : `{ titre: "Nouveau message", message, date, auteur }`
- ✅ Frontend listener : `NotificationsListener.tsx`
- ✅ Affichage toast React

**Endpoints** :
- Emissions socket seulement (pas d'endpoint REST)

**Frontend** :
- Composant `NotificationsListener.tsx` écoute l'événement `notification`
- Affichage des toasts via bibliothèque (toast, notification, etc.)

**Priorité : ++**
**Statut : ✅ Complet**

---

### US2.7 ❌ À FAIRE
**En tant qu'utilisateur, je veux pouvoir activer ou désactiver les notifications**

**Tâches techniques** :
- ❌ Table `user_preferences` avec champs : `user_id, notifications_enabled`
- ❌ Endpoint `PATCH /api/users/:id/preferences` pour toggle
- ❌ Vérification du statut avant l'émission socket `notification`
- ❌ Frontend : Toggle dans `Profile.tsx` ou `EditProfile.tsx`

**À implémenter** :
```javascript
// Backend : Model UserPreference
const UserPreference = sequelize.define('UserPreference', {
  user_id: DataTypes.INTEGER,
  notifications_enabled: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Route
router.patch('/users/:id/preferences', async (req, res) => {
  const { notifications_enabled } = req.body;
  const pref = await UserPreference.findOrCreate({ where: { user_id: req.params.id } });
  await pref[0].update({ notifications_enabled });
  res.json(pref[0]);
});

// Avant émission socket
const userPref = await UserPreference.findOne({ where: { user_id: utilisateur_id } });
if (userPref?.notifications_enabled) {
  ioInstance.to(`room_groupe_${groupe_id}`).emit("notification", notif);
}
```

**Priorité : ++**
**Statut : ❌ À faire**

---

### US2.8 ❌ À FAIRE
**En tant qu'administrateur, je veux envoyer des notifications globales à tous les utilisateurs**

**Tâches techniques** :
- ❌ Endpoint `POST /api/admin/broadcast-notification` (protégé keycloak + rôle admin)
- ❌ Vérification permission via `keycloak.enforcer()`
- ❌ Émission socket `globalNotification` à TOUS les clients (pas de room filter)
- ❌ Table `global_notifications` pour historique
- ❌ Interface admin dans `AdminPage.tsx` ou `PrincipalPage.tsx`

**À implémenter** :
```javascript
// Backend : Route protégée
router.post('/admin/broadcast-notification', keycloak.protect('admin'), async (req, res) => {
  const { titre, message } = req.body;
  
  const notif = await GlobalNotification.create({ titre, message });
  
  if (ioInstance) {
    ioInstance.emit("globalNotification", {
      id: notif.id,
      titre,
      message,
      date: new Date(),
      type: 'admin'
    });
  }
  
  res.json(notif);
});
```

**Frontend** :
- Page d'envoi dans `PrincipalPage.tsx`
- Listener global dans `NotificationsListener.tsx`

**Priorité : +++**
**Statut : ❌ À faire**

---

### US2.9 🔄 PARTIELLEMENT IMPLÉMENTÉ
**En tant qu'utilisateur, je veux déchiffrer automatiquement les messages reçus (ECDH + AES-CBC)**

**Tâches techniques** :
- ✅ Service `decryptionService.ts` pour AES-CBC
- ✅ Gestion des clés ECDH via `groupKeyManager.ts` + `keyService.ts`
- ✅ Hook `useECDHKey()` pour génération des clés
- 🔄 À améliorer : Cache des clés dérivées pour performance
- 🔄 À améliorer : Distribution des clés publiques aux nouveaux membres

**Endpoints (legacy RSA - à supprimer)** :
- `POST /api/messages/decryption/decrypt` — Déchiffrement RSA+AES (ancien système)

**Frontend** :
- Déchiffrement automatique dans `ChatPage.tsx`
- Service `decryptionService.ts` utilise la clé de groupe dérivée

**Priorité : +++**
**Statut : 🔄 Fonctionnel (70%)**

---

### US2.10 ✅ IMPLÉMENTÉ
**En tant qu'utilisateur, je veux créer une conversation pour un groupe**

**Tâches techniques** :
- ✅ Endpoint `POST /api/messages/conversations`
- ✅ Vérification du groupe via `Groupe.findByPk()`
- ✅ Création/récupération de la conversation existante
- ✅ Génération du titre : `Groupe {groupe_id}`

**Endpoints** :
- `POST /api/messages/conversations` — Créer/récupérer conversation
- `POST /api/messages/conversations/proxy` — Version proxy

**Frontend** :
- Appel via `chatService.ts` lors de l'entrée dans `ChatPage.tsx`

**Priorité : ++**
**Statut : ✅ Complet**

---

### US2.11 🔄 PARTIELLEMENT IMPLÉMENTÉ
**En tant qu'utilisateur, je veux que les clés ECDH de groupe soient partagées de manière sécurisée**

**Tâches techniques** :
- ✅ Génération paires ECDH par utilisateur via `useECDHKey()`
- ✅ Dérivation clés de groupe via `groupKeyManager.ts`
- ✅ Stockage des clés publiques dans `keyService.ts`
- 🔄 À améliorer : Distribution des clés publiques aux nouveaux membres du groupe
- 🔄 À améliorer : Rotation des clés lors de changements de membres

**À implémenter** :
- Endpoint `POST /api/keys/distribute-group-key` — Distribution de la clé de groupe aux nouveaux membres
- Endpoint `PATCH /api/keys/rotate/:groupe_id` — Rotation des clés lors de changements

**Priorité : +++**
**Statut : 🔄 Partiellement (60%)**

---

### US2.11 ❌ À FAIRE
**En tant qu'utilisateur, je veux pouvoir éditer ou supprimer mes messages**

**Tâches techniques** :
- ❌ Endpoint `PUT /api/messages/messages/:id` pour édition
- ❌ Endpoint `DELETE /api/messages/messages/:id` pour suppression
- ❌ Vérification que l'utilisateur est bien l'auteur
- ❌ Émission socket `messageUpdated` / `messageDeleted`
- ❌ Frontend : Boutons d'édition/suppression dans `ChatPage.tsx`

**Priorité : +**
**Statut : ❌ À faire**

---

### US2.12 ❌ À FAIRE
**En tant qu'utilisateur, je veux ajouter des réactions (emoji) aux messages**

**Tâches techniques** :
- ❌ Table `message_reactions` : (id, message_id, utilisateur_id, emoji, created_at)
- ❌ Endpoint `POST /api/messages/messages/:id/reactions` pour ajouter
- ❌ Endpoint `DELETE /api/messages/messages/:id/reactions/:emoji` pour retirer
- ❌ Émission socket `reactionAdded` / `reactionRemoved`
- ❌ Frontend : Sélecteur d'emoji + affichage dans `ChatPage.tsx`

**Priorité : +**
**Statut : ❌ À faire**

---

### US2.13 ❌ À FAIRE
**En tant qu'utilisateur, je veux épingler des messages importants dans un groupe**

**Tâches techniques** :
- ❌ Champ `is_pinned` (boolean) dans modèle `Message`
- ❌ Endpoint `PATCH /api/messages/messages/:id/pin` pour épingler/dépingler
- ❌ Route `GET /api/messages/conversations/:id/pinned` pour récupérer les épinglés
- ❌ Affichage des épinglés en haut du chat

**Priorité : +**
**Statut : ❌ À faire**

---

### US2.14 ❌ À FAIRE
**En tant qu'utilisateur, je veux chercher dans l'historique des messages**

**Tâches techniques** :
- ❌ Endpoint `GET /api/messages/conversations/:conversation_id/search?q=...`
- ❌ Recherche full-text sur `contenu` (query LIKE ou trigram PostgreSQL)
- ❌ Pagination des résultats (limit, offset)
- ❌ Frontend : Barre de recherche + affichage résultats dans `ChatPage.tsx`

**Priorité : +**
**Statut : ❌ À faire**

---

## 🔐 Architecture de Chiffrement E2E

### Flux global : ECDH + AES-CBC

```
Utilisateur A                           Utilisateur B
  ├─ Clé ECDH privée (IndexedDB)        ├─ Clé ECDH privée (IndexedDB)
  └─ Clé ECDH publique (Backend)        └─ Clé ECDH publique (Backend)
           │                                    │
           └─────── ECDH Handshake ─────────────┘
                          │
                   Shared Secret (secret_ab)
                          │
           HKDF(secret_ab, groupe_id, context)
                          │
                    Group Key (groupKey)
                          │
        ┌──────────────────┴──────────────────┐
        │                                     │
    AES-CBC Encrypt                      AES-CBC Encrypt
   (message, groupKey, IV)              (message, groupKey, IV)
        │                                     │
      Ciphertext                          Ciphertext
        │                                     │
   Sent to Backend ─── Backend stores ─→ Retrieved by A
   (ciphertext + iv)      (ciphertext + iv)
```

### Implémentation actuelle

**Services** :
- `useECDHKey.ts` — Hook pour générer/récupérer clé ECDH
- `keyService.ts` — Service pour gérer les clés publiques
- `groupKeyManager.ts` — Gestion des clés de groupe dérivées
- `chiffrage.ts` — Chiffrement/déchiffrement AES-CBC
- `decryptionService.ts` — Service de déchiffrement pour messages reçus

**Modèle Message** :
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  utilisateur_id INTEGER NOT NULL,
  contenu VARCHAR(4000),           -- Placeholder si chiffré
  type VARCHAR(50) DEFAULT 'text', -- text, file, audio
  ciphertext TEXT,                 -- Message chiffré (base64)
  iv VARCHAR(32),                  -- Vecteur d'initialisation (hex)
  encryptedMessageData TEXT,       -- Legacy RSA (à supprimer)
  encryptedAESKeyData TEXT,        -- Legacy RSA (à supprimer)
  is_read BOOLEAN DEFAULT FALSE,
  date_envoi TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id)
);
```

---

## 📌 Notes techniques

### ✅ Déjà implémenté (60%)
- Messaging texte avec socket.io RT
- Upload fichiers/images chunké
- Messages audio
- Notifications RT
- Déchiffrement ECDH + AES-CBC
- Création conversations

### 🔄 Partiellement implémenté (20%)
- Badges non-lus (endpoint manquant)
- Gestion clés ECDH (rotation de clés manquante)

### ❌ À faire (20%)
- Préférences notifications
- Admin : broadcast notifications
- Édition/suppression messages
- Réactions emoji
- Épinglage messages
- Recherche dans historique

### ⚠️ Points d'attention
- **Legacy RSA** : Endpoint `/decryption/decrypt` utilise RSA (ancien système) — À supprimer
- **Performance** : Cacher les clés dérivées pour éviter recalculs constants
- **Scalabilité** : Socket.io avec room filtering fonctionne bien actuellement
- **Sécurité** : ECDH + HKDF + AES-CBC = standard moderne de chiffrement E2E

---

## 📊 Statut global

| Catégorie | Couverture | Note |
|---|---|---|
| **Implémenté** | 60% | Messaging, fichiers, audio, notifications de base |
| **Partiellement** | 20% | Badges non-lus, clés ECDH |
| **À faire** | 20% | Préférences, admin, réactions, recherche |

**Prochaines étapes recommandées** :
1. US2.5 : Finir les badges non-lus (1-2 jours)
2. US2.7 : Préférences notifications (1-2 jours)
3. US2.8 : Admin broadcast (2-3 jours)
4. US2.11 : Rotation clés ECDH (3-4 jours)
