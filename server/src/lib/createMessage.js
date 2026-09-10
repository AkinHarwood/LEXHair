const crypto = require("crypto");
const { get, all, run, transaction } = require("../db");
const { hydrateMessages } = require("./hydrate");

/**
 * Creates a message in a channel or conversation, validates the sender is a
 * member, records any attachments and @mentions, and returns the message
 * with everything the client needs to render it.
 */
function createMessage({ authorId, channelId, conversationId, body, attachments = [], mentionedUserIds = [] }) {
  if (!channelId && !conversationId) throw new Error("channelId or conversationId is required");
  if (!body || !body.trim()) throw new Error("Message body is required");

  if (channelId) {
    const member = get("SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?", [channelId, authorId]);
    if (!member) throw new Error("Not a member of this channel");
  } else {
    const member = get(
      "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
      [conversationId, authorId]
    );
    if (!member) throw new Error("Not a member of this conversation");
  }

  // Only mention users who actually belong to this channel/conversation.
  let validMentionIds = [];
  if (mentionedUserIds.length) {
    const scope = channelId
      ? all("SELECT user_id FROM channel_members WHERE channel_id = ?", [channelId])
      : all("SELECT user_id FROM conversation_members WHERE conversation_id = ?", [conversationId]);
    const memberIds = new Set(scope.map((m) => m.userId));
    validMentionIds = mentionedUserIds.filter((id) => memberIds.has(id));
  }

  const id = crypto.randomUUID();

  transaction(() => {
    run(
      "INSERT INTO messages (id, body, author_id, channel_id, conversation_id) VALUES (?, ?, ?, ?, ?)",
      [id, body.trim(), authorId, channelId || null, conversationId || null]
    );
    for (const a of attachments) {
      run(
        "INSERT INTO attachments (id, message_id, file_name, file_path, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), id, a.fileName, a.storedName, a.mimeType, a.size]
      );
    }
    for (const mentionedUserId of validMentionIds) {
      run("INSERT INTO mentions (id, message_id, mentioned_user_id) VALUES (?, ?, ?)", [
        crypto.randomUUID(),
        id,
        mentionedUserId,
      ]);
    }
  });

  const row = get(
    `SELECT m.*, u.name as author_name FROM messages m JOIN users u ON u.id = m.author_id WHERE m.id = ?`,
    [id]
  );
  return hydrateMessages([row])[0];
}

module.exports = { createMessage };
