const express = require("express");
const { get, all } = require("../db");
const { authenticate } = require("../lib/auth");
const { hydrateMessages } = require("../lib/hydrate");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const channels = all(
    `SELECT c.* FROM channels c
     JOIN channel_members cm ON cm.channel_id = c.id
     WHERE cm.user_id = ? AND c.is_archived = 0
     ORDER BY c.name ASC`,
    [req.user.id]
  );
  for (const channel of channels) {
    channel.members = all(
      `SELECT u.id, u.name FROM channel_members cm JOIN users u ON u.id = cm.user_id WHERE cm.channel_id = ?`,
      [channel.id]
    );
  }
  res.json({ channels });
});

router.get("/:id/messages", (req, res) => {
  const { id } = req.params;
  const member = get("SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?", [id, req.user.id]);
  if (!member) {
    return res.status(403).json({ error: "Not a member of this channel" });
  }
  const before = req.query.before || new Date().toISOString();
  const messages = all(
    `SELECT m.*, u.name as author_name FROM messages m
     JOIN users u ON u.id = m.author_id
     WHERE m.channel_id = ? AND m.deleted_at IS NULL AND m.created_at < ?
     ORDER BY m.created_at DESC LIMIT 50`,
    [id, before]
  );
  res.json({ messages: hydrateMessages(messages).reverse() });
});

module.exports = router;
