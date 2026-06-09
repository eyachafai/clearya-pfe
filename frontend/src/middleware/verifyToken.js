// middlewares/verifyToken.js
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client = jwksClient({
  jwksUri: "http://localhost:8080/realms/myapp/protocol/openid-connect/certs"
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, getKey, {
    algorithms: ["RS256"]
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // 🔥 CENTRAL POINT
    req.user = {
      id: decoded.sub,
      username: decoded.preferred_username,
      roles: decoded.realm_access?.roles || [],
      clientRoles: decoded.resource_access?.myapp?.roles || [],
      email: decoded.email
    };

    next();
  });
};

module.exports = verifyToken;
