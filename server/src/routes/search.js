const express = require("express");
const { all } = require("../db");
const { authenticate } = require("../lib/auth");

const router = express.Router();
router.use(authenticate);

// Filters in JS over the requesting user's ~500 most recent accessible
// messages — simple, case-insensitive, and plenty fast for a 15-25 person
// team. Swap for SQLite FTS5 if history grows much larger.
router.get("/", (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 2) return res.json({ results: [] });

  const myChannelIds = all("SELECT channel_id FROM channel_members WHERE user_id = ?", [req.user.id]).map(
    (r) => r.channelId
  );
  const myConversationIds = all(
    "SELECT conversation_id FROM conversation_members WHERE user_id = ?",
    [req.user.id]
  ).map((r) => r.conversationId);

  if (!myChannelIds.length && !myConversationIds.length) return res.json({ results: [] });

  const channelPlaceholders = myChannelIds.map(() => "?").join(",") || "NULL";
  const conversationPlaceholders = myConversationIds.map(() => "?").join(",") || "NULL";

  const candidates = all(
    `SELECT m.*, u.name as author_name, ch.name as channel_name, ch.id as channel_id2,
            conv.id as conversation_id2, conv.is_group as conversation_is_group
     FROM messages m
     JOIN users u ON u.id = m.author_id
     LEFT JOIN channels ch ON ch.id = m.channel_id
     LEFT JOIN conversations conv ON conv.id = m.conversation_id
     WHERE m.deleted_at IS NULL
       AND (m.channel_id IN (${channelPlaceholders}) OR m.conversation_id IN (${conversationPlaceholders}))
     ORDER BY m.created_at DESC LIMIT 500`,
    [...myChannelIds, ...myConversationIds]
  );

  const needle = q.toLowerCase();
  const results = candidates
    .filter((m) => m.body.toLowerCase().includes(needle))
    .slice(0, 30)
    .map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      author: { id: m.authorId, name: m.authorName },
      channel: m.channelId ? { id: m.channelId, name: m.channelName } : null,
      conversation: m.conversationId ? { id: m.conversationId, isGroup: !!m.conversationIsGroup } : null,
    }));

  res.json({ results });
});

module.exports = router;
