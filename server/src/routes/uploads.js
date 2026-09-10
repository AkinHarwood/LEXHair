const express = require("express");
const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const { authenticate } = require("../lib/auth");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — plenty for an internal team tool

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});
const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE } });

// Returns file metadata the client attaches to a message it sends over the
// socket — the upload and the message-send are separate steps so a message
// can carry multiple attachments.
router.post("/", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });
  res.status(201).json({
    fileName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

// Authenticated file serving — accepts the JWT via query param too, since
// <img>/<video> tags and React Native's <Image> can't send Authorization
// headers.
router.get("/:storedName", authenticate, (req, res) => {
  const filePath = path.join(UPLOAD_DIR, path.basename(req.params.storedName));
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

module.exports = router;
