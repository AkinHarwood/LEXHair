const express = require("express");
const crypto = require("crypto");
const { get, all, run } = require("../db");
const { authenticate, requireAdmin } = require("../lib/auth");

const router = express.Router();
router.use(authenticate, requireAdmin);

const INVITE_TTL_DAYS = 14;

// --- Staff & invites -------------------------------------------------

router.get("/users", (req, res) => {
  const users = all(
    "SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at ASC"
  );
  res.json({ users });
});

router.get("/invites", (req, res) => {
  const invites = all(
    "SELECT * FROM invites WHERE accepted_at IS NULL ORDER BY created_at DESC"
  );
  res.json({ invites });
});

router.post("/invites", (req, res) => {
  const { email, name, role } = req.body;
  if (!email || !name) return res.status(400).json({ error: "Name and email are required" });

  const normalizedEmail = email.toLowerCase().trim();
  const existing = get("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
  if (existing && existing.status === "ACTIVE") {
    return res.status(409).json({ error: "This person already has an active account" });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const finalRole = role === "ADMIN" ? "ADMIN" : "MEMBER";

  run(
    "INSERT INTO invites (id, email, name, token, role, invited_by_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [id, normalizedEmail, name, token, finalRole, req.user.id, now.toISOString(), expiresAt]
  );

  const invite = get("SELECT * FROM invites WHERE id = ?", [id]);
  const base = process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
  res.status(201).json({ invite, inviteLink: `${base}/accept-invite?token=${token}` });
});

router.delete("/invites/:id", (req, res) => {
  run("DELETE FROM invites WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

router.patch("/users/:id/status", (req, res) => {
  const { status } = req.body;
  if (!["ACTIVE", "DEACTIVATED"].includes(status)) {
    return res.status(400).json({ error: "Status must be ACTIVE or DEACTIVATED" });
  }
  if (req.params.id === req.user.id && status === "DEACTIVATED") {
    return res.status(400).json({ error: "You can't deactivate your own account" });
  }
  run("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
  res.json({ user: get("SELECT id, email, name, role, status FROM users WHERE id = ?", [req.params.id]) });
});

router.patch("/users/:id/role", (req, res) => {
  const { role } = req.body;
  if (!["ADMIN", "MEMBER"].includes(role)) {
    return res.status(400).json({ error: "Role must be ADMIN or MEMBER" });
  }
  run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
  res.json({ user: get("SELECT id, email, name, role, status FROM users WHERE id = ?", [req.params.id]) });
});

// --- Channel administration -------------------------------------------

router.post("/channels", (req, res) => {
  const { name, description, memberIds } = req.body;
  if (!name) return res.status(400).json({ error: "Channel name is required" });

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
  if (get("SELECT id FROM channels WHERE name = ?", [slug])) {
    return res.status(409).json({ error: "A channel with this name already exists" });
  }

  const id = crypto.randomUUID();
  run("INSERT INTO channels (id, name, description) VALUES (?, ?, ?)", [id, slug, description || null]);

  const memberSet = new Set([req.user.id, ...(memberIds || [])]);
  for (const userId of memberSet) {
    run("INSERT INTO channel_members (id, channel_id, user_id) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      id,
      userId,
    ]);
  }

  const channel = get("SELECT * FROM channels WHERE id = ?", [id]);
  res.status(201).json({ channel });
});

router.patch("/channels/:id/archive", (req, res) => {
  run("UPDATE channels SET is_archived = ? WHERE id = ?", [req.body.isArchived ? 1 : 0, req.params.id]);
  res.json({ channel: get("SELECT * FROM channels WHERE id = ?", [req.params.id]) });
});

router.post("/channels/:id/members", (req, res) => {
  const { userId } = req.body;
  const existing = get("SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?", [
    req.params.id,
    userId,
  ]);
  if (!existing) {
    run("INSERT INTO channel_members (id, channel_id, user_id) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      req.params.id,
      userId,
    ]);
  }
  res.status(204).end();
});

router.delete("/channels/:id/members/:userId", (req, res) => {
  run("DELETE FROM channel_members WHERE channel_id = ? AND user_id = ?", [req.params.id, req.params.userId]);
  res.status(204).end();
});

module.exports = router;
