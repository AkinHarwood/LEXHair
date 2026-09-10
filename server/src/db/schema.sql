CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  invited_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  accepted_at TEXT
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS channel_members (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  is_group INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  channel_id TEXT REFERENCES channels(id),
  conversation_id TEXT REFERENCES conversations(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mentions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  mentioned_user_id TEXT NOT NULL REFERENCES users(id)
);
