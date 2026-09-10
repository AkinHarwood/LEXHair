const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { get, run, transaction } = require("../db");
const { signToken, authenticate } = require("../lib/auth");

const router = express.Router();

// Look up an invite by token (used by the "accept invite" screen to show
// the invitee's name/email before they set a password).
router.get("/invites/:token", (req, res) => {
  const invite = get("SELECT * FROM invites WHERE token = ?", [req.params.token]);
  if (!invite || invite.acceptedAt || new Date(invite.expiresAt) < new Date()) {
    return res.status(404).json({ error: "This invite is invalid or has expired" });
  }
  res.json({ email: invite.email, name: invite.name });
});

router.post("/accept-invite", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) {
    return res.status(400).json({ error: "A token and an 8+ character password are required" });
  }

  const invite = get("SELECT * FROM invites WHERE token = ?", [token]);
  if (!invite || invite.acceptedAt || new Date(invite.expiresAt) < new Date()) {
    return res.status(404).json({ error: "This invite is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const user = transaction(() => {
    const existing = get("SELECT * FROM users WHERE email = ?", [invite.email]);
    let u;
    if (existing) {
      run("UPDATE users SET password_hash = ?, status = 'ACTIVE', name = ?, role = ? WHERE id = ?", [
        passwordHash,
        invite.name,
        invite.role,
        existing.id,
      ]);
      u = get("SELECT * FROM users WHERE id = ?", [existing.id]);
    } else {
      const id = crypto.randomUUID();
      run(
        "INSERT INTO users (id, email, name, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)",
        [id, invite.email, invite.name, passwordHash, invite.role, now]
      );
      u = get("SELECT * FROM users WHERE id = ?", [id]);
    }
    run("UPDATE invites SET accepted_at = ? WHERE id = ?", [now, invite.id]);
    return u;
  });

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = get("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }
  if (user.status !== "ACTIVE") {
    return res.status(403).json({ error: "This account is not active. Contact your admin." });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Incorrect email or password" });

  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
}

module.exports = router;
