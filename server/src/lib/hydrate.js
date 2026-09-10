const { all } = require("../db");

// Attaches author, attachments, and mentions to a list of raw message rows
// (as returned by a SELECT that joins users for author_name).
function hydrateMessages(messages) {
  return messages.map((m) => {
    m.author = { id: m.authorId, name: m.authorName };
    delete m.authorName;
    m.attachments = all("SELECT * FROM attachments WHERE message_id = ?", [m.id]);
    m.mentions = all(
      `SELECT mn.mentioned_user_id, u.name as user_name FROM mentions mn
       JOIN users u ON u.id = mn.mentioned_user_id WHERE mn.message_id = ?`,
      [m.id]
    ).map((mn) => ({
      mentionedUserId: mn.mentionedUserId,
      mentionedUser: { id: mn.mentionedUserId, name: mn.userName },
    }));
    return m;
  });
}

module.exports = { hydrateMessages };
