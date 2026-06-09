export const requireRole = (roles) => (req, res, next) => {
  const userRoles = req.user.roles;

  const allowed = roles.some(r => userRoles.includes(r));
  if (!allowed) {
    return res.status(403).json({ error: "forbidden" });
  }

  next();
};