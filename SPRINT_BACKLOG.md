# 📋 BACKLOG SPRINT FINAL - Chat Sécurisé avec Chiffrement ECDH
## Système de Messaging en Temps Réel avec Socket.io

---

## 📊 Vue d'ensemble des User Stories

| ID | User Story | Priorité | Statut |
|---|---|---|---|
| US2.10 | Envoyer/recevoir des messages texte chiffrés | ⭐⭐⭐ | ✅ Fait |
| US2.11 | Voir l'historique des messages | ⭐⭐ | ✅ Fait |
| US2.12 | Envoyer/recevoir des fichiers, images et audio chiffrés | ⭐⭐⭐ | ✅ Fait |
| US2.13 | Afficher un badge pour les messages non lus | ⭐⭐ | 🔄 À compléter |
| US2.14 | Recevoir des notifications en temps réel | ⭐⭐ | ✅ Fait |
| US2.15 | Pouvoir activer/désactiver les notifications | ⭐⭐ | 🔄 À compléter |
| US2.16 | Envoyer des notifications globales (Admin) | ⭐⭐⭐ | 🔄 À compléter |

---

## US2.10 ✅ COMPLÉTÉ
### Envoyer et recevoir des messages texte chiffrés dans les groupes

**Qu'est-ce que c'est ?**
L'utilisateur peut taper un message, qui est automatiquement chiffré et envoyé au groupe. Les autres membres reçoivent le message en temps réel et voient le texte déchiffré.


**Comment ça marche ?**
- Le message est chiffré côté client avec la clé du groupe (ECDH + AES-GCM)
- Envoyé au serveur via l'API REST
- Le serveur émet le message à tous les membres du groupe via Socket.io
- Chaque utilisateur déchiffre le message à la réception

**Tâches complétées** :
✅ Socket.io configuré pour l'envoi/réception en temps réel
✅ API `POST /api/messages/messages` qui accepte les messages chiffrés
✅ Interface React dans `ChatPage.tsx` pour saisir et afficher les messages
✅ Déchiffrement automatique des messages reçus

**Fichiers impliqués** :
- Backend : `src/routes/messages.routes.js`
- Frontend : `src/components/chat/ChatPage.tsx`
- Frontend : `src/services/chatService.ts`
- Frontend : `src/utils/groupKeyManager.ts`

---

## US2.11 ✅ COMPLÉTÉ
### Voir l'historique des messages d'une conversation

**Qu'est-ce que c'est ?**
Quand l'utilisateur ouvre un groupe, il voit tous les messages précédents classés du plus ancien au plus récent.

**Comment ça marche ?**
- Appel API pour charger tous les messages
- Les messages chiffrés sont stockés en base avec leur IV
- Frontend les déchiffre et les affiche avec le nom et l'heure

**Tâches complétées** :
✅ Route `GET /api/messages/conversations/:id/messages` 
✅ Messages triés chronologiquement
✅ Affichage avec auteur et timestamp

**Fichiers impliqués** :
- Backend : `src/routes/messages.routes.js`
- Frontend : `src/components/chat/ChatPage.tsx`
- Frontend : `src/services/decryptionService.ts`

---

## US2.12 ✅ COMPLÉTÉ
### Envoyer et recevoir des fichiers, images et messages audio chiffrés

**Qu'est-ce que c'est ?**
L'utilisateur peut envoyer des fichiers (documents, images, vidéos, messages vocaux), tous chiffrés avec la clé du groupe.

**Comment ça marche ?**
1. **Fichiers et images** : Upload en chunks (par morceaux) pour les gros fichiers
   - Chiffrement côté client
   - Stockage temporaire en `/temp`, puis déplacement en `/uploads`
   - Affichage inline pour les images, lien de téléchargement pour documents

2. **Messages vocaux** : Enregistrement audio directement depuis le navigateur
   - Chiffrement et envoi via `/send-audio`
   - Lecteur audio chiffré côté client avec déchiffrement RT

**Tâches complétées** :
✅ Upload chunké pour éviter les timeouts sur les gros fichiers
✅ Chiffrement AES-CBC côté client
✅ Lecteur audio intégré pour les messages vocaux
✅ Affichage des images intégrées dans le chat
✅ Lien de téléchargement pour documents

**Fichiers impliqués** :
- Backend : `src/routes/messages.routes.js` (POST /upload, POST /send-audio)
- Frontend : `src/components/chat/ChatPage.tsx`
- Frontend : `src/utils/chiffrage.ts`

---

## US2.13 🔄 À COMPLÉTER
### Afficher un badge avec le nombre de messages non lus

**Qu'est-ce que c'est ?**
Dans la liste des groupes, à côté du nom du groupe, un petit badge rouge montre le nombre de messages non lus.

**État actuel** :
✅ Marquage automatique des messages comme lus (`PATCH /messages/:id/read`)
✅ UI du badge en place dans `MesGroupesChatPage.tsx`
❌ Endpoint pour compter les non-lus manquant au backend
❌ Synchronisation du comptage avec les nouveaux messages

**À faire (priorité moyenne)** :

1. **Ajouter l'endpoint backend** dans `src/routes/messages.routes.js` :
```javascript
router.get('/conversations/:conversation_id/unread-count', async (req, res) => {
  const { conversation_id } = req.params;
  const count = await Message.count({ 
    where: { conversation_id, is_read: false } 
  });
  res.json({ unread_count: count });
});
```

2. **Mettre à jour le frontend** pour appeler cet endpoint
3. **Ajouter un listener Socket.io** pour mettre à jour le badge en temps réel

**Durée estimée** : 1-2 jours

---

## US2.14 ✅ COMPLÉTÉ
### Recevoir des notifications en temps réel pour les nouveaux messages

**Qu'est-ce que c'est ?**
Quand quelqu'un envoie un message dans un groupe, tous les autres membres reçoivent une notification toast en haut à droite.

**Comment ça marche ?**
- Le serveur émet un event Socket.io `notification` 
- Le frontend affiche un toast avec le titre et le message
- Le toast disparaît automatiquement après 5 secondes

**Tâches complétées** :
✅ Émission Socket.io sur les rooms du groupe
✅ Composant Toast React
✅ Fermeture automatique après 5 secondes

**Fichiers impliqués** :
- Backend : `src/routes/messages.routes.js`
- Frontend : `src/components/NotificationsListener.tsx`
- Frontend : `src/socket.ts`

---

## US2.15 🔄 À COMPLÉTER
### Pouvoir activer ou désactiver les notifications

**Qu'est-ce que c'est ?**
L'utilisateur peut cliquer sur une icône cloche pour désactiver les notifications. Quand c'est désactivé, aucun toast n'apparaît.

**État actuel** :
✅ UI du toggle dans `src/components/user/notifications-user.tsx`
✅ Stockage en localStorage
❌ Stockage en base de données (table manquante)
❌ Synchronisation localStorage ↔ Backend
❌ Vérification du préférence avant d'envoyer les notifications

**À faire (priorité moyenne)** :

1. **Créer la table en base** :
```sql
CREATE TABLE user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES utilisateurs(id)
);
```

2. **Ajouter l'endpoint backend** pour mettre à jour les préférences :
```javascript
router.patch('/users/:id/preferences', async (req, res) => {
  const { notifications_enabled } = req.body;
  const pref = await UserPreference.findOrCreate({ 
    where: { user_id: req.params.id } 
  });
  await pref[0].update({ notifications_enabled });
  res.json(pref[0]);
});
```

3. **Mettre à jour le listener** pour vérifier la préférence avant d'afficher

**Durée estimée** : 1-2 jours

---

## US2.16 🔄 À COMPLÉTER
### Envoyer des notifications globales à tous les utilisateurs (Admin)

**Qu'est-ce que c'est ?**
Un administrateur peut composer une notification qui sera envoyée à TOUS les utilisateurs de l'application (pas juste un groupe).

**État actuel** :
✅ Interface admin dans `src/components/admin/notifications.tsx`
✅ API `POST /api/notifications/notifications` pour créer
✅ Historique des notifications envoyées
❌ Vérification du rôle admin (pas de protection Keycloak)
❌ Affichage des notifications globales chez les utilisateurs
❌ Mise à jour du listener pour recevoir les notifications globales

**À faire (priorité haute)** :

1. **Ajouter la protection admin** dans `src/routes/notification.routes.js` :
```javascript
router.post('/notifications', keycloak.protect('admin'), async (req, res) => {
  // ... code existant ...
  const notif = await Notifications.create({ titre, message, envoye_par, type });
  
  // Envoyer à TOUS les utilisateurs via Socket.io
  if (req.app.get('io')) {
    req.app.get('io').emit('globalNotification', notif);
  }
  
  res.status(201).json(notif);
});
```

2. **Ajouter un listener** pour les notifications globales dans `NotificationsListener.tsx`
3. **Afficher les notifications** dans le composant `notifications-user.tsx`

**Durée estimée** : 2-3 jours

---

## 📊 RÉSUMÉ DU SPRINT

### ✅ Déjà fait (70%)
- ✅ Messages texte chiffrés ECDH + AES-CBC
- ✅ Upload fichiers/images/audio en chunks
- ✅ Notifications toast en temps réel
- ✅ Historique des messages
- ✅ Déchiffrement automatique

### 🔄 À compléter (30%)
- 🔄 **US2.13** : Badge des non-lus (1-2 jours)
- 🔄 **US2.15** : Préférences notifications (1-2 jours)
- 🔄 **US2.16** : Notifications admin globales (2-3 jours)

**Charge totale restante** : ~5-7 jours de développement

---

## 🔐 Technologie de Chiffrement Utilisée

**ECDH (Elliptic Curve Diffie-Hellman) + AES-CBC**

C'est quoi ?
- **ECDH** : Permet à deux utilisateurs d'échanger une clé secrète de manière sécurisée
- **AES-CBC** : Chiffre les messages avec cette clé secrète
- **HKDF** : Dérive une clé pour le groupe à partir du secret partagé

Avantages :
- End-to-end : Personne sur le serveur ne peut lire les messages
- Moderne et performant
- Support des fichiers et images
- Scalable pour les groupes

---

## 📝 NOTES IMPORTANTES

⚠️ **Performance** : Les clés sont mises en cache pour éviter les recalculs
⚠️ **Sécurité** : Toujours vérifier les rôles avant de permettre certaines actions
⚠️ **Stockage** : Les préférences utilisateur doivent être en base ET en localStorage
⚠️ **Socket.io** : Bien gérer les "rooms" (groupes de connexions) pour ne pas surcharger le serveur