require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { get, all } = require("./db");
const { verifyToken } = require("./lib/auth");
const { createMessage } = require("./lib/createMessage");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const channelRoutes = require("./routes/channels");
const conversationRoutes = require("./routes/conversations");
const searchRoutes = require("./routes/search");
const uploadRoutes = require("./routes/uploads");
const userRoutes = require("./routes/users");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/users", userRoutes);

// Serve the built web app (Expo's static web export) from the same server
// as the API, so a single deployment covers both — and fall back to
// index.html for any non-API route so client-side routes like
// /accept-invite?token=... and /channel/:id work on direct load/refresh.
const WEB_DIST = process.env.WEB_DIST_PATH || path.join(__dirname, "..", "..", "app", "dist");
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(WEB_DIST, "index.html"));
  });
}

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || "*" } });

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const payload = token && verifyToken(token);
  if (!payload) return next(new Error("Not authenticated"));
  const user = get("SELECT * FROM users WHERE id = ?", [payload.sub]);
  if (!user || user.status !== "ACTIVE") return next(new Error("Account not active"));
  socket.user = user;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.user.id;

  // Join a personal room (for direct notifications) plus every channel and
  // conversation this user belongs to, so message broadcasts just work.
  socket.join(`user:${userId}`);
  const channels = all("SELECT channel_id FROM channel_members WHERE user_id = ?", [userId]);
  const conversations = all("SELECT conversation_id FROM conversation_members WHERE user_id = ?", [userId]);
  channels.forEach((c) => socket.join(`channel:${c.channelId}`));
  conversations.forEach((c) => socket.join(`conversation:${c.conversationId}`));

  socket.on("channel:join", (channelId) => {
    const member = get("SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?", [channelId, userId]);
    if (member) socket.join(`channel:${channelId}`);
  });

  socket.on("conversation:join", (conversationId) => {
    const member = get(
      "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?",
      [conversationId, userId]
    );
    if (member) socket.join(`conversation:${conversationId}`);
  });

  socket.on("message:send", (payload, ack) => {
    try {
      const message = createMessage({ authorId: userId, ...payload });
      const room = payload.channelId ? `channel:${payload.channelId}` : `conversation:${payload.conversationId}`;
      io.to(room).emit("message:new", message);

      // Notify mentioned users directly too (covers the case where they
      // aren't currently viewing this channel/conversation).
      message.mentions.forEach((m) => {
        io.to(`user:${m.mentionedUserId}`).emit("mention:new", { message });
      });

      if (ack) ack({ ok: true, message });
    } catch (err) {
      if (ack) ack({ ok: false, error: err.message });
    }
  });

  socket.on("typing", (payload) => {
    const room = payload.channelId ? `channel:${payload.channelId}` : `conversation:${payload.conversationId}`;
    socket.to(room).emit("typing", { userId, name: socket.user.name, ...payload });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Messaging server listening on port ${PORT}`);
});
