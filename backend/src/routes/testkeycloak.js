const express = require('express');
const router = express.Router();
const { keycloak } = require('../config/keycloak.config');

const USER_ROLE = process.env.USER_ROLE || 'myrealm';
const ADMIN_ROLE = process.env.ADMIN_ROLE || 'master';


function adminOnly(token, request) {
    return token.hasRole(`realm:${ADMIN_ROLE}`);
}

function isAuthenticated(token, request) {
    return token.hasRole(`realm:${ADMIN_ROLE}`) || token.hasRole(`realm:${USER_ROLE}`);
}

router.get('/public', (req, res) => {
  res.status(200).send({ message: "✅ Public endpoint working" });
});

router.get('/secured', keycloak.protect(), (req, res) => {
  res.status(200).send({ message: "🔒 Authenticated endpoint" });
});

router.get('/secured-admin', keycloak.protect('realm:admin'), (req, res) => {
  res.status(200).send({ message: "🛡️ Admin only endpoint" });
});

module.exports = router;
