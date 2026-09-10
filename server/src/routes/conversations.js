const express = require("express");
const crypto = require("crypto");
const { get, all, run } = require("../db");
const { authenticate } = require("../lib/auth");
const { hydrateMessages } = require("../lib/hydrate");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res) => {
  const conversations = all(
    `SELECT c.* FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = ?`,
    [req.user.id]
  );
  for (const conv of conversations) {
    conv.members = all(
      `SELECT u.id, u.name FROM conversation_members cm JOIN users u ON u.id = cm.user_id WHERE cm.conversation_id = ?`,
      [conv.id]
    );
    conv.lastMessage = get(
      `SELECT m.*, u.name as author_name FROM messages m JOIN users u ON u.id = m.author_id
       WHERE m.conversation_id = ? ORDER BY m.created_at DESC LIMIT 1`,
      [conv.id]
    );
  }
  res.json({ conversations });
});

// Create a DM (2 people) or group DM (3+), reusing an existing 1:1 thread
// between the same two people if one already exists.
router.post("/", (req, res) => {
  const { memberIds } = req.body;
  if (!Array.isArray(memberIds) || memberIds.length < 1) {
    return res.status(400).json({ error: "At least one other member is required" });
  }
  const allIds = [...new Set([req.user.id, ...memberIds])];

  if (allIds.length === 2) {
    const candidates = all(
      `SELECT conversation_id FROM conversation_members WHERE user_id = ?`,
      [allIds[0]]
    );
    for (const c of candidates) {
      const members = all("SELECT user_id FROM conversation_members WHERE conversation_id = ?", [
        c.conversationId,
      ]);
      const memberIdSet = new Set(members.map((m) => m.userId));
      const conv = get("SELECT * FROM conversations WHERE id = ?", [c.conversationId]);
      if (!conv.isGroup && memberIdSet.size === 2 && allIds.every((id) => memberIdSet.has(id))) {
        conv.members = all(
          `SELECT u.id, u.name FROM conversation_members cm JOIN users u ON u.id = cm.user_id WHERE cm.conversation_id = ?`,
          [conv.id]
        );
        return res.json({ conversation: conv });
      }
    }
  }

  const id = crypto.randomUUID();
  run("INSERT INTO conversations (id, is_group) VALUES (?, ?)", [id, allIds.length > 2 ? 1 : 0]);
  for (const userId of allIds) {
    run("INSERT INTO conversation_members (id, conversation_id, user_id) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      id,
      userId,
    ]);
  }
  const conversation = get("SELECT * FROM conversations WHERE id = ?", [id]);
  conversation.members = all(
    `SELECT u.id, u.name FROM conversation_members cm JOIN users u ON u.id = cm.user_id WHERE cm.conversation_id = ?`,
    [id]
  );
  res.status(201).json({ conversation });
});

router.get("/:id/messages", (req, res) => {
  const { id } = req.params;
  const member = get("SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?", [
    id,
    req.user.id,
  ]);
  if (!member) {
    return res.status(403).json({ error: "Not a member of this conversation" });
  }
  const before = req.query.before || new Date().toISOString();
  const messages = all(
    `SELECT m.*, u.name as author_name FROM messages m
     JOIN users u ON u.id = m.author_id
     WHERE m.conversation_id = ? AND m.deleted_at IS NULL AND m.created_at < ?
     ORDER BY m.created_at DESC LIMIT 50`,
    [id, before]
  );
  res.json({ messages: hydrateMessages(messages).reverse() });
});

module.exports = router;
