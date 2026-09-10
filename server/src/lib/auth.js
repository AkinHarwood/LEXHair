const jwt = require("jsonwebtoken");
const { get } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const TOKEN_TTL = "30d";

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Accepts a token via Authorization: Bearer <token> header OR ?token= query
// param, so it works uniformly for JSON APIs, sockets, and <img>/file URLs.
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const bearer = header && header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = bearer || req.query.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired session" });

  const user = get("SELECT * FROM users WHERE id = ?", [payload.sub]);
  if (!user || user.status !== "ACTIVE") {
    return res.status(401).json({ error: "Account not active" });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { signToken, verifyToken, authenticate, requireAdmin };
